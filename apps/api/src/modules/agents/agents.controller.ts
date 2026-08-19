import type { Request, Response } from "express";
import { AgentsService } from "./agents.service.js";
import { sendSuccess, sendError } from "../../utils/response.js";
import { getCleanErrorMessage } from "@antigravity/utils";
import { createAgentSchema, updateAgentSchema } from "@antigravity/validators";

const agentsService = new AgentsService();

export class AgentsController {
  async getAgents(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const result = await agentsService.getAgents(tenantId);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 500);
    }
  }

  async createAgent(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }

      const parsed = createAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await agentsService.createAgent(tenantId, parsed.data);
      sendSuccess(res, result, 201);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async getAgentById(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { id } = req.params;

      if (!tenantId || !id) {
        sendError(res, "Invalid request details", 400);
        return;
      }

      const result = await agentsService.getAgentById(tenantId, id);
      if (!result) {
        sendError(res, "Agent not found", 404);
        return;
      }

      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 500);
    }
  }

  async getAgentKnowledge(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { id } = req.params;
      if (!tenantId || !id) {
        sendError(res, "Invalid request details", 400);
        return;
      }
      const result = await agentsService.getAgentKnowledge(tenantId, id);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 500);
    }
  }

  async updateAgentKnowledge(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { id, kbId } = req.params;
      const { content } = req.body ?? {};
      if (!tenantId || !id || !kbId || typeof content !== "string") {
        sendError(res, "Invalid request details", 400);
        return;
      }
      const result = await agentsService.updateAgentKnowledge(tenantId, id, kbId, content);
      if (!result) {
        sendError(res, "Knowledge base not found", 404);
        return;
      }
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 500);
    }
  }

  async createTestCallToken(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const userId = req.userId;
      const { id } = req.params;

      if (!tenantId || !userId || !id) {
        sendError(res, "Invalid request context", 400);
        return;
      }

      const result = await agentsService.createTestCallToken(
        tenantId,
        id,
        userId,
        (req.body?.userName as string | undefined) ?? userId,
      );
      sendSuccess(res, result, 200);
    } catch (error: any) {
      const msg = getCleanErrorMessage(error);
      const status = /not found|inactive/i.test(msg)
        ? 404
        : /not configured/i.test(msg)
          ? 503
          : 500;
      sendError(res, msg, status);
    }
  }

  async updateAgent(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { id } = req.params;

      if (!tenantId || !id) {
        sendError(res, "Invalid request details", 400);
        return;
      }

      const parsed = updateAgentSchema.safeParse(req.body);
      if (!parsed.success) {
        const errorMsg = parsed.error.issues[0]?.message || "Validation failed";
        sendError(res, errorMsg, 400);
        return;
      }

      const result = await agentsService.updateAgent(tenantId, id, parsed.data);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async deleteAgent(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { id } = req.params;

      if (!tenantId || !id) {
        sendError(res, "Invalid request details", 400);
        return;
      }

      await agentsService.deleteAgent(tenantId, id);
      sendSuccess(res, { message: "Agent deleted successfully" }, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async getAgentLogs(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { id } = req.params;

      if (!tenantId || !id) {
        sendError(res, "Invalid request details", 400);
        return;
      }

      const { type, extractionStatus, startDate, endDate, cursor, limit } = req.query;

      const filters = {
        type: type ? String(type) : undefined,
        extractionStatus: extractionStatus ? String(extractionStatus) : undefined,
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        cursor: cursor ? String(cursor) : undefined,
        limit: limit ? Number(limit) : undefined,
      };

      const result = await agentsService.getAgentLogs(tenantId, id, filters);
      sendSuccess(res, result, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 500);
    }
  }

  async deleteAgentLog(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      const { id, logId } = req.params;

      if (!tenantId || !id || !logId) {
        sendError(res, "Invalid request details", 400);
        return;
      }

      await agentsService.deleteAgentLog(tenantId, id, logId);
      sendSuccess(res, { message: "Log deleted successfully" }, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async getTelephonyNumbers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }
      const numbers = await agentsService.getTelephonyNumbers(tenantId);
      sendSuccess(res, numbers, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 500);
    }
  }

  async purchaseTelephonyNumber(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }
      const { phoneNumber, label } = req.body;
      if (!phoneNumber) {
        sendError(res, "Phone number is required", 400);
        return;
      }
      const newNumber = await agentsService.purchaseTelephonyNumber(tenantId, phoneNumber, label);
      sendSuccess(res, newNumber, 201);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async getWorkflowsList(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }
      const workflows = await agentsService.getWorkflowsList(tenantId);
      sendSuccess(res, workflows, 200);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 500);
    }
  }

  async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        sendError(res, "Unauthorized request context", 401);
        return;
      }
      const { name, triggerType } = req.body;
      if (!name || !triggerType) {
        sendError(res, "Workflow name and triggerType are required", 400);
        return;
      }
      const newWorkflow = await agentsService.createWorkflow(tenantId, name, triggerType);
      sendSuccess(res, newWorkflow, 201);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 400);
    }
  }

  async testVoice(req: Request, res: Response): Promise<void> {
    try {
      const { provider, voice, language, voiceSettings } = req.body;
      if (!provider || !voice) {
        sendError(res, "Provider and voice are required", 400);
        return;
      }
      const audioBuffer = await agentsService.generateTestVoice({
        provider,
        voice,
        language,
        voiceSettings,
      });
      const contentType = provider === "sarvam" ? "audio/wav" : "audio/mpeg";
      res.setHeader("Content-Type", contentType);
      res.send(audioBuffer);
    } catch (error: any) {
      sendError(res, getCleanErrorMessage(error), 500);
    }
  }
}
