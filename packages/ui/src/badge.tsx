import * as React from "react";
import { cn } from "./utils.js";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "success" | "warning" | "danger";
}

export function Badge({ className, variant = "primary", ...props }: BadgeProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary",
        {
          "border-transparent bg-primary text-white": variant === "primary",
          "border-transparent bg-surface-dark dark:bg-surface-light text-text-dark dark:text-text-light": variant === "secondary",
          "border-transparent bg-success bg-opacity-20 text-success border-success border-opacity-30": variant === "success",
          "border-transparent bg-warning bg-opacity-20 text-warning border-warning border-opacity-30": variant === "warning",
          "border-transparent bg-error bg-opacity-20 text-error border-error border-opacity-30": variant === "danger",
        },
        className
      )}
      {...props}
    />
  );
}
