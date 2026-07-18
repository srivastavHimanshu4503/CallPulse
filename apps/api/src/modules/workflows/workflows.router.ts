import { Router } from "express";
import { WorkflowsController } from "./workflows.controller.js";
import { WorkflowFoldersController } from "./workflow-folders.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";
import { requireFeatureWhen } from "../../middleware/feature.middleware.js";

const router: Router = Router();
const controller = new WorkflowsController();
const foldersController = new WorkflowFoldersController();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Folders — mounted first so /folders never collides with /:id
router.get("/folders", foldersController.list);
router.post("/folders", foldersController.create);
router.put("/folders/:id/rename", foldersController.rename);
router.put("/folders/:id/move", foldersController.move);
router.delete("/folders/:id", foldersController.remove);

// Workflows — bulk endpoints registered BEFORE the /:id ones so their
// paths never get captured by the dynamic route matcher.
router.post("/bulk-delete", controller.bulkDelete);
router.post("/bulk-move", controller.bulkMove);
router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.get);
router.put("/:id", controller.update);
// Creating/editing workflows is free; turning one ON needs a paid plan.
// Pausing is always allowed.
router.post(
  "/:id/toggle",
  requireFeatureWhen("WORKFLOW_ACTIVATION", (req) => req.body?.isActive === true),
  controller.toggleActive,
);
router.put("/:id/move", controller.move);
router.delete("/:id", controller.remove);

export const workflowsRouter = router;
export default workflowsRouter;
