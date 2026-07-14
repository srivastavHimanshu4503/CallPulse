import * as React from "react";
import { ArrowUpRight } from "lucide-react";

export type KpiTone = "brand" | "positive" | "attention" | "accent" | "negative";

export interface KpiProps {
  label: string;
  value: string | number;
  delta?: { pct: number; direction: "up" | "down" };
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: KpiTone;
  onClick?: () => void;
}

const TONES: Record<KpiTone, string> = {
  brand: "bg-brand-50 text-brand-600 ring-brand-500/15",
  positive: "bg-positive-50 text-positive-500 ring-positive-500/15",
  attention: "bg-attention-50 text-attention-500 ring-attention-500/15",
  accent: "bg-accent-100 text-accent-700 ring-accent-500/20",
  negative: "bg-negative-50 text-negative-500 ring-negative-500/15",
};

export function Kpi({ label, value, delta, hint, icon: Icon, tone = "brand", onClick }: KpiProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="text-left w-full rounded-xl border border-line-default bg-bg-raised p-4 shadow-card hover:shadow-raised hover:border-line-strong transition-all disabled:cursor-default disabled:hover:shadow-card disabled:hover:border-line-default"
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{label}</span>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${TONES[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-fg-primary tracking-tight leading-none">{value}</span>
        {delta && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10.5px] font-semibold ${
              delta.direction === "up" ? "text-positive-500" : "text-negative-500"
            }`}
          >
            <ArrowUpRight className={`h-3 w-3 ${delta.direction === "down" ? "rotate-90" : ""}`} />
            {delta.pct}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-[10.5px] font-medium text-fg-muted">{hint}</div>}
    </button>
  );
}
