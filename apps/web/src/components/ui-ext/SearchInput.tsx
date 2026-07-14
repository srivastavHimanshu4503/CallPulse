import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@antigravity/ui";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  autoFocus,
}: SearchInputProps): React.JSX.Element {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full bg-white border border-line-default focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md h-9 pl-8 pr-8 focus:outline-none shadow-card"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full text-fg-muted hover:text-fg-primary hover:bg-bg-muted flex items-center justify-center"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
