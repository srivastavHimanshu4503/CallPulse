import * as React from "react";
import { Modal } from "@antigravity/ui";
import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true,
  onConfirm,
  onClose,
}: ConfirmModalProps): React.JSX.Element | null {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={
        <div className="flex items-center gap-2">
          {isDestructive && (
            <span className="h-7 w-7 rounded-md bg-rose-50 text-rose-500 ring-1 ring-rose-500/25 flex items-center justify-center">
              <AlertTriangle className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="text-[13px] font-semibold text-fg-primary">{title}</span>
        </div>
      }
    >
      <div className="p-5 space-y-3 font-sans">
        <div className="text-[13px] text-fg-primary leading-relaxed">{message}</div>
      </div>
      <div className="border-t border-line-default px-5 py-3 bg-slate-50 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-3.5 rounded-md border border-line-default bg-bg-raised hover:bg-bg-subtle text-fg-primary text-[12px] font-semibold"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`h-9 px-3.5 rounded-md text-white text-[12px] font-semibold shadow-card ${
            isDestructive ? "bg-rose-500 hover:bg-rose-600" : "bg-brand-500 hover:bg-brand-600"
          }`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
