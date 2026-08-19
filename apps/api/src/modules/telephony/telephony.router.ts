import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";
import { requireFeature } from "../../middleware/feature.middleware.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import * as twilio from "./twilio.js";
import * as plivo from "./plivo.js";

const router: Router = Router();
router.use(authMiddleware);
router.use(tenantMiddleware);

// Browse purchasable numbers.
//   /available-numbers?country=US&areaCode=415   → Twilio US local DIDs
//   /available-numbers?country=IN&pattern=80     → Plivo Indian STD-code DIDs
// Defaults to US when country is omitted (existing UI still works).
router.get(
  "/available-numbers",
  requireFeature("PHONE_NUMBER_PURCHASE"),
  async (req: Request, res: Response) => {
    try {
      const country = String(req.query.country || "US").toUpperCase() as "US" | "IN";

      if (country === "IN") {
        if (!plivo.isPlivoConfigured()) {
          sendError(res, "Indian numbers unavailable — Plivo not configured yet", 503);
          return;
        }
        const pattern = req.query.pattern ? String(req.query.pattern) : undefined;
        const data = await plivo.listAvailableNumbers(pattern);
        sendSuccess(res, data, 200);
        return;
      }

      if (!twilio.isTwilioConfigured()) {
        sendError(res, "Telephony is not configured yet", 503);
        return;
      }
      const areaCode = req.query.areaCode ? String(req.query.areaCode) : undefined;
      const data = await twilio.listAvailableNumbers(areaCode);
      sendSuccess(res, data, 200);
    } catch (err: any) {
      sendError(res, err.message || "Failed to load available numbers", 500);
    }
  },
);

// Which providers are usable right now — the UI hides/disables buy buttons
// for countries whose provider isn't configured yet.
router.get("/providers-status", async (_req: Request, res: Response) => {
  sendSuccess(res, {
    twilio: twilio.isTwilioConfigured(),
    plivo: plivo.isPlivoConfigured(),
  });
});

export const telephonyRouter = router;
export default telephonyRouter;
