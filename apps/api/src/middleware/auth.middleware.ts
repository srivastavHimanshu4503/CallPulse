import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { sendError } from "../utils/response.js";
import type { UserSession } from "@antigravity/types";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    sendError(res, "Authentication token is missing or invalid", 401);
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    sendError(res, "Authentication token is missing", 401);
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserSession;

    req.userId = decoded.userId;
    req.tenantId = decoded.tenantId;

    next();
  } catch (error) {
    sendError(res, "Authentication token is expired or invalid", 401);
  }
}
