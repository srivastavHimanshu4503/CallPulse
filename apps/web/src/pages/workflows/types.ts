/**
 * Workflow domain schema. Intentionally lean — one trigger, a small set of
 * powerful actions, and inline CRM filters on every block. The full tree
 * persists in `WorkflowDefinition.actions` (Prisma Json) so no migration
 * is required to iterate.
 */

import type { FilterCondition, FilterLogicalOperator } from "@antigravity/types";

// ─────────────────────────── Trigger ───────────────────────────
// Kept small on purpose: 3 real-world starting points cover 90% of flows.

export type TriggerType =
  | "CALL_ENDED"
  | "CONTACT_MATCHES";

export interface Trigger {
  type: TriggerType;
  /** Trigger-specific config (defined per-trigger by the registry). */
  config: Record<string, any>;
  /** Optional CRM filter — only fire when the contact matches. */
  filter?: BlockFilter | null;
}

// ─────────────────────────── Blocks / steps ───────────────────────────

export type BlockType =
  // Actions (deliberately minimal)
  | "SEND_SMS"
  | "MAKE_CALL"
  | "SLACK_NOTIFY"
  | "UPDATE"       // unified CRM update — create deal, move stage, tag, note, etc.
  // Logic
  | "IF"
  | "WAIT";

/** Reusable filter shape lives on both Trigger and each BlockNode. */
export interface BlockFilter {
  logical: FilterLogicalOperator;
  conditions: FilterCondition[];
}

export interface BlockNode {
  id: string;
  type: BlockType;
  config: Record<string, any>;
  /** Optional per-step filter — only run if the contact matches. */
  filter?: BlockFilter | null;
  /** Only set on IF steps. */
  children?: {
    then: BlockNode[];
    else: BlockNode[];
  };
}

// ─────────────────────────── Whole workflow ───────────────────────────

export interface WorkflowDef {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: Trigger;
  steps: BlockNode[];
  createdAt?: string;
  updatedAt?: string;
  lastRunAt?: string | null;
  runCount?: number;
}

// ─────────────────────────── Registry ───────────────────────────

export type FieldKind =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "boolean"
  | "duration"
  | "sentiment"
  | "score";

export interface FieldSchema {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: any;
  supportsVariables?: boolean;
  /** Only render this field when another field equals a specific value.
   *  Enables the Update block's discriminated sub-forms. */
  showWhen?: { key: string; equals: string | number | boolean };
}

export type BlockCategory = "trigger" | "action" | "logic";

export interface BlockDef {
  type: string;
  category: BlockCategory;
  group: string;
  label: string;
  description: string;
  icon: string;
  tone: BlockTone;
  fields: FieldSchema[];
  defaultConfig: Record<string, any>;
  /** Compact summary line rendered on the canvas card. */
  summary: (config: Record<string, any>) => string;
  /** Optional richer preview blocks (message body, tag chips, etc.). */
  preview?: (config: Record<string, any>) => Array<
    | { kind: "text"; label?: string; value: string }
    | { kind: "chip"; label: string; value: string }
    | { kind: "quote"; value: string }
  >;
  /** Whether this block supports the inline "Only run if…" filter. */
  supportsFilter?: boolean;
  /** True when the block CANNOT function without a filter — the whole point
   *  of the block IS the filter (e.g. CONTACT_MATCHES trigger). The
   *  inspector renders the filter always-open, no toggle. */
  requiresFilter?: boolean;
}

export type BlockTone =
  | "brand"        // blue — main brand
  | "positive"     // green — triggers (per user request)
  | "attention"    // amber — logic
  | "accent"       // indigo/gold — update
  | "negative"     // rose — dangerous
  | "muted"
  | "violet"       // NEW — for Update block
  | "cyan"         // NEW — for call actions
  | "pink";        // NEW — for Slack

// ─────────────────────────── Templates ───────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tone: BlockTone;
  build: () => Omit<WorkflowDef, "id" | "createdAt" | "updatedAt">;
}
