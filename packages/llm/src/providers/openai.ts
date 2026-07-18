import * as openai from "@livekit/agents-plugin-openai";
import type { LLMFactory } from "../types.js";

export const buildOpenAILLM: LLMFactory = (cfg) => {
  return new openai.LLM({
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: cfg.temperature,
    ...(cfg.maxTokens ? { maxCompletionTokens: cfg.maxTokens } : {}),
  });
};
