import { llm as agentsLLM } from "@livekit/agents";
import type { APIConnectOptions } from "@livekit/agents";
import { DEFAULT_API_CONNECT_OPTIONS } from "@livekit/agents";
import { createLogger } from "./logger.js";
import type { LLMInstance } from "./types.js";

/**
 * When calling an individual provider inside the fallback loop we disable
 * that provider's internal retry: `FallbackLLM` is the retry mechanism.
 * Letting each provider retry 4×2s means an 8-second dead-air gap before
 * the chain can move on to the next provider — unacceptable on a phone call.
 */
const FAST_FAIL_CONN_OPTIONS: APIConnectOptions = {
  ...DEFAULT_API_CONNECT_OPTIONS,
  maxRetry: 0,
  retryIntervalMs: 0,
  timeoutMs: 8000,
};

const log = createLogger("llm:fallback");

interface FallbackLLMOptions {
  primary: LLMInstance;
  fallbacks: LLMInstance[];
}

/**
 * Composes multiple LLM providers into a single provider-agnostic instance.
 *
 * On every chat() call it tries the primary first. If the primary's stream
 * errors *before yielding any chunk*, it transparently retries against each
 * fallback in order. If any provider has already started emitting audio to
 * the caller, we do not switch — mid-stream provider swaps produce garbled,
 * duplicated speech, so we bubble the error instead.
 *
 * Failure detection covers both cases the LiveKit LLM contract allows:
 *   1. The stream throws from the async iterator.
 *   2. The stream completes silently with 0 chunks while the underlying LLM
 *      instance emits an `error` event (this is how the LiveKit `inference`
 *      layer surfaces upstream API failures like 401/429/5xx).
 *
 * We also attach a no-op safety listener to each inner LLM to avoid Node's
 * unhandled `error` event crash when nothing else is listening.
 */
export class FallbackLLM extends agentsLLM.LLM {
  private readonly primary: LLMInstance;
  private readonly fallbacks: LLMInstance[];

  constructor(opts: FallbackLLMOptions) {
    super();
    this.primary = opts.primary;
    this.fallbacks = opts.fallbacks;

    // Guarantee at least one listener so Node's EventEmitter never throws
    // ERR_UNHANDLED_ERROR when a provider surfaces an API failure.
    for (const p of [this.primary, ...this.fallbacks]) {
      p.on("error", () => {});
    }
  }

  label(): string {
    const chain = [this.primary, ...this.fallbacks]
      .map((p) => `${p.provider}/${p.model}`)
      .join(" -> ");
    return `fallback[${chain}]`;
  }

  get model(): string {
    return this.primary.model;
  }

  get provider(): string {
    return `fallback(${this.primary.provider})`;
  }

  chat(args: {
    chatCtx: agentsLLM.ChatContext;
    toolCtx?: agentsLLM.ToolContextLike;
    connOptions?: APIConnectOptions;
    parallelToolCalls?: boolean;
    toolChoice?: agentsLLM.ToolChoice;
    extraKwargs?: Record<string, unknown>;
  }): agentsLLM.LLMStream {
    return new FallbackLLMStream(this, [this.primary, ...this.fallbacks], args);
  }

  prewarm(): void {
    this.primary.prewarm();
  }

  async aclose(): Promise<void> {
    await Promise.allSettled(
      [this.primary, ...this.fallbacks].map((p) => p.aclose())
    );
  }
}

interface FallbackChatArgs {
  chatCtx: agentsLLM.ChatContext;
  toolCtx?: agentsLLM.ToolContextLike;
  connOptions?: APIConnectOptions;
  parallelToolCalls?: boolean;
  toolChoice?: agentsLLM.ToolChoice;
  extraKwargs?: Record<string, unknown>;
}

class FallbackLLMStream extends agentsLLM.LLMStream {
  private readonly providers: LLMInstance[];
  private readonly callArgs: FallbackChatArgs;

  constructor(parent: FallbackLLM, providers: LLMInstance[], args: FallbackChatArgs) {
    super(parent, {
      chatCtx: args.chatCtx,
      toolCtx: args.toolCtx,
      connOptions: args.connOptions!,
    });
    this.providers = providers;
    this.callArgs = args;
  }

  protected async run(): Promise<void> {
    let lastError: unknown;

    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i]!;
      const isLast = i === this.providers.length - 1;
      const tag = `${provider.provider}/${provider.model}`;

      // Capture out-of-band `error` events emitted on the LLM instance.
      // The LiveKit inference layer surfaces upstream API failures this way
      // rather than throwing from the async iterator.
      let capturedError: Error | undefined;
      const errListener = (evt: any) => {
        if (!capturedError) {
          capturedError = evt?.error instanceof Error
            ? evt.error
            : new Error(evt?.error?.message ?? evt?.message ?? JSON.stringify(evt));
        }
      };
      provider.on("error", errListener);

      const startedAt = Date.now();
      let firstChunkAt: number | undefined;
      let chunkCount = 0;
      let textBuffer = "";
      const toolCallNames = new Set<string>();

      log.info("llm request start", { provider: tag });
      const stream = provider.chat({
        ...this.callArgs,
        connOptions: FAST_FAIL_CONN_OPTIONS,
      });

      try {
        for await (const chunk of stream) {
          chunkCount++;
          if (firstChunkAt === undefined) {
            firstChunkAt = Date.now();
            log.info("llm first token", { provider: tag, ttfbMs: firstChunkAt - startedAt });
          }
          const content = chunk.delta?.content;
          if (typeof content === "string" && content.length > 0) textBuffer += content;
          if (chunk.delta?.toolCalls) {
            for (const tc of chunk.delta.toolCalls) {
              if (tc.name) toolCallNames.add(tc.name);
            }
          }
          this.queue.put(chunk);
        }

        // The stream completed silently but the provider emitted an error
        // event — treat as a failure so fallback still runs.
        if (chunkCount === 0 && capturedError) {
          throw capturedError;
        }

        log.info("llm request complete", {
          provider: tag,
          totalMs: Date.now() - startedAt,
          chunks: chunkCount,
          chars: textBuffer.length,
          text: textBuffer.length > 0 ? textBuffer : undefined,
          toolCalls: toolCallNames.size > 0 ? Array.from(toolCallNames) : undefined,
        });
        if (i > 0) log.info("fallback provider succeeded", { provider: tag, attempt: i + 1 });
        return;
      } catch (err) {
        try { stream.close(); } catch { /* ignore */ }
        lastError = capturedError ?? err;
        const msg = lastError instanceof Error ? lastError.message : String(lastError);

        if (chunkCount > 0) {
          log.error("provider failed mid-stream — cannot fail over", {
            provider: tag,
            error: msg,
            partialChars: textBuffer.length,
          });
          throw lastError;
        }
        if (isLast) {
          log.error("all providers exhausted", { lastProvider: tag, error: msg });
          throw lastError;
        }
        log.warn("provider failed before yielding, trying fallback", {
          provider: tag,
          nextProvider: `${this.providers[i + 1]!.provider}/${this.providers[i + 1]!.model}`,
          error: msg,
        });
      } finally {
        provider.off("error", errListener);
      }
    }

    if (lastError) throw lastError;
  }
}
