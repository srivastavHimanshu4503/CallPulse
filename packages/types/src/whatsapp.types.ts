/** The subset of Twilio's WhatsApp webhook payload we consume. */
export interface TwilioWhatsAppWebhookPayload {
  /** e.g. "whatsapp:+916375422034" */
  From: string;
  /** e.g. "whatsapp:+17432227947" */
  To: string;
  /** Absent for media-only messages. */
  Body?: string;
  ProfileName?: string;
  MessageSid?: string;
  NumMedia?: string;
}

/** Persona fields a text-chat channel needs from an AIAgent row. */
export interface ChatAgentPersona {
  agentName: string;
  role: string;
  tone: string;
  language: string;
  businessName: string;
  businessInfo: string | null;
  knowledge: { name: string; content: string }[];
  /** Channel-specific extra instructions (agent.whatsappPrompt). */
  channelPrompt: string | null;
}
