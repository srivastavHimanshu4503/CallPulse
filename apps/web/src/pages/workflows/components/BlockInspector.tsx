import * as React from "react";
import { X, Info, Filter as FilterIcon, Trash2, Plus } from "lucide-react";
import { getBlockDef, TONE_STYLES } from "../registry.js";
import type { FieldSchema, Trigger, BlockNode, BlockFilter } from "../types.js";
import { BlockIcon } from "./BlockIcon.js";
import { cn } from "@antigravity/ui";
import { FilterLogicalOperator, FilterOperator } from "@antigravity/types";
import type { FilterCondition } from "@antigravity/types";

interface BlockInspectorProps {
  target: { kind: "trigger"; trigger: Trigger } | { kind: "step"; step: BlockNode } | null;
  onChangeTrigger?: (next: Trigger) => void;
  onChangeStep?: (patch: Partial<BlockNode>) => void;
  onClose: () => void;
}

const VARIABLE_HINTS = [
  "{{contact.firstName}}",
  "{{contact.phone}}",
  "{{contact.email}}",
  "{{call.sentiment}}",
];

/**
 * Right-hand inspector. Renders:
 *   1. Block header
 *   2. Field-schema-driven form
 *   3. "Only run if…" inline filter builder (when the block supports it)
 */
export function BlockInspector({
  target,
  onChangeTrigger,
  onChangeStep,
  onClose,
}: BlockInspectorProps): React.JSX.Element | null {
  if (!target) return null;

  const type = target.kind === "trigger" ? target.trigger.type : target.step.type;
  const config = target.kind === "trigger" ? target.trigger.config : target.step.config;
  const filter = target.kind === "trigger" ? target.trigger.filter : target.step.filter;
  const def = getBlockDef(type);

  if (!def) {
    return (
      <aside className="hidden lg:flex flex-col w-[360px] shrink-0 border-l border-line-default bg-bg-raised">
        <InspectorHeader onClose={onClose} title="Unknown block" tone="muted" icon="Zap" />
        <div className="p-4 text-[12px] text-fg-muted">
          This block type ({type}) isn't in the registry.
        </div>
      </aside>
    );
  }

  const setValue = (key: string, value: any) => {
    const next = { ...config, [key]: value };
    if (target.kind === "trigger" && onChangeTrigger) {
      onChangeTrigger({ ...target.trigger, config: next });
    }
    if (target.kind === "step" && onChangeStep) {
      onChangeStep({ config: next });
    }
  };

  const setFilter = (next: BlockFilter | null) => {
    if (target.kind === "trigger" && onChangeTrigger) {
      onChangeTrigger({ ...target.trigger, filter: next });
    }
    if (target.kind === "step" && onChangeStep) {
      onChangeStep({ filter: next });
    }
  };

  const kindLabel =
    target.kind === "trigger" ? "Trigger" : def.category === "logic" ? "Logic" : "Action";
  const headerTone = target.kind === "trigger" ? "positive" : (def.tone as any);

  return (
    <aside className="hidden lg:flex flex-col w-[360px] shrink-0 border-l border-line-default bg-bg-raised overflow-hidden">
      <InspectorHeader
        onClose={onClose}
        title={def.label}
        tone={headerTone}
        icon={def.icon}
        subtitle={kindLabel}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 border-b border-line-subtle bg-slate-50/70">
          <p className="text-[11.5px] text-fg-secondary leading-relaxed">{def.description}</p>
        </div>

        {def.fields.length === 0 ? (
          <div className="p-4 text-[12px] text-fg-muted italic">
            No settings — just the filter below.
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {def.fields
              .filter((f) => shouldShow(f, config))
              .map((f) => (
                <FieldRow
                  key={f.key}
                  field={f}
                  value={config[f.key] ?? f.defaultValue ?? ""}
                  onChange={(v) => setValue(f.key, v)}
                />
              ))}
          </div>
        )}

        {def.supportsFilter && (
          <FilterSection
            filter={filter || null}
            onChange={setFilter}
            tone={headerTone}
            required={!!def.requiresFilter}
          />
        )}
      </div>
    </aside>
  );
}

function shouldShow(f: FieldSchema, config: Record<string, any>): boolean {
  if (!f.showWhen) return true;
  return config[f.showWhen.key] === f.showWhen.equals;
}

/* ─────────────────────── Header ─────────────────────── */

function InspectorHeader({
  onClose,
  title,
  subtitle,
  tone,
  icon,
}: {
  onClose: () => void;
  title: string;
  subtitle?: string;
  tone: keyof typeof TONE_STYLES;
  icon: string;
}): React.JSX.Element {
  const t = TONE_STYLES[tone];
  return (
    <div className="border-b border-line-default bg-bg-raised shrink-0">
      <div className={cn("h-1", t.bar)} />
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <BlockIcon icon={icon} tone={tone as any} size="sm" />
          <div className="min-w-0">
            {subtitle && (
              <div className={cn("text-[9.5px] font-bold uppercase tracking-wider", t.text)}>
                {subtitle}
              </div>
            )}
            <div className="text-[13px] font-semibold text-fg-primary truncate leading-tight">
              {title}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="h-8 w-8 rounded-md hover:bg-slate-100 text-fg-secondary hover:text-fg-primary flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────── Field row ─────────────────────── */

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: FieldSchema;
  value: any;
  onChange: (v: any) => void;
}): React.JSX.Element {
  const inputBase =
    "w-full bg-bg-raised border border-line-default focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md focus:outline-none shadow-card";

  return (
    <div>
      <label className="block text-[11.5px] font-semibold text-fg-primary mb-1.5">
        {field.label}
        {field.required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>

      {field.kind === "text" && (
        <input
          type="text"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputBase, "h-9 px-2.5")}
        />
      )}

      {field.kind === "textarea" && (
        <>
          <textarea
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            className={cn(inputBase, "p-2.5 leading-relaxed resize-none")}
          />
          {field.supportsVariables && (
            <div className="mt-2 flex flex-wrap gap-1">
              {VARIABLE_HINTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onChange(`${value || ""}${v}`)}
                  className="inline-flex items-center h-6 px-2 rounded bg-orange-50 hover:bg-orange-100 text-orange-700 text-[10.5px] font-semibold font-mono"
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {field.kind === "number" && (
        <input
          type="number"
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className={cn(inputBase, "h-9 px-2.5")}
        />
      )}

      {field.kind === "select" && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputBase, "h-9 px-2 cursor-pointer")}
        >
          {(field.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {field.kind === "boolean" && (
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-line-strong text-blue-500 focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
          />
          <span className="text-[12px] text-fg-primary">{field.label}</span>
        </label>
      )}

      {field.kind === "sentiment" && (
        <div>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={Number(value) || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-fg-muted font-medium mt-1">
            <span>Very negative</span>
            <b className="text-fg-primary tabular-nums">{Number(value).toFixed(2)}</b>
            <span>Very positive</span>
          </div>
        </div>
      )}

      {field.kind === "score" && (
        <div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Number(value) || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-fg-muted font-medium mt-1">
            <span>0</span>
            <b className="text-fg-primary tabular-nums">{Number(value)}</b>
            <span>100</span>
          </div>
        </div>
      )}

      {field.kind === "duration" && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={cn(inputBase, "h-9 px-2.5 flex-1")}
          />
          <span className="text-[11px] text-fg-muted">minutes</span>
        </div>
      )}

      {field.kind === "conditions" && (
        <ConditionsEditor
          value={
            value && typeof value === "object" && Array.isArray(value.conditions)
              ? value
              : { logical: FilterLogicalOperator.AND, conditions: [] }
          }
          onChange={onChange}
        />
      )}

      {field.helper && (
        <p className="text-[10.5px] text-fg-muted mt-1.5 leading-relaxed flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{field.helper}</span>
        </p>
      )}
    </div>
  );
}

/* ─────────────────────── Filter section ─────────────────────── */

const FILTER_FIELDS: Array<{
  id: string;
  label: string;
  kind: "text" | "number" | "date" | "select" | "boolean";
}> = [
  { id: "name", label: "Contact name", kind: "text" },
  { id: "email", label: "Email", kind: "text" },
  { id: "phone", label: "Phone", kind: "text" },
  { id: "score", label: "Lead score", kind: "number" },
  { id: "hasOpenDeals", label: "Has open deals", kind: "select" },
  { id: "language", label: "Preferred language", kind: "select" },
  { id: "createdAt", label: "Created date", kind: "date" },
];

function operatorsFor(fid: string): Array<{ value: FilterOperator; label: string }> {
  const field = FILTER_FIELDS.find((f) => f.id === fid);
  if (field?.kind === "number") {
    return [
      { value: FilterOperator.EQUALS, label: "equals" },
      { value: FilterOperator.GREATER_THAN_OR_EQUAL, label: "≥" },
      { value: FilterOperator.LESS_THAN_OR_EQUAL, label: "≤" },
    ];
  }
  if (field?.kind === "date") {
    return [
      { value: FilterOperator.IS_AFTER, label: "is after" },
      { value: FilterOperator.IS_BEFORE, label: "is before" },
    ];
  }
  if (field?.kind === "select") {
    return [{ value: FilterOperator.EQUALS, label: "equals" }];
  }
  return [
    { value: FilterOperator.CONTAINS, label: "contains" },
    { value: FilterOperator.EQUALS, label: "equals" },
    { value: FilterOperator.IS_NOT_EMPTY, label: "is set" },
    { value: FilterOperator.IS_EMPTY, label: "is empty" },
  ];
}

function FilterSection({
  filter,
  onChange,
  tone,
  required,
}: {
  filter: BlockFilter | null;
  onChange: (next: BlockFilter | null) => void;
  tone: keyof typeof TONE_STYLES;
  required?: boolean;
}): React.JSX.Element {
  const t = TONE_STYLES[tone];
  // For required filters (e.g. CONTACT_MATCHES trigger) we always have an
  // active filter object — the toggle is hidden and the section is always
  // visible with a "needs at least one rule" warning if empty.
  const effectiveFilter: BlockFilter | null = required
    ? filter || { logical: FilterLogicalOperator.AND, conditions: [] }
    : filter;

  const toggle = () => {
    if (required) return;
    if (!filter) {
      onChange({ logical: FilterLogicalOperator.AND, conditions: [] });
    } else {
      onChange(null);
    }
  };

  const addCondition = () => {
    const first = FILTER_FIELDS[0]!;
    const cond: FilterCondition = {
      id: Math.random().toString(36).slice(2, 9),
      fieldId: first.id,
      operator: operatorsFor(first.id)[0]!.value,
      value: "",
    };
    const next: BlockFilter = effectiveFilter || {
      logical: FilterLogicalOperator.AND,
      conditions: [],
    };
    onChange({ ...next, conditions: [...next.conditions, cond] });
  };

  const patch = (id: string, p: Partial<FilterCondition>) => {
    if (!effectiveFilter) return;
    onChange({
      ...effectiveFilter,
      conditions: effectiveFilter.conditions.map((c) => (c.id === id ? { ...c, ...p } : c)),
    });
  };

  const remove = (id: string) => {
    if (!effectiveFilter) return;
    onChange({
      ...effectiveFilter,
      conditions: effectiveFilter.conditions.filter((c) => c.id !== id),
    });
  };

  return (
    <div className="border-t border-line-default bg-slate-50/60">
      <div className="p-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center ring-1",
              t.tile,
              t.ring,
            )}
          >
            <FilterIcon className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="text-[12px] font-semibold text-fg-primary leading-tight">
              {required ? "Filter conditions" : "Only run if…"}
              {required && <span className="text-rose-500 ml-0.5">*</span>}
            </div>
            <div className="text-[10.5px] text-fg-muted leading-tight">
              {required
                ? "Contacts matching these conditions trigger the flow"
                : "CRM conditions must match"}
            </div>
          </div>
        </div>
        {!required && (
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input type="checkbox" className="sr-only peer" checked={!!filter} onChange={toggle} />
            <span className="w-9 h-5 bg-line-strong rounded-full peer-checked:bg-blue-500 transition-colors" />
            <span
              className={cn(
                "absolute top-[2px] left-[2px] h-4 w-4 bg-white border border-line-default rounded-full shadow-card transition-transform",
                filter ? "translate-x-4" : "translate-x-0",
              )}
            />
          </label>
        )}
      </div>

      {effectiveFilter && (
        <div className="px-4 pb-4">
          {/* Warning when required but empty */}
          {required && effectiveFilter.conditions.length === 0 && (
            <div className="mb-3 rounded-md border border-amber-500/30 bg-amber-50 px-2.5 py-2 flex items-start gap-2">
              <span className="text-amber-600 text-sm">⚠</span>
              <div className="text-[11px] text-amber-800 leading-relaxed">
                Add at least one rule below — otherwise this workflow will never fire.
              </div>
            </div>
          )}

          {/* Match ALL / ANY */}
          <div className="inline-flex items-center gap-1 bg-bg-raised border border-line-default p-1 rounded-md mb-3">
            {[FilterLogicalOperator.AND, FilterLogicalOperator.OR].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onChange({ ...effectiveFilter, logical: op })}
                className={cn(
                  "px-2.5 h-6 rounded text-[10.5px] font-semibold transition-colors",
                  effectiveFilter.logical === op
                    ? "bg-blue-500 text-white"
                    : "text-fg-secondary hover:text-fg-primary",
                )}
              >
                {op === FilterLogicalOperator.AND ? "Match ALL" : "Match ANY"}
              </button>
            ))}
          </div>

          {/* Rules */}
          {effectiveFilter.conditions.length === 0 ? (
            <div className="rounded-md border border-dashed border-line-default bg-bg-raised py-4 text-center text-[11px] text-fg-muted">
              No rules yet. Click <b className="text-fg-primary">Add rule</b>.
            </div>
          ) : (
            <div className="space-y-2">
              {effectiveFilter.conditions.map((c, idx) => {
                const ops = operatorsFor(c.fieldId);
                const field = FILTER_FIELDS.find((f) => f.id === c.fieldId);
                const noValue =
                  c.operator === FilterOperator.IS_EMPTY ||
                  c.operator === FilterOperator.IS_NOT_EMPTY;
                return (
                  <div
                    key={c.id}
                    className="bg-bg-raised border border-line-default rounded-md p-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-fg-muted">
                        {idx === 0
                          ? "Where"
                          : effectiveFilter.logical === FilterLogicalOperator.AND
                            ? "and"
                            : "or"}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="h-5 w-5 rounded text-fg-muted hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <select
                        value={c.fieldId}
                        onChange={(e) => {
                          const nf = e.target.value;
                          patch(c.id, {
                            fieldId: nf,
                            operator: operatorsFor(nf)[0]!.value,
                            value: "",
                          });
                        }}
                        className="h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-blue-500"
                      >
                        {FILTER_FIELDS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={c.operator}
                        onChange={(e) =>
                          patch(c.id, { operator: e.target.value as FilterOperator })
                        }
                        className="h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-blue-500"
                      >
                        {ops.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!noValue && (
                      <>
                        {field?.id === "hasOpenDeals" ? (
                          <select
                            value={c.value}
                            onChange={(e) => patch(c.id, { value: e.target.value })}
                            className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">Select…</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        ) : field?.id === "language" ? (
                          <select
                            value={c.value}
                            onChange={(e) => patch(c.id, { value: e.target.value })}
                            className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">Select…</option>
                            {["English", "Hindi", "Hinglish", "Marathi", "Tamil", "Telugu"].map(
                              (l) => (
                                <option key={l} value={l}>
                                  {l}
                                </option>
                              ),
                            )}
                          </select>
                        ) : field?.kind === "date" ? (
                          <input
                            type="date"
                            value={c.value}
                            onChange={(e) => patch(c.id, { value: e.target.value })}
                            className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-blue-500"
                          />
                        ) : field?.kind === "number" ? (
                          <input
                            type="number"
                            value={c.value}
                            onChange={(e) => patch(c.id, { value: e.target.value })}
                            placeholder="value"
                            className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-blue-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={c.value}
                            onChange={(e) => patch(c.id, { value: e.target.value })}
                            placeholder="value"
                            className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-blue-500"
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={addCondition}
            className="mt-2 w-full inline-flex items-center justify-center gap-1 h-8 rounded-md border border-dashed border-blue-500/40 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11.5px] font-semibold"
          >
            <Plus className="h-3 w-3" />
            {effectiveFilter.conditions.length > 0 ? "Add another rule" : "Add rule"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── ConditionsEditor (multi-row, used inside IF block) ─────────────────────── */

function ConditionsEditor({
  value,
  onChange,
}: {
  value: BlockFilter;
  onChange: (next: BlockFilter) => void;
}): React.JSX.Element {
  const addCondition = () => {
    const first = FILTER_FIELDS[0]!;
    const cond: FilterCondition = {
      id: Math.random().toString(36).slice(2, 9),
      fieldId: first.id,
      operator: operatorsFor(first.id)[0]!.value,
      value: "",
    };
    onChange({ ...value, conditions: [...value.conditions, cond] });
  };

  const patch = (id: string, p: Partial<FilterCondition>) => {
    onChange({
      ...value,
      conditions: value.conditions.map((c) => (c.id === id ? { ...c, ...p } : c)),
    });
  };

  const remove = (id: string) => {
    onChange({ ...value, conditions: value.conditions.filter((c) => c.id !== id) });
  };

  return (
    <div className="rounded-md border border-line-default bg-slate-50/50 p-2 space-y-2">
      {/* Match ALL / ANY */}
      <div className="inline-flex items-center gap-1 bg-bg-raised border border-line-default p-1 rounded-md">
        {[FilterLogicalOperator.AND, FilterLogicalOperator.OR].map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => onChange({ ...value, logical: op })}
            className={cn(
              "px-2.5 h-6 rounded text-[10.5px] font-semibold transition-colors",
              value.logical === op
                ? "bg-amber-500 text-white"
                : "text-fg-secondary hover:text-fg-primary",
            )}
          >
            {op === FilterLogicalOperator.AND ? "Match ALL" : "Match ANY"}
          </button>
        ))}
      </div>

      {/* Warning if empty */}
      {value.conditions.length === 0 ? (
        <div className="rounded-md border border-dashed border-line-default bg-bg-raised py-4 text-center text-[11px] text-fg-muted">
          No rules yet. Add at least one to branch.
        </div>
      ) : (
        <div className="space-y-2">
          {value.conditions.map((c, idx) => {
            const ops = operatorsFor(c.fieldId);
            const field = FILTER_FIELDS.find((f) => f.id === c.fieldId);
            const noValue =
              c.operator === FilterOperator.IS_EMPTY || c.operator === FilterOperator.IS_NOT_EMPTY;
            return (
              <div
                key={c.id}
                className="bg-bg-raised border border-line-default rounded-md p-2 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-fg-muted">
                    {idx === 0
                      ? "Where"
                      : value.logical === FilterLogicalOperator.AND
                        ? "and"
                        : "or"}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    className="h-5 w-5 rounded text-fg-muted hover:text-rose-500 hover:bg-rose-50 flex items-center justify-center"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={c.fieldId}
                    onChange={(e) => {
                      const nf = e.target.value;
                      patch(c.id, { fieldId: nf, operator: operatorsFor(nf)[0]!.value, value: "" });
                    }}
                    className="h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-amber-500"
                  >
                    {FILTER_FIELDS.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={c.operator}
                    onChange={(e) => patch(c.id, { operator: e.target.value as FilterOperator })}
                    className="h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-amber-500"
                  >
                    {ops.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                {!noValue && (
                  <>
                    {field?.id === "hasOpenDeals" ? (
                      <select
                        value={c.value}
                        onChange={(e) => patch(c.id, { value: e.target.value })}
                        className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">Select…</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    ) : field?.id === "language" ? (
                      <select
                        value={c.value}
                        onChange={(e) => patch(c.id, { value: e.target.value })}
                        className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">Select…</option>
                        {["English", "Hindi", "Hinglish", "Marathi", "Tamil", "Telugu"].map((l) => (
                          <option key={l} value={l}>
                            {l}
                          </option>
                        ))}
                      </select>
                    ) : field?.kind === "date" ? (
                      <input
                        type="date"
                        value={c.value}
                        onChange={(e) => patch(c.id, { value: e.target.value })}
                        className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-amber-500"
                      />
                    ) : field?.kind === "number" ? (
                      <input
                        type="number"
                        value={c.value}
                        onChange={(e) => patch(c.id, { value: e.target.value })}
                        placeholder="value"
                        className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-amber-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={c.value}
                        onChange={(e) => patch(c.id, { value: e.target.value })}
                        placeholder="value"
                        className="w-full h-7 bg-bg-raised border border-line-default text-[11px] text-fg-primary rounded px-1.5 focus:outline-none focus:border-amber-500"
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={addCondition}
        className="w-full inline-flex items-center justify-center gap-1 h-8 rounded-md border border-dashed border-amber-500/40 bg-amber-50 text-amber-700 hover:bg-amber-100 text-[11.5px] font-semibold"
      >
        <Plus className="h-3 w-3" />
        {value.conditions.length > 0 ? "Add another rule" : "Add first rule"}
      </button>
    </div>
  );
}
