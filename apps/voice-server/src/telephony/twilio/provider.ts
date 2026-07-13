import twilio from "twilio";
import type { Request, Response } from "express";
import type { ITelephonyProvider, AgentConfig } from "../interface.js";
import { config } from "../../config.js";
import { createLogger } from "../../logger.js";
import { buildInboundTwiML } from "./webhook.js";

const log = createLogger("twilio");

export class TwilioTelephonyProvider implements ITelephonyProvider {
  private client: twilio.Twilio;

  constructor() {
    if (!config.twilio.isConfigured) {
      throw new Error("Twilio credentials are not fully configured");
    }
    this.client = twilio(config.twilio.accountSid!, config.twilio.authToken!);
  }

  async handleInboundWebhook(req: Request, res: Response): Promise<void> {
    const callerNumber = (req.body?.From as string) || "";
    const callSid = (req.body?.CallSid as string) || "";
    log.info("inbound call", { callSid, callerNumber });

    const twiml = buildInboundTwiML(callerNumber);
    res.type("text/xml").send(twiml);
  }

  async initiateOutboundCall(to: string, agentConfig: AgentConfig): Promise<string> {
    if (!config.server.publicUrl) {
      throw new Error("PUBLIC_URL must be set to initiate outbound calls");
    }
    log.info("initiating outbound call", { to, agent: agentConfig.name });

    const twimlUrl = `${config.server.publicUrl}/webhook/call/outbound?agentId=${encodeURIComponent(agentConfig.id)}`;
    const call = await this.client.calls.create({
      to,
      from: config.twilio.phoneNumber!,
      url: twimlUrl,
    });
    return call.sid;
  }

  async transferCall(callSid: string, to: string): Promise<void> {
    log.info("transfer call", { callSid, to });
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.dial(to);
    await this.client.calls(callSid).update({ twiml: twiml.toString() });
  }

  async endCall(callSid: string): Promise<void> {
    log.info("end call", { callSid });
    await this.client.calls(callSid).update({ status: "completed" });
  }
}
