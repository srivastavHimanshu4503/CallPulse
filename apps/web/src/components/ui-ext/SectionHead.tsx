import * as React from "react";
import { cn } from "@antigravity/ui";

interface SectionHeadProps {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHead({
  title,
  hint,
  action,
  className,
}: SectionHeadProps): React.JSX.Element {
  return (
    <div className={cn("flex items-center justify-between mb-3 shrink-0", className)}>
      <div className="min-w-0">
        <h3 className="text-[13px] font-semibold text-fg-primary tracking-tight">{title}</h3>
        {hint && <p className="text-[10.5px] text-fg-muted mt-0.5 truncate">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
