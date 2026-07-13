import { PrismaAgentConfigProvider } from "./prisma-provider.js";
import type { AgentConfigProvider } from "./types.js";

let singleton: AgentConfigProvider | undefined;

/**
 * Return the process-wide AgentConfigProvider. Currently backed by Prisma
 * via `@antigravity/db`. Swap the impl here to introduce caching, HTTP
 * fetch, or test fixtures without touching the voice pipeline.
 */
export const getAgentConfigProvider = (): AgentConfigProvider => {
  if (!singleton) singleton = new PrismaAgentConfigProvider();
  return singleton;
};

export type { AgentConfigProvider, AgentPersonaConfig, KnowledgeBaseEntry } from "./types.js";
