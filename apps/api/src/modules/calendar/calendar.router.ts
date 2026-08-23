import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";
import { calendarService } from "./calendar.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { db } from "../../config/database.js";

const router: Router = Router();

/**
 * Middleware: requires user to have OWNER or ADMIN role in the tenant
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.userId;
  const tenantId = req.tenantId;

  if (!userId || !tenantId) {
    sendError(res, "Authentication required", 401);
    return;
  }

  try {
    const user = await db.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { role: true },
    });

    if (!user || (user.role !== "OWNER" && user.role !== "ADMIN")) {
      sendError(res, "Forbidden: admin or owner access required", 403);
      return;
    }

    next();
  } catch (err: any) {
    sendError(res, err.message || "Authorization check failed", 500);
  }
}

/**
 * POST /api/v1/calendar/connect
 * Initiates Google OAuth consent flow for tenant admin.
 * Uses trusted context from auth/tenant middleware (never request body).
 */
router.post(
  "/connect",
  authMiddleware,
  tenantMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.userId!;

      const result = await calendarService.createConnectAuthorizationUrl({
        tenantId,
        userId,
      });

      sendSuccess(res, { url: result.url }, 200);
    } catch (err: any) {
      sendError(res, err.message || "Failed to initiate calendar connection", 500);
    }
  },
);

/**
 * GET /api/v1/calendar/callback
 * Public OAuth callback from Google. Validates and consumes single-use state.
 */
router.get("/callback", async (req: Request, res: Response): Promise<void> => {
  const error = req.query.error;
  if (error) {
    const errorMsg = `Google authorization error: ${error}`;
    if (req.headers.accept?.includes("text/html")) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Calendar Connection Failed</title></head>
          <body style="font-family: system-ui, sans-serif; text-align: center; padding: 40px; color: #b91c1c;">
            <h2>Google Calendar Connection Cancelled or Failed</h2>
            <p>${errorMsg}</p>
            <p>You can close this window and return to Settings.</p>
          </body>
        </html>
      `);
      return;
    }
    sendError(res, errorMsg, 400);
    return;
  }

  const code = req.query.code;
  const state = req.query.state;

  if (!code || typeof code !== "string" || !state || typeof state !== "string") {
    sendError(res, "Missing code or state parameter", 400);
    return;
  }

  try {
    const result = await calendarService.handleOAuthCallback({ code, state });

    if (req.headers.accept?.includes("text/html")) {
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Calendar Connected</title></head>
          <body style="font-family: system-ui, sans-serif; text-align: center; padding: 40px;">
            <h2>Google Calendar Connected Successfully</h2>
            <p>You can close this window and return to DeskBuddy Settings.</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'CALENDAR_CONNECTED', provider: '${result.provider}' }, '*');
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    sendSuccess(
      res,
      {
        connected: true,
        provider: result.provider,
        connectedAt: result.connectedAt,
      },
      200,
    );
  } catch (err: any) {
    const errorMsg = err.message || "Failed to complete calendar connection";
    if (req.headers.accept?.includes("text/html")) {
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Calendar Connection Failed</title></head>
          <body style="font-family: system-ui, sans-serif; text-align: center; padding: 40px; color: #b91c1c;">
            <h2>Google Calendar Connection Failed</h2>
            <p>${errorMsg}</p>
            <p>You can close this window and try again from Settings.</p>
          </body>
        </html>
      `);
      return;
    }
    sendError(res, errorMsg, 400);
  }
});

/**
 * GET /api/v1/calendar/status
 * Queries connection status for the authenticated tenant.
 */
router.get(
  "/status",
  authMiddleware,
  tenantMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId!;
      const status = await calendarService.getStatus(tenantId);
      sendSuccess(res, status, 200);
    } catch (err: any) {
      sendError(res, err.message || "Failed to get calendar status", 500);
    }
  },
);

/**
 * DELETE /api/v1/calendar/disconnect
 * Disconnects calendar for tenant. Preserves all booking history.
 */
router.delete(
  "/disconnect",
  authMiddleware,
  tenantMiddleware,
  requireAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId!;
      const result = await calendarService.disconnect(tenantId);
      sendSuccess(res, { disconnected: result.success }, 200);
    } catch (err: any) {
      sendError(res, err.message || "Failed to disconnect calendar", 500);
    }
  },
);

export { router as calendarRouter };
