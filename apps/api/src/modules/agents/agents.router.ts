import { Router } from "express";
import { AgentsController } from "./agents.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";

const router: Router = Router();
const controller = new AgentsController();

// All agent routes are protected by JWT Auth and Tenant Isolation
router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", controller.getAgents);
router.post("/", controller.createAgent);
router.get("/telephony/numbers", controller.getTelephonyNumbers);
router.post("/telephony/purchase", controller.purchaseTelephonyNumber);
router.get("/workflows/list", controller.getWorkflowsList);
router.post("/workflows", controller.createWorkflow);
router.get("/:id", controller.getAgentById);
router.put("/:id", controller.updateAgent);
router.delete("/:id", controller.deleteAgent);
router.get("/:id/logs", controller.getAgentLogs);
router.post("/:id/test-call/token", controller.createTestCallToken);

export const agentsRouter = router;
export default agentsRouter;
