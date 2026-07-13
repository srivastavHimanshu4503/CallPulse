import * as anthropic from "@livekit/agents-plugin-anthropic";
import type { LLMFactory } from "../types.js";

export const buildAnthropicLLM: LLMFactory = (cfg) => {
  return new anthropic.LLM({
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: cfg.temperature,
    // Anthropic requires an explicit max_tokens. Cap conservatively to stay under
    // the free-tier 4K output/minute limit and keep phone replies short.
    maxTokens: cfg.maxTokens ?? 512,
  });
};
