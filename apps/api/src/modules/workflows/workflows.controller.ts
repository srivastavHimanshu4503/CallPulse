import type { Request, Response } from "express";
import { WorkflowsService } from "./workflows.service.js";
import { getCleanErrorMessage } from "@antigravity/utils";

const service = new WorkflowsService();

export class WorkflowsController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const data = await service.list(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async get(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Workflow ID is required" });
        return;
      }
      const data = await service.get(tenantId, id);
      if (!data) {
        res.status(404).json({ success: false, data: null, error: "Workflow not found" });
        return;
      }
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { name, description, isActive, trigger, steps } = req.body;
      if (!trigger?.type) {
        res.status(400).json({ success: false, data: null, error: "trigger.type is required" });
        return;
      }
      const data = await service.create(tenantId, {
        name: name || "Untitled workflow",
        description,
        isActive,
        trigger,
        steps: steps || [],
      });
      res.status(201).json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Workflow ID is required" });
        return;
      }
      const data = await service.update(tenantId, id, req.body);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async toggleActive(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const { isActive } = req.body as { isActive: boolean };
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Workflow ID is required" });
        return;
      }
      const data = await service.toggleActive(tenantId, id, !!isActive);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Workflow ID is required" });
        return;
      }
      await service.remove(tenantId, id);
      res.json({ success: true, data: null, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  /** Move a workflow into a folder (folderId=null → root). */
  async move(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const { folderId } = req.body as { folderId?: string | null };
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "Workflow ID is required" });
        return;
      }
      const data = await service.move(tenantId, id, folderId ?? null);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async bulkDelete(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { ids } = req.body as { ids?: string[] };
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, data: null, error: "ids array required" });
        return;
      }
      const result = await service.bulkDelete(tenantId, ids);
      res.json({ success: true, data: result, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async bulkMove(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { ids, folderId } = req.body as { ids?: string[]; folderId?: string | null };
      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ success: false, data: null, error: "ids array required" });
        return;
      }
      const result = await service.bulkMove(tenantId, ids, folderId ?? null);
      res.json({ success: true, data: result, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }
}
