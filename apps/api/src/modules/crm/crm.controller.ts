import type { Request, Response } from "express";
import { CrmService } from "./crm.service.js";
import { 
  createContactSchema, 
  createDealSchema, 
  createCustomFieldSchema,
  createNoteSchema,
  createBookingSchema,
  createPipelineSchema
} from "@antigravity/validators";
import { getCleanErrorMessage } from "@antigravity/utils";

const crmService = new CrmService();

export class CrmController {
  async getContacts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const data = await crmService.getContacts(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async createContact(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
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
      const tenantId = (req as any).tenantId;
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
      const tenantId = (req as any).tenantId;
      const data = await crmService.getDeals(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async createDeal(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
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
      const tenantId = (req as any).tenantId;
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
      const tenantId = (req as any).tenantId;
      const data = await crmService.getCustomFields(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async createCustomField(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
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
      const tenantId = (req as any).tenantId;
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
      const tenantId = (req as any).tenantId;
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
      const tenantId = (req as any).tenantId;
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

  async getPipelines(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const data = await crmService.getPipelines(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async createPipeline(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const parsed = createPipelineSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, data: null, error: getCleanErrorMessage(parsed.error) });
        return;
      }

      const data = await crmService.createPipeline(tenantId, parsed.data);
      res.status(201).json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async deleteDeal(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Deal ID is required" });
        return;
      }

      await crmService.deleteDeal(tenantId, id);
      res.json({ success: true, data: null, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async updatePipeline(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Pipeline ID is required" });
        return;
      }

      const parsed = createPipelineSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ success: false, data: null, error: getCleanErrorMessage(parsed.error) });
        return;
      }

      const data = await crmService.updatePipeline(tenantId, id, parsed.data);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async deletePipeline(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Pipeline ID is required" });
        return;
      }

      await crmService.deletePipeline(tenantId, id);
      res.json({ success: true, data: null, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async updateDeal(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const { title, value, stage } = req.body;

      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Deal ID is required" });
        return;
      }

      const data = await crmService.updateDeal(tenantId, id, { title, value, stage });
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Contact ID is required" });
        return;
      }
      await crmService.softDeleteContact(tenantId, id);
      res.json({ success: true, data: null, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async bulkDeleteContacts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { ids } = req.body as { ids?: string[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, data: null, error: "ids array required" });
        return;
      }
      const result = await crmService.bulkDeleteContacts(tenantId, ids);
      res.json({ success: true, data: result, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async bulkImport(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { rows } = req.body as {
        rows?: Array<{ firstName: string; lastName: string; email?: string; phone?: string }>;
      };
      if (!Array.isArray(rows) || rows.length === 0) {
        res.status(400).json({ success: false, data: null, error: "rows array required" });
        return;
      }
      if (rows.length > 5000) {
        res.status(400).json({ success: false, data: null, error: "Max 5000 rows per import" });
        return;
      }
      const result = await crmService.bulkImport(tenantId, rows);
      res.json({ success: true, data: result, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async findDuplicates(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const data = await crmService.findDuplicates(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async mergeContacts(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { targetId, sourceId } = req.body as { targetId?: string; sourceId?: string };
      if (!targetId || !sourceId) {
        res.status(400).json({ success: false, data: null, error: "targetId and sourceId required" });
        return;
      }
      await crmService.mergeContacts(tenantId, targetId, sourceId);
      res.json({ success: true, data: null, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  /**
   * Internal hook — call this from the voice-server / webhook after a call
   * completes with extracted intent fields. Applies auto-deal creation.
   * Also usable from the UI ("Apply AI rules") for retro processing.
   */
  async postCallHook(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { contactId, extractedFields } = req.body as {
        contactId?: string;
        extractedFields?: Record<string, any>;
      };
      if (!contactId || !extractedFields) {
        res.status(400).json({ success: false, data: null, error: "contactId and extractedFields required" });
        return;
      }
      const result = await crmService.applyPostCallRule(tenantId, contactId, extractedFields);
      res.json({ success: true, data: result, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }
}
