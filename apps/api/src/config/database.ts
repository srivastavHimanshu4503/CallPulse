import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

declare global {
  // Prevent multiple instances of Prisma Client in development
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db = globalThis.prisma || new PrismaClient({
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
  log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

if (env.NODE_ENV !== "production") {
  globalThis.prisma = db;
}
