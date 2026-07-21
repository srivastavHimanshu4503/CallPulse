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
  maxDuration: number;
  dndCompliance: boolean;
  recordingConsent: boolean;
  isActive: boolean;
  phoneNumber: string;
  voice: string;
  voiceSpeed: number | null;
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

