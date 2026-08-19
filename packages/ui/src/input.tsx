import * as React from "react";
import { cn } from "./utils.js";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex w-full rounded-lg border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-error focus-visible:ring-error"
              : "border-border-dark dark:border-border-light focus-visible:ring-primary text-text-dark dark:text-text-light",
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-error font-medium">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
