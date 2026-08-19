import * as React from "react";
import { Modal } from "@antigravity/ui";
import { AlertTriangle, History, Zap } from "lucide-react";

interface DeleteWorkflowModalProps {
  workflowName: string;
  runCount?: number;
  isActive?: boolean;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Destructive-action confirmation for deleting a workflow. Explicit
 * about consequences (run history goes too) and highlights when the
 * workflow is currently active — so the user can catch a mistake.
 */
export function DeleteWorkflowModal({
  workflowName,
  runCount,
  isActive,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteWorkflowModalProps): React.JSX.Element {
  return (
    <Modal
      isOpen={true}
      onClose={isDeleting ? () => {} : onClose}
      size="sm"
      title={
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-md bg-rose-50 text-rose-500 ring-1 ring-rose-500/25 flex items-center justify-center">
            <AlertTriangle className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-fg-primary">Delete workflow</span>
        </div>
      }
    >
      <div className="p-5 space-y-3 font-sans">
        <p className="text-[13px] text-fg-primary leading-relaxed">
          Delete <b>“{workflowName}”</b>? This cannot be undone.
        </p>

        <ul className="rounded-md bg-slate-50 border border-line-default divide-y divide-line-subtle overflow-hidden">
          <li className="flex items-start gap-2 px-3 py-2 text-[11.5px] text-fg-secondary">
            <Zap className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              The workflow definition (trigger + steps + filters) is deleted.
            </div>
          </li>
          {typeof runCount === "number" && runCount > 0 && (
            <li className="flex items-start gap-2 px-3 py-2 text-[11.5px] text-fg-secondary">
              <History className="h-3.5 w-3.5 text-fg-muted mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <b className="text-fg-primary">{runCount}</b> past run{runCount === 1 ? "" : "s"}{" "}
                will also be removed. Call logs on individual contacts are unaffected.
              </div>
            </li>
          )}
          {isActive && (
            <li className="flex items-start gap-2 px-3 py-2 text-[11.5px] text-amber-800 bg-amber-50">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                This workflow is <b>currently active</b> — any live matches stop firing immediately.
              </div>
            </li>
          )}
        </ul>
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
          className="h-9 px-3.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[12px] font-semibold shadow-card disabled:opacity-60"
        >
          {isDeleting ? "Deleting…" : "Delete workflow"}
        </button>
      </div>
    </Modal>
  );
}
