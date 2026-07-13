import { PrismaClient } from "../generated/prisma-client/index.js";

declare global {
  // eslint-disable-next-line no-var
  var __antigravity_prisma__: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient shared across all services in the monorepo.
 *
 * The `globalThis` cache prevents Prisma from opening a new connection pool
 * on every hot-reload during dev (tsx watch, next dev, etc.). Production
 * builds create exactly one instance per process.
 */
export const db: PrismaClient =
  globalThis.__antigravity_prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__antigravity_prisma__ = db;
}

export { PrismaClient } from "../generated/prisma-client/index.js";
export type * from "../generated/prisma-client/index.js";
