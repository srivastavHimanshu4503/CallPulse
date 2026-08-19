/**
 * Consent state helpers. Backend fields aren't in Prisma yet, so we source
 * from `metadata` or default to permissive-but-visible state. Once a
 * migration lands, the API can start returning `consent` directly and
 * these helpers keep the UI stable.
 */

export interface ConsentState {
  dnd: boolean;
  smsOptIn: boolean;
  whatsappOptIn: boolean;
  emailOptIn: boolean;
  updatedAt?: string | null;
}

export const DEFAULT_CONSENT: ConsentState = {
  dnd: false,
  smsOptIn: true,
  whatsappOptIn: true,
  emailOptIn: true,
};

export function readConsent(contact: any): ConsentState {
  const raw = contact?.consent || contact?.metadata?.consent || {};
  return {
    dnd: Boolean(raw.dnd),
    smsOptIn: raw.smsOptIn !== false,
    whatsappOptIn: raw.whatsappOptIn !== false,
    emailOptIn: raw.emailOptIn !== false,
    updatedAt: raw.updatedAt || null,
  };
}

/** Blocks outbound channel actions when consent is missing/withdrawn. */
export function canSend(
  consent: ConsentState,
  channel: "sms" | "whatsapp" | "email",
): { allowed: boolean; reason?: string } {
  if (consent.dnd) return { allowed: false, reason: "Contact is on DND registry" };
  if (channel === "sms" && !consent.smsOptIn)
    return { allowed: false, reason: "SMS opt-out on file" };
  if (channel === "whatsapp" && !consent.whatsappOptIn)
    return { allowed: false, reason: "WhatsApp opt-out on file" };
  if (channel === "email" && !consent.emailOptIn)
    return { allowed: false, reason: "Email opt-out on file" };
  return { allowed: true };
}
