import * as React from "react";
import { Plus, Trash2, GitBranch, ChevronDown, Filter as FilterIcon, AlertCircle } from "lucide-react";
import { getBlockDef, TONE_STYLES, listByCategory } from "../registry.js";
import type { BlockNode, Trigger, BlockDef } from "../types.js";
import { BlockIcon } from "./BlockIcon.js";
import { cn } from "@antigravity/ui";
import { FilterLogicalOperator, FilterOperator } from "@antigravity/types";

interface WorkflowCanvasProps {
  trigger: Trigger;
  steps: BlockNode[];
  selectedId: string | null;
  isTriggerSelected: boolean;
  onSelectTrigger: () => void;
  onSelectStep: (id: string) => void;
  onChangeTriggerType: (type: string) => void;
  onAddStep: (afterId: string | null, type?: string) => void;
  onAddStepBranch: (parentId: string, branch: "then" | "else", afterId: string | null) => void;
  onDeleteStep: (id: string) => void;
}

/**
 * Vertical top-down builder. Trigger is a fixed first card (same size as
 * step cards). Filter conditions render inline where they matter — as
 * PRIMARY content on the CONTACT_MATCHES trigger, and as chips on any
 * block that has an optional filter set.
 */
export function WorkflowCanvas({
  trigger,
  steps,
  selectedId,
  isTriggerSelected,
  onSelectTrigger,
  onSelectStep,
  onChangeTriggerType,
  onAddStep,
  onAddStepBranch,
  onDeleteStep,
}: WorkflowCanvasProps): React.JSX.Element {
  return (
    <div
      className="flex-1 overflow-auto"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(15,23,42,0.06) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="min-h-full flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-[440px] flex flex-col items-center gap-0">
          <TriggerCard
            trigger={trigger}
            selected={isTriggerSelected}
            onClick={onSelectTrigger}
            onChangeType={onChangeTriggerType}
          />

          {steps.length === 0 ? (
            <>
              <Connector tone="positive" />
              <AddButton
                onSelect={(t) => onAddStep(null, t)}
                label="Add first action"
                isPrimary
              />
            </>
          ) : (
            <StepChain
              steps={steps}
              selectedId={selectedId}
              onSelectStep={onSelectStep}
              onAddStep={onAddStep}
              onAddStepBranch={onAddStepBranch}
              onDeleteStep={onDeleteStep}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Trigger card ─────────────────── */

function TriggerCard({
  trigger,
  selected,
  onClick,
  onChangeType,
}: {
  trigger: Trigger;
  selected: boolean;
  onClick: () => void;
  onChangeType: (type: string) => void;
}): React.JSX.Element {
  const def = getBlockDef(trigger.type);
  const triggerOptions = listByCategory("trigger");
  const filter = trigger.filter;
  const needsFilter = def?.requiresFilter && (!filter || filter.conditions.length === 0);

  return (
    <div
      onClick={onClick}
      className={cn(
        "w-full rounded-xl bg-white cursor-pointer transition-all overflow-hidden",
        selected
          ? "ring-2 ring-emerald-500/40 border-2 border-emerald-500 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.35)]"
          : "border border-line-default hover:border-emerald-500/40 shadow-card",
      )}
    >
      {/* Green top strip */}
      <div className="h-[3px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500" />

      <div className="p-3">
        {/* Type selector (segmented, always visible) */}
        <div
          className="flex items-center gap-1 p-1 bg-emerald-50/70 border border-emerald-500/20 rounded-md mb-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {triggerOptions.map((opt) => {
            const isActive = opt.type === trigger.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => onChangeType(opt.type)}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1 h-7 px-2 rounded text-[11px] font-semibold transition-all",
                  isActive
                    ? "bg-white text-emerald-700 shadow-card ring-1 ring-emerald-500/25"
                    : "text-emerald-800/60 hover:text-emerald-800 hover:bg-white/40",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Header row */}
        <div className="flex items-start gap-2.5">
          <BlockIcon icon={def?.icon || "Zap"} tone="positive" size="md" />
          <div className="min-w-0 flex-1">
            <div className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700">
              Trigger
            </div>
            <div className="text-[13.5px] font-semibold text-fg-primary tracking-tight leading-tight mt-0.5">
              {def?.label}
            </div>
            <div className="text-[11px] text-fg-secondary leading-snug mt-0.5">
              {def?.description}
            </div>
          </div>
        </div>

        {/* Config content — differs by trigger type */}
        {trigger.type === "CALL_ENDED" && (
          <CallEndedConfigSummary config={trigger.config} />
        )}

        {trigger.type === "CONTACT_MATCHES" && (
          <ContactMatchesFilterView filter={filter} needsFilter={!!needsFilter} />
        )}

        {/* Optional filter chips (for CALL_ENDED — additional contact filter) */}
        {trigger.type === "CALL_ENDED" && filter && filter.conditions.length > 0 && (
          <InlineFilterChips filter={filter} label="Also only if contact" />
        )}
      </div>
    </div>
  );
}

function CallEndedConfigSummary({ config }: { config: Record<string, any> }): React.JSX.Element {
  const outcomeLabels: Record<string, string> = {
    any: "Any outcome",
    positive: "Positive sentiment",
    negative: "Negative sentiment",
    missed: "Missed / no answer",
  };
  const directionLabels: Record<string, string> = {
    any: "Inbound or outbound",
    inbound: "Inbound only",
    outbound: "Outbound only",
  };
  return (
    <div className="mt-2.5 rounded-md bg-emerald-50/60 border border-emerald-500/20 px-2.5 py-1.5 flex items-center gap-2 flex-wrap text-[11px]">
      <span className="text-fg-muted font-medium">Outcome:</span>
      <b className="text-emerald-700">{outcomeLabels[config.outcome] || "any"}</b>
      <span className="h-3 w-px bg-emerald-500/25" />
      <span className="text-fg-muted font-medium">Direction:</span>
      <b className="text-emerald-700">{directionLabels[config.direction] || "any"}</b>
    </div>
  );
}

function ContactMatchesFilterView({
  filter,
  needsFilter,
}: {
  filter: any;
  needsFilter: boolean;
}): React.JSX.Element {
  if (needsFilter) {
    return (
      <div className="mt-2.5 rounded-md bg-amber-50 border border-amber-500/30 px-2.5 py-2 flex items-start gap-2">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-[11px] text-amber-800 leading-relaxed">
          <b>Add at least one condition</b> to define who this workflow targets.
          Open the inspector on the right to add rules like <i>lead score ≥ 75</i>.
        </div>
      </div>
    );
  }
  return (
    <div className="mt-2.5">
      <div className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1">
        <FilterIcon className="h-3 w-3" />
        Match {filter.logical === FilterLogicalOperator.AND ? "ALL" : "ANY"}
      </div>
      <FilterConditionChips filter={filter} tone="positive" />
    </div>
  );
}

/* ─────────────────── Step chain ─────────────────── */

function StepChain({
  steps,
  selectedId,
  onSelectStep,
  onAddStep,
  onAddStepBranch,
  onDeleteStep,
}: {
  steps: BlockNode[];
  selectedId: string | null;
  onSelectStep: (id: string) => void;
  onAddStep: (afterId: string | null, type?: string) => void;
  onAddStepBranch: (parentId: string, branch: "then" | "else", afterId: string | null) => void;
  onDeleteStep: (id: string) => void;
}): React.JSX.Element {
  return (
    <div className="w-full flex flex-col items-center">
      {steps.map((s, i) => {
        const def = getBlockDef(s.type);
        const tone = def?.tone || "muted";
        return (
          <React.Fragment key={s.id}>
            <Connector tone={i === 0 ? "positive" : tone} />
            <StepCard
              step={s}
              selected={selectedId === s.id}
              onSelect={() => onSelectStep(s.id)}
              onDelete={() => onDeleteStep(s.id)}
              onSelectStep={onSelectStep}
              onAddStepBranch={onAddStepBranch}
              onDeleteStep={onDeleteStep}
              selectedId={selectedId}
            />
            <Connector tone={tone} />
            <AddButton onSelect={(t) => onAddStep(s.id, t)} label={i === steps.length - 1 ? "Add next step" : ""} icon={i !== steps.length - 1} />
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─────────────────── Step card (compact) ─────────────────── */

function StepCard({
  step,
  selected,
  onSelect,
  onDelete,
  onSelectStep,
  onAddStepBranch,
  onDeleteStep,
  selectedId,
}: {
  step: BlockNode;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSelectStep: (id: string) => void;
  onAddStepBranch: (parentId: string, branch: "then" | "else", afterId: string | null) => void;
  onDeleteStep: (id: string) => void;
  selectedId: string | null;
}): React.JSX.Element {
  const def = getBlockDef(step.type);
  const tone = def?.tone || "muted";
  const t = TONE_STYLES[tone];

  return (
    <div
      onClick={onSelect}
      className={cn(
        "w-full rounded-xl bg-white cursor-pointer transition-all overflow-hidden group",
        selected
          ? "ring-2 ring-blue-500/40 border-2 border-blue-500 shadow-[0_8px_24px_-8px_rgba(59,130,246,0.35)]"
          : "border border-line-default hover:border-line-strong shadow-card",
      )}
    >
      <div className={cn("h-[3px]", t.bar)} />

      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start gap-2.5">
          <BlockIcon icon={def?.icon || "Zap"} tone={tone} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className={cn("text-[9.5px] font-bold uppercase tracking-wider", t.text)}>
                {def?.category === "logic" ? "Logic" : "Action"}
              </span>
              {step.type === "IF" && <GitBranch className={cn("h-3 w-3", t.text)} />}
            </div>
            <div className="text-[13px] font-semibold text-fg-primary tracking-tight leading-tight mt-0.5">
              {def?.label || step.type}
            </div>
            <div className="text-[11px] text-fg-secondary leading-snug mt-0.5">
              {def ? def.summary(step.config) : "Configure this step"}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded text-fg-muted hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center shrink-0"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>

        {/* One tight preview row when meaningful */}
        <CompactPreview config={step.config} def={def} tone={tone} />

        {/* Filter chips */}
        {def?.supportsFilter && step.filter && step.filter.conditions.length > 0 && (
          <div className="mt-2">
            <div className={cn("text-[9.5px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1", t.text)}>
              <FilterIcon className="h-3 w-3" />
              Only if contact
            </div>
            <FilterConditionChips filter={step.filter} tone={tone} />
          </div>
        )}

        {/* Two-lane branches for IF */}
        {step.type === "IF" && step.children && (
          <div className="mt-2.5 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
            <BranchColumn
              label="If TRUE"
              tone="positive"
              steps={step.children.then}
              selectedId={selectedId}
              onSelectStep={onSelectStep}
              onAddInBranch={(afterId) => onAddStepBranch(step.id, "then", afterId)}
              onDeleteStep={onDeleteStep}
            />
            <BranchColumn
              label="If FALSE"
              tone="negative"
              steps={step.children.else}
              selectedId={selectedId}
              onSelectStep={onSelectStep}
              onAddInBranch={(afterId) => onAddStepBranch(step.id, "else", afterId)}
              onDeleteStep={onDeleteStep}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────── Compact preview (one row of chips or a quote) ─────────────────── */

function CompactPreview({
  config,
  def,
  tone,
}: {
  config: Record<string, any>;
  def: BlockDef | undefined;
  tone: keyof typeof TONE_STYLES;
}): React.JSX.Element {
  const t = TONE_STYLES[tone];
  if (!def) return <></>;
  const rows = def.preview ? def.preview(config) : [];
  if (rows.length === 0) return <></>;

  // Prefer showing the quote if there is one — it's the most informative.
  const quote = rows.find((r: any) => r.kind === "quote");
  if (quote) {
    return (
      <div className={cn("mt-2 rounded-md border-l-2 px-2 py-1.5 italic text-[11.5px] text-fg-primary leading-relaxed", t.border, t.softBg)}>
        "{(quote as any).value}"
      </div>
    );
  }

  const chips = rows.filter((r: any) => r.kind === "chip");
  if (chips.length === 0) return <></>;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {chips.map((c: any, i: number) => (
        <span
          key={i}
          className={cn(
            "inline-flex items-center gap-1 rounded text-[10.5px] font-semibold px-1.5 py-0.5 ring-1",
            t.tile,
            t.ring,
          )}
        >
          {c.label && <span className="opacity-60 font-medium">{c.label}:</span>}
          <span>{c.value}</span>
        </span>
      ))}
    </div>
  );
}

/* ─────────────────── Filter condition chips ─────────────────── */

function FilterConditionChips({
  filter,
  tone,
}: {
  filter: { logical: FilterLogicalOperator; conditions: any[] };
  tone: keyof typeof TONE_STYLES;
}): React.JSX.Element {
  const t = TONE_STYLES[tone];
  return (
    <div className="flex flex-wrap gap-1">
      {filter.conditions.map((cond, i) => (
        <span
          key={cond.id || i}
          className={cn(
            "inline-flex items-center gap-1 rounded text-[10.5px] font-semibold px-1.5 py-0.5 ring-1 bg-white",
            t.text,
            t.ring,
          )}
        >
          <span className="opacity-70 font-medium">{prettyField(cond.fieldId)}</span>
          <span className="text-fg-muted font-normal">{prettyOp(cond.operator)}</span>
          {cond.operator !== FilterOperator.IS_EMPTY && cond.operator !== FilterOperator.IS_NOT_EMPTY && (
            <b>{cond.value || "?"}</b>
          )}
        </span>
      ))}
    </div>
  );
}

function InlineFilterChips({
  filter,
  label,
}: {
  filter: { logical: FilterLogicalOperator; conditions: any[] };
  label: string;
}): React.JSX.Element {
  return (
    <div className="mt-2">
      <div className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 mb-1 flex items-center gap-1">
        <FilterIcon className="h-3 w-3" />
        {label} · {filter.logical === FilterLogicalOperator.AND ? "match all" : "match any"}
      </div>
      <FilterConditionChips filter={filter} tone="positive" />
    </div>
  );
}

/* ─────────────────── Branch column ─────────────────── */

function BranchColumn({
  label,
  tone,
  steps,
  selectedId,
  onSelectStep,
  onAddInBranch,
  onDeleteStep,
}: {
  label: string;
  tone: "positive" | "negative";
  steps: BlockNode[];
  selectedId: string | null;
  onSelectStep: (id: string) => void;
  onAddInBranch: (afterId: string | null, type?: string) => void;
  onDeleteStep: (id: string) => void;
}): React.JSX.Element {
  const t = TONE_STYLES[tone];
  return (
    <div className={cn("rounded-md border border-dashed p-1.5", t.border, t.softBg)}>
      <div className={cn("text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1", t.text)}>
        <span className={cn("h-1.5 w-1.5 rounded-full", t.bar)} />
        {label}
      </div>
      {steps.length === 0 ? (
        <AddButton onSelect={(type) => onAddInBranch(null, type)} label="Add" size="sm" tone={tone} />
      ) : (
        <div className="flex flex-col items-center">
          {steps.map((child, i) => {
            const def = getBlockDef(child.type);
            const childTone = def?.tone || "muted";
            const ct = TONE_STYLES[childTone];
            const isSel = selectedId === child.id;
            return (
              <React.Fragment key={child.id}>
                {i > 0 && <div className={cn("h-2 w-px my-0.5", ct.bar)} />}
                <div className="w-full group/mini relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStep(child.id);
                    }}
                    className={cn(
                      "w-full rounded bg-white text-left p-1.5 transition-all overflow-hidden",
                      isSel
                        ? "border-2 border-blue-500 ring-1 ring-blue-500/20"
                        : "border border-line-default hover:border-line-strong",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <BlockIcon icon={def?.icon || "Zap"} tone={childTone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10.5px] font-semibold text-fg-primary truncate leading-tight">
                          {def?.label || child.type}
                        </div>
                        <div className="text-[9.5px] text-fg-muted truncate leading-tight">
                          {def ? def.summary(child.config) : ""}
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStep(child.id);
                    }}
                    className="absolute top-0.5 right-0.5 opacity-0 group-hover/mini:opacity-100 transition-opacity h-4 w-4 rounded text-fg-muted hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
                {i === steps.length - 1 && (
                  <div className="mt-1.5 w-full">
                    <AddButton onSelect={(type) => onAddInBranch(child.id, type)} label="Add" size="sm" tone={tone} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Connector ─────────────────── */

function Connector({ tone = "muted" }: { tone?: keyof typeof TONE_STYLES }): React.JSX.Element {
  const t = TONE_STYLES[tone];
  return (
    <div className="flex flex-col items-center py-1" aria-hidden>
      <div className={cn("h-4 w-[2px] rounded-full", t.bar, "opacity-70")} />
      <ChevronDown className={cn("h-3.5 w-3.5 -mt-1", t.text)} />
    </div>
  );
}

/* ─────────────────── Add button (with block-type picker menu) ─────────────────── */

function AddButton({
  onSelect,
  label,
  icon,
  size = "md",
  tone,
  isPrimary,
}: {
  onSelect: (type: string) => void;
  label?: string;
  icon?: boolean;
  size?: "sm" | "md";
  tone?: keyof typeof TONE_STYLES;
  isPrimary?: boolean;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const actions = listByCategory("action");
  const logic = listByCategory("logic");

  const btnH = size === "sm" ? "h-6" : "h-8";
  const styles = isPrimary
    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-[0_4px_12px_-3px_rgba(16,185,129,0.4)]"
    : tone === "positive"
      ? "bg-white border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-500"
      : tone === "negative"
        ? "bg-white border-rose-500/40 text-rose-600 hover:bg-rose-50 hover:border-rose-500"
        : "bg-white border-blue-500/40 text-blue-600 hover:bg-blue-50 hover:border-blue-500";

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 rounded-full border-2 border-dashed font-semibold transition-all",
          btnH,
          size === "sm" ? "text-[10px] w-full justify-center" : "text-[11px]",
          styles,
        )}
      >
        <Plus className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
        {(icon && !label) ? null : label || "Add step"}
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute left-1/2 -translate-x-1/2 mt-1.5 z-30 w-[260px] rounded-xl border border-line-default bg-white shadow-pop overflow-hidden"
        >
          <MenuSection title="Actions" items={actions} onPick={(t) => { setOpen(false); onSelect(t); }} />
          <div className="h-px bg-line-subtle" />
          <MenuSection title="Logic" items={logic} onPick={(t) => { setOpen(false); onSelect(t); }} />
        </div>
      )}
    </div>
  );
}

function MenuSection({
  title,
  items,
  onPick,
}: {
  title: string;
  items: BlockDef[];
  onPick: (type: string) => void;
}): React.JSX.Element {
  return (
    <div className="py-1">
      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-fg-muted">
        {title}
      </div>
      {items.map((b) => (
        <button
          key={b.type}
          type="button"
          onClick={() => onPick(b.type)}
          className="w-full flex items-start gap-2 px-3 py-1.5 text-left hover:bg-slate-50 transition-colors"
        >
          <BlockIcon icon={b.icon} tone={b.tone} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] font-semibold text-fg-primary leading-tight">{b.label}</div>
            <div className="text-[10.5px] text-fg-muted leading-tight mt-0.5 truncate">{b.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ─────────────────── field/op pretty ─────────────────── */

function prettyField(k: string): string {
  const map: Record<string, string> = {
    name: "Name",
    email: "Email",
    phone: "Phone",
    createdAt: "Created",
    hasOpenDeals: "Has deals",
    language: "Language",
    score: "Lead score",
  };
  return map[k] || k;
}

function prettyOp(op: string): string {
  const map: Record<string, string> = {
    [FilterOperator.CONTAINS]: "contains",
    [FilterOperator.EQUALS]: "=",
    [FilterOperator.GREATER_THAN_OR_EQUAL]: "≥",
    [FilterOperator.LESS_THAN_OR_EQUAL]: "≤",
    [FilterOperator.IS_EMPTY]: "is empty",
    [FilterOperator.IS_NOT_EMPTY]: "is set",
    [FilterOperator.IS_AFTER]: "after",
    [FilterOperator.IS_BEFORE]: "before",
  };
  return map[op] || op;
}
