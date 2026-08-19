import twilio from "twilio";
import { env } from "../../config/env.js";

/**
 * Thin Twilio adapter for phone-number shopping. US numbers only for now —
 * the Indian market needs DLT/KYC plumbing we'll add when we get there.
 */

export const isTwilioConfigured = (): boolean =>
  Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);

let client: ReturnType<typeof twilio> | null = null;
const getClient = () => {
  if (!isTwilioConfigured()) throw new Error("Telephony is not configured yet");
  if (!client) client = twilio(env.TWILIO_ACCOUNT_SID!, env.TWILIO_AUTH_TOKEN!);
  return client;
};

export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

export const listAvailableNumbers = async (areaCode?: string): Promise<AvailableNumber[]> => {
  const numbers = await getClient()
    .availablePhoneNumbers("US")
    .local.list({
      limit: 12,
      voiceEnabled: true,
      ...(areaCode ? { areaCode: Number(areaCode) } : {}),
    });
  return numbers.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName,
    locality: n.locality || null,
    region: n.region || null,
  }));
};

/** Buy the number on Twilio. Returns the resource sid for later management. */
export const purchaseNumber = async (phoneNumber: string): Promise<string> => {
  const purchased = await getClient().incomingPhoneNumbers.create({ phoneNumber });
  return purchased.sid;
};

/**
 * Attach a purchased number to the elastic SIP trunk that fronts LiveKit —
 * this is what makes inbound calls flow to the voice agent. We prefer the
 * trunk whose origination URI points at LiveKit; with a single trunk (the
 * normal case) we just use it.
 */
let cachedTrunkSid: string | null = null;
export const attachNumberToSipTrunk = async (phoneNumberSid: string): Promise<void> => {
  const client = getClient();

  if (!cachedTrunkSid) {
    const trunks = await client.trunking.v1.trunks.list({ limit: 20 });
    if (trunks.length === 0) {
      throw new Error("No Twilio elastic SIP trunk found — create one pointing at LiveKit first");
    }
    let chosen = trunks[0]!.sid;
    if (trunks.length > 1) {
      for (const t of trunks) {
        const uris = await client.trunking.v1.trunks(t.sid).originationUrls.list({ limit: 5 });
        if (uris.some((u) => (u.sipUrl || "").includes("livekit"))) {
          chosen = t.sid;
          break;
        }
      }
    }
    cachedTrunkSid = chosen;
  }

  await client.trunking.v1.trunks(cachedTrunkSid).phoneNumbers.create({
    phoneNumberSid,
  });
};
