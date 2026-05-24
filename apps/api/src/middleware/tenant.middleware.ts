import type { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response.js";

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract tenantId from request context (already injected by authMiddleware)
  const tenantId = req.tenantId;

  if (!tenantId) {
    sendError(res, "Access forbidden: tenant context is missing", 403);
    return;
  }

  // Double check that we are not trusting tenantId from request body or query params
  // If the user tries to inject/overwrite tenantId in body or query, force it back to the JWT-verified tenantId
  if (req.body && "tenantId" in req.body) {
    req.body.tenantId = tenantId;
  }

  if (req.query && "tenantId" in req.query) {
    req.query.tenantId = tenantId;
  }

  next();
}
