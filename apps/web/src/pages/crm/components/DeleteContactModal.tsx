import * as React from "react";
import { AlertTriangle, Layers } from "lucide-react";

interface DeleteContactModalProps {
  /** 1 for single delete; N for bulk. */
  contactCount: number;
  /** Open deals attached to the contact(s) — drives the keep/delete choice. */
  dealCount: number;
  contactName?: string;
  isDeleting?: boolean;
  onConfirm: (opts: { deleteDeals: boolean }) => void;
  onClose: () => void;
}

/**
 * Deleting a contact always removes its activity timeline and notes (they
 * are meaningless without the contact). Deals are the user's explicit
 * choice: keep them on the pipeline board, or delete them too.
 */
export function DeleteContactModal({
  contactCount,
  dealCount,
  contactName,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteContactModalProps): React.JSX.Element {
  const [deleteDeals, setDeleteDeals] = React.useState(false);
  const many = contactCount > 1;
  const title = many ? `Delete ${contactCount} contacts` : `Delete ${contactName || "contact"}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fg-primary/30 backdrop-blur-[2px]">
      <div className="bg-white border border-line-default rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-line-subtle flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-lg bg-negative-50 text-negative-500 ring-1 ring-negative-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <h3 className="text-[14px] font-semibold text-fg-primary">{title}</h3>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[12.5px] text-fg-secondary leading-relaxed">
            The full activity timeline — calls, field updates and notes — will be{" "}
            <strong className="text-fg-primary">permanently deleted</strong> with{" "}
            {many ? "these contacts" : "this contact"}. This cannot be undone.
          </p>

          {dealCount > 0 && (
            <label className="flex items-start gap-2.5 rounded-lg border border-line-default bg-bg-subtle p-3 cursor-pointer select-none hover:border-negative-500/40 transition-colors">
              <input
                type="checkbox"
                checked={deleteDeals}
                onChange={(e) => setDeleteDeals(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line-strong text-negative-500 focus:ring-2 focus:ring-negative-500/30 cursor-pointer"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-fg-primary">
                  <Layers className="h-3.5 w-3.5 text-fg-muted" />
                  Also delete {dealCount} linked deal{dealCount === 1 ? "" : "s"}
                </span>
                <span className="block text-[11px] text-fg-muted mt-0.5 leading-relaxed">
                  Unchecked, the deal{dealCount === 1 ? " stays" : "s stay"} on your pipeline
                  board so you don't lose the opportunity.
                </span>
              </span>
            </label>
          )}
        </div>

        <div className="px-5 py-3 bg-bg-subtle border-t border-line-subtle flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-md border border-line-default bg-white hover:bg-bg-muted text-[12px] font-semibold text-fg-primary transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onConfirm({ deleteDeals })}
            className="h-9 px-3.5 rounded-md bg-negative-500 hover:bg-negative-600 text-white text-[12px] font-semibold transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Deleting…" : many ? `Delete ${contactCount} contacts` : "Delete contact"}
          </button>
        </div>
      </div>
    </div>
  );
}
