import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthTokens } from "@antigravity/types";

// Helper to generate access and refresh tokens
export function generateTokens(userId: string, tenantId: string, email: string, name: string, role: string): AuthTokens {
  const payload = { userId, tenantId, email, name, role };
  
  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}
