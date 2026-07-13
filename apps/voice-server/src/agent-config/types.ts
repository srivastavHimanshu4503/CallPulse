export interface AgentPersonaConfig {
  /** Human name of the agent as it should be perceived by the caller. */
  agentName: string;
  /** The business/tenant name — used in greetings and prompts. */
  businessName: string;
  /** Business description used as context in the system prompt. */
  businessInfo?: string;
  /** Role the agent plays (Support, Sales, Reception, …). */
  role: string;
  /** Conversational tone (Friendly, Professional, Casual, …). */
  tone: string;
  /** Language preference; used to pick STT/TTS language codes and prompt tone. */
  language: string;
  /** Greeting spoken at the start of every call. Rendered verbatim by TTS. */
  greetingMessage: string;
  /** Fallback line when the agent cannot resolve a request. */
  fallbackMessage: string;
  /** Free-form system prompt tail — appended to the base persona rules. */
  systemPrompt?: string;
  /** Which voice profile to use for TTS. */
  voice: string;
  /** Max call duration in minutes; the agent should wrap up before this. */
  maxDurationMinutes: number;
  /** Knowledge base content, concatenated into the system prompt. */
  knowledge: KnowledgeBaseEntry[];

  /** Intake collection controls (name/phone/etc.). */
  intake: {
    enabled: boolean;
    fields: string[];
    prompt?: string;
  };

  /** Identifiers threaded through downstream calls (logging, tools). */
  ids: {
    agentId: string;
    tenantId: string;
    phoneNumberId: string;
  };
}

export interface KnowledgeBaseEntry {
  name: string;
  content: string;
}

/**
 * Provider interface for looking up an agent by the dialed phone number.
 * Keeps the voice pipeline agnostic of the storage backend — the current
 * impl hits Postgres via `@antigravity/db`, but this could be a cached
 * HTTP client, in-memory fixture (tests), or Redis-fronted read model.
 */
export interface AgentConfigProvider {
  getByPhoneNumber(phoneNumber: string): Promise<AgentPersonaConfig | null>;
  getById(agentId: string): Promise<AgentPersonaConfig | null>;
}
