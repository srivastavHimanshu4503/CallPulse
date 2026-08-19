export interface AgentBusinessHours {
  is24x7?: boolean;
  startTime?: string;
  endTime?: string;
}

export interface AgentBookingConfig {
  triggerCondition: string;
  provider: "google" | "calcom" | "link";
  calendarLink: string;
  meetingDurationMin: number;
  workingHoursNote: string;
  confirmationMessage: string;
  /** Ask the caller for an email so the calendar invite reaches their inbox.
   *  SMS confirmation is always sent regardless — email is best-effort. */
  askEmail: boolean;
}

/**
 * Per-voice provider tunables the user adjusts in the dashboard. All values
 * are stored provider-native (0–1 floats); the UI renders them as 0–100
 * sliders. Absent field = provider default.
 */
export interface AgentVoiceSettings {
  /** ElevenLabs: lower = more expressive/variable, higher = more monotone-stable. */
  stability?: number;
  /** ElevenLabs: how closely the output sticks to the original voice timbre. */
  similarityBoost?: number;
  /** ElevenLabs: style exaggeration — higher is more dramatic delivery. */
  style?: number;
  /** Sarvam: sampling temperature — higher is more expressive/varied. */
  temperature?: number;
}

export interface SerializedAgent {
  id: string;
  name: string;
  role: string;
  language: string;
  greetingMessage: string;
  tone: string;
  fallbackMessage: string;
  businessInfo: string | null;
  websiteUrl: string | null;
  /** Owner-written instructions for how the agent should talk and behave. */
  agentGuidelines: string | null;
  maxDuration: number;
  dndCompliance: boolean;
  recordingConsent: boolean;
  isActive: boolean;
  phoneNumber: string;
  voice: string;
  voiceSpeed: number | null;
  voiceSettings: AgentVoiceSettings | null;
  /** Word → spoken-form overrides (Sarvam pronunciation dictionary source). */
  pronunciations: Record<string, string> | null;
  intakeWorkflowId: string | null;
  smsWorkflowId: string | null;
  phoneNumberId: string | null;
  intakeEnabled: boolean;
  intakeFields: string[];
  intakePrompt: string | null;
  smsEnabled: boolean;
  smsTriggerCondition: string | null;
  smsTemplate: string | null;
  smsAgentReply: string | null;
  whatsappEnabled: boolean;
  whatsappPrompt: string | null;
  apiEnabled: boolean;
  apiWorkflowId: string | null;
  apiPrompt: string | null;
  callTransferEnabled: boolean;
  callTransferWorkflowId: string | null;
  callTransferNumber: string | null;
  callTransferCondition: string | null;
  callTransferMessage: string | null;
  callTransferFallbackNumber: string | null;
  callTransferTimeoutSec: number;
  callTransferNoAnswerAction: "take_message" | "offer_callback" | "end_politely";
  callTransferStyle: "warm" | "instant";
  bookingEnabled: boolean;
  bookingConfig: AgentBookingConfig | null;
  timeZone: string;
  businessHours: AgentBusinessHours | null;
  callsToday: number;
  avgDuration: number;
  createdAt: string;
  updatedAt: string;
}
