import { createLogger } from "./logger.js";
import type { LLMFactory, LLMInstance, LLMProviderConfig, LLMProviderName } from "./types.js";
import { buildOpenAILLM } from "./providers/openai.js";
import { buildGoogleLLM } from "./providers/google.js";
import { buildAnthropicLLM } from "./providers/anthropic.js";
import { FallbackLLM } from "./fallback.js";

const log = createLogger("llm");

const REGISTRY: Record<LLMProviderName, LLMFactory> = {
  openai: buildOpenAILLM,
  google: buildGoogleLLM,
  anthropic: buildAnthropicLLM,
};

/**
 * Instantiate a single LLM provider from a validated config block.
 * All providers return the same `agentsLLM.LLM` interface, so callers
 * (the voice pipeline) do not need to know which vendor is active.
 */
export const createLLM = (cfg: LLMProviderConfig): LLMInstance => {
  const factory = REGISTRY[cfg.provider];
  if (!factory) throw new Error(`Unsupported LLM provider: ${cfg.provider}`);
  log.info("initializing llm provider", { provider: cfg.provider, model: cfg.model });
  return factory(cfg);
};

/**
 * Build the pipeline LLM from a primary config plus an optional ordered list
 * of fallback configs. The returned instance is always a `FallbackLLM` — even
 * with zero fallbacks — so that per-request logging (start / first token /
 * complete text / errors) is uniform across configurations. With zero
 * fallbacks it behaves as a straight passthrough that fails fast when the
 * primary errors.
 *
 * Callers always receive a single `LLMInstance` and remain provider-agnostic.
 */
export const createPipelineLLM = (opts: {
  primary: LLMProviderConfig;
  fallbacks?: LLMProviderConfig[];
}): LLMInstance => {
  const primary = createLLM(opts.primary);
  const fallbacks = (opts.fallbacks ?? []).map(createLLM);

  log.info("wiring llm chain", {
    primary: `${opts.primary.provider}/${opts.primary.model}`,
    fallbacks: (opts.fallbacks ?? []).map((f) => `${f.provider}/${f.model}`),
  });
  return new FallbackLLM({ primary, fallbacks });
};

export type { LLMInstance, LLMProviderConfig, LLMProviderName } from "./types.js";
export { generateStructuredOutput } from "./structured.js";
export { generateChatReply, type ChatTurn } from "./chat.js";
export {
  OPENAI_MODELS,
  OPENAI_MODEL_IDS,
  DEFAULT_STRUCTURED_MODEL,
  type OpenAIModelId,
} from "./models.js";
