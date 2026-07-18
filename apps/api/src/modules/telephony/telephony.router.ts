import { Router } from "express";
import type { Request, Response } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";
import { requireFeature } from "../../middleware/feature.middleware.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { isTwilioConfigured, listAvailableNumbers } from "./twilio.js";

const router: Router = Router();
router.use(authMiddleware);
router.use(tenantMiddleware);

// Browse purchasable US numbers. Pro-only — same gate as the purchase.
router.get(
  "/available-numbers",
  requireFeature("PHONE_NUMBER_PURCHASE"),
  async (req: Request, res: Response) => {
    try {
      if (!isTwilioConfigured()) {
        sendError(res, "Telephony is not configured yet", 503);
        return;
      }
      const areaCode = req.query.areaCode ? String(req.query.areaCode) : undefined;
      const data = await listAvailableNumbers(areaCode);
      sendSuccess(res, data, 200);
    } catch (err: any) {
      sendError(res, err.message || "Failed to load available numbers", 500);
    }
  },
);

export const telephonyRouter = router;
export default telephonyRouter;
