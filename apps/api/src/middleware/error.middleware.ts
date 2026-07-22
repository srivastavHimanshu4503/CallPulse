import type { Request, Response, NextFunction } from "express";
import { captureError } from "@antigravity/observability";
import { logger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";

// Express error handlers must have 4 parameters to be recognized as error middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error({
    msg: "Unhandled Exception occurred in request",
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    tenantId: req.tenantId,
    userId: req.userId,
  });

  const statusCode = "status" in err && typeof err.status === "number" ? err.status : 500;
  // Expected 4xx (validation, auth, not-found) is noise, not an incident.
  if (statusCode >= 500) {
    captureError(err, {
      url: req.originalUrl,
      method: req.method,
      tenantId: req.tenantId,
      userId: req.userId,
    });
  }

  const message = err.message || "An unexpected system error occurred";

  sendError(res, message, statusCode);
}
