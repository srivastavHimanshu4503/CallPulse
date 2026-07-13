import twilio from "twilio";
import { config } from "../../config.js";

/**
 * Builds the TwiML that hands the inbound Twilio call to LiveKit's SIP connector.
 * LiveKit terminates the SIP dial and dispatches the configured agent.
 */
export function buildInboundTwiML(_callerNumber: string): string {
  const response = new twilio.twiml.VoiceResponse();

  const livekitUrl = config.livekit.url ?? "";
  const livekitHost = livekitUrl.replace(/^wss?:\/\//, "");
  const match = livekitHost.match(/^[^-]+-([a-zA-Z0-9]+)\.livekit\.cloud$/);
  const projectId = match ? match[1] : (config.livekit.apiKey ?? "").replace(/^API/, "");
  const sipDomain = `${projectId}.sip.livekit.cloud`;
  const phone = config.twilio.phoneNumber ?? "";

  response.dial().sip(`sip:${phone}@${sipDomain}:5061;transport=tls`);
  return response.toString();
}
