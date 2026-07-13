import * as google from "@livekit/agents-plugin-google";
import type { LLMFactory } from "../types.js";

export const buildGoogleLLM: LLMFactory = (cfg) => {
  return new google.LLM({
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: cfg.temperature,
    ...(cfg.maxTokens ? { maxOutputTokens: cfg.maxTokens } : {}),
  });
};
