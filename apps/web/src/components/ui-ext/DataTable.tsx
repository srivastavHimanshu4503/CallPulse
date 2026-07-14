import * as React from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@antigravity/ui";

export interface Column<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** If provided, header becomes clickable and sortable. Must return a
   *  comparable value (string | number | boolean | Date). */
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined;
  width?: string;
  align?: "left" | "right" | "center";
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Optional selection support — pass both to enable checkboxes. */
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  /** Renders after the last row inside <tbody> — e.g. loading skeletons. */
  footerSlot?: React.ReactNode;
  /** Height class for the scroll container. Default: none (grows). */
  scrollClassName?: string;
  /** Show a sticky header. */
  stickyHeader?: boolean;
  /** Initial sort. */
  initialSort?: { columnId: string; direction: "asc" | "desc" };
}

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  onRowClick,
  selectedIds,
  onSelectionChange,
  emptyState,
  isLoading,
  className,
  footerSlot,
  scrollClassName,
  stickyHeader = true,
  initialSort,
}: DataTableProps<T>): React.JSX.Element {
  const [sort, setSort] = React.useState<{ columnId: string; direction: "asc" | "desc" } | null>(
    initialSort || null,
  );

  const selectable = selectedIds !== undefined && onSelectionChange !== undefined;

  const sortedRows = React.useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.columnId);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av instanceof Date && bv instanceof Date) {
        return sort.direction === "asc" ? av.getTime() - bv.getTime() : bv.getTime() - av.getTime();
      }
      if (typeof av === "number" && typeof bv === "number") {
        return sort.direction === "asc" ? av - bv : bv - av;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      return sort.direction === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return copy;
  }, [rows, sort, columns]);

  const handleSort = (col: Column<T>) => {
    if (!col.sortValue) return;
    setSort((prev) => {
      if (!prev || prev.columnId !== col.id) return { columnId: col.id, direction: "asc" };
      if (prev.direction === "asc") return { columnId: col.id, direction: "desc" };
      return null;
    });
  };

  const allSelected =
    selectable && selectedIds!.length > 0 && sortedRows.every((r) => selectedIds!.includes(getRowId(r)));
  const someSelected = selectable && selectedIds!.length > 0 && !allSelected;

  const toggleAll = () => {
    if (!selectable) return;
    if (allSelected) {
      onSelectionChange!(selectedIds!.filter((id) => !sortedRows.some((r) => getRowId(r) === id)));
    } else {
      const ids = new Set(selectedIds!);
      sortedRows.forEach((r) => ids.add(getRowId(r)));
      onSelectionChange!(Array.from(ids));
    }
  };

  const toggleRow = (id: string) => {
    if (!selectable) return;
    const set = new Set(selectedIds!);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onSelectionChange!(Array.from(set));
  };

  return (
    <div
      className={cn(
        "border border-line-default rounded-xl bg-bg-raised overflow-hidden shadow-card flex flex-col min-h-0",
        className,
      )}
    >
      <div className={cn("overflow-auto", scrollClassName)}>
        <table className="w-full text-[12px] border-collapse">
          <thead className={cn("bg-bg-subtle border-b border-line-default", stickyHeader && "sticky top-0 z-10")}>
            <tr>
              {selectable && (
                <th className="px-3 py-2.5 w-10 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleAll}
                    className="h-3.5 w-3.5 rounded border-line-strong text-brand-500 focus:ring-brand-500/30 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sort?.columnId === col.id;
                const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
                return (
                  <th
                    key={col.id}
                    style={col.width ? { width: col.width } : undefined}
                    className={cn(
                      "px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-fg-muted select-none",
                      align,
                      col.headerClassName,
                    )}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className={cn(
                          "inline-flex items-center gap-1 hover:text-fg-primary transition-colors",
                          isSorted && "text-fg-primary",
                        )}
                      >
                        <span>{col.header}</span>
                        {!isSorted && <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                        {isSorted && sort!.direction === "asc" && <ArrowUp className="h-3 w-3" />}
                        {isSorted && sort!.direction === "desc" && <ArrowDown className="h-3 w-3" />}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-6">
                  <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 bg-bg-muted rounded-md animate-pulse" />
                    ))}
                  </div>
                </td>
              </tr>
            ) : sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-0">
                  {emptyState || (
                    <div className="p-12 text-center text-xs text-fg-muted">No records to show.</div>
                  )}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => {
                const id = getRowId(row);
                const isSelected = selectable && selectedIds!.includes(id);
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      "border-b border-line-subtle transition-colors",
                      onRowClick && "cursor-pointer hover:bg-bg-muted/70",
                      // Vivid saturated tint + solid 3px left indicator — unambiguous on white
                      isSelected &&
                        "bg-brand-100 shadow-[inset_3px_0_0_0_#2563EB] hover:bg-brand-200",
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-2.5 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={isSelected}
                          onChange={() => toggleRow(id)}
                          className={cn(
                            "h-4 w-4 rounded cursor-pointer text-brand-500 focus:ring-2 focus:ring-brand-500/30",
                            isSelected
                              ? "border-brand-500 ring-1 ring-brand-500/40"
                              : "border-line-strong",
                          )}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const align =
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                            ? "text-center"
                            : "text-left";
                      return (
                        <td
                          key={col.id}
                          className={cn(
                            "px-3 py-2.5 text-[12.5px]",
                            // Bump text weight/colour on selected row so it's clearly readable on tinted bg
                            isSelected ? "text-brand-900 font-medium" : "text-fg-secondary",
                            align,
                            col.className,
                          )}
                        >
                          {col.cell(row)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
            {footerSlot}
          </tbody>
        </table>
      </div>
    </div>
  );
}
