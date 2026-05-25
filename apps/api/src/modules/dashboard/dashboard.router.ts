import { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";

const router: Router = Router();
const controller = new DashboardController();

// Mount auth and tenancy security checks
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/stats", controller.getStats);
router.get("/activity", controller.getActivity);

export const dashboardRouter = router;
export default dashboardRouter;
