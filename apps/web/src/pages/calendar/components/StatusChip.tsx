import * as React from "react";

const STATUS_UI: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmed", cls: "bg-brand-50 text-brand-700 border-brand-500/15" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-500/15" },
  completed: { label: "Completed", cls: "bg-emerald-50 text-emerald-700 border-emerald-500/15" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 text-red-700 border-red-500/15" },
};

export function StatusChip({ status }: { status: string }): React.JSX.Element {
  const ui = STATUS_UI[status?.toLowerCase()] ?? {
    label: status || "Scheduled",
    cls: "bg-bg-subtle text-fg-secondary border-line-subtle",
  };
  return (
    <span
      className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${ui.cls}`}
    >
      {ui.label}
    </span>
  );
}
