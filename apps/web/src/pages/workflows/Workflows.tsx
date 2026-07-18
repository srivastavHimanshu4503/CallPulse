import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { api } from "../../lib/axios.js";
import { formatTimeAgo } from "@antigravity/utils";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Copy,
  Play,
  Pause,
  Workflow as WorkflowIcon,
  Home,
  ChevronRight,
  FolderInput,
  Folder,
  FolderPlus,
  Sparkles,
} from "lucide-react";
import { PageHeader, AppButton, Segmented } from "../../components/common/UI.tsx";
import {
  StatusPill,
  SearchInput,
  DataTable,
} from "../../components/ui-ext/index.js";
import type { Column } from "../../components/ui-ext/index.js";
import type { WorkflowDef, WorkflowFolder as WorkflowFolderT } from "./types.js";
import { TEMPLATES, getBlockDef } from "./registry.js";
import { BlockIcon } from "./components/BlockIcon.js";
import { FolderTree } from "./components/FolderTree.js";
import { FolderFormModal } from "./components/FolderFormModal.js";
import type { FolderFormMode } from "./components/FolderFormModal.js";
import { DeleteFolderModal } from "./components/DeleteFolderModal.js";
import { CreateWorkflowModal } from "./components/CreateWorkflowModal.js";
import { FolderPickerModal } from "./components/FolderPickerModal.js";
import { DeleteWorkflowModal } from "./components/DeleteWorkflowModal.js";
import { BulkDeleteWorkflowsModal } from "./components/BulkDeleteWorkflowsModal.js";

/**
 * Workflow list page. Two selection states:
 *   - `null`   → "All workflows" (everything, folder shown as inline chip)
 *   - `<uuid>` → that specific folder (subfolder cards + contained workflows)
 *
 * Creation always goes through CreateWorkflowModal — user explicitly picks
 * a starting point (blank / template) AND the target folder. No implicit
 * behaviour based on where the user happened to be selected.
 */
export function Workflows(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "paused">("all");
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null);

  // Dialog state — only one open at a time.
  const [folderDialog, setFolderDialog] = React.useState<
    | { kind: "form"; mode: FolderFormMode; targetId?: string; parentId: string | null; initialName?: string }
    | { kind: "delete"; targetId: string }
    | { kind: "move-folder"; targetId: string }
    | null
  >(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [movingWorkflow, setMovingWorkflow] = React.useState<WorkflowDef | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = React.useState<WorkflowDef | null>(null);

  // Multi-select for bulk actions
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkAction, setBulkAction] = React.useState<"delete" | "move" | null>(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => (await api.get("/workflows")).data.data as WorkflowDef[],
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["workflow-folders"],
    queryFn: async () => (await api.get("/workflows/folders")).data.data as WorkflowFolderT[],
  });

  // ───────────────── Mutations ─────────────────

  const createWorkflow = useMutation({
    mutationFn: async ({
      templateId,
      folderId,
    }: {
      templateId: string | null;
      folderId: string | null;
    }) => {
      const body = templateId
        ? TEMPLATES.find((t) => t.id === templateId)?.build()
        : {
            name: "Untitled workflow",
            description: "",
            isActive: false,
            trigger: { type: "CALL_ENDED", config: { outcome: "any", direction: "any" } },
            steps: [],
          };
      if (!body) throw new Error("Template not found");
      const res = await api.post("/workflows", body);
      const created = res.data.data as WorkflowDef;
      if (folderId) {
        await api.put(`/workflows/${created.id}/move`, { folderId });
        return { ...created, folderId };
      }
      return created;
    },
    onSuccess: (data) => {
      toast.success(`Created “${data.name}”`);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-folders"] });
      setIsCreateOpen(false);
      navigate(`/workflows/${data.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to create workflow"),
  });

  const createFolder = useMutation({
    mutationFn: async ({ parentId, name }: { parentId: string | null; name: string }) => {
      const res = await api.post("/workflows/folders", { name, parentId });
      return res.data.data as WorkflowFolderT;
    },
    onSuccess: (data) => {
      toast.success(`Folder “${data.name}” created`);
      queryClient.invalidateQueries({ queryKey: ["workflow-folders"] });
      setSelectedFolder(data.id);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to create folder"),
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await api.put(`/workflows/folders/${id}/rename`, { name });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-folders"] }),
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to rename folder"),
  });

  const moveFolder = useMutation({
    mutationFn: async ({ id, parentId }: { id: string; parentId: string | null }) => {
      await api.put(`/workflows/folders/${id}/move`, { parentId });
    },
    onSuccess: () => {
      toast.success("Folder moved");
      queryClient.invalidateQueries({ queryKey: ["workflow-folders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to move folder"),
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflows/folders/${id}`);
    },
    onSuccess: () => {
      toast.success("Folder deleted");
      queryClient.invalidateQueries({ queryKey: ["workflow-folders"] });
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to delete folder"),
  });

  const moveWorkflow = useMutation({
    mutationFn: async ({ id, folderId }: { id: string; folderId: string | null }) => {
      await api.put(`/workflows/${id}/move`, { folderId });
    },
    onSuccess: () => {
      toast.success("Moved");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-folders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to move workflow"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.post(`/workflows/${id}/toggle`, { isActive });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflows"] }),
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to toggle"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflows/${id}`);
    },
    onSuccess: () => {
      toast.success("Workflow deleted");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-folders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to delete"),
  });

  const duplicate = useMutation({
    mutationFn: async (wf: WorkflowDef) => {
      const res = await api.post("/workflows", {
        name: `${wf.name} (copy)`,
        description: wf.description,
        isActive: false,
        trigger: wf.trigger,
        steps: wf.steps,
      });
      const created = res.data.data as WorkflowDef;
      if (wf.folderId) {
        await api.put(`/workflows/${created.id}/move`, { folderId: wf.folderId });
      }
      return created;
    },
    onSuccess: (data) => {
      toast.success("Duplicated");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-folders"] });
      navigate(`/workflows/${data.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to duplicate"),
  });

  const bulkDelete = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/workflows/bulk-delete", { ids });
      return res.data.data as { deleted: number; skipped: number };
    },
    onSuccess: (data) => {
      toast.success(
        `Deleted ${data.deleted} workflow${data.deleted === 1 ? "" : "s"}${
          data.skipped ? ` · ${data.skipped} skipped` : ""
        }`,
      );
      setSelectedIds([]);
      setBulkAction(null);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-folders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Bulk delete failed"),
  });

  const bulkMove = useMutation({
    mutationFn: async ({ ids, folderId }: { ids: string[]; folderId: string | null }) => {
      const res = await api.post("/workflows/bulk-move", { ids, folderId });
      return res.data.data as { moved: number; skipped: number };
    },
    onSuccess: (data) => {
      toast.success(`Moved ${data.moved} workflow${data.moved === 1 ? "" : "s"}`);
      setSelectedIds([]);
      setBulkAction(null);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-folders"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Bulk move failed"),
  });

  // ───────────────── Filtering ─────────────────

  const scoped = React.useMemo(() => {
    if (selectedFolder === null) return workflows;
    return workflows.filter((w) => w.folderId === selectedFolder);
  }, [workflows, selectedFolder]);

  // Reset selection when scope/search/filter changes so stale ids don't linger.
  React.useEffect(() => {
    setSelectedIds([]);
  }, [selectedFolder, statusFilter, search]);

  const filtered = React.useMemo(() => {
    return scoped.filter((w) => {
      if (statusFilter === "active" && !w.isActive) return false;
      if (statusFilter === "paused" && w.isActive) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          w.name.toLowerCase().includes(q) ||
          w.trigger.type.toLowerCase().includes(q) ||
          (w.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [scoped, statusFilter, search]);

  const stats = React.useMemo(() => {
    const active = workflows.filter((w) => w.isActive).length;
    return { total: workflows.length, active, paused: workflows.length - active };
  }, [workflows]);

  const subfolders = React.useMemo(() => {
    if (!selectedFolder) return [];
    return folders.filter((f) => f.parentId === selectedFolder);
  }, [folders, selectedFolder]);

  // ───────────────── Dialog openers ─────────────────

  const openCreateFolderDialog = (parentId: string | null) => {
    setFolderDialog({
      kind: "form",
      mode: parentId ? "create-sub" : "create-root",
      parentId,
    });
  };

  const openRenameFolderDialog = (id: string) => {
    const current = folders.find((f) => f.id === id);
    if (!current) return;
    setFolderDialog({
      kind: "form",
      mode: "rename",
      targetId: id,
      parentId: current.parentId,
      initialName: current.name,
    });
  };

  const openMoveFolderDialog = (id: string) => {
    setFolderDialog({ kind: "move-folder", targetId: id });
  };

  const openDeleteFolderDialog = (id: string) => {
    setFolderDialog({ kind: "delete", targetId: id });
  };

  const submitFolderForm = (name: string) => {
    if (!folderDialog || folderDialog.kind !== "form") return;
    if (folderDialog.mode === "rename" && folderDialog.targetId) {
      renameFolder.mutate({ id: folderDialog.targetId, name });
    } else {
      createFolder.mutate({ parentId: folderDialog.parentId, name });
    }
    setFolderDialog(null);
  };

  const confirmDeleteDialog = () => {
    if (!folderDialog || folderDialog.kind !== "delete") return;
    const target = folders.find((f) => f.id === folderDialog.targetId);
    deleteFolder.mutate(folderDialog.targetId);
    if (selectedFolder === folderDialog.targetId) {
      setSelectedFolder(target?.parentId || null);
    }
    setFolderDialog(null);
  };

  const confirmMoveFolderDialog = (newParentId: string | null) => {
    if (!folderDialog || folderDialog.kind !== "move-folder") return;
    moveFolder.mutate({ id: folderDialog.targetId, parentId: newParentId });
    setFolderDialog(null);
  };

  // ───────────────── Columns ─────────────────

  const columns: Column<WorkflowDef>[] = [
    {
      id: "name",
      header: "Workflow",
      sortValue: (r) => r.name.toLowerCase(),
      cell: (w) => {
        const triggerDef = getBlockDef(w.trigger.type);
        const folder = w.folderId ? folders.find((f) => f.id === w.folderId) : null;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <BlockIcon icon={triggerDef?.icon || "Zap"} tone="positive" size="md" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-fg-primary truncate leading-tight">
                {w.name}
              </div>
              <div className="text-[10.5px] text-fg-muted truncate mt-0.5 flex items-center gap-1 flex-wrap">
                <span>{triggerDef?.label || w.trigger.type}</span>
                <span>·</span>
                <span>{w.steps.length} step{w.steps.length === 1 ? "" : "s"}</span>
                {folder && selectedFolder === null && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5">
                      <Folder className="h-2.5 w-2.5 text-amber-500" />
                      {folder.name}
                    </span>
                  </>
                )}
                {!folder && selectedFolder === null && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-0.5 text-fg-muted italic">
                      no folder
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      width: "104px",
      sortValue: (r) => (r.isActive ? 1 : 0),
      cell: (w) => (
        <StatusPill tone={w.isActive ? "positive" : "muted"} dot pulse={w.isActive}>
          {w.isActive ? "Active" : "Paused"}
        </StatusPill>
      ),
    },
    {
      id: "runs",
      header: "Runs",
      width: "80px",
      sortValue: (r) => r.runCount || 0,
      cell: (w) => (
        <span className="text-[12px] font-semibold text-fg-primary tabular-nums">
          {w.runCount ?? 0}
        </span>
      ),
    },
    {
      id: "lastRun",
      header: "Last run",
      width: "130px",
      sortValue: (r) => (r.lastRunAt ? new Date(r.lastRunAt) : null),
      cell: (w) => (
        <span className="text-[11.5px] text-fg-secondary">
          {w.lastRunAt ? formatTimeAgo(w.lastRunAt) : <span className="text-fg-muted">Never</span>}
        </span>
      ),
    },
    {
      id: "updatedAt",
      header: "Updated",
      width: "120px",
      sortValue: (r) => (r.updatedAt ? new Date(r.updatedAt) : null),
      cell: (w) => (
        <span className="text-[11.5px] text-fg-secondary">
          {w.updatedAt ? formatTimeAgo(w.updatedAt) : "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "220px",
      align: "right",
      cell: (w) => (
        <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => toggleActive.mutate({ id: w.id, isActive: !w.isActive })}
            className={`inline-flex items-center justify-center gap-1 h-8 w-[80px] rounded-md text-[11.5px] font-semibold border ${
              w.isActive
                ? "border-line-default bg-white text-fg-secondary hover:text-fg-primary hover:bg-slate-50"
                : "border-blue-500/30 bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            {w.isActive ? (
              <>
                <Pause className="h-3 w-3" /> Pause
              </>
            ) : (
              <>
                <Play className="h-3 w-3" /> Enable
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/workflows/${w.id}`)}
            className="inline-flex items-center justify-center gap-1 h-8 w-[70px] rounded-md text-[11.5px] font-semibold bg-blue-500 hover:bg-blue-600 text-white shadow-card"
          >
            Open
          </button>
          <RowMenu
            onMove={() => setMovingWorkflow(w)}
            onDuplicate={() => duplicate.mutate(w)}
            onDelete={() => setDeletingWorkflow(w)}
          />
        </div>
      ),
    },
  ];

  // ───────────────── Breadcrumb ─────────────────

  const breadcrumb = React.useMemo(() => {
    const path: { id: string | null; label: string }[] = [{ id: null, label: "All workflows" }];
    if (selectedFolder) {
      const chain: { id: string; name: string }[] = [];
      let cursor: WorkflowFolderT | undefined = folders.find((f) => f.id === selectedFolder);
      while (cursor) {
        chain.unshift({ id: cursor.id, name: cursor.name });
        cursor = cursor.parentId ? folders.find((f) => f.id === cursor!.parentId) : undefined;
      }
      for (const p of chain) path.push({ id: p.id, label: p.name });
    }
    return path;
  }, [selectedFolder, folders]);

  const currentFolder = React.useMemo(
    () => (selectedFolder ? folders.find((f) => f.id === selectedFolder) || null : null),
    [selectedFolder, folders],
  );

  const currentFolderName = currentFolder?.name;

  return (
    <PageWrapper noScroll={true}>
      <div className="flex flex-col h-full overflow-hidden font-sans">
        <PageHeader
          title="Workflows"
          subtitle={
            <span>
              Automations that react to your AI calls and CRM events. Group them into folders as
              your library grows.
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <AppButton
                variant="secondary"
                icon={<FolderPlus className="h-4 w-4" />}
                onClick={() => openCreateFolderDialog(selectedFolder)}
              >
                New folder
              </AppButton>
              <AppButton
                variant="primary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateOpen(true)}
              >
                New workflow
              </AppButton>
            </div>
          }
        />

        <div className="flex-1 flex overflow-hidden min-h-0">
          <FolderTree
            folders={folders}
            selected={selectedFolder}
            onSelect={setSelectedFolder}
            onCreate={openCreateFolderDialog}
            onRename={openRenameFolderDialog}
            onDelete={openDeleteFolderDialog}
            onMove={openMoveFolderDialog}
            rootWorkflowCount={stats.total}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {workflows.length === 0 && !isLoading ? (
              <EmptyWorkflows onCreate={() => setIsCreateOpen(true)} />
            ) : (
              <>
                {/* Breadcrumb + row count */}
                <div className="px-4 pt-3 pb-2 border-b border-line-subtle shrink-0 flex items-center flex-wrap gap-1">
                  {breadcrumb.map((b, i) => (
                    <React.Fragment key={String(b.id) + i}>
                      {i > 0 && <ChevronRight className="h-3 w-3 text-fg-muted shrink-0" />}
                      <button
                        type="button"
                        onClick={() => setSelectedFolder(b.id)}
                        className={
                          i === breadcrumb.length - 1
                            ? "inline-flex items-center gap-1 text-[12.5px] font-semibold text-fg-primary"
                            : "inline-flex items-center gap-1 text-[12px] font-medium text-fg-secondary hover:text-blue-700"
                        }
                      >
                        {i === 0 && <Home className="h-3 w-3" />}
                        {b.label}
                      </button>
                    </React.Fragment>
                  ))}
                  <span className="ml-auto text-[11.5px] text-fg-muted">
                    {scoped.length} workflow{scoped.length === 1 ? "" : "s"} here
                  </span>
                </div>

                {/* Toolbar */}
                <div className="px-4 py-2 flex items-center gap-2 shrink-0">
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder={selectedFolder ? `Search inside ${currentFolderName}…` : "Search all workflows…"}
                    className="flex-1 max-w-sm"
                  />
                  <Segmented
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as any)}
                    options={[
                      { label: "All", value: "all" },
                      { label: "Active", value: "active" },
                      { label: "Paused", value: "paused" },
                    ]}
                  />
                </div>

                <div className="flex-1 min-h-0 flex flex-col px-4 pb-4 gap-3">
                  {/* Subfolder cards */}
                  {currentFolder && subfolders.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-1.5">
                        Sub-folders
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {subfolders.map((sf) => (
                          <button
                            key={sf.id}
                            type="button"
                            onClick={() => setSelectedFolder(sf.id)}
                            className="text-left flex items-center gap-2.5 p-2.5 rounded-lg border border-line-default bg-white hover:border-blue-500/40 hover:shadow-card transition-all"
                          >
                            <span className="h-9 w-9 rounded-lg bg-amber-50 text-amber-500 ring-1 ring-amber-500/25 flex items-center justify-center shrink-0">
                              <Folder className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[12.5px] font-semibold text-fg-primary truncate leading-tight">
                                {sf.name}
                              </div>
                              <div className="text-[10.5px] text-fg-muted mt-0.5">
                                {sf.workflowCount} workflow{sf.workflowCount === 1 ? "" : "s"}
                                {sf.childCount > 0 && ` · ${sf.childCount} sub-folder${sf.childCount === 1 ? "" : "s"}`}
                              </div>
                            </div>
                            <ChevronRight className="h-3.5 w-3.5 text-fg-muted" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bulk action bar — visible only when rows are selected */}
                  {selectedIds.length > 0 && (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-blue-500/30 bg-blue-50 px-3 py-2 shrink-0 animate-in fade-in duration-150">
                      <div className="text-[12px] font-semibold text-blue-700">
                        {selectedIds.length} selected
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setBulkAction("move")}
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11.5px] font-semibold bg-white border border-line-default text-fg-primary hover:bg-slate-50"
                        >
                          <FolderInput className="h-3 w-3" />
                          Move to folder
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkAction("delete")}
                          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[11.5px] font-semibold bg-white border border-rose-500 text-rose-500 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedIds([])}
                          className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-[11.5px] font-semibold text-fg-secondary hover:text-fg-primary hover:bg-white"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <DataTable
                      rows={filtered}
                      columns={columns}
                      getRowId={(r) => r.id}
                      selectedIds={selectedIds}
                      onSelectionChange={setSelectedIds}
                      isLoading={isLoading}
                      onRowClick={(r) => navigate(`/workflows/${r.id}`)}
                      scrollClassName="flex-1"
                      className="flex-1"
                      emptyState={
                        <div className="p-8 text-center">
                          <WorkflowIcon className="h-8 w-8 text-fg-muted mx-auto mb-2" />
                          <div className="text-[13px] font-semibold text-fg-primary">
                            {search || statusFilter !== "all"
                              ? "No matching workflows here"
                              : selectedFolder
                                ? "This folder is empty"
                                : "No workflows yet"}
                          </div>
                          <div className="text-[11.5px] text-fg-muted mt-1 leading-relaxed max-w-sm mx-auto">
                            {search || statusFilter !== "all" ? (
                              "Try clearing filters."
                            ) : selectedFolder ? (
                              <>
                                Click <b className="text-fg-primary">+ New workflow</b> above — pick this folder in the dialog to add one here.
                              </>
                            ) : (
                              <>Click <b className="text-fg-primary">+ New workflow</b> above.</>
                            )}
                          </div>
                        </div>
                      }
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Modals ─── */}
        {isCreateOpen && (
          <CreateWorkflowModal
            folders={folders}
            defaultFolderId={selectedFolder}
            isSaving={createWorkflow.isPending}
            onClose={() => setIsCreateOpen(false)}
            onSubmit={(args) => createWorkflow.mutate(args)}
          />
        )}

        {deletingWorkflow && (
          <DeleteWorkflowModal
            workflowName={deletingWorkflow.name}
            runCount={deletingWorkflow.runCount}
            isActive={deletingWorkflow.isActive}
            isDeleting={remove.isPending}
            onClose={() => setDeletingWorkflow(null)}
            onConfirm={() => {
              const id = deletingWorkflow.id;
              remove.mutate(id, {
                onSuccess: () => setDeletingWorkflow(null),
              });
            }}
          />
        )}

        {bulkAction === "delete" && selectedIds.length > 0 && (
          <BulkDeleteWorkflowsModal
            workflows={workflows.filter((w) => selectedIds.includes(w.id))}
            isDeleting={bulkDelete.isPending}
            onClose={() => setBulkAction(null)}
            onConfirm={() => bulkDelete.mutate(selectedIds)}
          />
        )}

        {bulkAction === "move" && selectedIds.length > 0 && (
          <FolderPickerModal
            title={`Move ${selectedIds.length} workflow${selectedIds.length === 1 ? "" : "s"} to…`}
            helper="Pick a folder — every selected workflow moves there."
            folders={folders}
            currentId={null}
            confirmLabel={`Move ${selectedIds.length} here`}
            isSaving={bulkMove.isPending}
            onClose={() => setBulkAction(null)}
            onPick={(fid) => bulkMove.mutate({ ids: selectedIds, folderId: fid })}
          />
        )}

        {movingWorkflow && (
          <FolderPickerModal
            title="Move workflow to folder"
            helper={`Choose where “${movingWorkflow.name}” should live. Currently ${
              movingWorkflow.folderId
                ? `in “${folders.find((f) => f.id === movingWorkflow.folderId)?.name || "…"}”`
                : "not in any folder"
            }.`}
            folders={folders}
            currentId={movingWorkflow.folderId ?? null}
            isSaving={moveWorkflow.isPending}
            onClose={() => setMovingWorkflow(null)}
            onPick={(fid) => {
              moveWorkflow.mutate({ id: movingWorkflow.id, folderId: fid });
              setMovingWorkflow(null);
            }}
          />
        )}

        {folderDialog?.kind === "form" && (
          <FolderFormModal
            mode={folderDialog.mode}
            initialName={folderDialog.initialName || ""}
            parentName={
              folderDialog.mode === "create-sub" && folderDialog.parentId
                ? folders.find((f) => f.id === folderDialog.parentId)?.name
                : undefined
            }
            isSaving={createFolder.isPending || renameFolder.isPending}
            onClose={() => setFolderDialog(null)}
            onSubmit={submitFolderForm}
          />
        )}

        {folderDialog?.kind === "move-folder" &&
          (() => {
            const target = folders.find((f) => f.id === folderDialog.targetId);
            if (!target) return null;
            return (
              <FolderPickerModal
                title="Move folder to…"
                helper={`Choose the new parent for “${target.name}”. Everything inside comes along.`}
                folders={folders}
                excludeFolderId={target.id}
                currentId={target.parentId}
                isSaving={moveFolder.isPending}
                onClose={() => setFolderDialog(null)}
                onPick={confirmMoveFolderDialog}
              />
            );
          })()}

        {folderDialog?.kind === "delete" &&
          (() => {
            const target = folders.find((f) => f.id === folderDialog.targetId);
            if (!target) return null;
            const parentName = target.parentId
              ? folders.find((f) => f.id === target.parentId)?.name || null
              : null;
            return (
              <DeleteFolderModal
                folderName={target.name}
                workflowCount={target.workflowCount}
                subfolderCount={target.childCount}
                parentName={parentName}
                isDeleting={deleteFolder.isPending}
                onClose={() => setFolderDialog(null)}
                onConfirm={confirmDeleteDialog}
              />
            );
          })()}
      </div>
    </PageWrapper>
  );
}

export default Workflows;

/* ─────────────────────── Empty state ─────────────────────── */

function EmptyWorkflows({ onCreate }: { onCreate: () => void }): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto -mx-1 px-1">
      <div className="max-w-2xl mx-auto py-4 space-y-4 px-4">
        <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 via-blue-500 to-indigo-600 text-white shadow-[0_20px_50px_-16px_rgba(59,130,246,0.5)]">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur ring-1 ring-white/30 flex items-center justify-center shrink-0">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[19px] font-semibold tracking-tight leading-tight">
                  Turn every call into a next-step
                </h2>
                <p className="text-[13px] text-white/85 mt-1.5 leading-relaxed max-w-xl">
                  Create your first workflow — start blank or pick a template. Organise them into
                  folders as your library grows.
                </p>
                <button
                  type="button"
                  onClick={onCreate}
                  className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-[13px] font-semibold bg-white text-blue-700 hover:bg-white/90 shadow-card mt-4"
                >
                  <Plus className="h-4 w-4" /> Create workflow
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-line-default bg-white p-4">
          <h3 className="text-[13px] font-semibold text-fg-primary mb-3">How folders work</h3>
          <ul className="space-y-2 text-[12px] text-fg-secondary leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-50 text-blue-700 text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-500/25">
                1
              </span>
              <div>
                <b className="text-fg-primary">Create folders</b> for anything — campaign, team, or vertical (e.g. “Real-estate follow-ups”). Nest as deep as you want.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-50 text-blue-700 text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-500/25">
                2
              </span>
              <div>
                <b className="text-fg-primary">Assign on create</b> — the “New workflow” dialog lets you pick a folder right then.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-50 text-blue-700 text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-500/25">
                3
              </span>
              <div>
                <b className="text-fg-primary">Move anytime</b> — every workflow and folder has a <b className="text-fg-primary">⋯</b> menu with <b className="text-fg-primary">Move to…</b>.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Row menu (portal) — simplified ─────────────────────── */

function RowMenu({
  onMove,
  onDuplicate,
  onDelete,
}: {
  onMove: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const openMenu = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const w = 180;
    let top = r.bottom + 6;
    if (top + 150 > window.innerHeight - 8) top = r.top - 6 - 150;
    let left = r.right - w;
    if (left < 8) left = 8;
    setPos({ top, left });
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onWin = () => setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        aria-label="More actions"
        className={`h-8 w-8 rounded-md border flex items-center justify-center transition-colors ${
          open
            ? "bg-slate-100 border-line-default text-fg-primary"
            : "bg-white border-line-default text-fg-secondary hover:text-fg-primary hover:bg-slate-50"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 180, zIndex: 1000 }}
            className="bg-white border border-line-default rounded-lg shadow-pop py-1"
          >
            <MenuItem
              icon={FolderInput}
              label="Move to folder…"
              onClick={() => {
                setOpen(false);
                onMove();
              }}
            />
            <MenuItem
              icon={Copy}
              label="Duplicate"
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
            />
            <div className="h-px bg-line-subtle my-1" />
            <MenuItem
              icon={Trash2}
              label="Delete"
              destructive
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors ${
        destructive ? "text-rose-500 hover:bg-rose-50" : "text-fg-primary hover:bg-slate-50"
      }`}
    >
      <Icon className={`h-3.5 w-3.5 ${destructive ? "text-rose-500" : "text-fg-muted"}`} />
      {label}
    </button>
  );
}
