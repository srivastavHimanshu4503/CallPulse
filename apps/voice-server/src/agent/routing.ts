/**
 * Dynamic SIP Inbound DID & Caller Identity Resolution.
 * Enables multi-tenant, multi-DID call routing across various SIP providers
 * (LiveKit SIP trunking, Plivo Zentrunk, Twilio Elastic SIP Trunking).
 */

/**
 * Extract an E.164 phone number from a raw SIP URI or string (e.g. "sip:+919876543210@sip.livekit.cloud")
 */
export const sanitizePhoneNumber = (raw: string | undefined): string | undefined => {
  if (!raw) return undefined;
  const match = raw.match(/\+?\d{8,15}/);
  if (!match) return undefined;
  return match[0].startsWith("+") ? match[0] : `+${match[0]}`;
};

/**
 * Dynamically resolve the inbound dialed DID from LiveKit SIP participant attributes.
 * Inspects trunk phone number, SIP 'To' header, provider-specific headers (Plivo/Twilio),
 * and finally falls back to default dialedNumber if configured.
 */
export const resolveDialedNumber = (
  attrs: Record<string, string> = {},
  fallback?: string,
): string | undefined => {
  const candidates = [
    attrs["sip.trunkPhoneNumber"],
    attrs["sip.header.to"],
    attrs["sip.to"],
    attrs["X-Plivo-To"],
    attrs["x-plivo-to"],
    attrs["To"],
    attrs["to"],
    attrs["sip.ruleAttributes"],
  ];

  for (const candidate of candidates) {
    const sanitized = sanitizePhoneNumber(candidate);
    if (sanitized) return sanitized;
  }

  return sanitizePhoneNumber(fallback);
};

/**
 * Resolve caller phone number from participant attributes, room name, or caller hints.
 */
export const resolveCallerNumber = (
  attrs: Record<string, string> = {},
  extractedFromRoom?: string,
  hintCaller?: string,
): string => {
  const candidates = [
    attrs["sip.phoneNumber"],
    attrs["sip.header.from"],
    attrs["sip.from"],
    attrs["X-Plivo-From"],
    attrs["x-plivo-from"],
    attrs["From"],
    attrs["from"],
    extractedFromRoom,
    hintCaller,
  ];

  for (const candidate of candidates) {
    const sanitized = sanitizePhoneNumber(candidate);
    if (sanitized) return sanitized;
  }

  return "unknown";
};
