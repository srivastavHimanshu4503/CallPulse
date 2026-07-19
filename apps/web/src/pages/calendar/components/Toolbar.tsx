import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Segmented } from "../../../components/common/UI.tsx";
import type { ViewMode } from "../types.js";

interface ToolbarProps {
  label: string;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  onNavigate: (dir: -1 | 1) => void;
  onToday: () => void;
}

export function Toolbar({ label, view, onViewChange, onNavigate, onToday }: ToolbarProps): React.JSX.Element {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-[20px] font-bold text-fg-primary tracking-tight shrink-0">Calendar</h1>
        <span className="hidden md:block h-5 w-px bg-line-default" />
        <span className="hidden md:block text-[13.5px] font-semibold text-fg-secondary truncate tabular-nums">{label}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onToday}
          className="h-8 px-3 text-[12px] font-semibold text-fg-secondary bg-white border border-line-default rounded-lg hover:bg-bg-subtle hover:text-fg-primary transition-colors"
        >
          Today
        </button>
        <div className="inline-flex items-center rounded-lg border border-line-default bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => onNavigate(-1)}
            className="h-8 w-9 flex items-center justify-center text-fg-muted hover:text-fg-primary hover:bg-bg-subtle transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-px h-4 bg-line-subtle" />
          <button
            type="button"
            onClick={() => onNavigate(1)}
            className="h-8 w-9 flex items-center justify-center text-fg-muted hover:text-fg-primary hover:bg-bg-subtle transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <span className="md:hidden text-[12.5px] font-semibold text-fg-secondary tabular-nums">{label}</span>
        <Segmented<ViewMode>
          options={[
            { value: "Month", label: "Month" },
            { value: "Week", label: "Week" },
            { value: "Day", label: "Day" },
          ]}
          value={view}
          onChange={onViewChange}
        />
      </div>
    </header>
  );
}
