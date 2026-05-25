import type { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
} from "@antigravity/validators";

const authService = new AuthService();

// Helper to filter raw database/Prisma constraints out, presenting clean text responses
function getCleanErrorMessage(error: any): string {
  if (!error) return "An unexpected error occurred";
  
  const msg = error.message || "";
  
  // Clean up database unique constraint violations
  if (msg.includes("Unique constraint failed") || msg.includes("P2002")) {
    if (msg.includes("email")) {
      return "This email address is already in use by another workspace.";
    }
    if (msg.includes("slug") || msg.includes("Tenant")) {
      return "A business with this exact name already exists. Please try a different name.";
    }
    return "A record with these unique details already exists.";
  }
  
  // Clean up database foreign key constraint violations
  if (msg.includes("Foreign key constraint violated") || msg.includes("P2003")) {
    return "An integrity security check failed. Please ensure all related settings are valid.";
  }
  
  // If it's a Prisma error, don't expose stack details to the user
  if (msg.includes("PrismaClient") || msg.includes("invocation in") || msg.includes("Prisma Client")) {
    return "A database operation error occurred. Please contact our support team.";
  }
  
  return error.message || "An unexpected error occurred";
}

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
