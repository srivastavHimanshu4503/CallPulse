import * as React from "react";

/**
 * Shared UI primitives for internal pages. Uses the centralised design
 * tokens (bg-*, fg-*, line-*, brand-*, accent-*) so any theme change is
 * a single edit in tailwind.preset.js.
 */

// ─────────────────────────────────────────────────────────────
// Card
// ─────────────────────────────────────────────────────────────
export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}> = ({ children, className = "", padded = true }) => (
  <div
    className={[
      "rounded-xl border border-line-default bg-bg-raised shadow-card",
      padded ? "p-4" : "",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// SectionHead — used inside a Card
// ─────────────────────────────────────────────────────────────
export const SectionHead: React.FC<{
  title: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ title, hint, action }) => (
  <div className="flex items-center justify-between mb-3 shrink-0 gap-3">
    <div className="min-w-0">
      <h3 className="text-[13px] font-semibold text-fg-primary tracking-tight">{title}</h3>
      {hint && <p className="text-[10.5px] text-fg-muted mt-0.5 truncate">{hint}</p>}
    </div>
    {action}
  </div>
);

// ─────────────────────────────────────────────────────────────
// PageHeader — top of each page
// ─────────────────────────────────────────────────────────────
export const PageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 shrink-0 mb-4">
    <div className="min-w-0">
      <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-fg-primary">{title}</h1>
      {subtitle && (
        <div className="text-[12px] text-fg-secondary mt-0.5 flex flex-wrap items-center gap-2">{subtitle}</div>
      )}
    </div>
    {actions && (
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {actions}
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Button variants — light + minimal, consistent with hero CTAs
// ─────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "ghost" | "accent";
type BtnSize = "sm" | "md";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed";
const BTN_SIZES: Record<BtnSize, string> = {
  sm: "h-8 px-3 text-[12px]",
  md: "h-9 px-3.5 text-[12.5px]",
};
const BTN_VARIANTS: Record<BtnVariant, string> = {
  primary: "text-white shadow-sm",
  secondary: "border text-fg-primary",
  ghost: "text-fg-secondary hover:text-fg-primary hover:bg-bg-muted",
  accent:
    "text-[#0a0416] shadow-goldGlow hover:brightness-110 bg-gradient-to-br from-accent-300 via-accent-500 to-accent-700",
};

const BTN_INLINE: Record<BtnVariant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
    boxShadow:
      "0 1px 2px rgba(15,23,42,0.10), 0 4px 12px -4px rgba(37,99,235,0.45)",
  },
  secondary: {
    backgroundColor: "rgb(var(--slate-50))",
    borderColor: "rgb(var(--line-default))",
    boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
  },
  ghost: {},
  accent: {},
};

export const AppButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant;
    size?: BtnSize;
    icon?: React.ReactNode;
  }
>(({ variant = "secondary", size = "md", icon, className = "", style, children, ...rest }, ref) => (
  <button
    ref={ref}
    className={`${BTN_BASE} ${BTN_SIZES[size]} ${BTN_VARIANTS[variant]} ${className}`}
    style={{ ...BTN_INLINE[variant], ...(style || {}) }}
    {...rest}
  >
    {icon}
    {children}
  </button>
));
AppButton.displayName = "AppButton";

// ─────────────────────────────────────────────────────────────
// Segmented control — for period selectors, tabs, etc.
// ─────────────────────────────────────────────────────────────
export interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
}): React.JSX.Element {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg p-1 border"
      style={{ backgroundColor: "rgb(var(--line-subtle))", borderColor: "rgb(var(--line-default))" }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="px-3 h-7 rounded-md text-[11.5px] font-semibold transition-all"
            style={
              active
                ? {
                    backgroundColor: "#2563EB",
                    color: "#FFFFFF",
                    boxShadow: "0 1px 2px rgba(37,99,235,0.35), 0 1px 3px rgba(0,0,0,0.08)",
                  }
                : { backgroundColor: "transparent", color: "rgb(var(--fg-secondary))" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Toggle (switch)
// ─────────────────────────────────────────────────────────────
export const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  hint?: string;
}> = ({ checked, onChange, label, hint }) => (
  <label className="flex items-start justify-between gap-3 cursor-pointer">
    {(label || hint) && (
      <div className="min-w-0">
        {label && <div className="text-[12.5px] font-semibold text-fg-primary leading-tight">{label}</div>}
        {hint && <div className="text-[10.5px] text-fg-muted mt-0.5 leading-tight">{hint}</div>}
      </div>
    )}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-brand-500" : "bg-line-strong",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  </label>
);

// ─────────────────────────────────────────────────────────────
// Field wrapper (label + input)
// ─────────────────────────────────────────────────────────────
export const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <label className="block text-[12px] font-semibold text-fg-primary mb-1.5">{label}</label>
    {children}
    {hint && <p className="mt-1 text-[10.5px] text-fg-muted">{hint}</p>}
  </div>
);

// Input class shared across pages
export const inputClass =
  "w-full h-9 px-3 rounded-lg border border-line-default bg-bg-raised text-[12.5px] text-fg-primary placeholder:text-fg-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all outline-none";

// Textarea class
export const textareaClass =
  "w-full px-3 py-2 rounded-lg border border-line-default bg-bg-raised text-[12.5px] text-fg-primary placeholder:text-fg-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all outline-none resize-none";

// ─────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────
export const Empty: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, hint, action }) => (
  <div className="h-full flex flex-col items-center justify-center text-center px-6">
    <div className="h-12 w-12 rounded-full bg-bg-muted flex items-center justify-center mb-3 text-fg-muted">
      <Icon className="h-5 w-5" />
    </div>
    <p className="text-[13px] font-semibold text-fg-primary">{title}</p>
    {hint && <p className="text-[11.5px] text-fg-secondary mt-1 max-w-[280px]">{hint}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);
