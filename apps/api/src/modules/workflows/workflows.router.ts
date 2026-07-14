import { Router } from "express";
import { WorkflowsController } from "./workflows.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";

const router: Router = Router();
const controller = new WorkflowsController();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
router.post("/:id/toggle", controller.toggleActive);
router.delete("/:id", controller.remove);

export const workflowsRouter = router;
export default workflowsRouter;
