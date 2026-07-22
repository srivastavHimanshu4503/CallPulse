import * as React from "react";
import { Search, Info } from "lucide-react";
import { groupByCategory } from "../registry.js";
import type { BlockDef } from "../types.js";
import { BlockIcon } from "./BlockIcon.js";
import { cn } from "@antigravity/ui";

interface BlockLibraryProps {
  /** Called when a block is added. Canvas decides where. */
  onAddBlock: (type: string) => void;
  activeType?: string | null;
}

/**
 * Left sidebar — actions + logic only. Trigger lives in the canvas as a
 * fixed hero card the user configures inline. Kept intentionally small
 * (~4 actions, 2 logic) per product direction.
 */
export function BlockLibrary({ onAddBlock, activeType }: BlockLibraryProps): React.JSX.Element {
  const [search, setSearch] = React.useState("");
  const groups = groupByCategory();

  const filter = (blocks: BlockDef[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return blocks;
    return blocks.filter(
      (b) =>
        b.label.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.group.toLowerCase().includes(q),
    );
  };

  const cats = [
    { label: "Actions", hint: "Do something to the contact", items: filter(groups.action) },
    { label: "Logic", hint: "Branch or wait", items: filter(groups.logic) },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[280px] shrink-0 border-r border-line-default bg-gradient-to-b from-bg-canvas to-bg-canvas overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-line-subtle shrink-0">
        <div className="text-[13px] font-semibold text-fg-primary tracking-tight">Add step</div>
        <div className="text-[10.5px] text-fg-muted mt-0.5 leading-relaxed">
          Click any block to append it to the flow.
        </div>
        <div className="relative mt-2.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks…"
            className="w-full bg-bg-raised border border-line-default focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-[12px] text-fg-primary placeholder-fg-muted rounded-md h-8 pl-8 pr-2 focus:outline-none shadow-card"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {/* Info note about triggers */}
        <div className="mx-3 mb-3 rounded-lg border border-blue-500/25 bg-blue-50 px-3 py-2 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-[10.5px] text-blue-800 leading-relaxed">
            The <b>trigger</b> is set inside the card at the top of the canvas — one per workflow.
          </div>
        </div>

        {cats.map((cat) => (
          <div key={cat.label} className="mb-3">
            <div className="px-4 mb-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                {cat.label}
                <span className="ml-1.5 text-fg-muted font-medium">({cat.items.length})</span>
              </div>
              <div className="text-[10.5px] text-fg-muted mt-0.5">{cat.hint}</div>
            </div>

            <ul className="space-y-0.5 px-2">
              {cat.items.length === 0 ? (
                <li className="px-2 py-2 text-[10.5px] text-fg-muted italic">No matches</li>
              ) : (
                cat.items.map((b) => (
                  <li key={b.type}>
                    <button
                      type="button"
                      onClick={() => onAddBlock(b.type)}
                      className={cn(
                        "w-full flex items-start gap-2.5 px-2 py-2 rounded-md text-left transition-colors",
                        activeType === b.type
                          ? "bg-blue-50 ring-1 ring-blue-500/20"
                          : "hover:bg-bg-raised hover:shadow-card hover:ring-1 hover:ring-line-default",
                      )}
                    >
                      <BlockIcon icon={b.icon} tone={b.tone} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-fg-primary leading-tight truncate">
                          {b.label}
                        </div>
                        <div className="text-[10.5px] text-fg-muted mt-0.5 leading-tight line-clamp-2">
                          {b.description}
                        </div>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </aside>
  );
}
