import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";

const router: Router = Router();
const controller = new AuthController();

// Public Routes
router.post("/register", (req, res) => controller.register(req, res));
router.post("/login", (req, res) => controller.login(req, res));
router.post("/refresh", (req, res) => controller.refresh(req, res));
router.post("/logout", (req, res) => controller.logout(req, res));
router.post("/forgot-password", (req, res) => controller.forgotPassword(req, res));
router.post("/reset-password", (req, res) => controller.resetPassword(req, res));

// Protected Routes (requires token validation and tenant checking)
router.get("/me", authMiddleware, tenantMiddleware, (req, res) => controller.me(req, res));

export default router;
export { router as authRouter };
