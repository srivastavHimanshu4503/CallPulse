import OpenAI from "openai";
import { LLMError, RateLimitError, withRetries, type AppError } from "@antigravity/errors";
import type { LLMProviderConfig } from "./types.js";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Plain-text chat completion for messaging channels (WhatsApp, SMS).
 * The structured sibling (`generateStructuredOutput`) is for extraction;
 * this one is for conversation — system prompt + alternating history in,
 * one reply string out. Same retry/error semantics as the structured path.
 */
export const generateChatReply = async (
  config: LLMProviderConfig,
  systemPrompt: string,
  history: ChatTurn[],
): Promise<string> => {
  const openai = new OpenAI({ apiKey: config.apiKey, maxRetries: 0 });

  return withRetries(
    async () => {
      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: config.model || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map((t) => ({ role: t.role, content: t.content })),
          ],
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens ?? 500,
        });
      } catch (err) {
        throw classifyOpenAIError(err);
      }

      const reply = completion.choices[0]?.message.content?.trim();
      if (!reply) {
        const refusal = completion.choices[0]?.message.refusal;
        throw new LLMError(
          `Chat completion returned empty content${refusal ? ` (refusal: ${refusal})` : ""}`,
          { retryable: true },
        );
      }
      return reply;
    },
    { attempts: 3, baseDelayMs: 750, label: "chat:reply" },
  );
};

const classifyOpenAIError = (err: unknown): AppError => {
  const status = (err as { status?: number }).status;
  const message = (err as Error)?.message ?? String(err);

  if (status === 429) {
    return new RateLimitError(`OpenAI rate limited: ${message}`, { cause: err });
  }
  const retryable = status === undefined || status >= 500;
  return new LLMError(`OpenAI chat completion failed: ${message}`, {
    retryable,
    context: { status },
    cause: err,
  });
};
