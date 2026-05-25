import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { getCleanErrorMessage } from "@antigravity/utils";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
} from "@antigravity/validators";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await authService.register(parsed.data);
      sendSuccess(res, result, 201);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await authService.login(parsed.data);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 401);
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const parsed = refreshSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await authService.refresh(parsed.data.refreshToken);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 401);
    }
  }

  async logout(_req: Request, res: Response): Promise<void> {
    try {
      // For Phase 1 stateless JWT logout, we send a successful success response
      // (The client will clear tokens from local store)
      sendSuccess(res, { message: "Logged out successfully" }, 200);
    } catch (error: any) {
      sendError(res, "Logout failed", 500);
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await authService.forgotPassword(parsed.data.email);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      await authService.resetPassword(parsed.data);
      sendSuccess(res, { message: "Password updated successfully" }, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      const tenantId = req.tenantId;

      if (!userId || !tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const result = await authService.me(userId, tenantId);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 401);
    }
  }
}
