import { getAgentByPhoneNumber, getAgentById, type AgentContext } from "@antigravity/db";
import { createLogger } from "../logger.js";
import type { AgentConfigProvider, AgentPersonaConfig, AgentVoiceSettings } from "./types.js";

const log = createLogger("agent-config:prisma");

/**
 * Backed by `@antigravity/db`. Reads the AIAgent + Tenant + KnowledgeBase
 * rows and shapes them into the pipeline-friendly `AgentPersonaConfig`.
 * Two lookup paths:
 *   - `getByPhoneNumber` for real inbound calls (SIP)
 *   - `getById` for in-app test calls (browser WebRTC)
 */
export class PrismaAgentConfigProvider implements AgentConfigProvider {
  async getByPhoneNumber(phoneNumber: string): Promise<AgentPersonaConfig | null> {
    const ctx = await getAgentByPhoneNumber(phoneNumber);
    if (!ctx) {
      log.warn("no agent registered for phone number", { phoneNumber });
      return null;
    }
    log.info("agent loaded by phone", {
      phoneNumber,
      agentId: ctx.agent.id,
      agentName: ctx.agent.name,
      tenant: ctx.tenant.name,
      knowledgeBases: ctx.knowledgeBases.length,
    });
    return shape(ctx);
  }

  async getById(agentId: string): Promise<AgentPersonaConfig | null> {
    const ctx = await getAgentById(agentId);
    if (!ctx) {
      log.warn("no active agent found by id", { agentId });
      return null;
    }
    log.info("agent loaded by id", {
      agentId,
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
  guidelines: ctx.agent.agentGuidelines || undefined,
  voice: ctx.agent.voice,
  voiceSpeed: ctx.agent.voiceSpeed ?? undefined,
  voiceSettings: (ctx.agent.voiceSettings as AgentVoiceSettings | null) ?? undefined,
  pronunciationDictId: ctx.agent.pronunciationDictId ?? undefined,
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
  transfer:
    ctx.agent.callTransferEnabled && ctx.agent.callTransferNumber
      ? {
          number: ctx.agent.callTransferNumber,
          condition: ctx.agent.callTransferCondition,
          message: ctx.agent.callTransferMessage,
          fallbackNumber: ctx.agent.callTransferFallbackNumber,
          timeoutSec: ctx.agent.callTransferTimeoutSec,
          noAnswerAction: ctx.agent.callTransferNoAnswerAction,
          style: ctx.agent.callTransferStyle === "instant" ? "instant" : "warm",
        }
      : null,
  ids: {
    agentId: ctx.agent.id,
    tenantId: ctx.agent.tenantId,
    phoneNumberId: ctx.phoneNumber.id,
  },
});
