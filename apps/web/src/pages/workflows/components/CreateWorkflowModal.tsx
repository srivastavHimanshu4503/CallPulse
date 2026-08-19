import * as React from "react";
import { Modal } from "@antigravity/ui";
import {
  Sparkles,
  Zap,
  Flame,
  Snowflake,
  PhoneMissed,
  TrendingUp,
  ChevronDown,
  Home,
  Folder,
  Check,
} from "lucide-react";
import { cn } from "@antigravity/ui";
import { TEMPLATES, TONE_STYLES } from "../registry.js";
import type { WorkflowFolder, WorkflowTemplate } from "../types.js";

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Flame,
  Snowflake,
  PhoneMissed,
  TrendingUp,
};

interface CreateWorkflowModalProps {
  folders: WorkflowFolder[];
  /** Default folder — usually the one the user is currently viewing. */
  defaultFolderId?: string | null;
  isSaving?: boolean;
  onClose: () => void;
  /** Called on submit. `templateId=null` means blank. */
  onSubmit: (args: { templateId: string | null; folderId: string | null }) => void;
}

/**
 * Single entry point for creating a workflow. Two explicit choices:
 *   1. What to start from — Blank or a specific template (radio-like cards).
 *   2. Where to put it — folder dropdown, defaults to whatever the user
 *      was viewing when they clicked "New workflow".
 */
export function CreateWorkflowModal({
  folders,
  defaultFolderId = null,
  isSaving,
  onClose,
  onSubmit,
}: CreateWorkflowModalProps): React.JSX.Element {
  // "blank" or a template id
  const [choice, setChoice] = React.useState<"blank" | string>("blank");
  const [folderId, setFolderId] = React.useState<string | null>(defaultFolderId);

  const submit = () => {
    if (isSaving) return;
    onSubmit({
      templateId: choice === "blank" ? null : choice,
      folderId,
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={isSaving ? () => {} : onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 rounded-md bg-blue-50 text-blue-600 ring-1 ring-blue-500/25 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-semibold text-fg-primary">Create a workflow</span>
        </div>
      }
    >
      <div className="flex flex-col font-sans max-h-[85vh]">
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Step 1 — starting point */}
          <section>
            <div className="mb-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted">
                Step 1 · Choose a starting point
              </div>
              <p className="text-[11.5px] text-fg-secondary mt-0.5 leading-relaxed">
                Start from scratch or use a pre-wired recipe you can tweak.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Blank card — always first */}
              <ChoiceCard
                active={choice === "blank"}
                onClick={() => setChoice("blank")}
                icon={Zap}
                title="Start blank"
                description="Empty canvas. Set your own trigger and steps."
                tone="brand"
              />

              {TEMPLATES.map((t: WorkflowTemplate) => {
                const Icon = TEMPLATE_ICONS[t.icon] || Zap;
                const tone = TONE_STYLES[t.tone];
                return (
                  <ChoiceCard
                    key={t.id}
                    active={choice === t.id}
                    onClick={() => setChoice(t.id)}
                    icon={Icon}
                    title={t.name}
                    description={t.description}
                    toneClasses={tone}
                  />
                );
              })}
            </div>
          </section>

          {/* Step 2 — folder */}
          <section>
            <div className="mb-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted">
                Step 2 · Choose a folder
              </div>
              <p className="text-[11.5px] text-fg-secondary mt-0.5 leading-relaxed">
                Group related workflows into folders. You can move it later.
              </p>
            </div>

            <FolderDropdown folders={folders} value={folderId} onChange={setFolderId} />
          </section>
        </div>

        <div className="border-t border-line-default px-5 py-3 bg-slate-50 flex items-center justify-between gap-2">
          <div className="text-[10.5px] text-fg-muted leading-tight max-w-xs">
            {choice === "blank" ? (
              <>You'll pick the trigger + actions on the canvas.</>
            ) : (
              <>The template's trigger + actions are pre-set — you can edit any of them after.</>
            )}
          </div>
          <div className="flex items-center gap-2">
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
              onClick={submit}
              disabled={isSaving}
              className="h-9 px-3.5 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-[12px] font-semibold shadow-card disabled:opacity-60"
            >
              {isSaving ? "Creating…" : "Create workflow"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────────── Choice card ─────────────────── */

function ChoiceCard({
  active,
  onClick,
  icon: Icon,
  title,
  description,
  tone,
  toneClasses,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tone?: "brand";
  toneClasses?: { tile: string; ring: string };
}): React.JSX.Element {
  const tile =
    toneClasses?.tile ||
    (tone === "brand" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-fg-secondary");
  const ring = toneClasses?.ring || (tone === "brand" ? "ring-blue-500/20" : "ring-slate-200");
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left flex items-start gap-2.5 p-3 rounded-lg border transition-all",
        active
          ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-card"
          : "border-line-default bg-bg-raised hover:border-line-strong hover:shadow-card",
      )}
    >
      <span
        className={cn(
          "h-8 w-8 rounded-lg ring-1 flex items-center justify-center shrink-0",
          tile,
          ring,
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-semibold text-fg-primary leading-tight">{title}</span>
          {active && <Check className="h-3 w-3 text-blue-600" />}
        </div>
        <p className="text-[10.5px] text-fg-secondary leading-snug mt-0.5">{description}</p>
      </div>
    </button>
  );
}

/* ─────────────────── Folder dropdown ─────────────────── */

function FolderDropdown({
  folders,
  value,
  onChange,
}: {
  folders: WorkflowFolder[];
  value: string | null;
  onChange: (id: string | null) => void;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  const flat = React.useMemo(() => {
    const out: { folder: WorkflowFolder; depth: number }[] = [];
    const roots = folders.filter((f) => !f.parentId).sort((a, b) => a.name.localeCompare(b.name));
    const walk = (list: WorkflowFolder[], depth: number) => {
      for (const f of list) {
        out.push({ folder: f, depth });
        const kids = folders
          .filter((c) => c.parentId === f.id)
          .sort((a, b) => a.name.localeCompare(b.name));
        walk(kids, depth + 1);
      }
    };
    walk(roots, 0);
    return out;
  }, [folders]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const currentLabel = value ? folders.find((f) => f.id === value)?.name : null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2 h-10 px-3 rounded-md border transition-colors text-left shadow-card",
          open
            ? "border-blue-500 ring-2 ring-blue-500/20 bg-bg-raised"
            : "border-line-default bg-bg-raised hover:border-line-strong",
        )}
      >
        {currentLabel ? (
          <Folder className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        ) : (
          <Home className="h-3.5 w-3.5 text-fg-muted shrink-0" />
        )}
        <span className="flex-1 text-[12.5px] font-medium text-fg-primary truncate">
          {currentLabel || "Root — not inside any folder"}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 text-fg-muted transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-bg-raised border border-line-default rounded-md shadow-pop py-1 max-h-[240px] overflow-y-auto">
          <MenuFolderRow
            active={value === null}
            depth={0}
            icon={Home}
            label="Root — not inside any folder"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          />
          {flat.length === 0 ? (
            <div className="px-3 py-2.5 text-[11px] text-fg-muted italic">
              No folders yet. Close this modal and create one from the sidebar.
            </div>
          ) : (
            flat.map(({ folder, depth }) => (
              <MenuFolderRow
                key={folder.id}
                active={value === folder.id}
                depth={depth + 1}
                icon={Folder}
                label={folder.name}
                onClick={() => {
                  onChange(folder.id);
                  setOpen(false);
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MenuFolderRow({
  active,
  depth,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  depth: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 py-1.5 text-left transition-colors text-[12px]",
        active ? "bg-blue-50 text-blue-800 font-semibold" : "text-fg-primary hover:bg-slate-50",
      )}
      style={{ paddingLeft: 12 + depth * 14, paddingRight: 12 }}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-blue-600" : "text-amber-500")} />
      <span className="flex-1 truncate">{label}</span>
      {active && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
    </button>
  );
}
