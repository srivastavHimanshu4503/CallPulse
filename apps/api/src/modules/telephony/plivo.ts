import { Client } from "plivo";
import { env } from "../../config/env.js";

/**
 * Thin Plivo adapter for Indian phone-number shopping. Mirrors the shape of
 * `twilio.ts` — same three verbs (list, buy, attach) so the router can pick
 * a provider based on country without knowing implementation details.
 *
 * India specifics:
 *  - CPaaS providers (Plivo, Twilio, Telnyx) can only sell landline DIDs on
 *    Indian city STD codes (022 Mumbai, 080 Bangalore, 011 Delhi, etc.).
 *    Mobile-number inventory is reserved for telcos by TRAI rules.
 *  - Every India purchase needs a `complianceApplicationId` from the KYC
 *    profile you approve in the Plivo console. We stash it in
 *    PLIVO_COMPLIANCE_APPLICATION_ID and pass it on every buy.
 */

export const isPlivoConfigured = (): boolean =>
  Boolean(env.PLIVO_AUTH_ID && env.PLIVO_AUTH_TOKEN);

let client: Client | null = null;
const getClient = (): Client => {
  if (!isPlivoConfigured()) throw new Error("Plivo is not configured");
  if (!client) client = new Client(env.PLIVO_AUTH_ID!, env.PLIVO_AUTH_TOKEN!);
  return client;
};

export interface AvailableIndianNumber {
  phoneNumber: string;
  friendlyName: string;
  city: string | null;
  region: string | null;
  monthlyRentalRate: string | null;
  voiceEnabled: boolean;
}

/**
 * Search Plivo for available Indian DIDs. `pattern` filters by prefix — pass
 * a city STD code (`22`, `80`, `11`, etc.) to get numbers from that city.
 * Plivo returns E.164 format directly.
 */
export const listAvailableNumbers = async (
  pattern?: string,
): Promise<AvailableIndianNumber[]> => {
  const params: Record<string, unknown> = {
    type: "local",
    services: "voice",
    limit: 20,
  };
  if (pattern) params.pattern = pattern;

  const results = await getClient().numbers.search("IN", params);
  return results.map((r) => ({
    phoneNumber: r.number.startsWith("+") ? r.number : `+${r.number}`,
    friendlyName: r.number,
    city: r.city || null,
    region: r.region || null,
    monthlyRentalRate: r.monthly_rental_rate || null,
    voiceEnabled: !!r.voice_enabled,
  }));
};

/**
 * Buy an Indian DID from Plivo. Must include the compliance application id
 * from the approved KYC profile, otherwise the API rejects the purchase.
 * Returns the Plivo-side reference we store on the PhoneNumber row so we
 * can release / re-configure the number later.
 */
export const purchaseNumber = async (phoneNumber: string): Promise<string> => {
  const applicationId = env.PLIVO_APPLICATION_ID;
  const complianceApplicationId = env.PLIVO_COMPLIANCE_APPLICATION_ID;

  if (!complianceApplicationId) {
    throw new Error(
      "PLIVO_COMPLIANCE_APPLICATION_ID missing — set it once your India KYC is approved in the Plivo console",
    );
  }

  // Plivo's SDK strips the leading `+` internally. Send E.164 without it to
  // match how their examples do it.
  const bare = phoneNumber.replace(/^\+/, "");

  // Signature: buy(number, appId, cnamLookup, haEnable, complianceApplicationId)
  const resp = await getClient().numbers.buy(
    bare,
    applicationId,
    undefined,
    undefined,
    complianceApplicationId,
  );

  // Plivo returns { api_id, message, numbers: [{ number, status, ... }] }
  // We use the bare number as the reference; that's what all subsequent
  // Plivo API calls (release, update) key off of.
  return (resp as any)?.numbers?.[0]?.number || bare;
};

/**
 * Attach a purchased number to the SIP trunk that fronts LiveKit. In Plivo,
 * "trunk" attachment is really "point this number at an Application" — the
 * application has a voice URL that returns Plivo XML routing the call over
 * SIP to LiveKit. If the number was bought with `applicationId` already set
 * (see `purchaseNumber`), attachment is already done and this is a no-op.
 *
 * We keep the function for interface parity with the Twilio adapter — the
 * billing service calls both providers the same way.
 */
export const attachNumberToSipTrunk = async (phoneNumber: string): Promise<void> => {
  const applicationId = env.PLIVO_APPLICATION_ID;
  if (!applicationId) {
    console.warn(
      "[plivo] PLIVO_APPLICATION_ID not set — skipping trunk attach. Configure the number's voice URL manually in the Plivo console.",
    );
    return;
  }

  const bare = phoneNumber.replace(/^\+/, "");
  await getClient().numbers.update(bare, {
    appId: applicationId,
  });
};
