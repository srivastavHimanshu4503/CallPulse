import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@antigravity/ui";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (value: number) => void;
  pageSizes?: number[];
  className?: string;
}

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizes = [10, 20, 50, 100],
  className,
}: PaginationProps): React.JSX.Element {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-line-subtle px-4 py-2.5 bg-bg-subtle text-[11.5px] text-fg-secondary select-none",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {onItemsPerPageChange && (
          <>
            <span>Rows per page</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="h-7 bg-bg-raised border border-line-default text-[11.5px] font-semibold text-fg-primary rounded-md px-2 focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <div className="font-semibold text-fg-primary">
        {start.toLocaleString("en-IN")}–{end.toLocaleString("en-IN")} of{" "}
        {totalItems.toLocaleString("en-IN")}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-7 w-7 rounded-md border border-line-default bg-bg-raised text-fg-secondary hover:text-fg-primary hover:bg-bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-2 font-semibold text-fg-primary tabular-nums">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="h-7 w-7 rounded-md border border-line-default bg-bg-raised text-fg-secondary hover:text-fg-primary hover:bg-bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
