import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { getErrorMessage } from "@antigravity/errors";

const log = logger.child({ module: "whatsapp-sender" });

const SENDERS_API = "https://messaging.twilio.com/v2/Channels/Senders";

export type SenderStatus =
  | "NOT_REGISTERED"
  | "ONLINE"
  | "OFFLINE"
  | "CREATING"
  | "PENDING_VERIFICATION"
  | "UPDATING"
  | "UNKNOWN";

export interface SenderInfo {
  sid: string;
  status: SenderStatus;
  webhookConfigured: boolean;
}

interface RawSender {
  sid: string;
  sender_id: string;
  status: string;
  webhook?: { callback_url?: string | null } | null;
}

const senderConfigured = (): boolean =>
  Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WABA_ID);

const authHeader = (): string =>
  "Basic " + Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");

// Twilio reports transitional states like "ONLINE:UPDATING" — the prefix is
// the operative status for our UI.
const normalizeStatus = (raw: string): SenderStatus => {
  const head = raw.split(":")[0] ?? raw;
  switch (head) {
    case "ONLINE":
      return "ONLINE";
    case "OFFLINE":
      return "OFFLINE";
    case "CREATING":
      return "CREATING";
    case "PENDING_VERIFICATION":
    case "VERIFYING":
      return "PENDING_VERIFICATION";
    case "UPDATING":
      return "UPDATING";
    default:
      return "UNKNOWN";
  }
};

const toInfo = (s: RawSender): SenderInfo => ({
  sid: s.sid,
  status: normalizeStatus(s.status),
  webhookConfigured: Boolean(s.webhook?.callback_url),
});

async function findSender(phoneNumber: string): Promise<RawSender | null> {
  let url = `${SENDERS_API}?Channel=whatsapp&PageSize=100`;
  // Senders lists are tiny (one per number) — a single page is plenty, but
  // follow pagination defensively.
  for (let page = 0; page < 5 && url; page++) {
    const res = await fetch(url, { headers: { Authorization: authHeader() } });
    if (!res.ok) throw new Error(`Twilio senders list failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as {
      senders: RawSender[];
      meta: { next_page_url: string | null };
    };
    const match = data.senders.find((s) => s.sender_id === `whatsapp:${phoneNumber}`);
    if (match) return match;
    url = data.meta.next_page_url ?? "";
  }
  return null;
}

/**
 * Make sure `phoneNumber` is a registered WhatsApp sender with our webhook —
 * the WhatsApp equivalent of attaching a number to the SIP trunk.
 *
 * - already registered → backfill the webhook if it's missing, return status
 * - not registered → create the sender under our WABA (Twilio auto-verifies
 *   numbers it hosts) and set the webhook; Meta review runs asynchronously
 *
 * Never throws: WhatsApp enablement must not block agent saves. Callers get
 * a status they can surface in the UI.
 */
export async function ensureWhatsAppSender(
  phoneNumber: string,
  displayName: string,
): Promise<SenderInfo | null> {
  if (!senderConfigured()) {
    log.info("WABA not configured — skipping sender registration", { phoneNumber });
    return null;
  }

  try {
    const existing = await findSender(phoneNumber);

    if (existing) {
      // Registered but pointing nowhere — backfill our webhook so inbound
      // messages actually reach us.
      if (!existing.webhook?.callback_url && env.WHATSAPP_WEBHOOK_URL) {
        const res = await fetch(`${SENDERS_API}/${existing.sid}`, {
          method: "POST",
          headers: { Authorization: authHeader(), "Content-Type": "application/json" },
          body: JSON.stringify({
            webhook: { callback_url: env.WHATSAPP_WEBHOOK_URL, callback_method: "POST" },
          }),
        });
        if (!res.ok) {
          log.error("failed to set webhook on existing sender", {
            phoneNumber,
            status: res.status,
            body: await res.text(),
          });
          return toInfo(existing);
        }
        const updated = (await res.json()) as RawSender;
        log.info("webhook configured on existing WhatsApp sender", { phoneNumber });
        return toInfo(updated);
      }
      return toInfo(existing);
    }

    // Not registered — create the sender under our WABA.
    const res = await fetch(SENDERS_API, {
      method: "POST",
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_id: `whatsapp:${phoneNumber}`,
        configuration: { waba_id: env.TWILIO_WABA_ID },
        profile: { name: displayName },
        ...(env.WHATSAPP_WEBHOOK_URL
          ? { webhook: { callback_url: env.WHATSAPP_WEBHOOK_URL, callback_method: "POST" } }
          : {}),
      }),
    });
    if (!res.ok) {
      log.error("WhatsApp sender creation failed", {
        phoneNumber,
        status: res.status,
        body: await res.text(),
      });
      return null;
    }
    const created = (await res.json()) as RawSender;
    log.info("WhatsApp sender registration started", {
      phoneNumber,
      sid: created.sid,
      status: created.status,
    });
    return toInfo(created);
  } catch (err) {
    log.error("ensureWhatsAppSender failed", { phoneNumber, error: getErrorMessage(err) });
    return null;
  }
}

/** Live sender status for the UI. */
export async function getWhatsAppSenderStatus(
  phoneNumber: string,
): Promise<SenderInfo | { sid: null; status: SenderStatus; webhookConfigured: false }> {
  if (!senderConfigured()) return { sid: null, status: "NOT_REGISTERED", webhookConfigured: false };
  try {
    const existing = await findSender(phoneNumber);
    if (!existing) return { sid: null, status: "NOT_REGISTERED", webhookConfigured: false };
    return toInfo(existing);
  } catch (err) {
    log.error("sender status lookup failed", { phoneNumber, error: getErrorMessage(err) });
    return { sid: null, status: "UNKNOWN" as const, webhookConfigured: false };
  }
}
