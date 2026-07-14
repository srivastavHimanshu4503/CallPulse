import * as React from "react";
import { cn } from "@antigravity/ui";

export type StatusTone = "brand" | "positive" | "attention" | "negative" | "muted" | "accent";

const TONES: Record<StatusTone, string> = {
  brand: "bg-blue-50 text-blue-600 ring-blue-500/20",
  positive: "bg-emerald-50 text-emerald-600 ring-emerald-500/20",
  attention: "bg-amber-50 text-amber-600 ring-amber-500/20",
  negative: "bg-rose-50 text-rose-600 ring-rose-500/20",
  accent: "bg-indigo-50 text-indigo-700 ring-indigo-500/25",
  muted: "bg-bg-muted text-fg-secondary ring-line-default",
};

interface StatusPillProps {
  tone?: StatusTone;
  children: React.ReactNode;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function StatusPill({
  tone = "muted",
  children,
  dot,
  pulse,
  className,
}: StatusPillProps): React.JSX.Element {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          {pulse && (
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping",
                tone === "positive" && "bg-emerald-500",
                tone === "brand" && "bg-blue-500",
                tone === "attention" && "bg-amber-500",
                tone === "negative" && "bg-rose-500",
                tone === "accent" && "bg-indigo-500",
                tone === "muted" && "bg-fg-muted",
              )}
            />
          )}
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              tone === "positive" && "bg-emerald-500",
              tone === "brand" && "bg-blue-500",
              tone === "attention" && "bg-amber-500",
              tone === "negative" && "bg-rose-500",
              tone === "accent" && "bg-indigo-500",
              tone === "muted" && "bg-fg-muted",
            )}
          />
        </span>
      )}
      {children}
    </span>
  );
}
