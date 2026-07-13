import { db } from "../client.js";
import type { AIAgent, KnowledgeBase, PhoneNumber, Tenant } from "../../generated/prisma-client/index.js";

/**
 * Fully-hydrated agent config used by the voice-server on inbound calls.
 * The voice server never touches Prisma directly — it consumes this shape.
 */
export interface AgentContext {
  agent: AIAgent;
  tenant: Tenant;
  phoneNumber: PhoneNumber;
  knowledgeBases: KnowledgeBase[];
}

/**
 * Look up the AI agent attached to a dialed phone number.
 *
 * Returns null if the number is not registered, the agent is inactive, or
 * has been soft-deleted. The caller (voice-server) decides how to handle a
 * miss — typically play a generic greeting and hang up.
 *
 * Phone numbers are compared verbatim; upstream callers must pass the number
 * in E.164 format (e.g. `+17432227947`) exactly as stored on the PhoneNumber
 * row.
 */
export const getAgentByPhoneNumber = async (
  phoneNumber: string
): Promise<AgentContext | null> => {
  const phone = await db.phoneNumber.findUnique({
    where: { phoneNumber },
    include: { tenant: true },
  });
  if (!phone) return null;

  const agent = await db.aIAgent.findFirst({
    where: {
      phoneNumberId: phone.id,
      tenantId: phone.tenantId,
      isActive: true,
      deletedAt: null,
    },
    include: { knowledgeBases: true },
  });
  if (!agent) return null;

  const { knowledgeBases, ...agentCore } = agent;
  return {
    agent: agentCore as AIAgent,
    tenant: phone.tenant,
    phoneNumber: { ...phone, tenant: undefined } as unknown as PhoneNumber,
    knowledgeBases,
  };
};
