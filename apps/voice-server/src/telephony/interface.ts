import type { Request, Response } from "express";

export interface AgentConfig {
  id: string;
  name: string;
  voice: string;
  language: string;
  greetingMessage: string;
  fallbackMessage: string;
  personaPrompt: string;
}

export interface ITelephonyProvider {
  handleInboundWebhook(req: Request, res: Response): Promise<void>;
  initiateOutboundCall(to: string, agentConfig: AgentConfig): Promise<string>;
  transferCall(callSid: string, to: string): Promise<void>;
  endCall(callSid: string): Promise<void>;
}
