import type { Request, Response } from "express";
import { WorkflowFoldersService } from "./workflow-folders.service.js";
import { getCleanErrorMessage } from "@antigravity/utils";

const service = new WorkflowFoldersService();

export class WorkflowFoldersController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const data = await service.list(tenantId);
      res.json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { name, parentId } = req.body as { name?: string; parentId?: string | null };
      if (!name || !name.trim()) {
        res.status(400).json({ success: false, data: null, error: "Folder name required" });
        return;
      }
      const data = await service.create(tenantId, name, parentId || null);
      res.status(201).json({ success: true, data, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async rename(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const { name } = req.body as { name?: string };
      if (!id || !name) {
        res.status(400).json({ success: false, data: null, error: "id and name required" });
        return;
      }
      await service.rename(tenantId, id, name);
      res.json({ success: true, data: null, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async move(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      const { parentId } = req.body as { parentId?: string | null };
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "id required" });
        return;
      }
      await service.move(tenantId, id, parentId ?? null);
      res.json({ success: true, data: null, error: null });
    } catch (err) {
      res.status(400).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = (req as any).tenantId;
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, data: null, error: "id required" });
        return;
      }
      await service.remove(tenantId, id);
      res.json({ success: true, data: null, error: null });
    } catch (err) {
      res.status(500).json({ success: false, data: null, error: getCleanErrorMessage(err) });
    }
  }
}
