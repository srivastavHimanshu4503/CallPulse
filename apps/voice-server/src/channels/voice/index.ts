import { Router } from "express";
import { TwilioTelephonyProvider } from "../../telephony/twilio/provider.js";

const router: Router = Router();
const twilioProvider = new TwilioTelephonyProvider();

router.post("/inbound", async (req, res, next) => {
  try {
    await twilioProvider.handleInboundWebhook(req, res);
  } catch (error) {
    next(error);
  }
});

export default router;
