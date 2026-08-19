import * as React from "react";
import { cn } from "@antigravity/ui";

export interface TabDef<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  variant?: "segmented" | "underline";
  className?: string;
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  variant = "segmented",
  className,
}: TabsProps<T>): React.JSX.Element {
  if (variant === "underline") {
    return (
      <div
        className={cn(
          "flex items-center gap-1 border-b border-line-default -mx-1 px-1 overflow-x-auto overflow-y-hidden",
          className,
        )}
      >
        {tabs.map((t) => {
          const isActive = active === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => !t.disabled && onChange(t.id)}
              disabled={t.disabled}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2 text-[12px] font-semibold transition-colors disabled:opacity-40 shrink-0",
                isActive ? "text-blue-600" : "text-fg-secondary hover:text-fg-primary",
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{t.label}</span>
              {typeof t.count === "number" && (
                <span
                  className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    isActive ? "bg-blue-100 text-blue-700" : "bg-bg-muted text-fg-muted",
                  )}
                >
                  {t.count}
                </span>
              )}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-blue-600 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // segmented
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 bg-bg-muted border border-line-default p-1 rounded-lg",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => !t.disabled && onChange(t.id)}
            disabled={t.disabled}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all disabled:opacity-40",
              isActive
                ? "bg-bg-raised text-blue-600 shadow-card ring-1 ring-blue-500/20"
                : "text-fg-secondary hover:text-fg-primary",
            )}
          >
            {Icon && (
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-blue-600" : "text-fg-muted")} />
            )}
            <span>{t.label}</span>
            {typeof t.count === "number" && (
              <span
                className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-0.5 tabular-nums",
                  isActive
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-500/25"
                    : "bg-bg-raised text-fg-muted border border-line-default",
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
