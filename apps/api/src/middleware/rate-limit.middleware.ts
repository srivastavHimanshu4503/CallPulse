import rateLimit from "express-rate-limit";

/**
 * General rate limiter for authentication routes (login, register, token refresh)
 * Restricts brute-force credential stuffing attacks while preserving seamless dev experience.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication requests from this IP. Please try again after 15 minutes.",
  },
  skip: () => process.env.NODE_ENV === "test",
});

/**
 * Strict rate limiter for sensitive password-reset requests.
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many password reset requests from this IP. Please try again in an hour.",
  },
  skip: () => process.env.NODE_ENV === "test",
});
