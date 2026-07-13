import type { llm as agentsLLM } from "@livekit/agents";
import type { LLMProviderConfig, LLMProviderName } from "../config.js";

export type LLMInstance = agentsLLM.LLM;

export type { LLMProviderConfig, LLMProviderName };

export interface LLMFactory {
  (config: LLMProviderConfig): LLMInstance;
}
