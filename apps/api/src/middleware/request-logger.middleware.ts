import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger.js";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === "/api/v1/health") return next();

  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const msg = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;
    if (res.statusCode >= 500) {
      logger.error(msg);
    } else if (res.statusCode >= 400) {
      logger.warn(msg);
    } else {
      logger.info(msg);
    }
  });
  next();
}
