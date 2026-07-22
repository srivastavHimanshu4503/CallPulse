import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Modal } from "@antigravity/ui";
import { toast } from "sonner";
import {
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Filter,
  Sparkles,
  Trash2,
  FolderKanban,
} from "lucide-react";
import { api } from "../../../lib/axios.js";

interface Pipeline {
  id: string;
  name: string;
  stages: string[];
  stageConfigs?: StageRow[];
  filters?: any[] | null;
}

interface StageRow {
  name: string;
  color: string;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}

interface CustomFieldDef {
  id: string;
  name: string;
  type: "TEXT" | "NUMBER" | "BOOLEAN" | "DROPDOWN" | "DATE";
  options: string[];
}

interface PipelineSettingsModalProps {
  /** Pass a pipeline object to edit; omit to create. */
  pipeline?: Pipeline | null;
  customFieldDefs: CustomFieldDef[];
  onClose: () => void;
  onSaved: (pipeline: Pipeline) => void;
  onDeleted?: () => void;
}

// Spec-default stage set — each stage carries its own probability so the
// weighted forecast works out of the box.
const DEFAULT_STAGES: StageRow[] = [
  { name: "New Lead", color: "#64748b", probability: 10, isWon: false, isLost: false },
  { name: "Qualified", color: "#0ea5e9", probability: 30, isWon: false, isLost: false },
  { name: "Discovery", color: "#6366f1", probability: 45, isWon: false, isLost: false },
  { name: "Proposal Sent", color: "#f59e0b", probability: 70, isWon: false, isLost: false },
  { name: "Negotiation", color: "#f97316", probability: 90, isWon: false, isLost: false },
  { name: "Closed Won", color: "#10b981", probability: 100, isWon: true, isLost: false },
  { name: "Closed Lost", color: "#ef4444", probability: 0, isWon: false, isLost: true },
];

const STAGE_COLORS = [
  "#64748b", "#0ea5e9", "#6366f1", "#8b5cf6", "#f59e0b",
  "#f97316", "#10b981", "#14b8a6", "#ef4444", "#ec4899",
];

const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n) || 0));

const toStageRows = (pipeline?: Pipeline | null): StageRow[] => {
  if (pipeline?.stageConfigs && pipeline.stageConfigs.length > 0) {
    return pipeline.stageConfigs.map((s) => ({
      name: s.name,
      color: s.color || "#6366f1",
      probability: s.probability ?? 10,
      isWon: !!s.isWon,
      isLost: !!s.isLost,
    }));
  }
  if (pipeline?.stages && pipeline.stages.length > 0) {
    return pipeline.stages.map((name, i) => ({
      name,
      color: STAGE_COLORS[i % STAGE_COLORS.length]!,
      probability: Math.min(95, Math.round((i / Math.max(1, pipeline.stages.length - 1)) * 90) + 10),
      isWon: name.toLowerCase().includes("won"),
      isLost: name.toLowerCase().includes("lost"),
    }));
  }
  return DEFAULT_STAGES.map((s) => ({ ...s }));
};

export function PipelineSettingsModal({
  pipeline,
  customFieldDefs,
  onClose,
  onSaved,
  onDeleted,
}: PipelineSettingsModalProps): React.JSX.Element {
  const isEditing = !!pipeline;

  const [name, setName] = React.useState(pipeline?.name || "");
  const [stages, setStages] = React.useState<StageRow[]>(() => toStageRows(pipeline));
  const [useFilter, setUseFilter] = React.useState(
    !!(pipeline?.filters && pipeline.filters.length > 0),
  );
  const [filterFieldId, setFilterFieldId] = React.useState(
    pipeline?.filters?.[0]?.fieldDefinitionId || "",
  );
  const [filterFieldValue, setFilterFieldValue] = React.useState(
    pipeline?.filters?.[0]?.value || "",
  );
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const dropdownFields = React.useMemo(
    () => customFieldDefs.filter((d) => d.type === "DROPDOWN"),
    [customFieldDefs],
  );
  const filterOptions = React.useMemo(() => {
    const def = customFieldDefs.find((d) => d.id === filterFieldId);
    return def?.options || [];
  }, [filterFieldId, customFieldDefs]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanStages = stages
        .map((s) => ({ ...s, name: s.name.trim(), probability: clampPct(s.probability) }))
        .filter((s) => s.name);
      if (!name.trim() || cleanStages.length === 0) {
        throw new Error("Pipeline name and at least one stage are required");
      }
      const filters =
        useFilter && filterFieldId && filterFieldValue
          ? [{ fieldDefinitionId: filterFieldId, value: filterFieldValue }]
          : null;
      const payload = { name: name.trim(), stages: cleanStages, filters };

      if (isEditing) {
        const res = await api.put(`/crm/pipelines/${pipeline!.id}`, payload);
        return res.data.data as Pipeline;
      }
      const res = await api.post("/crm/pipelines", payload);
      return res.data.data as Pipeline;
    },
    onSuccess: (data) => {
      toast.success(isEditing ? "Pipeline updated" : `Created "${data.name}"`);
      onSaved(data);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || "Failed to save pipeline");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!pipeline) return;
      await api.delete(`/crm/pipelines/${pipeline.id}`);
    },
    onSuccess: () => {
      toast.success("Pipeline deleted");
      onDeleted?.();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || "Failed to delete pipeline");
    },
  });

  const patchStage = (i: number, patch: Partial<StageRow>) => {
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const setOutcome = (i: number, outcome: "open" | "won" | "lost") => {
    // Won implies 100%, Lost implies 0% — still editable afterwards.
    if (outcome === "won") patchStage(i, { isWon: true, isLost: false, probability: 100 });
    else if (outcome === "lost") patchStage(i, { isWon: false, isLost: true, probability: 0 });
    else patchStage(i, { isWon: false, isLost: false });
  };
  const addStage = () =>
    setStages((prev) => [
      ...prev,
      {
        name: "",
        color: STAGE_COLORS[prev.length % STAGE_COLORS.length]!,
        probability: 50,
        isWon: false,
        isLost: false,
      },
    ]);
  const removeStage = (i: number) => {
    if (stages.length <= 1) return;
    setStages(stages.filter((_, idx) => idx !== i));
  };
  const moveStage = (i: number, dir: "up" | "down") => {
    const target = dir === "up" ? i - 1 : i + 1;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    const t = next[i]!;
    next[i] = next[target]!;
    next[target] = t;
    setStages(next);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-500/20 flex items-center justify-center">
            <FolderKanban className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-fg-primary">
            {isEditing ? "Pipeline settings" : "New pipeline"}
          </span>
        </div>
      }
    >
      <div className="flex flex-col max-h-[85vh] font-sans">
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-[11.5px] font-semibold text-fg-primary mb-1.5">
              Pipeline name
              <span className="text-negative-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sales pipeline · Rental leads · Student admissions"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-raised border border-line-default focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 text-[13px] text-fg-primary placeholder-fg-muted rounded-md h-10 px-3 focus:outline-none shadow-card"
            />
          </div>

          {/* Stages */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11.5px] font-semibold text-fg-primary">
                Stages <span className="text-negative-500">*</span>
                <span className="text-fg-muted font-normal ml-1.5">
                  · left-to-right on the board
                </span>
              </label>
              <button
                type="button"
                onClick={addStage}
                className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50"
              >
                <Plus className="h-3 w-3" /> Add stage
              </button>
            </div>

            {/* Column labels */}
            <div className="hidden sm:flex items-center gap-1.5 px-2 mb-1 text-[9.5px] font-bold text-fg-muted uppercase tracking-wider">
              <span className="w-5" />
              <span className="w-5" />
              <span className="flex-1">Stage name</span>
              <span className="w-[76px] text-center">Win %</span>
              <span className="w-[132px] text-center">Outcome</span>
              <span className="w-[84px]" />
            </div>

            <ul className="space-y-1.5">
              {stages.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center gap-1.5 bg-bg-subtle border border-line-default rounded-md p-1.5 pl-2 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/15"
                >
                  <GripVertical className="h-3.5 w-3.5 text-fg-muted shrink-0" />

                  {/* Color swatch — cycles through the palette on click */}
                  <button
                    type="button"
                    onClick={() => {
                      const idx = STAGE_COLORS.indexOf(s.color);
                      patchStage(i, { color: STAGE_COLORS[(idx + 1) % STAGE_COLORS.length]! });
                    }}
                    className="h-5 w-5 rounded-full border-2 border-bg-raised ring-1 ring-line-strong shrink-0 transition-transform hover:scale-110"
                    style={{ backgroundColor: s.color }}
                    title="Click to change stage color"
                  />

                  <input
                    type="text"
                    value={s.name}
                    placeholder={`Stage ${i + 1}`}
                    onChange={(e) => patchStage(i, { name: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent border-0 text-[12.5px] text-fg-primary placeholder-fg-muted h-8 focus:outline-none focus:ring-0"
                  />

                  {/* Per-stage default probability */}
                  <div className="flex items-center gap-0.5 shrink-0 w-[76px] justify-center" title="Default win probability for deals entering this stage">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={s.probability}
                      onChange={(e) => patchStage(i, { probability: clampPct(Number(e.target.value)) })}
                      className="w-12 h-7 bg-bg-raised border border-line-default focus:border-brand-500 text-[11.5px] font-semibold text-fg-primary text-center rounded focus:outline-none"
                    />
                    <span className="text-[10px] font-bold text-fg-muted">%</span>
                  </div>

                  {/* Outcome: Open / Won / Lost */}
                  <div className="flex items-center rounded-md border border-line-default bg-bg-raised p-0.5 shrink-0" title="Deals in a Won/Lost stage count as closed">
                    {(["open", "won", "lost"] as const).map((o) => {
                      const active = o === "won" ? s.isWon : o === "lost" ? s.isLost : !s.isWon && !s.isLost;
                      return (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setOutcome(i, o)}
                          className={`h-6 px-1.5 rounded text-[9.5px] font-bold uppercase tracking-wide transition-colors ${
                            active
                              ? o === "won"
                                ? "bg-positive-50 text-positive-600"
                                : o === "lost"
                                  ? "bg-negative-50 text-negative-500"
                                  : "bg-bg-muted text-fg-primary"
                              : "text-fg-muted hover:text-fg-secondary"
                          }`}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => moveStage(i, "up")}
                      disabled={i === 0}
                      className="h-7 w-7 rounded text-fg-muted hover:text-fg-primary hover:bg-bg-raised disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center"
                      title="Move up"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStage(i, "down")}
                      disabled={i === stages.length - 1}
                      className="h-7 w-7 rounded text-fg-muted hover:text-fg-primary hover:bg-bg-raised disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center"
                      title="Move down"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStage(i)}
                      disabled={stages.length <= 1}
                      className="h-7 w-7 rounded text-fg-muted hover:text-negative-500 hover:bg-negative-50 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center"
                      title="Remove stage"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <p className="text-[10.5px] text-fg-muted mt-2 leading-relaxed flex items-start gap-1">
              <Sparkles className="h-3 w-3 text-brand-500 shrink-0 mt-px" />
              Win % sets the default probability for deals entering each stage — it powers the
              weighted revenue forecast. Reps can still override it per deal.
            </p>
          </div>

          {/* Smart filter */}
          <div className="rounded-md border border-line-default bg-bg-subtle p-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useFilter}
                onChange={(e) => setUseFilter(e.target.checked)}
                className="h-4 w-4 rounded border-line-strong text-brand-500 focus:ring-2 focus:ring-brand-500/30 cursor-pointer"
              />
              <span className="text-[12px] font-semibold text-fg-primary inline-flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-brand-500" />
                Auto-add matching contacts
              </span>
            </label>
            <p className="text-[10.5px] text-fg-muted mt-1.5 leading-relaxed pl-6">
              Contacts whose custom field matches your rule flow into this pipeline
              automatically — even after a call. Great for "MBA course = Yes" style routing.
            </p>

            {useFilter && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <div>
                  <label className="block text-[10.5px] font-semibold text-fg-secondary mb-1">
                    Custom field
                  </label>
                  <select
                    value={filterFieldId}
                    onChange={(e) => {
                      setFilterFieldId(e.target.value);
                      setFilterFieldValue("");
                    }}
                    className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
                  >
                    <option value="">Choose field…</option>
                    {dropdownFields.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10.5px] font-semibold text-fg-secondary mb-1">
                    Must equal
                  </label>
                  <select
                    value={filterFieldValue}
                    onChange={(e) => setFilterFieldValue(e.target.value)}
                    disabled={!filterFieldId}
                    className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">Choose value…</option>
                    {filterOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                {dropdownFields.length === 0 && (
                  <div className="col-span-1 sm:col-span-2 text-[10.5px] text-attention-600 bg-attention-50 border border-attention-500/25 rounded-md p-2 leading-relaxed">
                    <Sparkles className="inline h-3 w-3 mr-1 align-text-bottom" />
                    Create a <b>dropdown</b> custom field on the Custom Fields tab first.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Delete pipeline (edit mode only) */}
          {isEditing && onDeleted && (
            <div className="rounded-md border border-negative-500/25 bg-negative-50 p-3">
              {confirmDelete ? (
                <div className="space-y-2">
                  <div className="text-[11.5px] font-semibold text-negative-600">
                    Delete “{pipeline?.name}”?
                  </div>
                  <div className="text-[10.5px] text-fg-secondary leading-relaxed">
                    Deals stay — they get detached from this pipeline. You can reassign
                    them later.
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      className="inline-flex items-center gap-1 h-7 px-3 rounded-md text-[11px] font-semibold bg-negative-500 hover:bg-negative-600 text-white disabled:opacity-50"
                    >
                      {deleteMutation.isPending ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="text-[11px] font-semibold text-fg-secondary hover:text-fg-primary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-negative-500 hover:text-negative-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete this pipeline
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-line-default px-5 py-3 bg-bg-subtle flex items-center justify-end gap-2 shrink-0">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            className="border border-line-default bg-bg-raised hover:bg-bg-muted text-fg-primary font-semibold text-[12px] h-9 px-3.5 rounded-md shadow-none"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim()}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[12px] h-9 px-3.5 rounded-md border-none shadow-card disabled:opacity-50"
          >
            {saveMutation.isPending
              ? isEditing
                ? "Saving…"
                : "Creating…"
              : isEditing
                ? "Save changes"
                : "Create pipeline"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
