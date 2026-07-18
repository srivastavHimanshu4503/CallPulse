import { db } from "../../config/database.js";

/**
 * Persistence for the workflow-folder tree. Folders form a nested tree
 * (parentId is nullable — null means the folder lives at the root).
 * Workflows themselves reference a folder via folderId (null = ungrouped).
 */

interface FolderNode {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  workflowCount: number;
  childCount: number;
}

export class WorkflowFoldersService {
  /** Flat list of folders with counts. UI builds the tree. */
  async list(tenantId: string): Promise<FolderNode[]> {
    const folders = await db.workflowFolder.findMany({
      where: { tenantId },
      orderBy: [{ parentId: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { workflows: true, children: true } },
      },
    });

    return folders.map((f: any) => ({
      id: f.id,
      name: f.name,
      parentId: f.parentId,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
      workflowCount: f._count.workflows,
      childCount: f._count.children,
    }));
  }

  async create(tenantId: string, name: string, parentId: string | null): Promise<FolderNode> {
    const cleanName = name.trim() || "Untitled folder";
    if (parentId) {
      // Guard: parent must belong to the same tenant.
      const parent = await db.workflowFolder.findFirst({ where: { id: parentId, tenantId } });
      if (!parent) throw new Error("Parent folder not found");
    }
    const created = await db.workflowFolder.create({
      data: { tenantId, name: cleanName, parentId: parentId || null },
    });
    return {
      id: created.id,
      name: created.name,
      parentId: created.parentId,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      workflowCount: 0,
      childCount: 0,
    };
  }

  async rename(tenantId: string, id: string, name: string): Promise<void> {
    const existing = await db.workflowFolder.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Folder not found");
    await db.workflowFolder.update({
      where: { id },
      data: { name: name.trim() || existing.name },
    });
  }

  /** Change a folder's parent. Prevents cycles (a folder cannot be its own
   *  descendant) by walking up from the proposed parent. */
  async move(tenantId: string, id: string, newParentId: string | null): Promise<void> {
    const existing = await db.workflowFolder.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Folder not found");
    if (id === newParentId) throw new Error("A folder cannot be its own parent");

    if (newParentId) {
      // Walk up from newParent to ensure `id` is not among the ancestors.
      let cursor: string | null = newParentId;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === id) throw new Error("Cannot move a folder into its own descendant");
        if (seen.has(cursor)) break; // corrupt tree — bail out
        seen.add(cursor);
        const parent: { parentId: string | null } | null = await db.workflowFolder.findFirst({
          where: { id: cursor, tenantId },
          select: { parentId: true },
        });
        cursor = parent?.parentId ?? null;
      }
    }

    await db.workflowFolder.update({
      where: { id },
      data: { parentId: newParentId },
    });
  }

  /** Delete a folder. Its immediate child folders + workflows re-parent to
   *  the deleted folder's own parent (or become root). No cascade of
   *  workflow deletion — those stay safe. */
  async remove(tenantId: string, id: string): Promise<void> {
    const existing = await db.workflowFolder.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error("Folder not found");
    const newParentId = existing.parentId;

    await db.$transaction(async (tx: any) => {
      await tx.workflowFolder.updateMany({
        where: { parentId: id, tenantId },
        data: { parentId: newParentId },
      });
      await tx.workflowDefinition.updateMany({
        where: { folderId: id, tenantId },
        data: { folderId: newParentId },
      });
      await tx.workflowFolder.delete({ where: { id } });
    });
  }
}
