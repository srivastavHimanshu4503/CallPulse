import { Client } from "plivo";
import { env } from "../../config/env.js";

/**
 * Thin Plivo adapter for Indian phone-number shopping. Mirrors the shape of
 * `twilio.ts` — same three verbs (list, buy, attach) so the router can pick
 * a provider based on country without knowing implementation details.
 *
 * Routing model: SIP Trunking (same as Twilio Elastic Trunk). Purchased
 * DIDs are attached in the Plivo console to a SIP trunk whose termination
 * points at LiveKit's inbound SIP host. No Applications, no webhooks —
 * Plivo forwards SIP INVITEs straight to LiveKit.
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
  const complianceApplicationId = env.PLIVO_COMPLIANCE_APPLICATION_ID;

  if (!complianceApplicationId) {
    throw new Error(
      "PLIVO_COMPLIANCE_APPLICATION_ID missing — set it once your India KYC is approved in the Plivo console",
    );
  }

  // Plivo's SDK strips the leading `+` internally. Send E.164 without it to
  // match how their examples do it.
  const bare = phoneNumber.replace(/^\+/, "");

  try {
    // Signature: buy(number, appId, cnamLookup, haEnable, complianceApplicationId)
    // We intentionally skip appId — routing happens via SIP trunk (configured
    // in Plivo console), not via a Voice URL Application.
    const resp = await getClient().numbers.buy(
      bare,
      undefined,
      undefined,
      undefined,
      complianceApplicationId,
    );

    // Plivo returns { api_id, message, numbers: [{ number, status, ... }] }
    // We use the bare number as the reference; that's what all subsequent
    // Plivo API calls (release, update) key off of.
    return (resp as any)?.numbers?.[0]?.number || bare;
  } catch (err) {
    // Surface the ACTUAL Plivo response so we can tell "number gone" from
    // "compliance/application mismatch" from "auth failure". Their SDK
    // sometimes attaches details on `.body` or `.response`.
    const anyErr = err as any;
    const detail =
      anyErr?.response?.data ||
      anyErr?.body ||
      anyErr?.data ||
      anyErr?.message ||
      String(err);
    console.error("[plivo] purchaseNumber failed", {
      number: bare,
      complianceApplicationId,
      status: anyErr?.statusCode || anyErr?.status,
      detail,
    });
    // Common cause: search results go stale in seconds. Message the caller
    // clearly so the UI can prompt a retry rather than a mystery 500.
    if (String(detail).toLowerCase().includes("not found")) {
      throw new Error(
        "Number no longer available on Plivo — search again and pick another (India inventory turns over fast).",
      );
    }
    throw new Error(
      `Plivo purchase failed: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
    );
  }
};

/**
 * SIP trunk attachment for Plivo is a one-time console setup — you create
 * a SIP trunk in the Plivo dashboard that terminates at LiveKit's SIP host,
 * and newly-purchased DIDs are attached to that trunk on the same page.
 * There is no per-number API attach step.
 *
 * We keep this function as a no-op for interface parity with the Twilio
 * adapter, so `provisionPhoneNumber` in billing.service can call both
 * providers with the same shape.
 */
export const attachNumberToSipTrunk = async (_phoneNumber: string): Promise<void> => {
  // No-op — Plivo SIP trunk is configured in the console, not via API.
};
