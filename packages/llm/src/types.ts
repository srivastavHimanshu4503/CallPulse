import type { llm as agentsLLM } from "@livekit/agents";
export type LLMProviderName = "openai" | "google" | "anthropic";

export interface LLMProviderConfig {
  provider: LLMProviderName;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens?: number;
}

export type LLMInstance = agentsLLM.LLM;



export interface LLMFactory {
  (config: LLMProviderConfig): LLMInstance;
}
