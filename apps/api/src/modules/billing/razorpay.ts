import Razorpay from "razorpay";
import crypto from "crypto";
import { env } from "../../config/env.js";
import { PLAN_PRICE_INR, PLAN_CREDITS, getCreditPack, PHONE_NUMBER_PRICE_INR } from "@antigravity/types";

/**
 * Thin Razorpay adapter. Everything provider-specific lives here so a future
 * switch (Cashfree, PayU, Stripe) replaces one file, not the billing system.
 *
 * NOTE: we use one-time ORDERS ("30 days of Pro"), not auto-renewing
 * subscriptions — the Subscriptions API needs Razorpay account activation,
 * and one-time renewal is friendlier for Indian SMBs anyway (no e-mandate).
 */

export const PRO_PERIOD_DAYS = 30;

export const isRazorpayConfigured = (): boolean =>
  Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

let client: Razorpay | null = null;
const getClient = (): Razorpay => {
  if (!isRazorpayConfigured()) throw new Error("Payments are not configured yet");
  if (!client) {
    client = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID!,
      key_secret: env.RAZORPAY_KEY_SECRET!,
    });
  }
  return client;
};

export interface CheckoutSession {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
}

/** One order = one 30-day Pro period. tenantId travels in the order notes. */
export const createProOrder = async (tenantId: string): Promise<CheckoutSession> => {
  const rzp = getClient();
  const amountPaise = (PLAN_PRICE_INR.PRO ?? 0) * 100;
  const order: any = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `pro-${Date.now().toString(36)}`,
    notes: {
      tenantId,
      product: "pro-30d",
      credits: String(PLAN_CREDITS.PRO),
    },
  });
  return {
    keyId: env.RAZORPAY_KEY_ID!,
    orderId: order.id,
    amount: amountPaise,
    currency: "INR",
  };
};

/** One order = one credit pack. tenantId + credits travel in the notes. */
export const createCreditsOrder = async (
  tenantId: string,
  packId: string,
): Promise<CheckoutSession> => {
  const pack = getCreditPack(packId);
  if (!pack) throw new Error("Unknown credit pack");
  const rzp = getClient();
  const amountPaise = pack.priceInr * 100;
  const order: any = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `credits-${Date.now().toString(36)}`,
    notes: {
      tenantId,
      product: "credits",
      credits: String(pack.credits),
    },
  });
  return {
    keyId: env.RAZORPAY_KEY_ID!,
    orderId: order.id,
    amount: amountPaise,
    currency: "INR",
  };
};

/** One order = one dedicated phone number, permanently bound to one agent. */
export const createNumberOrder = async (
  tenantId: string,
  agentId: string,
  phoneNumber: string,
): Promise<CheckoutSession> => {
  const rzp = getClient();
  const amountPaise = PHONE_NUMBER_PRICE_INR * 100;
  const order: any = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `number-${Date.now().toString(36)}`,
    notes: {
      tenantId,
      product: "phone-number",
      agentId,
      phoneNumber,
    },
  });
  return {
    keyId: env.RAZORPAY_KEY_ID!,
    orderId: order.id,
    amount: amountPaise,
    currency: "INR",
  };
};

/** Fetch an order back from Razorpay — verify/webhook read its notes to
 *  know what was purchased instead of trusting anything from the browser. */
export const fetchOrder = async (orderId: string): Promise<any> =>
  getClient().orders.fetch(orderId);

/** Signature check for the checkout success callback (order_id|payment_id). */
export const verifyCheckoutSignature = (input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean => {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.signature));
  } catch {
    return false;
  }
};

/** Signature check for webhooks (raw body, webhook secret). */
export const verifyWebhookSignature = (rawBody: Buffer, signature: string): boolean => {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
};
