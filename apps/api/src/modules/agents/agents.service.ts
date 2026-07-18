import { db } from "../../config/database.js";
import type { CreateAgentInput, UpdateAgentInput } from "@antigravity/validators";
import type { SerializedAgent } from "@antigravity/types";
import type { LogFilters } from "./agents.types.js";
import { createTestCallCredentials, type TestCallCredentials } from "../../config/livekit.js";
import { PLAN_AGENT_LIMITS } from "@antigravity/types";
import { ensureWhatsAppSender } from "../whatsapp/whatsapp-sender.service.js";

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
    const avgDuration = avgDurationResult._avg.duration ? Math.round(avgDurationResult._avg.duration * 10) / 10 : 0;

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
    const limit = PLAN_AGENT_LIMITS[(tenant?.plan as keyof typeof PLAN_AGENT_LIMITS) ?? "FREE"] ?? 1;
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
      timeZone,
      businessHours,
    } = data;

    // Create Agent within transaction to link KnowledgeBase if websiteUrl exists
    const agent = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
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
          voice: voice || "Priya (Indian Female)",
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
          timeZone: timeZone ?? "Asia/Kolkata",
          businessHours: businessHours ?? undefined,
          systemPrompt: `You are a helpful ${tone} AI assistant named ${name} specializing in a ${role} role. Greeting: ${greetingMessage}`,
          modelName: "gemini-2.5-flash",
        },
      });

      // Create a KnowledgeBase entry if websiteUrl is provided
      if (websiteUrl) {
        await tx.knowledgeBase.create({
          data: {
            tenantId,
            agentId: newAgent.id,
            name: `${name} Website Scraping Context`,
            content: `Pending content extraction for site: ${websiteUrl}`,
          },
        });
      }

      return newAgent;
    });

    registerWhatsAppSenderInBackground(agent, tenantId);
    return this.serializeAgent(agent, tenantId);
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
    userName: string
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

  async updateAgent(tenantId: string, id: string, data: UpdateAgentInput): Promise<SerializedAgent> {
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
      timeZone,
      businessHours,
    } = data;

    const updated = await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
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
          intakeWorkflowId: intakeWorkflowId !== undefined ? intakeWorkflowId : undefined,
          smsWorkflowId: smsWorkflowId !== undefined ? smsWorkflowId : undefined,
          phoneNumberId: phoneNumberId !== undefined ? phoneNumberId : undefined,
          intakeEnabled: intakeEnabled !== undefined ? intakeEnabled : undefined,
          intakeFields: intakeFields !== undefined ? intakeFields : undefined,
          intakePrompt: intakePrompt !== undefined ? intakePrompt : undefined,
          smsEnabled: smsEnabled !== undefined ? smsEnabled : undefined,
          smsTriggerCondition: smsTriggerCondition !== undefined ? smsTriggerCondition : undefined,
          smsTemplate: smsTemplate !== undefined ? smsTemplate : undefined,
          smsAgentReply: smsAgentReply !== undefined ? smsAgentReply : undefined,
          whatsappEnabled: whatsappEnabled !== undefined ? whatsappEnabled : undefined,
          whatsappPrompt: whatsappPrompt !== undefined ? whatsappPrompt : undefined,
          timeZone: timeZone !== undefined ? timeZone : undefined,
          businessHours: businessHours !== undefined ? businessHours : undefined,
          systemPrompt: `You are a helpful ${tone || existing.tone} AI assistant named ${name || existing.name} specializing in a ${role || existing.role} role. Greeting: ${greetingMessage || existing.greetingMessage}`,
        },
      });

      // Update or create KnowledgeBase entry if websiteUrl has changed and is now provided
      if (websiteUrl && websiteUrl !== existing.websiteUrl) {
        await tx.knowledgeBase.deleteMany({
          where: {
            agentId: id,
            tenantId,
          },
        });

        await tx.knowledgeBase.create({
          data: {
            tenantId,
            agentId: id,
            name: `${updatedAgent.name} Website Scraping Context`,
            content: `Pending content extraction for updated site: ${websiteUrl}`,
          },
        });
      }

      return updatedAgent;
    });

    registerWhatsAppSenderInBackground(updated, tenantId);
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
    let queryArgs: any = {
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
      where: { id: logId, tenantId, agentId }
    });
    
    if (!log) {
      throw new Error("Log not found or unauthorized");
    }
    
    await db.communicationLog.delete({
      where: { id: logId }
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
            { type: "collect_field", field: "name", prompt: "Aapka poora naam bataiye?" }
          ]),
        },
      });

      const sms = await db.workflowDefinition.create({
        data: {
          tenantId,
          name: "Default Post-Call Follow-up SMS Sequence",
          triggerType: "SMS_WORKFLOW",
          actions: JSON.stringify([
            { type: "send_sms", template: "Hi {contactName}, thank you for calling. We have updated your details in our CRM." }
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

  async generateTestVoice(opts: {
    provider: string;
    voice: string;
    language?: string;
  }): Promise<Buffer> {
    const { provider, voice, language } = opts;

    // Normalize voice identifier
    const cleanVoice = voice.split(":").pop() || voice;
    const voiceKey = cleanVoice.toLowerCase().trim();

    // Map legacy / unrecognized speaker IDs
    let speaker = voiceKey;
    if (speaker === "aravind") speaker = "soham";
    if (speaker === "aditi") speaker = "ritu";
    if (speaker === "deepika") speaker = "kavitha";

    // Determine voice gender for correct Hindi/Hinglish grammatical endings
    const femaleVoices = [
      "priya", "aditi", "ritu", "deepika", "kavitha",
      "alloy", "shimmer", "coral", "sage", "marin"
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

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not configured on the API server");

      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: testText,
          voice: speaker, // use mapped voice identifier
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI TTS preview failed: ${err}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else if (provider === "sarvam") {
      const apiKey = process.env.SARVAM_API_KEY;
      if (!apiKey) throw new Error("SARVAM_API_KEY is not configured on the API server");

      const isEnglish = agentLang.startsWith("en");
      const response = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: testText,
          speaker: speaker, // use mapped speaker ID
          target_language_code: isEnglish ? "en-IN" : "hi-IN",
          model: "bulbul:v3",
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
    } else {
      throw new Error(`Unsupported voice provider: ${provider}`);
    }
  }
}

