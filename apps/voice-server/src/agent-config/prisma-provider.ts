import { getAgentByPhoneNumber, type AgentContext } from "@antigravity/db";
import { createLogger } from "../logger.js";
import type { AgentConfigProvider, AgentPersonaConfig } from "./types.js";

const log = createLogger("agent-config:prisma");

/**
 * Backed by `@antigravity/db`. Reads the AIAgent + Tenant + KnowledgeBase
 * rows for the phone number the caller dialed and shapes them into the
 * pipeline-friendly `AgentPersonaConfig`.
 */
export class PrismaAgentConfigProvider implements AgentConfigProvider {
  async getByPhoneNumber(phoneNumber: string): Promise<AgentPersonaConfig | null> {
    const ctx = await getAgentByPhoneNumber(phoneNumber);
    if (!ctx) {
      log.warn("no agent registered for phone number", { phoneNumber });
      return null;
    }
    log.info("agent loaded", {
      phoneNumber,
      agentId: ctx.agent.id,
      agentName: ctx.agent.name,
      tenant: ctx.tenant.name,
      knowledgeBases: ctx.knowledgeBases.length,
    });
    return shape(ctx);
  }
}

const shape = (ctx: AgentContext): AgentPersonaConfig => ({
  agentName: ctx.agent.name,
  businessName: ctx.tenant.name,
  businessInfo: ctx.agent.businessInfo ?? undefined,
  role: ctx.agent.role,
  tone: ctx.agent.tone,
  language: ctx.agent.language,
  greetingMessage: ctx.agent.greetingMessage,
  fallbackMessage: ctx.agent.fallbackMessage,
  systemPrompt: ctx.agent.systemPrompt || undefined,
  voice: ctx.agent.voice,
  maxDurationMinutes: ctx.agent.maxDuration,
  knowledge: ctx.knowledgeBases.map((kb) => ({
    name: kb.name,
    content: kb.content ?? "",
  })),
  intake: {
    enabled: ctx.agent.intakeEnabled,
    fields: ctx.agent.intakeFields,
    prompt: ctx.agent.intakePrompt ?? undefined,
  },
  ids: {
    agentId: ctx.agent.id,
    tenantId: ctx.agent.tenantId,
    phoneNumberId: ctx.phoneNumber.id,
  },
});
