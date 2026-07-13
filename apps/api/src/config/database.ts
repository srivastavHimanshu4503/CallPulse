/**
 * Compatibility shim. The Prisma client lives in `@antigravity/db` — this
 * file re-exports the singleton so existing api-server imports
 * (`import { db } from "../config/database.js"`) keep working during the
 * package migration. Prefer importing directly from `@antigravity/db`
 * in new code.
 */
export { db, PrismaClient } from "@antigravity/db";
export type * from "@antigravity/db";
