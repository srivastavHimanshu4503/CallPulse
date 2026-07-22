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
  /** Owner-written behavior guidelines — appended to the base persona rules. */
  guidelines?: string;
  /** Which voice profile to use for TTS. */
  voice: string;
  /** Speaking-speed multiplier. Undefined = per-provider default. */
  voiceSpeed?: number;
  /** User-tuned per-voice provider settings (0–1 floats). Undefined = defaults. */
  voiceSettings?: AgentVoiceSettings;
  /** Sarvam pronunciation dictionary id synced by the api server (p_xxx). */
  pronunciationDictId?: string;
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

  /**
   * Call-transfer workflow. Null when the agent has transfer disabled or no
   * destination number — in that case the transfer tool is never registered
   * and the prompt carries no transfer rules.
   */
  transfer: TransferConfig | null;

  /** Identifiers threaded through downstream calls (logging, tools). */
  ids: {
    agentId: string;
    tenantId: string;
    phoneNumberId: string;
  };
}

/** Mirrors `AgentVoiceSettings` in @antigravity/types (stored as JSON on the agent row). */
export interface AgentVoiceSettings {
  /** ElevenLabs: lower = more expressive, higher = more stable/monotone. */
  stability?: number;
  /** ElevenLabs: adherence to the original voice timbre. */
  similarityBoost?: number;
  /** ElevenLabs: style exaggeration. */
  style?: number;
  /** Sarvam: sampling temperature — higher is more expressive. */
  temperature?: number;
}

export interface KnowledgeBaseEntry {
  name: string;
  content: string;
}

export interface TransferConfig {
  /** Destination number in E.164 — comes ONLY from the agent config, never from the LLM. */
  number: string;
  /** Human-written trigger condition, injected verbatim into the prompt. */
  condition: string | null;
  /** Line the agent speaks before a warm transfer. */
  message: string | null;
  /** Secondary number tried when the primary doesn't answer. */
  fallbackNumber: string | null;
  /** Ring timeout for the transfer target, in seconds. */
  timeoutSec: number;
  /** What to do when nobody answers: take_message | offer_callback | end_politely. */
  noAnswerAction: string;
  /** "warm" announces the transfer message first; "instant" redirects immediately. */
  style: "warm" | "instant";
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
