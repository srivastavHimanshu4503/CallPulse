import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";
import {
  authRateLimiter,
  passwordResetRateLimiter,
} from "../../middleware/rate-limit.middleware.js";

const router: Router = Router();
const controller = new AuthController();

// Public Routes (guarded with rate limiters to prevent brute-force attacks)
router.post("/register", authRateLimiter, (req, res) => controller.register(req, res));
router.post("/login", authRateLimiter, (req, res) => controller.login(req, res));
router.post("/refresh", authRateLimiter, (req, res) => controller.refresh(req, res));
router.post("/logout", (req, res) => controller.logout(req, res));
router.post("/forgot-password", passwordResetRateLimiter, (req, res) =>
  controller.forgotPassword(req, res),
);
router.post("/reset-password", passwordResetRateLimiter, (req, res) =>
  controller.resetPassword(req, res),
);
router.get("/voice-sample", (req, res) => controller.voiceSample(req, res));

// Protected Routes (requires token validation and tenant checking)
router.get("/me", authMiddleware, tenantMiddleware, (req, res) => controller.me(req, res));

export default router;
export { router as authRouter };
