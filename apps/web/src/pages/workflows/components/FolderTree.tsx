import * as React from "react";
import { createPortal } from "react-dom";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Inbox,
  Info,
  FolderInput,
} from "lucide-react";
import { cn } from "@antigravity/ui";
import type { WorkflowFolder } from "../types.js";

/** Selected folder id. `null` = root ("All workflows" — everything). */
export type SelectedFolder = string | null;

interface TreeNode extends WorkflowFolder {
  children: TreeNode[];
  depth: number;
}

export function buildFolderTree(folders: WorkflowFolder[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const f of folders) {
    byId.set(f.id, { ...f, children: [], depth: 0 });
  }
  const roots: TreeNode[] = [];
  for (const f of folders) {
    const node = byId.get(f.id)!;
    if (f.parentId && byId.has(f.parentId)) {
      const parent = byId.get(f.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

interface FolderTreeProps {
  folders: WorkflowFolder[];
  selected: SelectedFolder;
  onSelect: (id: SelectedFolder) => void;
  onCreate: (parentId: string | null) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string) => void;
  rootWorkflowCount: number;
}

/**
 * Left sidebar. Two mental buckets:
 *   1. "All workflows" — everything, folder-tagged or not
 *   2. The folder tree — click any folder to see only its contents
 * Kebab menu per folder: new sub-folder, rename, move, delete.
 */
export function FolderTree({
  folders,
  selected,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onMove,
  rootWorkflowCount,
}: FolderTreeProps): React.JSX.Element {
  const tree = React.useMemo(() => buildFolderTree(folders), [folders]);
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    // Auto-expand ancestors of the current selection.
    if (!selected) return;
    const path: string[] = [];
    let cursor: WorkflowFolder | undefined = folders.find((f) => f.id === selected);
    while (cursor && cursor.parentId) {
      path.push(cursor.parentId);
      cursor = folders.find((f) => f.id === cursor!.parentId);
    }
    if (path.length > 0) {
      setExpanded((prev) => {
        const next = new Set(prev);
        for (const id of path) next.add(id);
        return next;
      });
    }
  }, [selected, folders]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="hidden md:flex flex-col w-[250px] shrink-0 border-r border-line-default bg-slate-50 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-line-subtle shrink-0 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
          Folders
        </span>
        <button
          type="button"
          onClick={() => onCreate(null)}
          className="inline-flex items-center gap-1 h-6 px-1.5 rounded text-[10.5px] font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-800"
          title="New root folder"
        >
          <Plus className="h-3 w-3" /> New
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {/* All workflows */}
        <RootRow
          icon={Inbox}
          label="All workflows"
          count={rootWorkflowCount}
          selected={selected === null}
          onClick={() => onSelect(null)}
        />

        {tree.length > 0 && (
          <div className="pt-1 mt-1 border-t border-line-subtle">
            {tree.map((node) => (
              <FolderRow
                key={node.id}
                node={node}
                expanded={expanded}
                onToggle={toggle}
                selected={selected}
                onSelect={onSelect}
                onCreate={onCreate}
                onRename={onRename}
                onDelete={onDelete}
                onMove={onMove}
              />
            ))}
          </div>
        )}

        {/* Inline help — only when there are no folders yet */}
        {tree.length === 0 && (
          <div className="mx-3 mt-3 rounded-md border border-dashed border-blue-500/25 bg-blue-50/50 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-[10.5px] text-blue-800 leading-relaxed">
                <b>No folders yet.</b> Click <b>+ New</b> above to create one — then group workflows
                by campaign, team, or vertical.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint — always shown, quick reminder of how moves work */}
      <div className="border-t border-line-subtle px-3 py-2 shrink-0 bg-bg-raised">
        <p className="text-[10px] text-fg-muted leading-relaxed">
          Use the <b className="text-fg-primary">⋯</b> on any workflow or folder to{" "}
          <b className="text-fg-primary">move</b> it into another folder.
        </p>
      </div>
    </aside>
  );
}

/* ─────────────────── All-workflows row ─────────────────── */

function RootRow({
  icon: Icon,
  label,
  count,
  selected,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 pl-3 pr-2 h-8 text-left transition-colors",
        selected
          ? "bg-blue-100 text-blue-800 border-l-2 border-blue-500 pl-[10px]"
          : "text-fg-primary hover:bg-slate-100",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", selected ? "text-blue-600" : "text-blue-500")} />
      <span className="flex-1 text-[12.5px] font-semibold truncate">{label}</span>
      <span
        className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums shrink-0",
          selected ? "bg-white text-blue-700" : "bg-slate-200 text-fg-secondary",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/* ─────────────────── Folder row (recursive) ─────────────────── */

function FolderRow({
  node,
  expanded,
  onToggle,
  selected,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onMove,
}: {
  node: TreeNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selected: SelectedFolder;
  onSelect: (id: SelectedFolder) => void;
  onCreate: (parentId: string | null) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string) => void;
}): React.JSX.Element {
  const isExpanded = expanded.has(node.id);
  const isSelected = selected === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-1 h-8 transition-colors",
          isSelected
            ? "bg-blue-100 text-blue-800 border-l-2 border-blue-500"
            : "hover:bg-slate-100",
        )}
        style={{ paddingLeft: 4 + node.depth * 14 + (isSelected ? 0 : 2) }}
      >
        <button
          type="button"
          onClick={() => onToggle(node.id)}
          className="h-5 w-5 flex items-center justify-center text-fg-muted hover:text-fg-primary shrink-0"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <span className="h-3 w-3 inline-block" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelect(node.id)}
          className="flex-1 flex items-center gap-1.5 pr-1 h-full text-left min-w-0"
        >
          {isExpanded ? (
            <FolderOpen
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                isSelected ? "text-blue-600" : "text-amber-500",
              )}
            />
          ) : (
            <Folder
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                isSelected ? "text-blue-600" : "text-amber-500",
              )}
            />
          )}
          <span className="flex-1 text-[12.5px] font-medium truncate">{node.name}</span>
          {node.workflowCount > 0 && (
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums shrink-0",
                isSelected ? "bg-white text-blue-700" : "bg-slate-200 text-fg-secondary",
              )}
            >
              {node.workflowCount}
            </span>
          )}
        </button>
        <FolderKebab
          onCreateChild={() => onCreate(node.id)}
          onRename={() => onRename(node.id)}
          onMove={() => onMove(node.id)}
          onDelete={() => onDelete(node.id)}
        />
      </div>
      {isExpanded &&
        node.children.map((child) => (
          <FolderRow
            key={child.id}
            node={child}
            expanded={expanded}
            onToggle={onToggle}
            selected={selected}
            onSelect={onSelect}
            onCreate={onCreate}
            onRename={onRename}
            onDelete={onDelete}
            onMove={onMove}
          />
        ))}
    </>
  );
}

/* ─────────────────── Per-folder kebab (portal) ─────────────────── */

function FolderKebab({
  onCreateChild,
  onRename,
  onMove,
  onDelete,
}: {
  onCreateChild: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const w = 200;
    let top = r.bottom + 4;
    if (top + 170 > window.innerHeight) top = r.top - 4 - 170;
    let left = r.right - w;
    if (left < 8) left = 8;
    setPos({ top, left });
    setOpen(true);
  };

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node))
        return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onWin = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onWin, true);
    window.addEventListener("resize", onWin);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onWin, true);
      window.removeEventListener("resize", onWin);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openMenu}
        className={cn(
          "h-6 w-6 rounded flex items-center justify-center transition-colors shrink-0",
          open
            ? "bg-slate-200 text-fg-primary"
            : "opacity-0 group-hover:opacity-100 text-fg-muted hover:text-fg-primary hover:bg-slate-200",
        )}
        aria-label="Folder actions"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 200, zIndex: 1000 }}
            className="rounded-lg border border-line-default bg-bg-raised shadow-pop py-1"
          >
            <MenuItem
              icon={Plus}
              label="New sub-folder"
              onClick={() => {
                setOpen(false);
                onCreateChild();
              }}
            />
            <MenuItem
              icon={Pencil}
              label="Rename"
              onClick={() => {
                setOpen(false);
                onRename();
              }}
            />
            <MenuItem
              icon={FolderInput}
              label="Move to…"
              onClick={() => {
                setOpen(false);
                onMove();
              }}
            />
            <div className="h-px bg-line-subtle my-1" />
            <MenuItem
              icon={Trash2}
              label="Delete folder"
              destructive
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium transition-colors",
        destructive ? "text-rose-500 hover:bg-rose-50" : "text-fg-primary hover:bg-slate-50",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", destructive ? "text-rose-500" : "text-fg-muted")} />
      {label}
    </button>
  );
}
