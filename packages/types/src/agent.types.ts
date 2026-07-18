export interface AgentBusinessHours {
  is24x7?: boolean;
  startTime?: string;
  endTime?: string;
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
  timeZone: string;
  businessHours: AgentBusinessHours | null;
  callsToday: number;
  avgDuration: number;
  createdAt: string;
  updatedAt: string;
}

