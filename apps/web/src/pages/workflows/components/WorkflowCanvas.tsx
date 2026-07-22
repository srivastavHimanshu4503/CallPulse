import * as React from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  NodeToolbar,
  EdgeLabelRenderer,
  BaseEdge,
  Panel,
  getSmoothStepPath,
  applyNodeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type Connection,
  type EdgeProps,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Filter as FilterIcon,
  LayoutGrid,
  Zap,
} from "lucide-react";
import { getBlockDef, TONE_STYLES, listByCategory } from "../registry.js";
import type { BlockNode, Trigger } from "../types.js";
import { BlockIcon } from "./BlockIcon.js";
import { cn } from "@antigravity/ui";

/* ─────────────────────────── Public props ─────────────────────────── */

export interface WorkflowCanvasProps {
  trigger: Trigger;
  steps: BlockNode[];
  selectedId: string | null;
  isTriggerSelected: boolean;
  onSelectTrigger: () => void;
  onSelectStep: (id: string) => void;
  onChangeTriggerType: (type: string) => void;
  /** afterId "__start__" inserts at the front of the root chain. */
  onAddStep: (afterId: string | "__start__" | null, type: string) => void;
  onAddStepBranch: (
    parentId: string,
    branch: "then" | "else",
    position: "start" | "end",
    type: string,
  ) => void;
  onDeleteStep: (id: string) => void;
  onMoveStep: (id: string, dir: "up" | "down") => void;
  onReattachAfter: (movedId: string, afterId: string | "__start__") => void;
  onReattachIntoBranch: (movedId: string, parentId: string, branch: "then" | "else") => void;
  onSetPosition: (id: string, x: number, y: number) => void;
  onTidy: () => void;
  hasCustomPositions: boolean;
}

/* ─────────────────────────── Layout constants ───────────────────────────
 * Every card is EXACTLY the same size — uniformity was a hard requirement. */

const NODE_W = 264;
const NODE_H = 84;
const GHOST_H = 44;
const VGAP = 64;
const HGAP = 56;

type InsertSpec =
  | { kind: "after"; afterId: string | "__start__" }
  | { kind: "branch"; parentId: string; branch: "then" | "else"; position: "start" | "end" };

interface EdgeData {
  label?: "Yes" | "No";
  insert?: InsertSpec;
  [key: string]: unknown;
}

/* ─────────────────────────── Tree → graph derivation ─────────────────────────── */

const chainWidth = (chain: BlockNode[]): number =>
  chain.length === 0 ? NODE_W : Math.max(...chain.map(stepWidth));

const stepWidth = (s: BlockNode): number =>
  s.type === "IF" && s.children
    ? chainWidth(s.children.then) + HGAP + chainWidth(s.children.else)
    : NODE_W;

interface Incoming {
  sources: Array<{ id: string; handle?: "then" | "else"; label?: "Yes" | "No" }>;
  insert: InsertSpec;
}

type ChainScope = { kind: "root" } | { kind: "branch"; parentId: string; branch: "then" | "else" };

/**
 * TREE SEMANTICS: once a condition splits the flow, the branches NEVER merge
 * back. An IF permanently ends its chain — everything that happens next
 * lives inside its Yes or No branch (which can nest further IFs). Every
 * branch therefore carries its own trailing "+ Add step" slot.
 */
function buildGraph(
  trigger: Trigger,
  steps: BlockNode[],
): { nodes: Node[]; edges: Edge<EdgeData>[] } {
  const nodes: Node[] = [];
  const edges: Edge<EdgeData>[] = [];
  let edgeSeq = 0;

  const connect = (incoming: Incoming, targetId: string, withInsert = true) => {
    incoming.sources.forEach((src, i) => {
      edges.push({
        id: `e${edgeSeq++}`,
        source: src.id,
        sourceHandle: src.handle,
        target: targetId,
        type: "flow",
        data: { label: src.label, insert: withInsert && i === 0 ? incoming.insert : undefined },
      });
    });
  };

  nodes.push({
    id: "trigger",
    type: "trigger",
    position: { x: -NODE_W / 2, y: 0 },
    draggable: false,
    data: { trigger },
  });

  /** Lays out one chain centered on `cx`; returns the bottom Y reached. */
  const walkChain = (
    chain: BlockNode[],
    cx: number,
    startY: number,
    incoming: Incoming,
    scope: ChainScope,
  ): number => {
    let cursor: Incoming | null = incoming;
    let y = startY;

    for (const step of chain) {
      if (!cursor) break; // defensive: nothing may follow an IF in a chain
      const pos = step.ui ?? { x: cx - NODE_W / 2, y };
      nodes.push({ id: step.id, type: "step", position: pos, data: { step } });
      connect(cursor, step.id);

      if (step.type === "IF" && step.children) {
        const thenW = chainWidth(step.children.then);
        const elseW = chainWidth(step.children.else);
        const total = thenW + HGAP + elseW;
        const branchY = y + NODE_H + VGAP;
        let bottom = branchY;

        (["then", "else"] as const).forEach((br) => {
          const bCx = br === "then" ? cx - total / 2 + thenW / 2 : cx + total / 2 - elseW / 2;
          const entry: Incoming = {
            sources: [{ id: step.id, handle: br, label: br === "then" ? "Yes" : "No" }],
            insert: { kind: "branch", parentId: step.id, branch: br, position: "start" },
          };
          bottom = Math.max(
            bottom,
            walkChain(step.children![br], bCx, branchY, entry, {
              kind: "branch",
              parentId: step.id,
              branch: br,
            }),
          );
        });

        y = bottom;
        cursor = null; // the tree only grows — branches never merge back
      } else {
        y += NODE_H + VGAP;
        cursor = { sources: [{ id: step.id }], insert: { kind: "after", afterId: step.id } };
      }
    }

    // Chains that don't end in an IF get their own "+ Add step" slot; the
    // ghost itself is the add button, so its edge needs no extra "+".
    if (cursor) {
      const ghostId =
        scope.kind === "root" ? "ghost-end-root" : `ghost-end-${scope.parentId}-${scope.branch}`;
      const insert: InsertSpec =
        scope.kind === "root"
          ? cursor.insert
          : { kind: "branch", parentId: scope.parentId, branch: scope.branch, position: "end" };
      nodes.push({
        id: ghostId,
        type: "ghost",
        position: { x: cx - NODE_W / 2, y },
        draggable: false,
        data: { insert },
      });
      connect(cursor, ghostId, false);
      y += GHOST_H + VGAP;
    }

    return y;
  };

  walkChain(
    steps,
    0,
    NODE_H + VGAP,
    { sources: [{ id: "trigger" }], insert: { kind: "after", afterId: "__start__" } },
    { kind: "root" },
  );

  return { nodes, edges };
}

/* ─────────────────────────── Custom nodes ─────────────────────────── */

const HANDLE_CLS = "!h-2 !w-2 !bg-slate-300 !border !border-bg-raised";

function TriggerNodeCmp({ data, selected }: NodeProps): React.JSX.Element {
  const trigger = (data as any).trigger as Trigger;
  const def = getBlockDef(trigger.type);
  const tone = TONE_STYLES[def?.tone || "positive"];
  const options = listByCategory("trigger");
  const ctx = React.useContext(CanvasCtx);

  return (
    <div
      style={{ width: NODE_W, height: NODE_H }}
      className={cn(
        "rounded-xl bg-bg-raised cursor-pointer transition-all overflow-hidden flex flex-col",
        selected
          ? "ring-2 ring-blue-500/40 border border-blue-500 shadow-[0_8px_24px_-8px_rgba(59,130,246,0.35)]"
          : "border border-line-default hover:border-blue-500/40 shadow-card",
      )}
      onClick={ctx.onSelectTrigger}
    >
      <div className={cn("h-[3px] shrink-0", tone.bar)} />
      <div className="flex items-center gap-2.5 px-3 flex-1 min-h-0">
        <BlockIcon icon={def?.icon || "Zap"} tone={def?.tone || "positive"} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">
              Trigger
            </span>
            {(trigger.filter?.conditions?.length ?? 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600">
                <FilterIcon className="h-2.5 w-2.5" />
                {trigger.filter!.conditions.length}
              </span>
            )}
          </div>
          <select
            value={trigger.type}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => ctx.onChangeTriggerType(e.target.value)}
            className="mt-0.5 w-full bg-transparent text-[12px] font-semibold text-fg-primary focus:outline-none cursor-pointer"
          >
            {options.map((o) => (
              <option key={o.type} value={o.type}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <Zap className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      </div>
      <Handle type="source" position={Position.Bottom} className={HANDLE_CLS} />
    </div>
  );
}

function StepNodeCmp({ data, selected }: NodeProps): React.JSX.Element {
  const step = (data as any).step as BlockNode;
  const def = getBlockDef(step.type);
  const tone = TONE_STYLES[def?.tone || "brand"];
  const ctx = React.useContext(CanvasCtx);
  const isIf = step.type === "IF";
  const summary = def?.summary(step.config) || "";

  return (
    <>
      <NodeToolbar isVisible={selected} position={Position.Right} className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => ctx.onMoveStep(step.id, "up")}
          className="h-7 w-7 rounded-md bg-bg-raised border border-line-default text-fg-secondary hover:text-blue-600 hover:border-blue-500/40 flex items-center justify-center shadow-card"
          title="Move earlier in its chain"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => ctx.onMoveStep(step.id, "down")}
          className="h-7 w-7 rounded-md bg-bg-raised border border-line-default text-fg-secondary hover:text-blue-600 hover:border-blue-500/40 flex items-center justify-center shadow-card"
          title="Move later in its chain"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => ctx.onDeleteStep(step.id)}
          className="h-7 w-7 rounded-md bg-bg-raised border border-line-default text-fg-secondary hover:text-rose-500 hover:border-rose-500/40 flex items-center justify-center shadow-card"
          title={isIf ? "Delete condition (steps inside are kept)" : "Delete step"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </NodeToolbar>

      <div
        style={{ width: NODE_W, height: NODE_H }}
        className={cn(
          "rounded-xl bg-bg-raised cursor-pointer transition-all overflow-hidden flex flex-col",
          selected
            ? "ring-2 ring-blue-500/40 border border-blue-500 shadow-[0_8px_24px_-8px_rgba(59,130,246,0.35)]"
            : "border border-line-default hover:border-blue-500/40 shadow-card",
        )}
        onClick={() => ctx.onSelectStep(step.id)}
      >
        <div className={cn("h-[3px] shrink-0", tone.bar)} />
        <div className="flex items-center gap-2.5 px-3 flex-1 min-h-0">
          <BlockIcon icon={def?.icon || "Zap"} tone={def?.tone || "brand"} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-fg-primary truncate">
                {def?.label || step.type}
              </span>
              {(step.filter?.conditions?.length ?? 0) > 0 && (
                <span
                  className="inline-flex items-center gap-0.5 text-[9px] font-bold text-blue-600 shrink-0"
                  title="Only runs when the contact matches this step's filter"
                >
                  <FilterIcon className="h-2.5 w-2.5" />
                  {step.filter!.conditions.length}
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-fg-muted leading-snug line-clamp-2 mt-0.5">
              {summary}
            </div>
          </div>
        </div>
      </div>

      <Handle type="target" position={Position.Top} className={HANDLE_CLS} />
      {isIf ? (
        <>
          <Handle
            type="source"
            id="then"
            position={Position.Bottom}
            style={{ left: "25%" }}
            className="!h-2.5 !w-2.5 !bg-emerald-500 !border !border-white"
          />
          <Handle
            type="source"
            id="else"
            position={Position.Bottom}
            style={{ left: "75%" }}
            className="!h-2.5 !w-2.5 !bg-rose-400 !border !border-white"
          />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} className={HANDLE_CLS} />
      )}
    </>
  );
}

function GhostNodeCmp({ data }: NodeProps): React.JSX.Element {
  const ctx = React.useContext(CanvasCtx);
  const insert = (data as any).insert as InsertSpec;
  return (
    <>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <button
        type="button"
        style={{ width: NODE_W, height: GHOST_H }}
        onClick={(e) => ctx.openMenu(insert, e.currentTarget.getBoundingClientRect())}
        className="rounded-xl border-2 border-dashed border-line-strong bg-bg-raised/60 hover:border-blue-500/50 hover:bg-blue-50/40 text-fg-muted hover:text-blue-600 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add step
      </button>
    </>
  );
}

/* ─────────────────────────── Custom edge ─────────────────────────── */

function FlowEdgeCmp(props: EdgeProps): React.JSX.Element {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd } = props;
  const data = (props.data || {}) as EdgeData;
  const ctx = React.useContext(CanvasCtx);
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 12,
  });

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} style={{ stroke: "#94a3b8", strokeWidth: 1.5 }} />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          className="absolute pointer-events-auto flex items-center gap-1 nodrag nopan"
        >
          {data.label && (
            <span
              className={cn(
                "text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 border bg-bg-raised",
                data.label === "Yes"
                  ? "text-emerald-600 border-emerald-500/40"
                  : "text-rose-500 border-rose-400/40",
              )}
            >
              {data.label}
            </span>
          )}
          {data.insert && (
            <button
              type="button"
              onClick={(e) => ctx.openMenu(data.insert!, e.currentTarget.getBoundingClientRect())}
              className="h-5 w-5 rounded-full bg-bg-raised border border-line-strong text-fg-muted hover:text-blue-600 hover:border-blue-500 flex items-center justify-center shadow-card transition-colors"
              title="Insert a step here"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

/* ─────────────────────────── Context (fresh callbacks per render) ─────────────────────────── */

interface CanvasCtxValue {
  onSelectTrigger: () => void;
  onSelectStep: (id: string) => void;
  onChangeTriggerType: (t: string) => void;
  onMoveStep: (id: string, dir: "up" | "down") => void;
  onDeleteStep: (id: string) => void;
  openMenu: (insert: InsertSpec, anchor: DOMRect) => void;
}

const CanvasCtx = React.createContext<CanvasCtxValue>({} as CanvasCtxValue);

const NODE_TYPES = { trigger: TriggerNodeCmp, step: StepNodeCmp, ghost: GhostNodeCmp };
const EDGE_TYPES = { flow: FlowEdgeCmp };

/* ─────────────────────────── Add-step menu ─────────────────────────── */

function AddMenu({
  anchor,
  onPick,
  onClose,
}: {
  anchor: DOMRect;
  onPick: (type: string) => void;
  onClose: () => void;
}): React.JSX.Element {
  const groups = [
    { title: "Actions", defs: listByCategory("action") },
    { title: "Logic", defs: listByCategory("logic") },
  ];
  const left = Math.min(anchor.left, window.innerWidth - 280);
  const top = Math.min(anchor.bottom + 6, window.innerHeight - 380);

  return createPortal(
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        style={{ left, top }}
        onClick={(e) => e.stopPropagation()}
        className="absolute w-[264px] max-h-[360px] overflow-y-auto bg-bg-raised border border-line-default rounded-xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100"
      >
        {groups.map((g) => (
          <div key={g.title}>
            <div className="px-2 pt-2 pb-1 text-[9.5px] font-bold text-fg-muted uppercase tracking-wider">
              {g.title}
            </div>
            {g.defs.map((d) => (
              <button
                key={d.type}
                type="button"
                onClick={() => onPick(d.type)}
                className="w-full flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-blue-50/60 text-left transition-colors"
              >
                <BlockIcon icon={d.icon} tone={d.tone} size="sm" />
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-fg-primary">{d.label}</span>
                  <span className="block text-[10px] text-fg-muted truncate">{d.description}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────── Canvas ─────────────────────────── */

export function WorkflowCanvas(props: WorkflowCanvasProps): React.JSX.Element {
  const {
    trigger,
    steps,
    selectedId,
    isTriggerSelected,
    onAddStep,
    onAddStepBranch,
    onReattachAfter,
    onReattachIntoBranch,
    onSetPosition,
  } = props;

  const [menu, setMenu] = React.useState<{ insert: InsertSpec; anchor: DOMRect } | null>(null);

  const derived = React.useMemo(() => buildGraph(trigger, steps), [trigger, steps]);

  const [nodes, setNodes] = React.useState<Node[]>(derived.nodes);
  React.useEffect(() => {
    setNodes(
      derived.nodes.map((n) => ({
        ...n,
        selected: n.id === selectedId || (n.id === "trigger" && isTriggerSelected),
      })),
    );
  }, [derived, selectedId, isTriggerSelected]);

  const onNodesChange = React.useCallback(
    (changes: NodeChange[]) =>
      setNodes((nds) => applyNodeChanges(changes.filter((c) => c.type !== "remove"), nds)),
    [],
  );

  const onConnect = React.useCallback(
    (conn: Connection) => {
      const { source, target, sourceHandle } = conn;
      if (!source || !target) return;
      if (target === "trigger" || target.startsWith("ghost-") || source.startsWith("ghost-")) return;
      if (source === target) return;
      if (source === "trigger") {
        onReattachAfter(target, "__start__");
      } else if (sourceHandle === "then" || sourceHandle === "else") {
        onReattachIntoBranch(target, source, sourceHandle);
      } else {
        onReattachAfter(target, source);
      }
    },
    [onReattachAfter, onReattachIntoBranch],
  );

  const ctxValue = React.useMemo<CanvasCtxValue>(
    () => ({
      onSelectTrigger: props.onSelectTrigger,
      onSelectStep: props.onSelectStep,
      onChangeTriggerType: props.onChangeTriggerType,
      onMoveStep: props.onMoveStep,
      onDeleteStep: props.onDeleteStep,
      openMenu: (insert, anchor) => setMenu({ insert, anchor }),
    }),
    [props.onSelectTrigger, props.onSelectStep, props.onChangeTriggerType, props.onMoveStep, props.onDeleteStep],
  );

  return (
    <CanvasCtx.Provider value={ctxValue}>
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={nodes}
          edges={derived.edges}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          onNodesChange={onNodesChange}
          onConnect={onConnect}
          onNodeDragStop={(_, node) => {
            if (node.type === "step") onSetPosition(node.id, node.position.x, node.position.y);
          }}
          fitView
          fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
          minZoom={0.25}
          maxZoom={1.75}
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
          nodesDraggable
          elementsSelectable
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="rgba(15,23,42,0.08)" />
          <Controls showInteractive={false} position="bottom-left" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            className="!h-24 !w-36 rounded-lg border border-line-default overflow-hidden"
            nodeColor={(n) => (n.type === "trigger" ? "#10b981" : n.type === "ghost" ? "#e2e8f0" : "#3b82f6")}
          />
          {props.hasCustomPositions && (
            <Panel position="top-right">
              <button
                type="button"
                onClick={props.onTidy}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-bg-raised border border-line-default text-[11.5px] font-semibold text-fg-secondary hover:text-blue-600 hover:border-blue-500/40 shadow-card transition-colors"
                title="Snap all steps back to the automatic layout"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Tidy layout
              </button>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {menu && (
        <AddMenu
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          onPick={(type) => {
            const ins = menu.insert;
            setMenu(null);
            if (ins.kind === "after") onAddStep(ins.afterId, type);
            else onAddStepBranch(ins.parentId, ins.branch, ins.position, type);
          }}
        />
      )}
    </CanvasCtx.Provider>
  );
}
