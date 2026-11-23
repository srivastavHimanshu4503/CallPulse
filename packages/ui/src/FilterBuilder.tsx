import * as React from "react";
import { createPortal } from "react-dom";
import { Trash2, Plus, Filter, X } from "lucide-react";
import { FilterLogicalOperator, FilterOperator } from "@antigravity/types";
import type { FilterCondition } from "@antigravity/types";
import { cn } from "./utils.js";

export interface FilterFieldDef {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "boolean" | "select";
  options?: string[];
  operators?: { value: FilterOperator; label: string }[];
}

interface FilterBuilderProps {
  fields: FilterFieldDef[];
  conditions: FilterCondition[];
  onConditionsChange: (next: FilterCondition[]) => void;
  logical: FilterLogicalOperator;
  onLogicalChange: (op: FilterLogicalOperator) => void;
  isOpen: boolean;
  onClose: () => void;
}

const OP_LABEL: Record<FilterOperator, string> = {
  [FilterOperator.CONTAINS]: "contains",
  [FilterOperator.EQUALS]: "equals",
  [FilterOperator.GREATER_THAN_OR_EQUAL]: "≥",
  [FilterOperator.LESS_THAN_OR_EQUAL]: "≤",
  [FilterOperator.IS_EMPTY]: "is empty",
  [FilterOperator.IS_NOT_EMPTY]: "is not empty",
  [FilterOperator.IS_AFTER]: "is after",
  [FilterOperator.IS_BEFORE]: "is before",
};

function operatorsFor(field: FilterFieldDef): { value: FilterOperator; label: string }[] {
  if (field.operators) return field.operators;
  switch (field.type) {
    case "number":
      return [
        { value: FilterOperator.EQUALS, label: OP_LABEL[FilterOperator.EQUALS] },
        {
          value: FilterOperator.GREATER_THAN_OR_EQUAL,
          label: OP_LABEL[FilterOperator.GREATER_THAN_OR_EQUAL],
        },
        {
          value: FilterOperator.LESS_THAN_OR_EQUAL,
          label: OP_LABEL[FilterOperator.LESS_THAN_OR_EQUAL],
        },
        { value: FilterOperator.IS_EMPTY, label: OP_LABEL[FilterOperator.IS_EMPTY] },
        { value: FilterOperator.IS_NOT_EMPTY, label: OP_LABEL[FilterOperator.IS_NOT_EMPTY] },
      ];
    case "date":
      return [
        { value: FilterOperator.IS_AFTER, label: OP_LABEL[FilterOperator.IS_AFTER] },
        { value: FilterOperator.IS_BEFORE, label: OP_LABEL[FilterOperator.IS_BEFORE] },
        { value: FilterOperator.IS_EMPTY, label: OP_LABEL[FilterOperator.IS_EMPTY] },
        { value: FilterOperator.IS_NOT_EMPTY, label: OP_LABEL[FilterOperator.IS_NOT_EMPTY] },
      ];
    case "boolean":
    case "select":
      return [
        { value: FilterOperator.EQUALS, label: OP_LABEL[FilterOperator.EQUALS] },
        { value: FilterOperator.IS_EMPTY, label: OP_LABEL[FilterOperator.IS_EMPTY] },
        { value: FilterOperator.IS_NOT_EMPTY, label: OP_LABEL[FilterOperator.IS_NOT_EMPTY] },
      ];
    default:
      return [
        { value: FilterOperator.CONTAINS, label: OP_LABEL[FilterOperator.CONTAINS] },
        { value: FilterOperator.EQUALS, label: OP_LABEL[FilterOperator.EQUALS] },
        { value: FilterOperator.IS_EMPTY, label: OP_LABEL[FilterOperator.IS_EMPTY] },
        { value: FilterOperator.IS_NOT_EMPTY, label: OP_LABEL[FilterOperator.IS_NOT_EMPTY] },
      ];
  }
}

function defaultOperator(field: FilterFieldDef): FilterOperator {
  return operatorsFor(field)[0]!.value;
}

export function FilterBuilder({
  fields,
  conditions,
  onConditionsChange,
  logical,
  onLogicalChange,
  isOpen,
  onClose,
}: FilterBuilderProps): React.JSX.Element | null {
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf1);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(t);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const add = () => {
    const first = fields[0];
    if (!first) return;
    onConditionsChange([
      ...conditions,
      {
        id: Math.random().toString(36).slice(2, 9),
        fieldId: first.id,
        operator: defaultOperator(first),
        value: "",
      },
    ]);
  };

  const remove = (id: string) => onConditionsChange(conditions.filter((c) => c.id !== id));
  const patch = (id: string, next: Partial<FilterCondition>) => {
    onConditionsChange(conditions.map((c) => (c.id === id ? { ...c, ...next } : c)));
  };
  const swapField = (id: string, fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    patch(id, {
      fieldId,
      operator: defaultOperator(field),
      value: field.type === "boolean" ? "true" : "",
    });
  };

  const node = (
    <div className="fixed inset-0 z-[100] font-sans">
      {/* Darker backdrop so drawer is unmistakable over any content */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      {/* Drawer panel with strong shadow + border */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute inset-y-0 right-0 w-full sm:w-[480px] bg-bg-raised border-l-2 border-line-strong flex flex-col h-full overflow-hidden shadow-pop transform transition-transform duration-220 ease-out will-change-transform",
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="h-14 border-b border-line-default px-5 bg-bg-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-500/20 flex items-center justify-center">
              <Filter className="h-3.5 w-3.5" />
            </span>
            <h3 className="text-[13px] font-semibold text-fg-primary">
              Filters
              {conditions.length > 0 && (
                <span className="text-fg-muted font-medium ml-1">({conditions.length})</span>
              )}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-bg-raised text-fg-secondary hover:text-fg-primary flex items-center justify-center border border-transparent hover:border-line-default transition-colors"
            aria-label="Close filters"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Match logic segmented */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-1.5">
              Match logic
            </label>
            <div className="inline-flex items-center gap-1 bg-bg-muted border border-line-default p-1 rounded-md">
              {[FilterLogicalOperator.AND, FilterLogicalOperator.OR].map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => onLogicalChange(op)}
                  className={cn(
                    "px-3 h-7 rounded text-[11.5px] font-semibold transition-colors",
                    logical === op
                      ? "bg-bg-raised text-brand-600 shadow-card ring-1 ring-brand-500/15"
                      : "text-fg-secondary hover:text-fg-primary",
                  )}
                >
                  {op === FilterLogicalOperator.AND ? "Match ALL" : "Match ANY"}
                </button>
              ))}
            </div>
            <p className="text-[10.5px] text-fg-muted mt-2 leading-relaxed">
              {logical === FilterLogicalOperator.AND
                ? "Contacts must satisfy every rule below."
                : "Contacts match if any single rule below is true."}
            </p>
          </div>

          {/* Rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                Rules
              </span>
              <button
                type="button"
                onClick={add}
                className="inline-flex items-center gap-1 h-6 px-2 rounded text-[11px] font-semibold text-brand-600 hover:text-brand-700 hover:bg-brand-50"
              >
                <Plus className="h-3 w-3" /> Add rule
              </button>
            </div>

            {conditions.length === 0 ? (
              <div className="py-10 border border-dashed border-line-default rounded-lg text-center text-[11.5px] text-fg-muted px-4 bg-bg-subtle">
                No rules yet. Click <b className="text-fg-primary">Add rule</b> to filter your list.
              </div>
            ) : (
              <div className="space-y-2.5">
                {conditions.map((cond, idx) => {
                  const field = fields.find((f) => f.id === cond.fieldId) || fields[0];
                  if (!field) return null;
                  const ops = operatorsFor(field);
                  const valueHidden =
                    cond.operator === FilterOperator.IS_EMPTY ||
                    cond.operator === FilterOperator.IS_NOT_EMPTY;
                  return (
                    <div
                      key={cond.id}
                      className="border border-line-default rounded-md p-3 bg-bg-subtle space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                          {idx === 0
                            ? "Where"
                            : logical === FilterLogicalOperator.AND
                              ? "and"
                              : "or"}
                        </span>
                        <button
                          type="button"
                          onClick={() => remove(cond.id)}
                          className="text-fg-muted hover:text-negative-500 h-6 w-6 rounded-md flex items-center justify-center hover:bg-negative-50"
                          title="Delete rule"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={cond.fieldId}
                          onChange={(e) => swapField(cond.id, e.target.value)}
                          className="w-full h-8 bg-bg-raised border border-line-default text-[12px] text-fg-primary rounded-md px-2 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                        >
                          {fields.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={cond.operator}
                          onChange={(e) =>
                            patch(cond.id, { operator: e.target.value as FilterOperator })
                          }
                          className="w-full h-8 bg-bg-raised border border-line-default text-[12px] text-fg-primary rounded-md px-2 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
                        >
                          {ops.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {!valueHidden && (
                        <ValueInput
                          field={field}
                          value={cond.value}
                          onChange={(v) => patch(cond.id, { value: v })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line-default px-5 py-3 bg-bg-subtle flex items-center justify-between shrink-0">
          {conditions.length > 0 ? (
            <button
              type="button"
              onClick={() => onConditionsChange([])}
              className="text-[11.5px] font-semibold text-negative-500 hover:text-negative-600"
            >
              Clear all
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-4 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-[12px] font-semibold shadow-card"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );

  // Portal to document.body — bulletproof against any transformed/overflow-hidden ancestor.
  return createPortal(node, document.body);
}

function ValueInput({
  field,
  value,
  onChange,
}: {
  field: FilterFieldDef;
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  const baseCls =
    "w-full h-8 bg-bg-raised border border-line-default text-[12px] text-fg-primary rounded-md px-2 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20";
  if (field.type === "select") {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} className={baseCls}>
        <option value="">Select…</option>
        {(field.options || []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "boolean") {
    return (
      <select
        value={value || "true"}
        onChange={(e) => onChange(e.target.value)}
        className={baseCls}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }
  if (field.type === "date") {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={baseCls}
      />
    );
  }
  if (field.type === "number") {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Value"
        className={baseCls}
      />
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
      className={cn(baseCls, "placeholder-fg-muted")}
    />
  );
}

export function evaluateCondition(cond: FilterCondition, actualVal: any): boolean {
  const v = cond.value;
  switch (cond.operator) {
    case FilterOperator.CONTAINS:
      return String(actualVal || "")
        .toLowerCase()
        .includes(String(v).toLowerCase());
    case FilterOperator.EQUALS:
      return String(actualVal ?? "").toLowerCase() === String(v).toLowerCase();
    case FilterOperator.GREATER_THAN_OR_EQUAL:
      return Number(actualVal || 0) >= Number(v || 0);
    case FilterOperator.LESS_THAN_OR_EQUAL:
      return Number(actualVal || 0) <= Number(v || 0);
    case FilterOperator.IS_EMPTY:
      return !actualVal || String(actualVal).trim() === "";
    case FilterOperator.IS_NOT_EMPTY:
      return !!actualVal && String(actualVal).trim() !== "";
    case FilterOperator.IS_AFTER:
      if (!actualVal) return false;
      return new Date(actualVal).getTime() >= new Date(v).getTime();
    case FilterOperator.IS_BEFORE:
      if (!actualVal) return false;
      return new Date(actualVal).getTime() <= new Date(v).getTime();
    default:
      return true;
  }
}
