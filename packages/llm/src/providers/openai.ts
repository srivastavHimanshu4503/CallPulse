import * as openai from "@livekit/agents-plugin-openai";
import { AzureOpenAI } from "openai";
import type { LLMFactory } from "../types.js";

export const buildOpenAILLM: LLMFactory = (cfg) => {
  if (cfg.azure) {
    // gpt-5 / o-series are reasoning models: they reject `temperature` and,
    // left at default effort, silently "think" before the first token —
    // fatal on a phone call. `minimal` skips reasoning entirely.
    const isReasoningModel = /^(gpt-5|o\d)/.test(cfg.model);
    const client = new AzureOpenAI({
      apiKey: cfg.apiKey,
      endpoint: cfg.azure.endpoint,
      apiVersion: cfg.azure.apiVersion ?? "2025-04-01-preview",
    });
    return new openai.LLM({
      // Cast: the plugin's bundled openai types differ in version from ours,
      // but AzureOpenAI is a structural OpenAI client (same surface).
      client: client as never,
      // With an Azure client the `model` field is the DEPLOYMENT name — it
      // becomes the /deployments/{model}/ URL segment.
      model: cfg.azure.deployment,
      ...(isReasoningModel
        ? { reasoningEffort: "minimal" as const }
        : { temperature: cfg.temperature }),
      ...(cfg.maxTokens ? { maxCompletionTokens: cfg.maxTokens } : {}),
    });
  }
  return new openai.LLM({
    apiKey: cfg.apiKey,
    model: cfg.model,
    temperature: cfg.temperature,
    ...(cfg.maxTokens ? { maxCompletionTokens: cfg.maxTokens } : {}),
    ...(cfg.serviceTier ? { serviceTier: cfg.serviceTier } : {}),
  });
};
