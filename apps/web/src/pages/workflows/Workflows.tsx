import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { api } from "../../lib/axios.js";
import { formatTimeAgo } from "@antigravity/utils";
import { toast } from "sonner";
import {
  Plus,
  Zap,
  Flame,
  Snowflake,
  PhoneMissed,
  TrendingUp,
  MoreHorizontal,
  Trash2,
  Copy,
  Play,
  Pause,
  Workflow as WorkflowIcon,
  Sparkles,
} from "lucide-react";
import { PageHeader, AppButton, Segmented } from "../../components/common/UI.tsx";
import {
  StatusPill,
  SearchInput,
  DataTable,
} from "../../components/ui-ext/index.js";
import type { Column } from "../../components/ui-ext/index.js";
import type { WorkflowDef } from "./types.js";
import { TEMPLATES, getBlockDef, TONE_STYLES } from "./registry.js";
import { BlockIcon } from "./components/BlockIcon.js";
import { createPortal } from "react-dom";

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Snowflake,
  PhoneMissed,
  TrendingUp,
};

export function Workflows(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "paused">("all");

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => (await api.get("/workflows")).data.data as WorkflowDef[],
  });

  const createFromTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const t = TEMPLATES.find((x) => x.id === templateId);
      if (!t) throw new Error("Template not found");
      const built = t.build();
      const res = await api.post("/workflows", built);
      return res.data.data as WorkflowDef;
    },
    onSuccess: (data) => {
      toast.success(`Created "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      navigate(`/workflows/${data.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to create workflow"),
  });

  const createBlank = useMutation({
    mutationFn: async () => {
      const res = await api.post("/workflows", {
        name: "Untitled workflow",
        description: "",
        isActive: false,
        trigger: { type: "CALL_ENDED", config: { outcome: "any", direction: "any" } },
        steps: [],
      });
      return res.data.data as WorkflowDef;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      navigate(`/workflows/${data.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to create workflow"),
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
      return res.data.data as WorkflowDef;
    },
    onSuccess: (data) => {
      toast.success("Duplicated");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      navigate(`/workflows/${data.id}`);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to duplicate"),
  });

  const filtered = React.useMemo(() => {
    return workflows.filter((w) => {
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
  }, [workflows, statusFilter, search]);

  const stats = React.useMemo(() => {
    const active = workflows.filter((w) => w.isActive).length;
    const totalRuns = workflows.reduce((s, w) => s + (w.runCount || 0), 0);
    return { total: workflows.length, active, paused: workflows.length - active, totalRuns };
  }, [workflows]);

  const columns: Column<WorkflowDef>[] = [
    {
      id: "name",
      header: "Workflow",
      sortValue: (r) => r.name.toLowerCase(),
      cell: (w) => {
        const triggerDef = getBlockDef(w.trigger.type);
        return (
          <div className="flex items-center gap-3 min-w-0">
            <BlockIcon icon={triggerDef?.icon || "Zap"} tone="positive" size="md" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-fg-primary truncate leading-tight">{w.name}</div>
              <div className="text-[10.5px] text-fg-muted truncate mt-0.5">
                {triggerDef?.label || w.trigger.type} · {w.steps.length} step{w.steps.length === 1 ? "" : "s"}
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
      width: "200px",
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
            onDuplicate={() => duplicate.mutate(w)}
            onDelete={() => {
              if (window.confirm(`Delete "${w.name}"? Runs history will be removed.`)) {
                remove.mutate(w.id);
              }
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <PageWrapper noScroll={true}>
      <div className="flex flex-col h-full overflow-hidden font-sans">
        <PageHeader
          title="Workflows"
          subtitle={<span>Automate follow-ups, deals, and alerts from calls and CRM events.</span>}
          actions={
            <AppButton
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => createBlank.mutate()}
              disabled={createBlank.isPending}
            >
              New workflow
            </AppButton>
          }
        />

        {workflows.length === 0 && !isLoading ? (
          <EmptyWorkflows
            onCreateBlank={() => createBlank.mutate()}
            onUseTemplate={(id) => createFromTemplate.mutate(id)}
          />
        ) : (
          <>
            {/* Stat strip */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11.5px] shrink-0 mb-2 px-0.5">
              <span className="inline-flex items-center gap-1.5 text-fg-secondary">
                <WorkflowIcon className="h-3 w-3 text-fg-muted" />
                <b className="text-fg-primary tabular-nums">{stats.total}</b>{" "}
                <span className="text-fg-muted">total</span>
              </span>
              <span className="text-line-strong">·</span>
              <span className="text-fg-secondary">
                <b className="text-blue-600 tabular-nums">{stats.active}</b>{" "}
                <span className="text-fg-muted">active</span>
              </span>
              <span className="text-line-strong">·</span>
              <span className="text-fg-secondary">
                <b className="text-fg-primary tabular-nums">{stats.paused}</b>{" "}
                <span className="text-fg-muted">paused</span>
              </span>
              <span className="text-line-strong">·</span>
              <span className="text-fg-secondary">
                <b className="text-fg-primary tabular-nums">{stats.totalRuns}</b>{" "}
                <span className="text-fg-muted">runs all-time</span>
              </span>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 shrink-0 mb-2">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search workflows by name or trigger…"
                className="flex-1 max-w-sm"
              />
              <Segmented
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: "All", value: "all" },
                  { label: "Active", value: "active" },
                  { label: "Paused", value: "paused" },
                ]}
              />
            </div>

            {/* Table */}
            <div className="flex-1 min-h-0 flex flex-col">
              <DataTable
                rows={filtered}
                columns={columns}
                getRowId={(r) => r.id}
                isLoading={isLoading}
                onRowClick={(r) => navigate(`/workflows/${r.id}`)}
                scrollClassName="flex-1"
                className="flex-1"
                emptyState={
                  <div className="p-12 text-center text-[13px] font-semibold text-fg-primary">
                    No matching workflows
                    <div className="text-[11.5px] text-fg-muted font-normal mt-1">
                      Try clearing search or switching the status filter.
                    </div>
                  </div>
                }
              />
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  );
}

export default Workflows;

/* ─────────────────────── Empty state ─────────────────────── */

function EmptyWorkflows({
  onCreateBlank,
  onUseTemplate,
}: {
  onCreateBlank: () => void;
  onUseTemplate: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto -mx-1 px-1">
      <div className="max-w-3xl mx-auto py-3 space-y-4">
        {/* Hero */}
        <div
          className="rounded-2xl overflow-hidden text-white shadow-[0_20px_50px_-16px_rgba(37,99,235,0.5)]"
          style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 55%, #4F46E5 100%)" }}
        >
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
                  Workflows react to your AI calls and CRM events — send follow-ups,
                  create deals, notify Slack. Pick a template or start blank.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={onCreateBlank}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg text-[13px] font-semibold bg-white text-blue-700 hover:bg-white/90 shadow-card"
                  >
                    <Plus className="h-4 w-4" /> Start blank workflow
                  </button>
                  <span className="text-[11.5px] text-white/80 ml-1">
                    or pick a template ↓
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Templates */}
        <div>
          <div className="mb-2">
            <h3 className="text-[13px] font-semibold text-fg-primary">Templates</h3>
            <p className="text-[11px] text-fg-muted mt-0.5">Pre-wired flows — you tweak, we run them.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {TEMPLATES.map((t) => {
              const Icon = TEMPLATE_ICONS[t.icon] || Zap;
              const tone = TONE_STYLES[t.tone];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onUseTemplate(t.id)}
                  className="text-left rounded-xl bg-white border border-line-default hover:border-blue-500/40 hover:shadow-raised p-4 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className={`h-11 w-11 rounded-xl ${tone.tile} ring-1 ${tone.ring} flex items-center justify-center shrink-0`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-fg-primary leading-tight group-hover:text-blue-700 transition-colors">
                        {t.name}
                      </div>
                      <div className="text-[11.5px] text-fg-secondary mt-1 leading-relaxed">
                        {t.description}
                      </div>
                    </div>
                    <Plus className="h-4 w-4 text-fg-muted group-hover:text-blue-600 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-line-default bg-white p-4">
          <h3 className="text-[13px] font-semibold text-fg-primary mb-3">How workflows think</h3>
          <ul className="space-y-2.5 text-[12px] text-fg-secondary leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-50 text-blue-700 text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-500/25">
                1
              </span>
              <div>
                <b className="text-fg-primary">One trigger:</b> Every workflow starts with a
                single event — a call ending, or a contact matching a CRM filter.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-blue-50 text-blue-700 text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-blue-500/25">
                2
              </span>
              <div>
                <b className="text-fg-primary">Chain actions:</b> Send SMS, make a call, notify
                Slack, or update the CRM. Add a filter on any step so it only runs when it should.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-5 w-5 rounded-full bg-amber-50 text-amber-700 text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-amber-500/25">
                3
              </span>
              <div>
                <b className="text-fg-primary">Branch with logic:</b> Use if/else and wait blocks to
                model real-world decisions and delays.
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Row menu (portal) ─────────────────────── */

function RowMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const openMenu = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuW = 170;
    let top = r.bottom + 6;
    if (top + 100 > window.innerHeight - 8) top = r.top - 6 - 100;
    let left = r.right - menuW;
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
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 170, zIndex: 1000 }}
            className="bg-white border border-line-default rounded-lg shadow-pop py-1"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDuplicate();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-fg-primary hover:bg-slate-50"
            >
              <Copy className="h-3.5 w-3.5 text-fg-muted" />
              Duplicate
            </button>
            <div className="h-px bg-line-subtle my-1" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium text-rose-500 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
