import { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";
import { requireFeature } from "../../middleware/feature.middleware.js";

const router: Router = Router();
const controller = new DashboardController();

// Mount auth and tenancy security checks
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/stats", controller.getStats);
router.get("/activity", controller.getActivity);
router.get("/recent-calls", controller.getRecentCalls);
router.get("/top-agents", controller.getTopAgents);
router.get("/week-calls", controller.getWeekCalls);
router.get("/active-workflows", controller.getActiveWorkflows);
// The dedicated Analytics page is Pro-only; dashboard stats above stay free.
router.get("/analytics", requireFeature("ANALYTICS_PAGE"), controller.getAnalytics);

export const dashboardRouter = router;
export default dashboardRouter;
