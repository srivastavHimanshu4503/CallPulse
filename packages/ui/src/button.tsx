import * as React from "react";
import { cn } from "./utils.js";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 rounded-lg",
          {
            // Primary Indigo variant
            "bg-primary text-primary-foreground hover:bg-opacity-90 active:scale-[0.98] transition-transform duration-100":
              variant === "primary",
            // Secondary variant
            "bg-surface-dark dark:bg-surface-light text-text-dark dark:text-text-light hover:bg-opacity-80":
              variant === "secondary",
            // Outline variant
            "border border-border-dark dark:border-border-light bg-transparent hover:bg-surface-dark dark:hover:bg-surface-light text-text-dark dark:text-text-light":
              variant === "outline",
            // Ghost variant
            "bg-transparent hover:bg-surface-dark dark:hover:bg-surface-light text-text-dark dark:text-text-light":
              variant === "ghost",
            // Danger variant
            "bg-error text-white hover:bg-opacity-90 active:scale-[0.98]": variant === "danger",
          },
          {
            "h-9 px-3 text-sm": size === "sm",
            "h-10 px-4 py-2 text-base": size === "md",
            "h-11 px-6 text-lg": size === "lg",
          },
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
