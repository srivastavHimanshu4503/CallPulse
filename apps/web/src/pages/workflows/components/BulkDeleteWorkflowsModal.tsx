import * as React from "react";
import { Modal } from "@antigravity/ui";
import { AlertTriangle, Trash2, History, Zap } from "lucide-react";
import type { WorkflowDef } from "../types.js";

interface BulkDeleteWorkflowsModalProps {
  workflows: WorkflowDef[];
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation modal for deleting multiple workflows at once. Shows the
 * count, how many are active (so a rogue click on an active workflow is
 * visible), and the combined run-history that will be removed.
 */
export function BulkDeleteWorkflowsModal({
  workflows,
  isDeleting,
  onClose,
  onConfirm,
}: BulkDeleteWorkflowsModalProps): React.JSX.Element {
  const total = workflows.length;
  const activeCount = workflows.filter((w) => w.isActive).length;
  const totalRuns = workflows.reduce((s, w) => s + (w.runCount || 0), 0);

  return (
    <Modal
      isOpen={true}
      onClose={isDeleting ? () => {} : onClose}
      size="md"
      title={
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-md bg-rose-50 text-rose-500 ring-1 ring-rose-500/25 flex items-center justify-center">
            <AlertTriangle className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-fg-primary">
            Delete {total} workflow{total === 1 ? "" : "s"}
          </span>
        </div>
      }
    >
      <div className="p-5 space-y-3 font-sans">
        <p className="text-[13px] text-fg-primary leading-relaxed">
          You're about to delete <b>{total}</b> workflow{total === 1 ? "" : "s"}. This cannot be undone.
        </p>

        {/* Consequence list */}
        <ul className="rounded-md bg-slate-50 border border-line-default divide-y divide-line-subtle overflow-hidden">
          <li className="flex items-start gap-2 px-3 py-2 text-[11.5px] text-fg-secondary">
            <Zap className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              The workflow definitions (triggers, steps, filters) will be permanently removed.
            </div>
          </li>
          {totalRuns > 0 && (
            <li className="flex items-start gap-2 px-3 py-2 text-[11.5px] text-fg-secondary">
              <History className="h-3.5 w-3.5 text-fg-muted mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <b className="text-fg-primary">{totalRuns.toLocaleString("en-IN")}</b> combined past
                run{totalRuns === 1 ? "" : "s"} will be removed. Call logs on individual contacts stay.
              </div>
            </li>
          )}
          {activeCount > 0 && (
            <li className="flex items-start gap-2 px-3 py-2 text-[11.5px] text-amber-800 bg-amber-50">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <b>{activeCount}</b> of the selected workflows {activeCount === 1 ? "is" : "are"}{" "}
                <b>currently active</b> — any live matches stop firing immediately.
              </div>
            </li>
          )}
        </ul>

        {/* Preview of names (first 6) so user can spot a mistake */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-1.5">
            Selected
          </div>
          <div className="rounded-md border border-line-default bg-bg-raised max-h-[140px] overflow-y-auto divide-y divide-line-subtle">
            {workflows.slice(0, 12).map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-2 px-3 py-1.5">
                <span className="text-[12px] text-fg-primary truncate">{w.name}</span>
                {w.isActive && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-500/25 rounded px-1.5 py-0.5 shrink-0">
                    Active
                  </span>
                )}
              </div>
            ))}
            {workflows.length > 12 && (
              <div className="px-3 py-1.5 text-[11px] text-fg-muted italic">
                + {workflows.length - 12} more…
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-line-default px-5 py-3 bg-slate-50 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isDeleting}
          className="h-9 px-3.5 rounded-md border border-line-default bg-bg-raised hover:bg-bg-subtle text-fg-primary text-[12px] font-semibold disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isDeleting}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[12px] font-semibold shadow-card disabled:opacity-60"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {isDeleting ? "Deleting…" : `Delete ${total} workflow${total === 1 ? "" : "s"}`}
        </button>
      </div>
    </Modal>
  );
}
