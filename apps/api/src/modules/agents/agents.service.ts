import { db } from "../../config/database.js";
import type { CreateAgentInput, UpdateAgentInput } from "@antigravity/validators";
import type { SerializedAgent } from "@antigravity/types";
import type { LogFilters } from "./agents.types.js";
import { createTestCallCredentials, type TestCallCredentials } from "../../config/livekit.js";
import { PLAN_AGENT_LIMITS } from "@antigravity/types";
import { ensureWhatsAppSender } from "../whatsapp/whatsapp-sender.service.js";
import { generateChatReply } from "@antigravity/llm";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";

type AIAgent = NonNullable<Awaited<ReturnType<typeof db.aIAgent.findFirst>>>;

/**
 * WhatsApp works like the SIP trunk: enabling it must actually provision the
 * channel, not just flip a flag. Fire-and-forget — Meta review is async and
 * a registration hiccup must never fail the agent save. The UI reads live
 * sender status separately.
 */
const registerWhatsAppSenderInBackground = (agent: AIAgent, tenantId: string): void => {
  if (!agent.whatsappEnabled || !agent.phoneNumberId) return;
  void (async () => {
    const [phone, tenant] = await Promise.all([
      db.phoneNumber.findUnique({
        where: { id: agent.phoneNumberId! },
        select: { phoneNumber: true },
      }),
      db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    if (!phone) return;
    await ensureWhatsAppSender(phone.phoneNumber, tenant?.name || agent.name);
  })().catch(() => {
    /* logged inside ensureWhatsAppSender */
  });
};

/**
 * New tenants have no knowledge base, so a fresh agent would answer calls with
 * zero business context. When the tenant has given us real business info
 * (type, website, or a description), generate a starter KB from it with one
 * LLM call. Fire-and-forget: agent creation must never fail or slow down
 * because of an LLM hiccup — worst case the agent starts without a KB.
 *
 * If the tenant has NO usable business info, we deliberately do NOT auto-fill
 * with "sample business hours" boilerplate — an owner then hearing the agent
 * confidently claim "we open at 9am" on a call is the worst kind of KB bug.
 * A blank starter KB with the placeholder prompt is safer than a hallucinated
 * one, and prompts the owner to fill it in.
 */
export const generateDefaultKnowledgeBaseInBackground = (
  agent: AIAgent,
  tenantId: string,
): void => {
  const log = logger.child({ module: "agents-default-kb" });
  void (async () => {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, businessType: true, teamSize: true, websiteUrl: true },
    });
    if (!tenant) return;

    const hasRealInfo = Boolean(
      tenant.businessType?.trim() ||
      tenant.websiteUrl?.trim() ||
      agent.websiteUrl?.trim() ||
      agent.businessInfo?.trim(),
    );

    // Always create a KB row so the dashboard shows one and the owner has a
    // place to write in; content is filled by the LLM only when we have real
    // info, otherwise it stays blank with a helpful placeholder.
    if (!env.OPENAI_API_KEY || !hasRealInfo) {
      await db.knowledgeBase.create({
        data: {
          tenantId,
          agentId: agent.id,
          name: `${agent.name} Knowledge Base`,
          content: "",
        },
      });
      log.info("starter knowledge base row created (blank — no business info yet)", {
        agentId: agent.id,
      });
      return;
    }

    const businessFacts = [
      `Business name: ${tenant.name}`,
      tenant.businessType ? `Business type: ${tenant.businessType}` : null,
      tenant.teamSize ? `Team size: ${tenant.teamSize}` : null,
      tenant.websiteUrl || agent.websiteUrl
        ? `Website: ${agent.websiteUrl || tenant.websiteUrl}`
        : null,
      agent.businessInfo ? `Owner-provided business info: ${agent.businessInfo}` : null,
      `AI receptionist name: ${agent.name}, role: ${agent.role}, language: ${agent.language}`,
    ]
      .filter(Boolean)
      .join("\n");

    const content = await generateChatReply(
      {
        provider: "openai",
        apiKey: env.OPENAI_API_KEY,
        model: "gpt-4o-mini",
        temperature: 0.4,
        maxTokens: 900,
      },
      "You write starter knowledge bases for AI phone receptionists of Indian small businesses. " +
        "From the business facts given, write a concise knowledge base the receptionist can rely on during calls: " +
        "a short business overview, plausible services or offerings for this business type, and typical customer questions with sensible answers. " +
        "STRICT RULES: (1) NEVER invent specific business hours, prices, phone numbers, addresses, or availability windows — for any of those, tell the receptionist to ask the caller for a callback with the team. " +
        "(2) Do NOT include a 'Business Hours' or 'Market Hours' or 'Timings' section at all unless the facts explicitly gave hours. " +
        "(3) Keep it under ~500 words. Plain text with simple section headings. No preamble, no markdown symbols other than headings.",
      [{ role: "user", content: businessFacts }],
    );

    await db.knowledgeBase.create({
      data: {
        tenantId,
        agentId: agent.id,
        name: `${agent.name} Starter Knowledge Base`,
        content,
      },
    });
    log.info("default knowledge base generated", { agentId: agent.id });
  })().catch((err) => {
    log.warn("default knowledge base generation failed", { agentId: agent.id, err: String(err) });
  });
};

export class AgentsService {
  /**
   * Helper to format raw database AIAgent into SerializedAgent structure
   */
  private async serializeAgent(agent: AIAgent, tenantId: string): Promise<SerializedAgent> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch count of calls handled by this agent today
    const callsTodayCount = await db.communicationLog.count({
      where: {
        tenantId,
        agentId: agent.id,
        type: "CALL",
        createdAt: {
          gte: today,
        },
      },
    });

    // 2. Fetch average call duration today for this agent
    const avgDurationResult = await db.communicationLog.aggregate({
      where: {
        tenantId,
        agentId: agent.id,
        type: "CALL",
        createdAt: {
          gte: today,
        },
        duration: {
          not: null,
        },
      },
      _avg: {
        duration: true,
      },
    });

    // 3. Fetch specific PhoneNumber for the agent, or default to first active
    let phoneNumberRecord = null;
    if (agent.phoneNumberId) {
      phoneNumberRecord = await db.phoneNumber.findFirst({
        where: {
          tenantId,
          id: agent.phoneNumberId,
        },
      });
    }

    const phoneNumber = phoneNumberRecord?.phoneNumber || "Unassigned Dedicated Line";
    const avgDuration = avgDurationResult._avg.duration
      ? Math.round(avgDurationResult._avg.duration * 10) / 10
      : 0;

    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      language: agent.language,
      greetingMessage: agent.greetingMessage,
      tone: agent.tone,
      fallbackMessage: agent.fallbackMessage,
      businessInfo: agent.businessInfo,
      websiteUrl: agent.websiteUrl,
      maxDuration: agent.maxDuration,
      dndCompliance: agent.dndCompliance,
      recordingConsent: agent.recordingConsent,
      isActive: agent.isActive,
      phoneNumber,
      voice: agent.voice,
      voiceSpeed: agent.voiceSpeed,
      voiceSettings: (agent.voiceSettings as SerializedAgent["voiceSettings"]) ?? null,
      pronunciations: (agent.pronunciations as SerializedAgent["pronunciations"]) ?? null,
      agentGuidelines: agent.agentGuidelines ?? null,
      intakeWorkflowId: agent.intakeWorkflowId,
      smsWorkflowId: agent.smsWorkflowId,
      phoneNumberId: agent.phoneNumberId,
      intakeEnabled: agent.intakeEnabled,
      intakeFields: agent.intakeFields,
      intakePrompt: agent.intakePrompt,
      smsEnabled: agent.smsEnabled,
      smsTriggerCondition: agent.smsTriggerCondition,
      smsTemplate: agent.smsTemplate,
      smsAgentReply: agent.smsAgentReply,
      whatsappEnabled: agent.whatsappEnabled,
      whatsappPrompt: agent.whatsappPrompt,
      apiEnabled: agent.apiEnabled,
      apiWorkflowId: agent.apiWorkflowId,
      apiPrompt: agent.apiPrompt,
      callTransferEnabled: agent.callTransferEnabled,
      callTransferWorkflowId: agent.callTransferWorkflowId,
      callTransferNumber: agent.callTransferNumber,
      callTransferCondition: agent.callTransferCondition,
      callTransferMessage: agent.callTransferMessage,
      callTransferFallbackNumber: agent.callTransferFallbackNumber,
      callTransferTimeoutSec: agent.callTransferTimeoutSec,
      callTransferNoAnswerAction:
        agent.callTransferNoAnswerAction as SerializedAgent["callTransferNoAnswerAction"],
      callTransferStyle: agent.callTransferStyle as SerializedAgent["callTransferStyle"],
      bookingEnabled: agent.bookingEnabled,
      bookingConfig: (agent.bookingConfig as SerializedAgent["bookingConfig"]) ?? null,
      timeZone: agent.timeZone,
      businessHours: (agent.businessHours as SerializedAgent["businessHours"]) ?? null,
      callsToday: callsTodayCount,
      avgDuration,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    };
  }

  async getAgents(tenantId: string): Promise<SerializedAgent[]> {
    const agents = await db.aIAgent.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Serialize each agent in parallel
    return Promise.all(agents.map((agent: AIAgent) => this.serializeAgent(agent, tenantId)));
  }

  async createAgent(tenantId: string, data: CreateAgentInput): Promise<SerializedAgent> {
    // Plan limits: FREE = 1 agent, PRO = 10 (PLAN_AGENT_LIMITS). The credit
    // pool stays tenant-wide regardless of how many agents share it.
    const [tenant, agentCount] = await Promise.all([
      db.tenant.findFirst({ where: { id: tenantId }, select: { plan: true } }),
      db.aIAgent.count({ where: { tenantId, deletedAt: null } }),
    ]);
    const limit =
      PLAN_AGENT_LIMITS[(tenant?.plan as keyof typeof PLAN_AGENT_LIMITS) ?? "FREE"] ?? 1;
    if (agentCount >= limit) {
      throw new Error(
        tenant?.plan === "PRO"
          ? `Agent limit reached (${limit} on Pro)`
          : `Free plan includes ${limit} agent — upgrade to Pro to create up to ${PLAN_AGENT_LIMITS.PRO}`,
      );
    }

    const {
      name,
      role,
      language,
      greetingMessage,
      tone,
      fallbackMessage,
      businessInfo,
      websiteUrl,
      maxDuration,
      dndCompliance,
      recordingConsent,
      isActive,
      voice,
      voiceSpeed,
      voiceSettings,
      pronunciations,
      agentGuidelines,
      intakeWorkflowId,
      smsWorkflowId,
      phoneNumberId,
      intakeEnabled,
      intakeFields,
      intakePrompt,
      smsEnabled,
      smsTriggerCondition,
      smsTemplate,
      smsAgentReply,
      whatsappEnabled,
      whatsappPrompt,
      apiEnabled,
      apiWorkflowId,
      apiPrompt,
      callTransferEnabled,
      callTransferWorkflowId,
      callTransferNumber,
      callTransferCondition,
      callTransferMessage,
      callTransferFallbackNumber,
      callTransferTimeoutSec,
      callTransferNoAnswerAction,
      callTransferStyle,
      bookingEnabled,
      bookingConfig,
      timeZone,
      businessHours,
    } = data;

    // Create Agent within transaction to link KnowledgeBase if websiteUrl exists
    const agent = await db.$transaction(
      async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
        const newAgent = await tx.aIAgent.create({
          data: {
            tenantId,
            name,
            role,
            language,
            greetingMessage,
            tone,
            fallbackMessage,
            businessInfo: businessInfo || null,
            websiteUrl: websiteUrl || null,
            maxDuration: maxDuration ?? 10,
            dndCompliance: dndCompliance ?? true,
            recordingConsent: recordingConsent ?? true,
            isActive: isActive ?? true,
            voice: voice || "sarvam:shubh",
            voiceSpeed: voiceSpeed ?? null,
            voiceSettings: voiceSettings ?? undefined,
            pronunciations: pronunciations ?? undefined,
            intakeWorkflowId: intakeWorkflowId || null,
            smsWorkflowId: smsWorkflowId || null,
            phoneNumberId: phoneNumberId || null,
            intakeEnabled: intakeEnabled ?? false,
            intakeFields: intakeFields ?? [],
            intakePrompt: intakePrompt || null,
            smsEnabled: smsEnabled ?? false,
            smsTriggerCondition: smsTriggerCondition || null,
            smsTemplate: smsTemplate || null,
            smsAgentReply: smsAgentReply || null,
            whatsappEnabled: whatsappEnabled ?? false,
            whatsappPrompt: whatsappPrompt || null,
            apiEnabled: apiEnabled ?? false,
            apiWorkflowId: apiWorkflowId || null,
            apiPrompt: apiPrompt || null,
            callTransferEnabled: callTransferEnabled ?? false,
            callTransferWorkflowId: callTransferWorkflowId || null,
            callTransferNumber: callTransferNumber || null,
            callTransferCondition: callTransferCondition || null,
            callTransferMessage: callTransferMessage || null,
            callTransferFallbackNumber: callTransferFallbackNumber || null,
            callTransferTimeoutSec: callTransferTimeoutSec ?? 25,
            callTransferNoAnswerAction: callTransferNoAnswerAction ?? "take_message",
            callTransferStyle: callTransferStyle ?? "warm",
            bookingEnabled: bookingEnabled ?? false,
            bookingConfig: bookingConfig ?? undefined,
            timeZone: timeZone ?? "Asia/Kolkata",
            businessHours: businessHours ?? undefined,
            agentGuidelines: agentGuidelines || null,
            modelName: "gemini-2.5-flash",
          },
        });

        // Knowledge base row is created outside the transaction by the
        // background generator below (blank when we don't have real business
        // info, LLM-populated when we do). Keeps the KB list clean and the
        // owner never sees a "Pending extraction..." placeholder.

        return newAgent;
      },
    );

    registerWhatsAppSenderInBackground(agent, tenantId);
    generateDefaultKnowledgeBaseInBackground(agent, tenantId);
    if (pronunciations && Object.keys(pronunciations).length > 0) {
      await this.syncPronunciationDictionary(agent.id);
    }
    return this.serializeAgent(agent, tenantId);
  }

  async getAgentKnowledge(tenantId: string, agentId: string) {
    return db.knowledgeBase.findMany({
      where: { tenantId, agentId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, content: true, updatedAt: true },
    });
  }

  async updateAgentKnowledge(tenantId: string, agentId: string, kbId: string, content: string) {
    const kb = await db.knowledgeBase.findFirst({
      where: { id: kbId, tenantId, agentId },
      select: { id: true },
    });
    if (!kb) return null;
    return db.knowledgeBase.update({
      where: { id: kbId },
      data: { content },
      select: { id: true, name: true, content: true, updatedAt: true },
    });
  }

  async getAgentById(tenantId: string, id: string): Promise<SerializedAgent | null> {
    const agent = await db.aIAgent.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!agent) return null;
    return this.serializeAgent(agent, tenantId);
  }

  /**
   * Issue a short-lived LiveKit access token that the browser uses to join a
   * dedicated test-call room. The voice-server agent worker gets dispatched
   * into the same room and loads this agent's config via room metadata —
   * no phone / Twilio involvement.
   */
  async createTestCallToken(
    tenantId: string,
    agentId: string,
    userId: string,
    userName: string,
  ): Promise<TestCallCredentials> {
    // Ownership check — this agent must belong to the caller's tenant.
    const agent = await db.aIAgent.findFirst({
      where: { id: agentId, tenantId, deletedAt: null, isActive: true },
      select: { id: true, phoneNumberId: true },
    });
    if (!agent) {
      throw new Error("Agent not found for this tenant or is inactive");
    }

    // Resolve the caller's real name so test-call contacts/logs show who
    // actually made the call instead of a raw userId.
    const user = await db.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { name: true },
    });

    // Test-call contacts should carry a real-looking phone: use the agent's
    // own number when the tenant has one purchased; the synthetic
    // `test-<userId>` id is only the fallback for number-less accounts.
    let callerId = `test-${userId}`;
    if (agent.phoneNumberId) {
      const phone = await db.phoneNumber.findFirst({
        where: { id: agent.phoneNumberId, tenantId },
        select: { phoneNumber: true },
      });
      if (phone?.phoneNumber) callerId = phone.phoneNumber;
    }

    return createTestCallCredentials({
      agentId,
      userIdentity: `test-${userId}`,
      userName: user?.name ?? userName,
      callerId,
    });
  }

  async updateAgent(
    tenantId: string,
    id: string,
    data: UpdateAgentInput,
  ): Promise<SerializedAgent> {
    // Confirm agent exists and belongs to tenant
    const existing = await db.aIAgent.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new Error("Agent not found or unauthorized");
    }

    // Only AGENT_LINE numbers may be attached — the business contact number
    // can never become an agent line.
    if (data.phoneNumberId) {
      const num = await db.phoneNumber.findFirst({
        where: { id: data.phoneNumberId, tenantId },
        select: { kind: true },
      });
      if (!num) throw new Error("Phone number not found");
      if (num.kind !== "AGENT_LINE") {
        throw new Error("Your business contact number can't be used as an agent line");
      }
    }

    // A purchased number is permanently bound to its agent — reassigning or
    // detaching it is not allowed.
    if (
      existing.phoneNumberId &&
      data.phoneNumberId !== undefined &&
      data.phoneNumberId !== existing.phoneNumberId
    ) {
      throw new Error("This agent's phone number is permanent and cannot be changed");
    }

    const {
      name,
      role,
      language,
      greetingMessage,
      tone,
      fallbackMessage,
      businessInfo,
      websiteUrl,
      maxDuration,
      dndCompliance,
      recordingConsent,
      isActive,
      voice,
      voiceSpeed,
      voiceSettings,
      pronunciations,
      agentGuidelines,
      intakeWorkflowId,
      smsWorkflowId,
      phoneNumberId,
      intakeEnabled,
      intakeFields,
      intakePrompt,
      smsEnabled,
      smsTriggerCondition,
      smsTemplate,
      smsAgentReply,
      whatsappEnabled,
      whatsappPrompt,
      apiEnabled,
      apiWorkflowId,
      apiPrompt,
      callTransferEnabled,
      callTransferWorkflowId,
      callTransferNumber,
      callTransferCondition,
      callTransferMessage,
      callTransferFallbackNumber,
      callTransferTimeoutSec,
      callTransferNoAnswerAction,
      callTransferStyle,
      bookingEnabled,
      bookingConfig,
      timeZone,
      businessHours,
    } = data;

    const updated = await db.$transaction(
      async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
        const updatedAgent = await tx.aIAgent.update({
          where: {
            id,
          },
          data: {
            name: name !== undefined ? name : undefined,
            role: role !== undefined ? role : undefined,
            language: language !== undefined ? language : undefined,
            greetingMessage: greetingMessage !== undefined ? greetingMessage : undefined,
            tone: tone !== undefined ? tone : undefined,
            fallbackMessage: fallbackMessage !== undefined ? fallbackMessage : undefined,
            businessInfo: businessInfo !== undefined ? businessInfo : undefined,
            websiteUrl: websiteUrl !== undefined ? websiteUrl : undefined,
            maxDuration: maxDuration !== undefined ? maxDuration : undefined,
            dndCompliance: dndCompliance !== undefined ? dndCompliance : undefined,
            recordingConsent: recordingConsent !== undefined ? recordingConsent : undefined,
            isActive: isActive !== undefined ? isActive : undefined,
            voice: voice !== undefined ? voice : undefined,
            voiceSpeed: voiceSpeed !== undefined ? voiceSpeed : undefined,
            voiceSettings: voiceSettings !== undefined ? (voiceSettings ?? undefined) : undefined,
            pronunciations:
              pronunciations !== undefined ? (pronunciations ?? undefined) : undefined,
            intakeWorkflowId: intakeWorkflowId !== undefined ? intakeWorkflowId : undefined,
            smsWorkflowId: smsWorkflowId !== undefined ? smsWorkflowId : undefined,
            phoneNumberId: phoneNumberId !== undefined ? phoneNumberId : undefined,
            intakeEnabled: intakeEnabled !== undefined ? intakeEnabled : undefined,
            intakeFields: intakeFields !== undefined ? intakeFields : undefined,
            intakePrompt: intakePrompt !== undefined ? intakePrompt : undefined,
            smsEnabled: smsEnabled !== undefined ? smsEnabled : undefined,
            smsTriggerCondition:
              smsTriggerCondition !== undefined ? smsTriggerCondition : undefined,
            smsTemplate: smsTemplate !== undefined ? smsTemplate : undefined,
            smsAgentReply: smsAgentReply !== undefined ? smsAgentReply : undefined,
            whatsappEnabled: whatsappEnabled !== undefined ? whatsappEnabled : undefined,
            whatsappPrompt: whatsappPrompt !== undefined ? whatsappPrompt : undefined,
            apiEnabled: apiEnabled !== undefined ? apiEnabled : undefined,
            apiWorkflowId: apiWorkflowId !== undefined ? apiWorkflowId : undefined,
            apiPrompt: apiPrompt !== undefined ? apiPrompt : undefined,
            callTransferEnabled:
              callTransferEnabled !== undefined ? callTransferEnabled : undefined,
            callTransferWorkflowId:
              callTransferWorkflowId !== undefined ? callTransferWorkflowId : undefined,
            callTransferNumber: callTransferNumber !== undefined ? callTransferNumber : undefined,
            callTransferCondition:
              callTransferCondition !== undefined ? callTransferCondition : undefined,
            callTransferMessage:
              callTransferMessage !== undefined ? callTransferMessage : undefined,
            callTransferFallbackNumber:
              callTransferFallbackNumber !== undefined ? callTransferFallbackNumber : undefined,
            callTransferTimeoutSec:
              callTransferTimeoutSec !== undefined ? callTransferTimeoutSec : undefined,
            callTransferNoAnswerAction:
              callTransferNoAnswerAction !== undefined ? callTransferNoAnswerAction : undefined,
            callTransferStyle: callTransferStyle !== undefined ? callTransferStyle : undefined,
            bookingEnabled: bookingEnabled !== undefined ? bookingEnabled : undefined,
            bookingConfig: bookingConfig !== undefined ? (bookingConfig ?? undefined) : undefined,
            timeZone: timeZone !== undefined ? timeZone : undefined,
            businessHours: businessHours !== undefined ? businessHours : undefined,
            agentGuidelines: agentGuidelines !== undefined ? agentGuidelines : undefined,
          },
        });

        // Website URL changes: we no longer wipe the KB and replace it with a
        // "Pending extraction..." placeholder — the owner may have already
        // filled in real content. If they want a fresh KB from the new URL
        // they can edit or clear the KB explicitly.

        return updatedAgent;
      },
    );

    registerWhatsAppSenderInBackground(updated, tenantId);
    // Re-sync the Sarvam dictionary when the mappings changed OR the agent's
    // language changed (entries are stored under the language's code).
    if (
      pronunciations !== undefined ||
      (language !== undefined && language !== existing.language)
    ) {
      await this.syncPronunciationDictionary(id);
    }
    return this.serializeAgent(updated, tenantId);
  }

  async deleteAgent(tenantId: string, id: string): Promise<void> {
    const existing = await db.aIAgent.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!existing) {
      throw new Error("Agent not found or unauthorized");
    }

    await db.aIAgent.update({
      where: {
        id,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getAgentLogs(tenantId: string, agentId: string, filters: LogFilters): Promise<any[]> {
    const { type, extractionStatus, startDate, endDate, cursor, limit = 20 } = filters;

    // Verify agent belongs to tenant
    const agentExists = await db.aIAgent.findFirst({
      where: {
        id: agentId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!agentExists) {
      throw new Error("Agent not found or unauthorized");
    }

    const whereClause: any = {
      tenantId,
      agentId,
    };

    if (type && type !== "ALL") {
      whereClause.type = type;
    }

    if (extractionStatus && extractionStatus !== "ALL") {
      whereClause.extractionStatus = extractionStatus;
    }

    if (startDate || endDate) {
      whereClause.occurredAt = {};
      if (startDate) {
        whereClause.occurredAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.occurredAt.lte = new Date(endDate);
      }
    }

    // Cursor-based query parameters
    const queryArgs: any = {
      where: whereClause,
      take: limit,
      orderBy: {
        occurredAt: "desc",
      },
      include: {
        contact: true,
      },
    };

    if (cursor) {
      queryArgs.skip = 1;
      queryArgs.cursor = {
        id: cursor,
      };
    }

    return db.communicationLog.findMany(queryArgs);
  }

  async deleteAgentLog(tenantId: string, agentId: string, logId: string) {
    const log = await db.communicationLog.findFirst({
      where: { id: logId, tenantId, agentId },
    });

    if (!log) {
      throw new Error("Log not found or unauthorized");
    }

    await db.communicationLog.delete({
      where: { id: logId },
    });

    return true;
  }

  async getTelephonyNumbers(tenantId: string) {
    // Only real agent lines — the owner's BUSINESS contact number from
    // signup is reachability info, not a line an AI can answer.
    return db.phoneNumber.findMany({
      where: {
        tenantId,
        kind: "AGENT_LINE",
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async purchaseTelephonyNumber(tenantId: string, phoneNumber: string, label?: string) {
    return db.phoneNumber.create({
      data: {
        tenantId,
        phoneNumber,
        label: label || "AI Agent Assigned Line",
      },
    });
  }

  async getWorkflowsList(tenantId: string) {
    let workflows = await db.workflowDefinition.findMany({
      where: {
        tenantId,
      },
    });

    if (workflows.length === 0) {
      const intake = await db.workflowDefinition.create({
        data: {
          tenantId,
          name: "Default In-Call Intake Workflow",
          triggerType: "IN_CALL_WORKFLOW",
          actions: JSON.stringify([
            { type: "collect_field", field: "email", prompt: "Aapka email address kya hai?" },
            { type: "collect_field", field: "name", prompt: "Aapka poora naam bataiye?" },
          ]),
        },
      });

      const sms = await db.workflowDefinition.create({
        data: {
          tenantId,
          name: "Default Post-Call Follow-up SMS Sequence",
          triggerType: "SMS_WORKFLOW",
          actions: JSON.stringify([
            {
              type: "send_sms",
              template:
                "Hi {contactName}, thank you for calling. We have updated your details in our CRM.",
            },
          ]),
        },
      });

      workflows = [intake, sms];
    }

    return workflows;
  }

  async createWorkflow(tenantId: string, name: string, triggerType: string) {
    return db.workflowDefinition.create({
      data: {
        tenantId,
        name,
        triggerType,
        actions: JSON.stringify([]),
      },
    });
  }

  /**
   * Sync the agent's word → spoken-form overrides to a Sarvam pronunciation
   * dictionary and store the resulting dict_id on the agent row. Best-effort:
   * a Sarvam outage must never fail an agent save — the voice-server simply
   * keeps using the last synced dictionary (or none).
   *
   * Entries are scoped under the agent's language code (Sarvam applies only
   * the block matching the TTS target_language_code). Emptying the list
   * deletes the remote dictionary — Sarvam caps an account at 10.
   */
  private async syncPronunciationDictionary(agentId: string): Promise<void> {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) return;

    try {
      const agent = await db.aIAgent.findFirst({
        where: { id: agentId },
        select: { id: true, language: true, pronunciations: true, pronunciationDictId: true },
      });
      if (!agent) return;

      const entries = (agent.pronunciations as Record<string, string> | null) ?? {};
      const words = Object.entries(entries).filter(([w, s]) => w.trim() && s.trim());

      if (words.length === 0) {
        if (agent.pronunciationDictId) {
          await fetch(
            `https://api.sarvam.ai/text-to-speech/pronunciation-dictionary?dict_id=${encodeURIComponent(agent.pronunciationDictId)}`,
            { method: "DELETE", headers: { "api-subscription-key": apiKey } },
          ).catch(() => undefined);
          await db.aIAgent.update({ where: { id: agentId }, data: { pronunciationDictId: null } });
        }
        return;
      }

      const langCodeMap: Record<string, string> = {
        english: "en-IN",
        hindi: "hi-IN",
        hinglish: "hi-IN",
        marathi: "mr-IN",
        tamil: "ta-IN",
        telugu: "te-IN",
        bengali: "bn-IN",
        gujarati: "gu-IN",
        kannada: "kn-IN",
        malayalam: "ml-IN",
        punjabi: "pa-IN",
        odia: "od-IN",
      };
      const langCode = langCodeMap[(agent.language || "").toLowerCase()] ?? "hi-IN";

      const payload = JSON.stringify({
        pronunciations: { [langCode]: Object.fromEntries(words) },
      });
      // Sarvam rejects multipart parts without an explicit application/json
      // content type, so the file part MUST be a typed Blob. Fresh FormData
      // per request — undici consumes the body stream on send.
      const upload = async (method: "POST" | "PUT", url: string) => {
        const form = new FormData();
        form.append("file", new Blob([payload], { type: "application/json" }), "dict.json");
        return fetch(url, { method, headers: { "api-subscription-key": apiKey }, body: form });
      };

      let dictId = agent.pronunciationDictId;
      let res = dictId
        ? await upload(
            "PUT",
            `https://api.sarvam.ai/text-to-speech/pronunciation-dictionary?dict_id=${encodeURIComponent(dictId)}`,
          )
        : await upload("POST", "https://api.sarvam.ai/text-to-speech/pronunciation-dictionary");

      // A stale/deleted dict_id makes the update 4xx — fall back to creating
      // a fresh dictionary rather than losing the user's mappings.
      if (dictId && !res.ok) {
        res = await upload("POST", "https://api.sarvam.ai/text-to-speech/pronunciation-dictionary");
        dictId = null;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.error(`Sarvam pronunciation dictionary sync failed (${res.status}): ${body}`);
        return;
      }

      if (!dictId) {
        const result = (await res.json()) as { dictionary_id?: string };
        if (result.dictionary_id) {
          await db.aIAgent.update({
            where: { id: agentId },
            data: { pronunciationDictId: result.dictionary_id },
          });
        }
      }
    } catch (err) {
      console.error("Sarvam pronunciation dictionary sync failed:", err);
    }
  }

  async generateTestVoice(opts: {
    provider: string;
    voice: string;
    language?: string;
    voiceSettings?: {
      stability?: number;
      similarityBoost?: number;
      style?: number;
      temperature?: number;
    } | null;
  }): Promise<Buffer> {
    const { provider, voice, language, voiceSettings } = opts;

    // Normalize voice identifier
    const cleanVoice = voice.split(":").pop() || voice;
    const voiceKey = cleanVoice.toLowerCase().trim();

    // Map legacy / unrecognized speaker IDs
    let speaker = voiceKey;
    if (speaker === "aravind") speaker = "soham";
    if (speaker === "aditi") speaker = "ritu";
    if (speaker === "deepika") speaker = "kavitha";

    // Determine voice gender for correct Hindi/Hinglish grammatical endings.
    // The last five are ElevenLabs Sarah, Matilda, Jessica, Bella, Alice
    // (voice IDs lowercased to match voiceKey).
    const femaleVoices = [
      "priya",
      "aditi",
      "ritu",
      "deepika",
      "kavitha",
      "ishita",
      "suhani",
      "neha",
      "pooja",
      "roopa",
      "alloy",
      "shimmer",
      "coral",
      "sage",
      "marin",
      "exavitqu4vr4xnsdxmal",
      "xrexe9ykig1wjnnlvkgx",
      "cgsgspj2msm6clmckdw9",
      "hpp4j3vqnfwauoo0d1us",
      "xb7hh8msujpsbsdyk0k2",
    ];
    const isFemale = femaleVoices.includes(voiceKey);

    // Determine target language context
    const agentLang = (language || "").toLowerCase().trim();
    let testText = "";

    if (agentLang.startsWith("en")) {
      // English-only greeting
      testText = "Hello! I am your AI voice assistant. I am ready to help you with your query.";
    } else if (agentLang.startsWith("hin") && !agentLang.includes("glish")) {
      // Pure Hindi greeting with correct gender endings (raha hoon / rahi hoon)
      testText = isFemale
        ? "Namaste! Main aapki sahayata karne ke liye taiyaar hoon. Main aapki madad kar rahi hoon."
        : "Namaste! Main aapki sahayata karne ke liye taiyaar hoon. Main aapki madad kar raha hoon.";
    } else {
      // Hinglish / Auto / Default greeting
      testText = isFemale
        ? "Namaste! Main aapki help karne ke liye ready hoon. Main aapki call connect kar rahi hoon."
        : "Namaste! Main aapki help karne ke liye ready hoon. Main aapki call connect kar raha hoon.";
    }

    if (provider === "sarvam") {
      const apiKey = process.env.SARVAM_API_KEY;
      if (!apiKey) throw new Error("SARVAM_API_KEY is not configured on the API server");

      const langCodeMap: Record<string, string> = {
        english: "en-IN",
        hindi: "hi-IN",
        hinglish: "hi-IN",
        marathi: "mr-IN",
        tamil: "ta-IN",
        telugu: "te-IN",
        bengali: "bn-IN",
        gujarati: "gu-IN",
        kannada: "kn-IN",
        malayalam: "ml-IN",
        punjabi: "pa-IN",
        odia: "od-IN",
      };
      const targetLanguageCode = langCodeMap[agentLang] ?? "hi-IN";
      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: testText,
          speaker: speaker, // use mapped speaker ID
          target_language_code: targetLanguageCode,
          model: "bulbul:v3",
          ...(voiceSettings?.temperature !== undefined
            ? { temperature: voiceSettings.temperature }
            : {}),
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Sarvam TTS preview failed: ${err}`);
      }
      const data = (await response.json()) as { audios?: string[] };
      const base64 = data.audios?.[0];
      if (!base64) throw new Error("No audio returned from Sarvam AI");
      return Buffer.from(base64, "base64");
    } else if (provider === "elevenlabs") {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured on the API server");

      // ElevenLabs voice IDs are case-sensitive — use the un-lowercased form.
      const elevenVoiceId = encodeURIComponent(cleanVoice.trim());
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenVoiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model_id: "eleven_turbo_v2_5",
          text: testText,
          language_code: agentLang.startsWith("en") ? "en" : "hi",
          ...(voiceSettings &&
          (voiceSettings.stability !== undefined ||
            voiceSettings.similarityBoost !== undefined ||
            voiceSettings.style !== undefined)
            ? {
                voice_settings: {
                  stability: voiceSettings.stability ?? 0.5,
                  similarity_boost: voiceSettings.similarityBoost ?? 0.75,
                  ...(voiceSettings.style !== undefined ? { style: voiceSettings.style } : {}),
                },
              }
            : {}),
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`ElevenLabs TTS preview failed: ${err}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else {
      throw new Error(`Unsupported voice provider: ${provider}`);
    }
  }
}
