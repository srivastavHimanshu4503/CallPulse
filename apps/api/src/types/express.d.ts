import { UserSession } from "@antigravity/types";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      tenantId?: string;
    }
  }
}
