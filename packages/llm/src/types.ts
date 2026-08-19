import type { llm as agentsLLM } from "@livekit/agents";
export type LLMProviderName = "openai" | "google" | "anthropic";

export interface LLMProviderConfig {
  provider: LLMProviderName;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens?: number;
  /**
   * OpenAI-only. "priority" buys consistently low TTFT (~2x token price) —
   * the standard tier's 2-4s first-token spikes read as dead air on a live
   * phone call. Ignored by other providers.
   */
  serviceTier?: string;
  /**
   * OpenAI-only. When set, requests go to an Azure OpenAI resource instead
   * of api.openai.com — used to serve the model from an Indian region
   * (~25ms RTT from the Mumbai box vs ~280ms to OpenAI US). serviceTier is
   * ignored on Azure (regional capacity is already latency-consistent, and
   * Azure rejects the parameter).
   */
  azure?: {
    endpoint: string;
    deployment: string;
    apiVersion?: string;
  };
}

export type LLMInstance = agentsLLM.LLM;

export interface LLMFactory {
  (config: LLMProviderConfig): LLMInstance;
}
