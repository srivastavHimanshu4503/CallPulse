import type { Request, Response } from "express";
import { CrmService } from "./crm.service.js";
import { 
  createContactSchema, 
  createDealSchema, 
  createCustomFieldSchema,
  createNoteSchema,
  createBookingSchema 
} from "@antigravity/validators";
import { getCleanErrorMessage } from "@antigravity/utils";

const crmService = new CrmService();

export class CrmController {
  async getContacts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const data = await crmService.getContacts(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async createContact(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const parsed = createContactSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, data: null, error: getCleanErrorMessage(parsed.error) });
        return;
      }

      const data = await crmService.createContact(tenantId, parsed.data);
      res.status(201).json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async getContactDetails(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Contact ID is required" });
        return;
      }

      const data = await crmService.getContactDetails(tenantId, id);
      if (!data) {
        res.status(404).json({ success: false, data: null, error: "Contact record not found" });
        return;
      }

      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async getDeals(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const data = await crmService.getDeals(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async createDeal(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const parsed = createDealSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, data: null, error: getCleanErrorMessage(parsed.error) });
        return;
      }

      const data = await crmService.createDeal(tenantId, parsed.data);
      res.status(201).json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async updateDealStage(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const { id } = req.params;
      const { stage } = req.body;
      if (!id || !stage) {
        res.status(400).json({ success: false, data: null, error: "Deal ID and stage are required" });
        return;
      }

      const data = await crmService.updateDealStage(tenantId, id, stage);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async getCustomFields(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const data = await crmService.getCustomFields(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async createCustomField(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const parsed = createCustomFieldSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, data: null, error: getCleanErrorMessage(parsed.error) });
        return;
      }

      const data = await crmService.createCustomField(tenantId, parsed.data);
      res.status(201).json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async createNote(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const { contactId } = req.params;
      const parsed = createNoteSchema.safeParse(req.body);
      if (!contactId || !parsed.success) {
        res.status(400).json({ success: false, data: null, error: parsed.success ? "Contact ID required" : getCleanErrorMessage(parsed.error) });
        return;
      }

      const data = await crmService.createNote(tenantId, contactId, parsed.data.content);
      res.status(201).json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const { contactId } = req.params;
      const parsed = createBookingSchema.safeParse(req.body);
      if (!contactId || !parsed.success) {
        res.status(400).json({ success: false, data: null, error: parsed.success ? "Contact ID required" : getCleanErrorMessage(parsed.error) });
        return;
      }

      const data = await crmService.createBooking(tenantId, contactId, {
        title: parsed.data.title,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
      });
      res.status(201).json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async updateContactCustomFields(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).user.tenantId;
      const { contactId } = req.params;
      const { values } = req.body; // array of { fieldDefinitionId: string, value: any }
      if (!contactId || !Array.isArray(values)) {
        res.status(400).json({ success: false, data: null, error: "Contact ID and custom field values array are required" });
        return;
      }

      await crmService.updateContactCustomFieldValues(tenantId, contactId, values);
      res.json({ success: true, data: null, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }
}
