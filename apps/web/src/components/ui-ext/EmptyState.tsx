import * as React from "react";
import { cn } from "@antigravity/ui";

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}: EmptyStateProps): React.JSX.Element {
  const padY = size === "sm" ? "py-8" : size === "lg" ? "py-20" : "py-12";
  const iconSize = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center border border-dashed border-line-default rounded-xl bg-bg-subtle/70 px-6 text-center",
        padY,
        className,
      )}
    >
      {Icon && (
        <div className={cn("mb-3 flex items-center justify-center rounded-full bg-white border border-line-default text-brand-500", iconSize)}>
          <Icon className={size === "lg" ? "h-7 w-7" : "h-5 w-5"} />
        </div>
      )}
      <h3 className="text-sm font-semibold text-fg-primary">{title}</h3>
      {description && (
        <p className="max-w-sm text-[12px] text-fg-secondary mt-1.5 leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
