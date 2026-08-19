import * as React from "react";
import { Modal } from "@antigravity/ui";
import { Folder, FolderOpen, Home, Check, FolderInput } from "lucide-react";
import { cn } from "@antigravity/ui";
import type { WorkflowFolder } from "../types.js";

interface FolderPickerModalProps {
  title?: string;
  helper?: string;
  folders: WorkflowFolder[];
  /** The folder that would be moved. When picking a parent, we exclude
   *  this id + its descendants from the choices (a folder cannot become
   *  its own descendant's child). Pass undefined when moving a workflow. */
  excludeFolderId?: string;
  /** Current parent/folder id — highlighted and marked "current". */
  currentId?: string | null;
  isSaving?: boolean;
  onClose: () => void;
  onPick: (folderId: string | null) => void;
  /** CTA label. Defaults to "Move here". */
  confirmLabel?: string;
}

/**
 * A single reusable "pick a folder" modal. Used for:
 *   - moving a workflow into a folder
 *   - moving a folder to be a child of another folder (or to root)
 * When `excludeFolderId` is set, that folder + all its descendants are
 * hidden so you can't create a cycle.
 */
export function FolderPickerModal({
  title = "Move to folder",
  helper = "Pick where this should live.",
  folders,
  excludeFolderId,
  currentId,
  isSaving,
  onClose,
  onPick,
  confirmLabel = "Move here",
}: FolderPickerModalProps): React.JSX.Element {
  const [selected, setSelected] = React.useState<string | null>(currentId ?? null);

  // Compute the set of forbidden ids (self + descendants) so we don't
  // create cycles when re-parenting a folder.
  const forbidden = React.useMemo(() => {
    const out = new Set<string>();
    if (!excludeFolderId) return out;
    out.add(excludeFolderId);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of folders) {
        if (f.parentId && out.has(f.parentId) && !out.has(f.id)) {
          out.add(f.id);
          changed = true;
        }
      }
    }
    return out;
  }, [folders, excludeFolderId]);

  // Flatten the tree into a depth-labelled list, filtering out forbidden nodes.
  const flat = React.useMemo(() => {
    const out: { folder: WorkflowFolder; depth: number }[] = [];
    const roots = folders
      .filter((f) => !f.parentId && !forbidden.has(f.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    const walk = (list: WorkflowFolder[], depth: number) => {
      for (const f of list) {
        out.push({ folder: f, depth });
        const kids = folders
          .filter((c) => c.parentId === f.id && !forbidden.has(c.id))
          .sort((a, b) => a.name.localeCompare(b.name));
        walk(kids, depth + 1);
      }
    };
    walk(roots, 0);
    return out;
  }, [folders, forbidden]);

  const canConfirm = !isSaving && selected !== (currentId ?? null);

  return (
    <Modal
      isOpen={true}
      onClose={isSaving ? () => {} : onClose}
      size="sm"
      title={
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-500/25 flex items-center justify-center">
            <FolderInput className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-fg-primary">{title}</span>
        </div>
      }
    >
      <div className="flex flex-col font-sans max-h-[75vh]">
        <div className="px-5 pt-4 pb-2">
          <p className="text-[11.5px] text-fg-secondary leading-relaxed">{helper}</p>
        </div>

        <div className="px-2 pb-2 max-h-[360px] overflow-y-auto">
          {/* Root */}
          <FolderRow
            depth={0}
            icon={Home}
            label="Root — not inside any folder"
            selected={selected === null}
            isCurrent={currentId === null || currentId === undefined}
            onSelect={() => setSelected(null)}
          />

          {flat.length === 0 ? (
            <div className="px-3 py-6 text-center text-[11.5px] text-fg-muted italic">
              No other folders yet. Create one first with{" "}
              <b className="text-fg-primary">+ New folder</b>.
            </div>
          ) : (
            flat.map(({ folder, depth }) => (
              <FolderRow
                key={folder.id}
                depth={depth + 1}
                icon={Folder}
                label={folder.name}
                selected={selected === folder.id}
                isCurrent={currentId === folder.id}
                onSelect={() => setSelected(folder.id)}
              />
            ))
          )}
        </div>

        <div className="border-t border-line-default px-5 py-3 bg-slate-50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-9 px-3.5 rounded-md border border-line-default bg-bg-raised hover:bg-bg-subtle text-fg-primary text-[12px] font-semibold disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onPick(selected)}
            disabled={!canConfirm}
            className="h-9 px-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-semibold shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Moving…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FolderRow({
  depth,
  icon: Icon,
  label,
  selected,
  isCurrent,
  onSelect,
}: {
  depth: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 py-1.5 rounded-md text-left transition-colors text-[12.5px]",
        selected ? "bg-blue-100 text-blue-800" : "text-fg-primary hover:bg-slate-100",
      )}
      style={{ paddingLeft: 8 + depth * 14, paddingRight: 8 }}
    >
      {selected ? (
        <FolderOpen className={cn("h-3.5 w-3.5 shrink-0", "text-blue-600")} />
      ) : (
        <Icon
          className={cn("h-3.5 w-3.5 shrink-0", isCurrent ? "text-fg-muted" : "text-amber-500")}
        />
      )}
      <span className="flex-1 font-medium truncate">{label}</span>
      {isCurrent && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted bg-slate-100 border border-line-default rounded px-1.5 py-0.5 shrink-0">
          current
        </span>
      )}
      {selected && !isCurrent && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
    </button>
  );
}
