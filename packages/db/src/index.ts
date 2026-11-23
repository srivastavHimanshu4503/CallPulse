export { db, PrismaClient } from "./client.js";
export { Prisma } from "../generated/prisma-client/index.js";
export type * from "../generated/prisma-client/index.js";

export * from "./queries/agents.js";
export * from "./queries/communications.js";
export * from "./queries/contacts.js";
export * from "./queries/billing.js";
export * from "./queries/outbox.js";
