import { db } from "../../config/database.js";

/**
 * Persistence layer for workflows. The entire tree (trigger + steps) is
 * stored in `WorkflowDefinition.actions` (Json). `triggerType` mirrors
 * `trigger.type` so we can filter workflows by trigger at query time
 * without unpacking the JSON.
 */

interface StoredWorkflow {
  trigger?: { type: string; config: Record<string, any> };
  steps?: any[];
  description?: string;
  isActive?: boolean;
}

export interface WorkflowInput {
  name: string;
  description?: string;
  isActive?: boolean;
  trigger: { type: string; config: Record<string, any> };
  steps: any[];
}

function serialize(w: any) {
  const stored: StoredWorkflow = (w.actions as any) || {};
  return {
    id: w.id,
    tenantId: w.tenantId,
    name: w.name,
    description: stored.description || "",
    isActive: stored.isActive !== false,
    trigger: stored.trigger || { type: w.triggerType || "MANUAL", config: {} },
    steps: Array.isArray(stored.steps) ? stored.steps : [],
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  };
}

export class WorkflowsService {
  async list(tenantId: string) {
    const rows = await db.workflowDefinition.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { runs: true } },
        runs: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { startedAt: true, status: true },
        },
      },
    });

    return rows.map((r: any) => ({
      ...serialize(r),
      runCount: r._count.runs,
      lastRunAt: r.runs[0]?.startedAt ? r.runs[0].startedAt.toISOString() : null,
      lastRunStatus: r.runs[0]?.status || null,
    }));
  }

  async get(tenantId: string, id: string) {
    const w = await db.workflowDefinition.findFirst({ where: { id, tenantId } });
    if (!w) return null;
    return serialize(w);
  }

  async create(tenantId: string, input: WorkflowInput) {
    const created = await db.workflowDefinition.create({
      data: {
        tenantId,
        name: input.name.trim() || "Untitled workflow",
        triggerType: input.trigger.type,
        actions: {
          trigger: input.trigger,
          steps: input.steps || [],
          description: input.description || "",
          isActive: input.isActive !== false,
        } as any,
      },
    });
    return serialize(created);
  }

  async update(tenantId: string, id: string, input: Partial<WorkflowInput>) {
    const existing = await db.workflowDefinition.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Workflow not found");

    const stored: StoredWorkflow = (existing.actions as any) || {};
    const nextTrigger = input.trigger || stored.trigger || { type: existing.triggerType || "MANUAL", config: {} };

    const updated = await db.workflowDefinition.update({
      where: { id },
      data: {
        name: input.name !== undefined ? input.name.trim() : existing.name,
        triggerType: nextTrigger.type,
        actions: {
          trigger: nextTrigger,
          steps: input.steps !== undefined ? input.steps : stored.steps || [],
          description: input.description !== undefined ? input.description : stored.description || "",
          isActive: input.isActive !== undefined ? input.isActive : stored.isActive !== false,
        } as any,
      },
    });
    return serialize(updated);
  }

  async toggleActive(tenantId: string, id: string, isActive: boolean) {
    const existing = await db.workflowDefinition.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Workflow not found");
    const stored: StoredWorkflow = (existing.actions as any) || {};
    const updated = await db.workflowDefinition.update({
      where: { id },
      data: {
        actions: {
          ...(stored as any),
          isActive,
        } as any,
      },
    });
    return serialize(updated);
  }

  async remove(tenantId: string, id: string) {
    const existing = await db.workflowDefinition.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Workflow not found");
    // Cascade: delete workflow runs first to avoid FK constraint errors
    await db.$transaction(async (tx: any) => {
      await tx.workflowRun.deleteMany({ where: { workflowDefinitionId: id, tenantId } });
      await tx.workflowDefinition.delete({ where: { id } });
    });
  }
}
