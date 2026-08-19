import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";
import { billingService } from "./billing.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { invalidatePlanCache } from "../../middleware/feature.middleware.js";
import {
  isRazorpayConfigured,
  createProOrder,
  createCreditsOrder,
  createNumberOrder,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  PRO_PERIOD_DAYS,
} from "./razorpay.js";

const router: Router = Router();
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/entitlements", async (req: Request, res: Response) => {
  try {
    const data = await billingService.getEntitlements((req as any).tenantId);
    sendSuccess(res, data, 200);
  } catch (err: any) {
    sendError(res, err.message || "Failed to load entitlements", 500);
  }
});

router.get("/credits", async (req: Request, res: Response) => {
  try {
    const data = await billingService.getLedger((req as any).tenantId);
    sendSuccess(res, data, 200);
  } catch (err: any) {
    sendError(res, err.message || "Failed to load credit history", 500);
  }
});

router.get("/payments", async (req: Request, res: Response) => {
  try {
    const data = await billingService.getPayments((req as any).tenantId);
    sendSuccess(res, data, 200);
  } catch (err: any) {
    sendError(res, err.message || "Failed to load payments", 500);
  }
});

// Create a Razorpay order for Checkout.js.
//   { product: "pro" }                → 30 days of Pro
//   { product: "credits", packId }    → one-time credit top-up
router.post("/checkout", async (req: Request, res: Response) => {
  try {
    if (!isRazorpayConfigured()) {
      sendError(res, "Payments are not configured yet", 503);
      return;
    }
    const tenantId = (req as any).tenantId;
    const product = String(req.body?.product || "pro");
    let session;
    if (product === "credits") {
      session = await createCreditsOrder(tenantId, String(req.body?.packId || ""));
    } else if (product === "phone-number") {
      // Pro-only, and the number binding is one-time per agent.
      const ent = await billingService.getEntitlements(tenantId);
      if (!ent.features.PHONE_NUMBER_PURCHASE) {
        sendError(res, "Buying a phone number needs the Pro plan", 403);
        return;
      }
      const agentId = String(req.body?.agentId || "");
      const phoneNumber = String(req.body?.phoneNumber || "");
      const country = (String(req.body?.country || "US").toUpperCase() === "IN" ? "IN" : "US") as
        "US" | "IN";
      if (!agentId || !phoneNumber) {
        sendError(res, "agentId and phoneNumber are required", 400);
        return;
      }
      const agent = await (
        await import("../../config/database.js")
      ).db.aIAgent.findFirst({
        where: { id: agentId, tenantId, deletedAt: null },
        select: { phoneNumberId: true },
      });
      if (!agent) {
        sendError(res, "Agent not found", 404);
        return;
      }
      if (agent.phoneNumberId) {
        sendError(res, "This agent already has a number — numbers can't be changed", 400);
        return;
      }
      session = await createNumberOrder(tenantId, agentId, phoneNumber, country);
    } else {
      session = await createProOrder(tenantId);
    }
    sendSuccess(res, session, 200);
  } catch (err: any) {
    sendError(res, err?.error?.description || err.message || "Failed to start checkout", 500);
  }
});

// Browser returns here after a successful payment; verify Razorpay's
// signature before trusting it, then flip the plan + grant credits.
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body || {};
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      sendError(res, "Missing payment verification fields", 400);
      return;
    }
    const valid = verifyCheckoutSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    if (!valid) {
      sendError(res, "Payment signature verification failed", 400);
      return;
    }
    const tenantId = (req as any).tenantId;
    // What was bought comes from the order's server-side notes — the browser
    // only proves the payment happened (signature above).
    const fulfilledTenant = await billingService.fulfillOrder(
      razorpay_order_id,
      razorpay_payment_id,
      PRO_PERIOD_DAYS,
    );
    if (fulfilledTenant !== tenantId) {
      sendError(res, "Payment does not belong to this account", 400);
      return;
    }
    invalidatePlanCache(tenantId);
    const data = await billingService.getEntitlements(tenantId);
    sendSuccess(res, data, 200);
  } catch (err: any) {
    sendError(res, err.message || "Failed to verify payment", 500);
  }
});

export const billingRouter = router;
export default billingRouter;

/**
 * Razorpay webhook — mounted separately in app.ts with a RAW body parser
 * (signature is computed over the exact bytes). Handles renewals and
 * cancellations that happen outside the browser.
 */
export const billingWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.header("x-razorpay-signature") || "";
    const raw = req.body as Buffer;
    if (!verifyWebhookSignature(raw, signature)) {
      res.status(400).json({ ok: false });
      return;
    }

    const event = JSON.parse(raw.toString("utf8"));
    const type: string = event?.event || "";
    // Safety net for the browser-verify flow: if the tab closed mid-payment,
    // the captured-payment webhook still activates the plan (idempotent).
    if (type === "payment.captured") {
      const payment = event?.payload?.payment?.entity;
      if (payment?.order_id && payment?.id) {
        const tenantId = await billingService.fulfillOrder(
          payment.order_id,
          payment.id,
          PRO_PERIOD_DAYS,
        );
        if (tenantId) invalidatePlanCache(tenantId);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    // Always 200 unknown/broken events after logging — Razorpay retries 4xx/5xx.
    console.error("[billing webhook]", (err as Error).message);
    res.json({ ok: true });
  }
};
