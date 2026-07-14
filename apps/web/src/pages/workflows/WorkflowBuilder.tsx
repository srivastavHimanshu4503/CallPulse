import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { api } from "../../lib/axios.js";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Trash2,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@antigravity/ui";
import { StatusPill } from "../../components/ui-ext/index.js";
import type { WorkflowDef, BlockNode, BlockType, Trigger } from "./types.js";
import { getBlockDef, rid } from "./registry.js";
import { BlockLibrary } from "./components/BlockLibrary.js";
import { WorkflowCanvas } from "./components/WorkflowCanvas.js";
import { BlockInspector } from "./components/BlockInspector.js";

/**
 * Workflow builder — 3-column layout.
 *  • Trigger is always present + auto-selected on load. Cannot be deleted.
 *  • Left library holds actions + logic only.
 *  • Canvas is a vertical top-to-bottom chain.
 *  • Right inspector renders the schema-driven form + inline filter.
 */
export function WorkflowBuilder(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: fetched, isLoading } = useQuery({
    queryKey: ["workflow", id],
    queryFn: async () => (await api.get(`/workflows/${id}`)).data.data as WorkflowDef,
    enabled: !!id,
  });

  const [wf, setWf] = React.useState<WorkflowDef | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [isTriggerSelected, setIsTriggerSelected] = React.useState(true);
  const [renaming, setRenaming] = React.useState(false);

  React.useEffect(() => {
    if (fetched) {
      setWf({ ...fetched, steps: cloneTree(fetched.steps) });
      setIsTriggerSelected(true);
      setSelectedId(null);
    }
  }, [fetched]);

  const dirty = React.useMemo(() => {
    if (!wf || !fetched) return false;
    return JSON.stringify(stripMeta(wf)) !== JSON.stringify(stripMeta(fetched));
  }, [wf, fetched]);

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ───────────── Mutations ─────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!wf) return;
      const res = await api.put(`/workflows/${wf.id}`, {
        name: wf.name,
        description: wf.description,
        isActive: wf.isActive,
        trigger: wf.trigger,
        steps: wf.steps,
      });
      return res.data.data as WorkflowDef;
    },
    onSuccess: (data) => {
      if (data) {
        setWf({ ...data, steps: cloneTree(data.steps) });
        queryClient.setQueryData(["workflow", id], data);
        queryClient.invalidateQueries({ queryKey: ["workflows"] });
        toast.success("Saved");
      }
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to save"),
  });

  const toggleActive = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!wf) return;
      await api.post(`/workflows/${wf.id}/toggle`, { isActive });
      return isActive;
    },
    onSuccess: (isActive) => {
      if (isActive === undefined) return;
      setWf((prev) => (prev ? { ...prev, isActive: isActive as boolean } : prev));
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      toast.success((isActive as boolean) ? "Workflow enabled" : "Workflow paused");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to toggle"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!wf) return;
      await api.delete(`/workflows/${wf.id}`);
    },
    onSuccess: () => {
      toast.success("Workflow deleted");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
      navigate("/workflows");
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || "Failed to delete"),
  });

  // ───────────── Tree operations ─────────────

  const changeTriggerType = (type: string) => {
    if (!wf) return;
    const def = getBlockDef(type);
    if (!def || def.category !== "trigger") return;
    setWf({
      ...wf,
      trigger: { type: type as any, config: { ...def.defaultConfig }, filter: wf.trigger.filter || null },
    });
    setIsTriggerSelected(true);
    setSelectedId(null);
  };

  const buildStep = (type: string): BlockNode | null => {
    const def = getBlockDef(type);
    if (!def || def.category === "trigger") return null;
    const step: BlockNode = {
      id: rid(),
      type: type as BlockType,
      config: { ...def.defaultConfig },
    };
    if (type === "IF") step.children = { then: [], else: [] };
    return step;
  };

  const handleAddByType = (afterId: string | null, type: string) => {
    if (!wf) return;
    const step = buildStep(type);
    if (!step) return;
    setWf({ ...wf, steps: insertAfter(wf.steps, afterId, step) });
    setSelectedId(step.id);
    setIsTriggerSelected(false);
  };

  const handleAddInBranch = (parentId: string, branch: "then" | "else", afterId: string | null, type: string = "SEND_SMS") => {
    if (!wf) return;
    const step = buildStep(type);
    if (!step) return;
    setWf({
      ...wf,
      steps: insertInBranch(wf.steps, parentId, branch, afterId, step),
    });
    setSelectedId(step.id);
    setIsTriggerSelected(false);
  };

  const deleteStep = (stepId: string) => {
    if (!wf) return;
    setWf({ ...wf, steps: removeStep(wf.steps, stepId) });
    if (selectedId === stepId) {
      setSelectedId(null);
      setIsTriggerSelected(true);
    }
  };

  const patchStepById = (stepId: string, patch: Partial<BlockNode>) => {
    if (!wf) return;
    setWf({ ...wf, steps: patchStep(wf.steps, stepId, (s) => ({ ...s, ...patch })) });
  };

  const selectedStep = React.useMemo(() => {
    if (!wf || !selectedId) return null;
    return findStep(wf.steps, selectedId);
  }, [wf, selectedId]);

  const inspectorTarget = isTriggerSelected && wf
    ? { kind: "trigger" as const, trigger: wf.trigger }
    : selectedStep
      ? { kind: "step" as const, step: selectedStep }
      : null;

  // ───────────── Render ─────────────

  if (isLoading || !wf) {
    return (
      <PageWrapper noScroll>
        <div className="h-full flex items-center justify-center">
          <div className="animate-pulse text-fg-muted text-[13px]">Loading workflow…</div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper noScroll>
      <div className="flex flex-col h-full overflow-hidden font-sans bg-slate-50">
        {/* Top bar */}
        <div className="h-14 shrink-0 border-b border-line-default bg-white flex items-center px-3 gap-3">
          <button
            type="button"
            onClick={() => {
              if (dirty && !window.confirm("Unsaved changes will be lost. Leave?")) return;
              navigate("/workflows");
            }}
            className="h-9 w-9 rounded-md border border-line-default bg-slate-50 hover:bg-slate-100 text-fg-secondary hover:text-fg-primary flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <span className="h-6 w-px bg-line-subtle" />

          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                type="text"
                value={wf.name}
                autoFocus
                onChange={(e) => setWf({ ...wf, name: e.target.value })}
                onBlur={() => setRenaming(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") setRenaming(false);
                }}
                className="w-full max-w-md bg-white border border-line-default focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 text-[14px] font-semibold text-fg-primary rounded-md h-9 px-2.5 focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setRenaming(true)}
                className="inline-flex items-center gap-2 text-left group"
              >
                <Zap className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-[14px] font-semibold text-fg-primary truncate max-w-md group-hover:underline">
                  {wf.name}
                </span>
                <span className="text-[10.5px] text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  rename
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {dirty ? (
              <StatusPill tone="attention" dot>
                Unsaved
              </StatusPill>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-fg-muted font-medium">
                <Check className="h-3 w-3 text-emerald-500" />
                Saved
              </span>
            )}

            <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-line-subtle ml-1">
              <span className="text-[10.5px] font-semibold text-fg-secondary">
                {wf.isActive ? "Live" : "Paused"}
              </span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={wf.isActive}
                  onChange={(e) => toggleActive.mutate(e.target.checked)}
                />
                <span className="w-9 h-5 bg-line-strong rounded-full peer-checked:bg-emerald-500 transition-colors" />
                <span
                  className={`absolute top-[2px] left-[2px] h-4 w-4 bg-white border border-line-default rounded-full shadow-card transition-transform ${
                    wf.isActive ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete "${wf.name}"? This can't be undone.`)) {
                  remove.mutate();
                }
              }}
              className="h-9 w-9 rounded-md border border-line-default bg-slate-50 hover:bg-rose-50 hover:border-rose-500/30 hover:text-rose-500 text-fg-secondary flex items-center justify-center transition-colors"
              aria-label="Delete workflow"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <Button
              variant="primary"
              onClick={() => saveMutation.mutate()}
              disabled={!dirty || saveMutation.isPending}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md text-[12px] font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-card border-none disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saveMutation.isPending ? "Saving…" : "Save workflow"}
            </Button>
          </div>
        </div>

        {/* 3-col body */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          <BlockLibrary
            onAddBlock={(t) => {
              const afterId = selectedStep?.id || (wf.steps.length > 0 ? wf.steps[wf.steps.length - 1]!.id : null);
              handleAddByType(afterId, t);
            }}
            activeType={selectedStep?.type || null}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <WorkflowCanvas
              trigger={wf.trigger}
              steps={wf.steps}
              selectedId={selectedId}
              isTriggerSelected={isTriggerSelected}
              onSelectTrigger={() => {
                setIsTriggerSelected(true);
                setSelectedId(null);
              }}
              onSelectStep={(sid) => {
                setSelectedId(sid);
                setIsTriggerSelected(false);
              }}
              onChangeTriggerType={changeTriggerType}
              onAddStep={(afterId, type) => handleAddByType(afterId, type || "SEND_SMS")}
              onAddStepBranch={(parentId, branch, afterId) =>
                handleAddInBranch(parentId, branch, afterId, "SEND_SMS")
              }
              onDeleteStep={(stepId) => deleteStep(stepId)}
            />
          </div>

          <BlockInspector
            target={inspectorTarget}
            onChangeTrigger={(t: Trigger) => setWf({ ...wf, trigger: t })}
            onChangeStep={(patch) => selectedStep && patchStepById(selectedStep.id, patch)}
            onClose={() => {
              setSelectedId(null);
              setIsTriggerSelected(true);
            }}
          />
        </div>
      </div>
    </PageWrapper>
  );
}

export default WorkflowBuilder;

/* ─────────────────────── Tree helpers (pure) ─────────────────────── */

function cloneTree(steps: BlockNode[]): BlockNode[] {
  return steps.map((s) => ({
    ...s,
    config: { ...s.config },
    filter: s.filter ? { ...s.filter, conditions: [...s.filter.conditions] } : s.filter,
    children: s.children
      ? { then: cloneTree(s.children.then), else: cloneTree(s.children.else) }
      : undefined,
  }));
}

function stripMeta(w: WorkflowDef): any {
  const { createdAt: _c, updatedAt: _u, runCount: _r, lastRunAt: _l, ...rest } = w as any;
  return rest;
}

function insertAfter(steps: BlockNode[], afterId: string | null, node: BlockNode): BlockNode[] {
  if (afterId === null) return [...steps, node];
  const out: BlockNode[] = [];
  let inserted = false;
  for (const s of steps) {
    const nextS: BlockNode = { ...s };
    if (nextS.children) {
      nextS.children = {
        then: insertAfter(nextS.children.then, afterId, node),
        else: insertAfter(nextS.children.else, afterId, node),
      };
    }
    out.push(nextS);
    if (nextS.id === afterId && !inserted) {
      out.push(node);
      inserted = true;
    }
  }
  return out;
}

function insertInBranch(
  steps: BlockNode[],
  parentId: string,
  branch: "then" | "else",
  afterId: string | null,
  node: BlockNode,
): BlockNode[] {
  return steps.map((s) => {
    if (s.id === parentId && s.children) {
      return {
        ...s,
        children: {
          ...s.children,
          [branch]: insertAfter(s.children[branch], afterId, node),
        },
      };
    }
    if (s.children) {
      return {
        ...s,
        children: {
          then: insertInBranch(s.children.then, parentId, branch, afterId, node),
          else: insertInBranch(s.children.else, parentId, branch, afterId, node),
        },
      };
    }
    return s;
  });
}

function removeStep(steps: BlockNode[], id: string): BlockNode[] {
  return steps
    .filter((s) => s.id !== id)
    .map((s) =>
      s.children
        ? {
            ...s,
            children: {
              then: removeStep(s.children.then, id),
              else: removeStep(s.children.else, id),
            },
          }
        : s,
    );
}

function patchStep(
  steps: BlockNode[],
  id: string,
  patcher: (s: BlockNode) => BlockNode,
): BlockNode[] {
  return steps.map((s) => {
    if (s.id === id) return patcher(s);
    if (s.children) {
      return {
        ...s,
        children: {
          then: patchStep(s.children.then, id, patcher),
          else: patchStep(s.children.else, id, patcher),
        },
      };
    }
    return s;
  });
}

function findStep(steps: BlockNode[], id: string): BlockNode | null {
  for (const s of steps) {
    if (s.id === id) return s;
    if (s.children) {
      const t = findStep(s.children.then, id);
      if (t) return t;
      const e = findStep(s.children.else, id);
      if (e) return e;
    }
  }
  return null;
}
