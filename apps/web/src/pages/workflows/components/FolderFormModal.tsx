import * as React from "react";
import { Modal } from "@antigravity/ui";
import { FolderPlus, FolderOpen, Pencil } from "lucide-react";

export type FolderFormMode = "create-root" | "create-sub" | "rename";

interface FolderFormModalProps {
  mode: FolderFormMode;
  /** Initial name — used for rename (existing name) or create (empty/placeholder). */
  initialName?: string;
  /** Name of the parent folder — shown when creating a sub-folder for context. */
  parentName?: string;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

/**
 * Clean, on-brand replacement for window.prompt(). Handles all three
 * name-input flows for workflow folders through a single modal component.
 * Uses the shared @antigravity/ui Modal so it inherits app-wide keyboard
 * handling, backdrop click, and animations.
 */
export function FolderFormModal({
  mode,
  initialName = "",
  parentName,
  isSaving,
  onClose,
  onSubmit,
}: FolderFormModalProps): React.JSX.Element {
  const [name, setName] = React.useState(initialName);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Two-frame delay so the modal animation settles before we take focus.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const trimmed = name.trim();
  const changed = trimmed !== initialName.trim();
  const canSubmit = trimmed.length > 0 && (mode !== "rename" || changed) && !isSaving;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(trimmed);
  };

  const HeaderIcon = mode === "rename" ? Pencil : mode === "create-sub" ? FolderOpen : FolderPlus;
  const headerTitle =
    mode === "rename" ? "Rename folder" : mode === "create-sub" ? "New sub-folder" : "New folder";
  const submitLabel = mode === "rename" ? "Save name" : "Create folder";
  const placeholder =
    mode === "rename"
      ? "Folder name"
      : mode === "create-sub"
        ? "e.g. Onboarding sequences"
        : "e.g. Sales campaigns";

  return (
    <Modal
      isOpen={true}
      onClose={isSaving ? () => {} : onClose}
      size="sm"
      title={
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-500/25 flex items-center justify-center">
            <HeaderIcon className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-fg-primary">{headerTitle}</span>
        </div>
      }
    >
      <form onSubmit={submit} className="flex flex-col font-sans">
        <div className="p-5 space-y-4">
          {mode === "create-sub" && parentName && (
            <div className="rounded-md bg-slate-50 border border-line-default px-3 py-2 text-[11.5px] text-fg-secondary leading-relaxed">
              Inside{" "}
              <b className="text-fg-primary inline-flex items-center gap-1">
                <FolderOpen className="h-3 w-3 text-amber-500" />
                {parentName}
              </b>
            </div>
          )}

          <div>
            <label className="block text-[11.5px] font-semibold text-fg-primary mb-1.5">
              Folder name
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              disabled={isSaving}
              maxLength={80}
              className="w-full bg-bg-raised border border-line-default focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-[13px] text-fg-primary placeholder-fg-muted rounded-md h-10 px-3 focus:outline-none shadow-card disabled:opacity-60"
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10.5px] text-fg-muted">
                Give it a name your teammates will recognise at a glance.
              </p>
              <p
                className={`text-[10px] font-medium tabular-nums ${
                  trimmed.length > 60 ? "text-amber-600" : "text-fg-muted"
                }`}
              >
                {trimmed.length}/80
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-line-default px-5 py-3 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-9 px-3.5 rounded-md border border-line-default bg-bg-raised hover:bg-bg-subtle text-fg-primary text-[12px] font-semibold shadow-none disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="h-9 px-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-semibold shadow-card border-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
