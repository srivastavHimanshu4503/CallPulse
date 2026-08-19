import * as React from "react";
import { Modal } from "@antigravity/ui";
import { AlertTriangle, ArrowUpCircle } from "lucide-react";

interface DeleteFolderModalProps {
  folderName: string;
  workflowCount: number;
  subfolderCount: number;
  parentName: string | null;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Destructive-action confirmation. Explicit about what's happening: the
 * folder is removed, but nothing inside is deleted — the workflows and
 * sub-folders re-parent up one level. Matches server-side semantics.
 */
export function DeleteFolderModal({
  folderName,
  workflowCount,
  subfolderCount,
  parentName,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteFolderModalProps): React.JSX.Element {
  const target = parentName || "the root";

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
          <span className="text-[13px] font-semibold text-fg-primary">Delete folder</span>
        </div>
      }
    >
      <div className="p-5 space-y-3 font-sans">
        <p className="text-[13px] text-fg-primary leading-relaxed">
          Delete <b>“{folderName}”</b>?
        </p>

        <div className="rounded-md bg-slate-50 border border-line-default p-3 space-y-2">
          <div className="flex items-start gap-2 text-[11.5px] text-fg-secondary">
            <ArrowUpCircle className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              {workflowCount === 0 && subfolderCount === 0 ? (
                <>This folder is empty — nothing else changes.</>
              ) : (
                <>
                  {workflowCount > 0 && (
                    <>
                      <b className="text-fg-primary">{workflowCount}</b> workflow
                      {workflowCount === 1 ? "" : "s"}
                    </>
                  )}
                  {workflowCount > 0 && subfolderCount > 0 && " and "}
                  {subfolderCount > 0 && (
                    <>
                      <b className="text-fg-primary">{subfolderCount}</b> sub-folder
                      {subfolderCount === 1 ? "" : "s"}
                    </>
                  )}{" "}
                  will move to <b className="text-fg-primary">{target}</b>. No workflows are
                  deleted.
                </>
              )}
            </div>
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
          className="h-9 px-3.5 rounded-md bg-rose-500 hover:bg-rose-600 text-white text-[12px] font-semibold shadow-card disabled:opacity-60"
        >
          {isDeleting ? "Deleting…" : "Delete folder"}
        </button>
      </div>
    </Modal>
  );
}
