/**
 * Plans, credits, and feature entitlements — the single source of truth
 * shared by the API (enforcement) and the web app (UX). Changing a plan's
 * price/credits/features is a one-line edit here.
 */

export const PLAN_KEYS = ["FREE", "GROWTH", "PRO"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

/** FREE is a one-time signup grant; paid plans refill monthly. */
export const PLAN_CREDITS: Record<PlanKey, number> = {
  FREE: 30,
  GROWTH: 200, // placeholder — tier not sold yet
  PRO: 500, // placeholder until pricing is final
};

/** How many AI agents each plan may create. */
export const PLAN_AGENT_LIMITS: Record<PlanKey, number> = {
  FREE: 1,
  GROWTH: 3,
  PRO: 10,
};

/** One-time price for a dedicated US phone number. */
export const PHONE_NUMBER_PRICE_INR = 299;

/** Display price in ₹/month. 0 = free, null = not sold yet. */
export const PLAN_PRICE_INR: Record<PlanKey, number | null> = {
  FREE: 0,
  GROWTH: null,
  PRO: 2999, // placeholder until pricing is final
};

/**
 * What things cost, in credits. Charged per started minute — a 20-second
 * call bills as 1 minute (5 credits).
 */
export const CREDIT_COSTS = {
  VOICE_PER_MINUTE: 5,
  SMS: 10,
  WHATSAPP: 5,
} as const;

/** Credits for a call of `durationSeconds` — per started minute, min 1 minute. */
export const creditsForCall = (durationSeconds: number): number =>
  Math.max(1, Math.ceil(durationSeconds / 60)) * CREDIT_COSTS.VOICE_PER_MINUTE;

/** One-time credit top-ups — for tenants who burn through their plan
 *  credits mid-cycle and just need more, without a new plan purchase. */
export const CREDIT_PACKS = [
  { id: "pack_100", credits: 100, priceInr: 799 },
  { id: "pack_250", credits: 250, priceInr: 1799 },
  { id: "pack_500", credits: 500, priceInr: 2999 },
] as const;

export type CreditPackId = (typeof CREDIT_PACKS)[number]["id"];

export const getCreditPack = (id: string) => CREDIT_PACKS.find((p) => p.id === id) ?? null;

export const FEATURES = {
  /** Contact detail page with the full activity timeline. */
  CONTACT_DETAILS: "CONTACT_DETAILS",
  /** Embeddable website chat/call widget. */
  WEBSITE_WIDGET: "WEBSITE_WIDGET",
  /** The dedicated Analytics page (dashboard stats stay free). */
  ANALYTICS_PAGE: "ANALYTICS_PAGE",
  /** Turning a workflow ON (creating/editing stays free). */
  WORKFLOW_ACTIVATION: "WORKFLOW_ACTIVATION",
  /** Buying a dedicated phone number for an agent. */
  PHONE_NUMBER_PURCHASE: "PHONE_NUMBER_PURCHASE",
} as const;

export type FeatureKey = keyof typeof FEATURES;

/** Which plans unlock each feature. GROWTH counts as a paid tier. */
export const FEATURE_ACCESS: Record<FeatureKey, PlanKey[]> = {
  CONTACT_DETAILS: ["GROWTH", "PRO"],
  WEBSITE_WIDGET: ["PRO"],
  ANALYTICS_PAGE: ["PRO"],
  WORKFLOW_ACTIVATION: ["GROWTH", "PRO"],
  PHONE_NUMBER_PURCHASE: ["PRO"],
};

export const hasFeature = (plan: string, feature: FeatureKey): boolean =>
  FEATURE_ACCESS[feature].includes(plan as PlanKey);

/** Payload of GET /billing/entitlements — what the frontend gates on. */
export interface Entitlements {
  plan: PlanKey;
  creditBalance: number;
  features: Record<FeatureKey, boolean>;
}

export const buildEntitlements = (plan: string, creditBalance: number): Entitlements => ({
  plan: (PLAN_KEYS.includes(plan as PlanKey) ? plan : "FREE") as PlanKey,
  creditBalance,
  features: Object.fromEntries(
    (Object.keys(FEATURE_ACCESS) as FeatureKey[]).map((f) => [f, hasFeature(plan, f)]),
  ) as Record<FeatureKey, boolean>,
});
