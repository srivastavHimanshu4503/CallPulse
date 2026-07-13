import type { Request, Response } from "express";
import type { ITelephonyProvider, AgentConfig } from "../interface.js";

export class PlivoTelephonyProvider implements ITelephonyProvider {
  async handleInboundWebhook(_req: Request, _res: Response): Promise<void> {
    console.log("[PlivoTelephonyProvider] handleInboundWebhook - Not implemented");
    throw new Error("Plivo telephony provider not implemented");
  }

  async initiateOutboundCall(_to: string, _agentConfig: AgentConfig): Promise<string> {
    console.log("[PlivoTelephonyProvider] initiateOutboundCall - Not implemented");
    throw new Error("Plivo telephony provider not implemented");
  }

  async transferCall(_callSid: string, _to: string): Promise<void> {
    console.log("[PlivoTelephonyProvider] transferCall - Not implemented");
    throw new Error("Plivo telephony provider not implemented");
  }

  async endCall(_callSid: string): Promise<void> {
    console.log("[PlivoTelephonyProvider] endCall - Not implemented");
    throw new Error("Plivo telephony provider not implemented");
  }
}
