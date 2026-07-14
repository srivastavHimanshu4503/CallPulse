/**
 * Client-side lead score fallback. When the API doesn't return a `score`
 * on a contact, we compute a heuristic 0–100 score from whatever signals
 * are already on the contact object (deals, recent activity dates). Keeps
 * every list/detail surface consistent even before the API implements it.
 */

interface ScoreableContact {
  score?: number | null;
  deals?: Array<{ deletedAt?: string | null; value?: number | null; stage?: string | null }> | null;
  activities?: Array<{ occurredAt?: string | null; type?: string | null }> | null;
  createdAt?: string | null;
  customFields?: Array<{ fieldName?: string; textValue?: string | null; numberValue?: number | null }> | null;
}

export interface ScoreBreakdown {
  score: number;
  band: "hot" | "warm" | "cool" | "cold";
  reasons: string[];
}

const now = () => Date.now();
const daysSince = (iso?: string | null): number => {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.max(0, (now() - t) / 86_400_000);
};

export function computeLeadScore(contact: ScoreableContact): ScoreBreakdown {
  if (typeof contact.score === "number" && contact.score >= 0) {
    return withBand(contact.score, ["from API"]);
  }

  const reasons: string[] = [];
  let s = 20; // baseline

  // Deals
  const openDeals = (contact.deals || []).filter((d) => !d.deletedAt);
  if (openDeals.length > 0) {
    s += 25;
    reasons.push(`${openDeals.length} open deal${openDeals.length > 1 ? "s" : ""}`);
    const totalValue = openDeals.reduce((acc, d) => acc + (d.value || 0), 0);
    if (totalValue > 100_000) {
      s += 10;
      reasons.push("high-value deal");
    }
  }

  // Recent inbound call
  const acts = (contact.activities || []).filter((a) => a.occurredAt);
  const lastCall = acts.find((a) => a.type === "CALL_INBOUND" || a.type === "CALL_OUTBOUND");
  const lastCallDays = daysSince(lastCall?.occurredAt);
  if (lastCallDays <= 2) {
    s += 20;
    reasons.push("called within 48h");
  } else if (lastCallDays <= 7) {
    s += 12;
    reasons.push("called this week");
  } else if (lastCallDays <= 30) {
    s += 4;
    reasons.push("called this month");
  } else if (lastCallDays !== Infinity) {
    s -= 5;
    reasons.push("no recent call");
  }

  // Any recent activity of any kind
  const lastAny = acts[0];
  const lastAnyDays = daysSince(lastAny?.occurredAt);
  if (lastAnyDays <= 3) {
    s += 8;
    reasons.push("recent activity");
  } else if (lastAnyDays > 30 && lastAnyDays !== Infinity) {
    s -= 8;
    reasons.push("stale — 30d+");
  }

  // Booking
  if (acts.some((a) => a.type === "BOOKING_CREATED")) {
    s += 12;
    reasons.push("booked appointment");
  }

  // Freshness of contact record itself
  const ageDays = daysSince(contact.createdAt);
  if (ageDays <= 3) {
    s += 5;
    reasons.push("brand-new lead");
  }

  s = Math.max(0, Math.min(100, Math.round(s)));
  return withBand(s, reasons);
}

function withBand(score: number, reasons: string[]): ScoreBreakdown {
  let band: ScoreBreakdown["band"] = "cold";
  if (score >= 75) band = "hot";
  else if (score >= 55) band = "warm";
  else if (score >= 35) band = "cool";
  return { score, band, reasons };
}

export const BAND_LABEL: Record<ScoreBreakdown["band"], string> = {
  hot: "Hot",
  warm: "Warm",
  cool: "Cool",
  cold: "Cold",
};

export const BAND_TONE: Record<ScoreBreakdown["band"], "positive" | "attention" | "brand" | "muted"> = {
  hot: "positive",
  warm: "attention",
  cool: "brand",
  cold: "muted",
};
