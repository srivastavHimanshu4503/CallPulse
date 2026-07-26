import * as google from "@livekit/agents-plugin-google";
import type { LLMFactory } from "../types.js";

export const buildGoogleLLM: LLMFactory = (cfg) => {
  return new google.LLM({
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: cfg.temperature,
    ...(cfg.maxTokens ? { maxOutputTokens: cfg.maxTokens } : {}),
    // The plugin's default per-request timeout is 8s, but Google's API now
    // rejects any deadline under 10s ("Manually set deadline 8s is too short").
    // That fails EVERY call before token 1 — the fallback chain silently
    // covers it, so users see gpt-4.1 latency + Gemini's failure delay.
    // 15s gives comfortable headroom over Google's 10s floor while still
    // letting the SDK abort a truly stuck call before the caller notices.
    httpOptions: { timeout: 15_000 },
  });
};
