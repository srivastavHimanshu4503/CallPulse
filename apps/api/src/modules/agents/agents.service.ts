import { db } from "../../config/database.js";
import type { CreateAgentInput, UpdateAgentInput } from "@antigravity/validators";
import type { SerializedAgent } from "@antigravity/types";
import type { LogFilters } from "./agents.types.js";

type AIAgent = NonNullable<Awaited<ReturnType<typeof db.aIAgent.findFirst>>>;

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
    const { type, startDate, endDate, cursor, limit = 20 } = filters;

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

  async getTelephonyNumbers(tenantId: string) {
    return db.phoneNumber.findMany({
      where: {
        tenantId,
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
}

