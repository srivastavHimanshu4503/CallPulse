import { db } from "../../config/database.js";
import {
  buildEntitlements,
  PLAN_CREDITS,
  type Entitlements,
} from "@antigravity/types";

type CreditReason =
  | "SIGNUP_GRANT"
  | "PLAN_GRANT"
  | "TOPUP_PURCHASE"
  | "CALL_DEDUCTION"
  | "ADJUSTMENT";

export class BillingService {
  async getEntitlements(tenantId: string): Promise<Entitlements & { periodEnd: string | null }> {
    await this.expireIfDue(tenantId);
    const [tenant, sub] = await Promise.all([
      db.tenant.findFirst({
        where: { id: tenantId },
        select: { plan: true, creditBalance: true },
      }),
      db.billingSubscription.findFirst({ where: { tenantId } }),
    ]);
    if (!tenant) throw new Error("Tenant not found");
    return {
      ...buildEntitlements(tenant.plan, tenant.creditBalance),
      periodEnd:
        sub?.status === "ACTIVE" && sub.currentPeriodEnd
          ? sub.currentPeriodEnd.toISOString()
          : null,
    };
  }

  /**
   * The ONLY way credits move. Writes the ledger row and updates the cached
   * balance atomically. Negative deltas never take the balance below zero —
   * callers get the actual amount applied back.
   */
  async grantCredits(
    tenantId: string,
    delta: number,
    reason: CreditReason,
    opts: { refId?: string; note?: string } = {},
  ): Promise<{ applied: number; balance: number }> {
    return db.$transaction(async (tx: any) => {
      const tenant = await tx.tenant.findFirst({
        where: { id: tenantId },
        select: { creditBalance: true },
      });
      if (!tenant) throw new Error("Tenant not found");

      const applied = delta < 0 ? -Math.min(-delta, tenant.creditBalance) : delta;
      if (applied === 0) return { applied: 0, balance: tenant.creditBalance };

      const updated = await tx.tenant.update({
        where: { id: tenantId },
        data: { creditBalance: { increment: applied } },
        select: { creditBalance: true },
      });
      await tx.creditLedger.create({
        data: { tenantId, delta: applied, reason, refId: opts.refId, note: opts.note },
      });
      return { applied, balance: updated.creditBalance };
    });
  }

  /** One-time 30-credit grant at signup. Safe to re-call — grants only once. */
  async grantSignupCredits(tenantId: string): Promise<void> {
    const existing = await db.creditLedger.findFirst({
      where: { tenantId, reason: "SIGNUP_GRANT" },
      select: { id: true },
    });
    if (existing) return;
    await this.grantCredits(tenantId, PLAN_CREDITS.FREE, "SIGNUP_GRANT", {
      note: "Welcome credits",
    });
  }

  async getLedger(tenantId: string, limit = 50) {
    return db.creditLedger.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  /**
   * Flip the tenant to PRO for 30 days after a verified payment. Idempotent
   * per paymentId — a duplicate verify + webhook grants credits only once.
   * Buying again while still active EXTENDS the period from its current end.
   */
  async activatePro(tenantId: string, paymentId: string, periodDays: number): Promise<void> {
    const alreadyGranted = await db.creditLedger.findFirst({
      where: { tenantId, reason: "PLAN_GRANT", refId: paymentId },
      select: { id: true },
    });
    if (alreadyGranted) return;

    await db.$transaction(async (tx: any) => {
      const existing = await tx.billingSubscription.findFirst({ where: { tenantId } });
      const base =
        existing?.currentPeriodEnd && existing.currentPeriodEnd > new Date()
          ? existing.currentPeriodEnd
          : new Date();
      const currentPeriodEnd = new Date(base.getTime() + periodDays * 86_400_000);

      await tx.tenant.update({ where: { id: tenantId }, data: { plan: "PRO" } });
      await tx.billingSubscription.upsert({
        where: { tenantId },
        create: {
          tenantId,
          provider: "razorpay",
          providerSubId: paymentId,
          plan: "PRO",
          status: "ACTIVE",
          currentPeriodEnd,
        },
        update: { providerSubId: paymentId, plan: "PRO", status: "ACTIVE", currentPeriodEnd },
      });
    });

    await this.grantCredits(tenantId, PLAN_CREDITS.PRO, "PLAN_GRANT", {
      refId: paymentId,
      note: "Pro plan — 30 days",
    });
  }

  /**
   * Lazy expiry: if the paid period has passed, drop back to FREE. Called on
   * every entitlements read, so the app self-corrects without a cron.
   */
  async expireIfDue(tenantId: string): Promise<void> {
    const sub = await db.billingSubscription.findFirst({ where: { tenantId } });
    if (!sub || sub.status !== "ACTIVE") return;
    if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) {
      await db.$transaction(async (tx: any) => {
        await tx.tenant.update({ where: { id: tenantId }, data: { plan: "FREE" } });
        await tx.billingSubscription.update({
          where: { id: sub.id },
          data: { status: "CANCELED" },
        });
      });
    }
  }

  /** Credit-pack top-up — idempotent per paymentId. */
  async grantTopup(tenantId: string, paymentId: string, credits: number): Promise<void> {
    const already = await db.creditLedger.findFirst({
      where: { tenantId, reason: "TOPUP_PURCHASE", refId: paymentId },
      select: { id: true },
    });
    if (already) return;
    await this.grantCredits(tenantId, credits, "TOPUP_PURCHASE", {
      refId: paymentId,
      note: `Credit top-up (+${credits})`,
    });
  }

  /**
   * Shared fulfilment for verify + webhook: reads what was bought from the
   * ORDER's notes (server-to-server, never from the browser) and routes to
   * the right grant. Idempotent end to end.
   */
  async fulfillOrder(orderId: string, paymentId: string, periodDays: number): Promise<string | null> {
    const { fetchOrder } = await import("./razorpay.js");
    const order = await fetchOrder(orderId);
    const tenantId: string | undefined = order?.notes?.tenantId;
    const product: string | undefined = order?.notes?.product;
    if (!tenantId || !product) return null;

    if (product === "pro-30d") {
      await this.activatePro(tenantId, paymentId, periodDays);
    } else if (product === "credits") {
      const credits = Number(order?.notes?.credits || 0);
      if (credits > 0) await this.grantTopup(tenantId, paymentId, credits);
    } else if (product === "phone-number") {
      const country = (String(order?.notes?.country || "US").toUpperCase() === "IN" ? "IN" : "US") as "US" | "IN";
      await this.provisionPhoneNumber(
        tenantId,
        String(order?.notes?.agentId || ""),
        String(order?.notes?.phoneNumber || ""),
        paymentId,
        country,
      );
    }

    // Payment audit record — the row behind "Payments & invoices" in the UI.
    // Upsert on paymentId so verify + webhook never create duplicates.
    try {
      await db.paymentRecord.upsert({
        where: { paymentId },
        create: {
          tenantId,
          paymentId,
          orderId,
          product,
          amountPaise: Number(order?.amount_paid || order?.amount || 0),
          currency: String(order?.currency || "INR"),
          description:
            product === "pro-30d"
              ? "Pro plan — 30 days"
              : product === "phone-number"
                ? `Dedicated number ${order?.notes?.phoneNumber || ""}`
                : `Credit top-up (+${order?.notes?.credits || 0})`,
        },
        update: {},
      });
    } catch {
      // Audit write must never fail fulfilment; reconcilable from Razorpay.
    }
    return tenantId;
  }

  /**
   * Post-payment number provisioning: buy from the right telephony provider
   * (Twilio for US, Plivo for India), store the number, and permanently bind
   * it to the agent. Idempotent — the number row acts as the marker. A
   * provider failure after payment is logged loudly and left for support
   * (the payment record stays as evidence).
   */
  async provisionPhoneNumber(
    tenantId: string,
    agentId: string,
    phoneNumber: string,
    paymentId: string,
    country: "US" | "IN" = "US",
  ): Promise<void> {
    if (!agentId || !phoneNumber) return;

    const existing = await db.phoneNumber.findFirst({ where: { phoneNumber } });
    if (existing) return; // already provisioned (verify + webhook both fire)

    const agent = await db.aIAgent.findFirst({
      where: { id: agentId, tenantId, deletedAt: null },
      select: { id: true, phoneNumberId: true },
    });
    if (!agent) throw new Error("Agent not found for number provisioning");
    if (agent.phoneNumberId) return; // number binding is one-time — never overwrite

    // Pick the provider based on the country the user chose. Same three-verb
    // interface (buy, attach, route) — swap the module, keep the flow.
    const providerName: "TWILIO" | "PLIVO" = country === "IN" ? "PLIVO" : "TWILIO";
    const providerModule =
      country === "IN"
        ? await import("../telephony/plivo.js")
        : await import("../telephony/twilio.js");
    const { ensureNumberRouted } = await import("../telephony/livekit-sip.js");

    // Step 1 — buy the number. A failure here is fatal (they paid!).
    let providerRef: string | null = null;
    try {
      providerRef = await providerModule.purchaseNumber(phoneNumber);
    } catch (err) {
      console.error(
        `[billing] PAID BUT ${providerName} PURCHASE FAILED — tenant ${tenantId}, payment ${paymentId}, number ${phoneNumber}:`,
        (err as Error).message,
      );
      throw new Error(
        "Payment received but the number could not be provisioned — our team will fix this shortly",
      );
    }

    // Steps 2+3 — wire the call path end to end, zero manual console work:
    // provider number → provider SIP trunk → LiveKit inbound trunk → agent
    // dispatch. Failures here are logged loudly but never lose the purchase;
    // the number row records how far provisioning got for support/retry.
    let provisionNote = "Dedicated line";
    try {
      // Twilio takes the sid; Plivo takes the number itself. Both accept a
      // string, so the interface stays uniform.
      await providerModule.attachNumberToSipTrunk(providerRef);
      try {
        await ensureNumberRouted(phoneNumber);
      } catch (err) {
        provisionNote = "Dedicated line (LiveKit routing pending)";
        console.error(
          `[billing] number bought + trunk attached, LIVEKIT ROUTING FAILED — ${phoneNumber}:`,
          (err as Error).message,
        );
      }
    } catch (err) {
      provisionNote = "Dedicated line (trunk attach pending)";
      console.error(
        `[billing] number bought, ${providerName} TRUNK ATTACH FAILED — ${phoneNumber}:`,
        (err as Error).message,
      );
    }

    await db.$transaction(async (tx: any) => {
      const row = await tx.phoneNumber.create({
        data: {
          tenantId,
          phoneNumber,
          label: provisionNote,
          provider: providerName,
          country,
          providerRef,
          // Keep populating twilioSid on Twilio purchases for any legacy
          // code that still reads the old column. Plivo leaves it null.
          twilioSid: providerName === "TWILIO" ? providerRef : null,
          kind: "AGENT_LINE",
        },
      });
      await tx.aIAgent.update({ where: { id: agentId }, data: { phoneNumberId: row.id } });
    });
  }

  /** Payment history for the billing page — the invoice audit trail. */
  async getPayments(tenantId: string, limit = 50) {
    return db.paymentRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getSubscription(tenantId: string) {
    return db.billingSubscription.findFirst({ where: { tenantId } });
  }
}

export const billingService = new BillingService();
