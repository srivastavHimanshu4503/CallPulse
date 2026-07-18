import type { Request, Response } from "express";
import { WhatsAppService } from "./whatsapp.service.js";
import { WhatsAppTemplateService } from "./whatsapp-template.service.js";
import { getWhatsAppSenderStatus } from "./whatsapp-sender.service.js";
import { db } from "../../config/database.js";

const templateService = new WhatsAppTemplateService();

export class WhatsAppController {
  private service: WhatsAppService;

  constructor() {
    this.service = new WhatsAppService();
  }

  /**
   * Handle incoming WhatsApp message webhook from Twilio
   */
  handleIncoming = async (req: Request, res: Response): Promise<void> => {
    try {
      // Twilio sends application/x-www-form-urlencoded
      const payload = req.body;

      // We don't await this so Twilio gets a fast 200 OK response
      this.service.handleIncomingMessage(payload).catch((err) => {
        console.error("Error processing WhatsApp message:", err);
      });

      // Twilio expects a valid TwiML response or a 200 OK
      res.status(200).send("<Response></Response>");
    } catch (error: any) {
      console.error("WhatsApp webhook error:", error);
      res.status(500).send("Internal Server Error");
    }
  };

  handleStatusCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      this.service.handleStatusCallback(req.body ?? {}).catch((err) => {
        console.error("Error processing WhatsApp status callback:", err);
      });
      res.status(200).send("");
    } catch {
      res.status(200).send("");
    }
  };

  getSenderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      const agent = await db.aIAgent.findFirst({
        where: { id: req.params.agentId, tenantId, deletedAt: null },
        select: { phoneNumberId: true },
      });
      if (!agent) {
        res.status(404).json({ success: false, data: null, error: "Agent not found" });
        return;
      }
      if (!agent.phoneNumberId) {
        res.json({ success: true, data: { status: "NO_NUMBER", webhookConfigured: false }, error: null });
        return;
      }
      const phone = await db.phoneNumber.findUnique({
        where: { id: agent.phoneNumberId },
        select: { phoneNumber: true },
      });
      const status = await getWhatsAppSenderStatus(phone!.phoneNumber);
      res.json({
        success: true,
        data: { number: phone!.phoneNumber, status: status.status, webhookConfigured: status.webhookConfigured },
        error: null,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  getSessionByLog = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      const data = await this.service.getSessionByLog(tenantId, req.params.logId!);
      res.json({ success: true, data, error: null });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  sendManualReply = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
      if (!message) {
        res.status(400).json({ success: false, data: null, error: "message is required" });
        return;
      }
      const data = await this.service.sendManualReply(tenantId, req.params.sessionId!, message);
      res.json({ success: true, data, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  sendOutbound = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      const { agentId, to, message } = req.body ?? {};
      if (typeof agentId !== "string" || typeof to !== "string" || typeof message !== "string" || !message.trim()) {
        res.status(400).json({ success: false, data: null, error: "agentId, to, and message are required" });
        return;
      }
      const data = await this.service.sendOutboundMessage(tenantId, agentId, to, message.trim());
      res.json({ success: true, data, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  listTemplates = async (_req: Request, res: Response): Promise<void> => {
    try {
      const data = await templateService.listTemplates();
      res.json({ success: true, data, error: null });
    } catch (err: any) {
      res.status(500).json({ success: false, data: null, error: err.message });
    }
  };

  createTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, body, category, language } = req.body ?? {};
      if (typeof name !== "string" || typeof body !== "string") {
        res.status(400).json({ success: false, data: null, error: "name and body are required" });
        return;
      }
      const data = await templateService.createTemplate({ name, body, category, language });
      res.json({ success: true, data, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  deleteTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      await templateService.deleteTemplate(req.params.sid!);
      res.json({ success: true, data: { deleted: true }, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  sendTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      const { agentId, to, contentSid, variables } = req.body ?? {};
      if (typeof agentId !== "string" || typeof to !== "string" || typeof contentSid !== "string") {
        res.status(400).json({ success: false, data: null, error: "agentId, to, and contentSid are required" });
        return;
      }
      const data = await this.service.sendTemplateMessage(
        tenantId,
        agentId,
        to,
        contentSid,
        variables && typeof variables === "object" ? variables : {},
      );
      res.json({ success: true, data, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  setTakeover = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      const data = await this.service.setTakeover(
        tenantId,
        req.params.sessionId!,
        Boolean(req.body?.enabled),
      );
      res.json({ success: true, data, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };

  closeSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      const data = await this.service.closeSession(tenantId, req.params.sessionId!);
      res.json({ success: true, data, error: null });
    } catch (err: any) {
      res.status(400).json({ success: false, data: null, error: err.message });
    }
  };
}
