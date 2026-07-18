import { Router } from "express";
import twilio from "twilio";
import { env } from "../../config/env.js";
import { WhatsAppController } from "./whatsapp.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";

const router: Router = Router();
const controller = new WhatsAppController();

// Twilio signs every webhook with X-Twilio-Signature. Without validation,
// anyone who finds this URL can spoof inbound messages and make our account
// send outbound WhatsApp (cost abuse). Validation needs the exact public URL,
// so it's enforced in production and skipped for local curl/ngrok testing.
router.post(
  "/",
  // The SDK only reads the auth token from a STRING argument (an object's
  // authToken field gets overwritten internally) — hence the two-arg form.
  twilio.webhook(env.TWILIO_AUTH_TOKEN ?? "", {
    validate: env.NODE_ENV === "production",
  }),
  controller.handleIncoming,
);

// Message delivery status callbacks (sent → delivered/undelivered/failed).
router.post(
  "/status",
  twilio.webhook(env.TWILIO_AUTH_TOKEN ?? "", {
    validate: env.NODE_ENV === "production",
  }),
  controller.handleStatusCallback,
);

export const whatsappRouter = router;

// Dashboard-facing endpoints (session state + human takeover) — JWT + tenant
// isolation, unlike the Twilio webhook above which authenticates by signature.
const conversationsRouter: Router = Router();
conversationsRouter.use(authMiddleware);
conversationsRouter.use(tenantMiddleware);
conversationsRouter.get("/sender-status/:agentId", controller.getSenderStatus);
conversationsRouter.post("/send", controller.sendOutbound);
conversationsRouter.get("/templates", controller.listTemplates);
conversationsRouter.post("/templates", controller.createTemplate);
conversationsRouter.delete("/templates/:sid", controller.deleteTemplate);
conversationsRouter.post("/send-template", controller.sendTemplate);
conversationsRouter.get("/sessions/by-log/:logId", controller.getSessionByLog);
conversationsRouter.post("/sessions/:sessionId/reply", controller.sendManualReply);
conversationsRouter.post("/sessions/:sessionId/takeover", controller.setTakeover);
conversationsRouter.post("/sessions/:sessionId/close", controller.closeSession);

export const whatsappConversationsRouter = conversationsRouter;
export default whatsappRouter;
