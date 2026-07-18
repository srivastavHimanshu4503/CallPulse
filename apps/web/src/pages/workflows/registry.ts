import type { BlockDef, BlockTone, WorkflowTemplate } from "./types.js";
import { FilterLogicalOperator, FilterOperator } from "@antigravity/types";

/**
 * Lean workflow registry. Every block/trigger declared once — the library
 * sidebar, canvas card and inspector read from here. Adding a new block
 * type is a single edit in this file.
 */

// ─────────────────────────── Triggers (3 total) ───────────────────────────

const TRIGGERS: BlockDef[] = [
  {
    type: "CALL_ENDED",
    category: "trigger",
    group: "Calls",
    label: "When a call ends",
    description: "Fires as soon as the AI agent hangs up. Filter by sentiment or direction below.",
    icon: "PhoneCall",
    tone: "positive",
    supportsFilter: true,
    fields: [
      {
        key: "outcome",
        label: "Only for calls that ended",
        kind: "select",
        options: [
          { value: "any", label: "Any outcome" },
          { value: "positive", label: "Positive sentiment" },
          { value: "negative", label: "Negative sentiment" },
          { value: "missed", label: "Missed / no answer" },
        ],
        defaultValue: "any",
      },
      {
        key: "direction",
        label: "Direction",
        kind: "select",
        options: [
          { value: "any", label: "Inbound or outbound" },
          { value: "inbound", label: "Inbound only" },
          { value: "outbound", label: "Outbound only" },
        ],
        defaultValue: "any",
      },
    ],
    defaultConfig: { outcome: "any", direction: "any" },
    summary: (c) => {
      const outcome = OUTCOME_LABEL[c.outcome as string] || "any";
      const dir = c.direction === "any" ? "" : ` · ${c.direction}`;
      return `Call ended · ${outcome}${dir}`;
    },
    preview: (c) => [
      { kind: "chip", label: "Outcome", value: OUTCOME_LABEL[c.outcome as string] || "any" },
      { kind: "chip", label: "Direction", value: c.direction || "any" },
    ],
  },
  {
    type: "CONTACT_MATCHES",
    category: "trigger",
    group: "CRM",
    label: "When a contact matches",
    description: "Fires the moment a contact enters your filter (lead score jumps, new tag, etc.).",
    icon: "UserCheck",
    tone: "positive",
    supportsFilter: true,
    requiresFilter: true,
    fields: [],
    defaultConfig: {},
    summary: (_c) => "When a contact matches conditions below",
    preview: () => [],
  },
];

const OUTCOME_LABEL: Record<string, string> = {
  any: "any outcome",
  positive: "positive sentiment",
  negative: "negative sentiment",
  missed: "missed / no answer",
};

// ─────────────────────────── Actions (4 total) ───────────────────────────

const ACTIONS: BlockDef[] = [
  {
    type: "SEND_SMS",
    category: "action",
    group: "Messaging",
    label: "Send SMS",
    description: "Text the contact. Use variables like {{contact.firstName}}.",
    icon: "MessageSquare",
    tone: "brand",
    supportsFilter: true,
    fields: [
      {
        key: "message",
        label: "Message",
        kind: "textarea",
        placeholder: "Hi {{contact.firstName}}, thanks for the call…",
        supportsVariables: true,
        required: true,
      },
    ],
    defaultConfig: { message: "" },
    summary: (c) => (c.message ? truncate(c.message, 60) : "No message yet"),
    preview: (c) => (c.message ? [{ kind: "quote", value: c.message }] : []),
  },
  {
    type: "MAKE_CALL",
    category: "action",
    group: "Calls",
    label: "Make outbound call",
    description: "AI agent rings the contact with your goal.",
    icon: "PhoneOutgoing",
    tone: "cyan",
    supportsFilter: true,
    fields: [
      {
        key: "goal",
        label: "Call goal",
        kind: "textarea",
        placeholder: "Book a demo, confirm interest, follow up on quote…",
        supportsVariables: true,
        required: true,
      },
      {
        key: "agentId",
        label: "Agent ID (optional)",
        kind: "text",
        helper: "Leave blank to use the default agent.",
      },
    ],
    defaultConfig: { goal: "", agentId: "" },
    summary: (c) => (c.goal ? truncate(c.goal, 60) : "No goal set"),
    preview: (c) => (c.goal ? [{ kind: "quote", value: c.goal }] : []),
  },
  {
    type: "SLACK_NOTIFY",
    category: "action",
    group: "Notify",
    label: "Notify Slack",
    description: "Post to a Slack channel — great for alerting sales.",
    icon: "Slack",
    tone: "pink",
    supportsFilter: true,
    fields: [
      { key: "channel", label: "Channel", kind: "text", placeholder: "#sales", required: true },
      {
        key: "message",
        label: "Message",
        kind: "textarea",
        placeholder: "🔥 Hot lead from {{contact.firstName}}",
        supportsVariables: true,
        required: true,
      },
    ],
    defaultConfig: { channel: "", message: "" },
    summary: (c) => (c.channel ? `→ ${c.channel}` : "No channel set"),
    preview: (c) => {
      const rows: Array<any> = [];
      if (c.channel) rows.push({ kind: "chip", label: "Channel", value: c.channel });
      if (c.message) rows.push({ kind: "quote", value: c.message });
      return rows;
    },
  },
  {
    type: "UPDATE",
    category: "action",
    group: "CRM",
    label: "Update CRM",
    description: "Create a deal, move a stage, tag or note the contact — pick the op inside.",
    icon: "Wrench",
    tone: "violet",
    supportsFilter: true,
    fields: [
      {
        key: "operation",
        label: "What to update",
        kind: "select",
        options: [
          { value: "add_tag", label: "Add tag to contact" },
          { value: "create_deal", label: "Create a deal" },
          { value: "move_deal_stage", label: "Move deal to stage" },
          { value: "add_note", label: "Add a note" },
          { value: "update_field", label: "Update a custom field" },
        ],
        defaultValue: "add_tag",
      },
      // Sub-fields keyed off `operation`
      {
        key: "tag",
        label: "Tag",
        kind: "text",
        placeholder: "hot-lead",
        showWhen: { key: "operation", equals: "add_tag" },
        required: true,
      },
      {
        key: "dealTitle",
        label: "Deal title",
        kind: "text",
        placeholder: "{{contact.firstName}} — new opportunity",
        supportsVariables: true,
        showWhen: { key: "operation", equals: "create_deal" },
        required: true,
      },
      {
        key: "dealValue",
        label: "Deal value (₹)",
        kind: "number",
        defaultValue: 0,
        showWhen: { key: "operation", equals: "create_deal" },
      },
      {
        key: "dealStage",
        label: "Initial stage",
        kind: "text",
        placeholder: "New lead",
        showWhen: { key: "operation", equals: "create_deal" },
      },
      {
        key: "moveToStage",
        label: "Target stage",
        kind: "text",
        placeholder: "Qualified",
        showWhen: { key: "operation", equals: "move_deal_stage" },
        required: true,
      },
      {
        key: "noteContent",
        label: "Note",
        kind: "textarea",
        placeholder: "Followed up automatically after positive call.",
        supportsVariables: true,
        showWhen: { key: "operation", equals: "add_note" },
        required: true,
      },
      {
        key: "fieldName",
        label: "Custom field name",
        kind: "text",
        placeholder: "e.g. Budget range",
        showWhen: { key: "operation", equals: "update_field" },
        required: true,
      },
      {
        key: "fieldValue",
        label: "New value",
        kind: "text",
        supportsVariables: true,
        showWhen: { key: "operation", equals: "update_field" },
      },
    ],
    defaultConfig: { operation: "add_tag", tag: "" },
    summary: (c) => summarizeUpdate(c),
    preview: (c) => updatePreview(c),
  },
];

function summarizeUpdate(c: Record<string, any>): string {
  switch (c.operation) {
    case "add_tag":
      return c.tag ? `Add tag #${c.tag}` : "Add tag";
    case "create_deal":
      return c.dealTitle ? `Create deal "${truncate(c.dealTitle, 40)}"` : "Create deal";
    case "move_deal_stage":
      return c.moveToStage ? `Move to "${c.moveToStage}"` : "Move deal";
    case "add_note":
      return c.noteContent ? `Note: ${truncate(c.noteContent, 40)}` : "Add note";
    case "update_field":
      return c.fieldName ? `Update ${c.fieldName}` : "Update field";
    default:
      return "Update CRM";
  }
}

function updatePreview(c: Record<string, any>): Array<any> {
  const rows: Array<any> = [];
  rows.push({ kind: "chip", label: "Operation", value: (c.operation || "").replace(/_/g, " ") });
  if (c.operation === "add_tag" && c.tag) rows.push({ kind: "chip", label: "Tag", value: `#${c.tag}` });
  if (c.operation === "create_deal") {
    if (c.dealTitle) rows.push({ kind: "chip", label: "Title", value: c.dealTitle });
    if (c.dealValue) rows.push({ kind: "chip", label: "Value", value: `₹${c.dealValue}` });
    if (c.dealStage) rows.push({ kind: "chip", label: "Stage", value: c.dealStage });
  }
  if (c.operation === "move_deal_stage" && c.moveToStage) {
    rows.push({ kind: "chip", label: "Stage", value: c.moveToStage });
  }
  if (c.operation === "add_note" && c.noteContent) {
    rows.push({ kind: "quote", value: c.noteContent });
  }
  if (c.operation === "update_field") {
    if (c.fieldName) rows.push({ kind: "chip", label: "Field", value: c.fieldName });
    if (c.fieldValue) rows.push({ kind: "chip", label: "→", value: c.fieldValue });
  }
  return rows;
}

// ─────────────────────────── Logic (2 total) ───────────────────────────

const LOGIC: BlockDef[] = [
  {
    type: "IF",
    category: "logic",
    group: "Branch",
    label: "If / else",
    description: "Split the flow based on one or more conditions on the contact or call.",
    icon: "GitBranch",
    tone: "attention",
    supportsFilter: false,
    fields: [
      {
        key: "when",
        label: "Conditions",
        kind: "conditions",
        helper: "Chain multiple rules with AND / OR — same feel as a CRM filter.",
      },
    ],
    defaultConfig: {
      when: {
        logical: FilterLogicalOperator.AND,
        conditions: [
          {
            id: rid(),
            fieldId: "score",
            operator: FilterOperator.GREATER_THAN_OR_EQUAL,
            value: "75",
          },
        ],
      },
    },
    summary: (c) => {
      const when = c.when || { logical: FilterLogicalOperator.AND, conditions: [] };
      const n = when.conditions?.length || 0;
      if (n === 0) return "No conditions yet";
      if (n === 1) {
        const cond = when.conditions[0];
        return `If ${prettyField(cond.fieldId)} ${prettyOp(cond.operator)} ${cond.value || "?"}`;
      }
      return `${n} conditions · match ${when.logical === FilterLogicalOperator.AND ? "ALL" : "ANY"}`;
    },
    preview: (c) => {
      const when = c.when || { logical: FilterLogicalOperator.AND, conditions: [] };
      if (!when.conditions || when.conditions.length === 0) return [];
      const rows: any[] = [];
      rows.push({
        kind: "chip",
        label: "Match",
        value: when.logical === FilterLogicalOperator.AND ? "ALL" : "ANY",
      });
      for (const cond of when.conditions) {
        rows.push({
          kind: "chip",
          label: prettyField(cond.fieldId),
          value: `${prettyOp(cond.operator)} ${cond.value || "?"}`,
        });
      }
      return rows;
    },
  },
  {
    type: "WAIT",
    category: "logic",
    group: "Delay",
    label: "Wait",
    description: "Pause the workflow for a duration.",
    icon: "Timer",
    tone: "attention",
    supportsFilter: false,
    fields: [
      { key: "amount", label: "Amount", kind: "number", defaultValue: 1 },
      {
        key: "unit",
        label: "Unit",
        kind: "select",
        options: [
          { value: "minutes", label: "Minutes" },
          { value: "hours", label: "Hours" },
          { value: "days", label: "Days" },
        ],
        defaultValue: "hours",
      },
    ],
    defaultConfig: { amount: 1, unit: "hours" },
    summary: (c) => `Wait ${c.amount} ${c.unit}`,
    preview: (c) => [{ kind: "chip", label: "Wait", value: `${c.amount} ${c.unit}` }],
  },
];

// ─────────────────────────── Lookup ───────────────────────────

export const REGISTRY: BlockDef[] = [...TRIGGERS, ...ACTIONS, ...LOGIC];

const BY_TYPE: Record<string, BlockDef> = Object.fromEntries(
  REGISTRY.map((b) => [b.type, b]),
);

export function getBlockDef(type: string): BlockDef | undefined {
  return BY_TYPE[type];
}

export function listByCategory(category: "trigger" | "action" | "logic"): BlockDef[] {
  return REGISTRY.filter((b) => b.category === category);
}

export function groupByCategory(): Record<"trigger" | "action" | "logic", BlockDef[]> {
  return { trigger: TRIGGERS, action: ACTIONS, logic: LOGIC };
}

// ─────────────────────────── Tone styles (expanded palette) ───────────────────────────

export const TONE_STYLES: Record<
  BlockTone,
  { tile: string; ring: string; text: string; bar: string; border: string; softBg: string }
> = {
  brand: {
    tile: "bg-blue-50 text-blue-600",
    ring: "ring-blue-500/25",
    text: "text-blue-600",
    bar: "bg-blue-500",
    border: "border-blue-500/30",
    softBg: "bg-blue-50/50",
  },
  positive: {
    tile: "bg-emerald-50 text-emerald-600",
    ring: "ring-emerald-500/25",
    text: "text-emerald-700",
    bar: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    border: "border-emerald-500/30",
    softBg: "bg-emerald-50/60",
  },
  attention: {
    tile: "bg-amber-50 text-amber-600",
    ring: "ring-amber-500/25",
    text: "text-amber-700",
    bar: "bg-amber-500",
    border: "border-amber-500/30",
    softBg: "bg-amber-50/60",
  },
  accent: {
    tile: "bg-orange-50 text-orange-700",
    ring: "ring-orange-500/25",
    text: "text-orange-700",
    bar: "bg-orange-500",
    border: "border-orange-500/30",
    softBg: "bg-orange-50/60",
  },
  negative: {
    tile: "bg-rose-50 text-rose-500",
    ring: "ring-rose-500/25",
    text: "text-rose-600",
    bar: "bg-rose-500",
    border: "border-rose-500/30",
    softBg: "bg-rose-50/60",
  },
  muted: {
    tile: "bg-slate-100 text-slate-600",
    ring: "ring-slate-300",
    text: "text-slate-600",
    bar: "bg-slate-400",
    border: "border-slate-300",
    softBg: "bg-slate-50",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600",
    ring: "ring-violet-500/25",
    text: "text-violet-700",
    bar: "bg-violet-500",
    border: "border-violet-500/30",
    softBg: "bg-violet-50/60",
  },
  cyan: {
    tile: "bg-cyan-50 text-cyan-600",
    ring: "ring-cyan-500/25",
    text: "text-cyan-700",
    bar: "bg-cyan-500",
    border: "border-cyan-500/30",
    softBg: "bg-cyan-50/60",
  },
  pink: {
    tile: "bg-pink-50 text-pink-600",
    ring: "ring-pink-500/25",
    text: "text-pink-700",
    bar: "bg-pink-500",
    border: "border-pink-500/30",
    softBg: "bg-pink-50/60",
  },
};

// ─────────────────────────── Templates ───────────────────────────

export const TEMPLATES: WorkflowTemplate[] = [
  {
    id: "hot-lead-slack",
    name: "Hot lead → notify Slack",
    description: "Positive-sentiment call ends → ping #sales instantly.",
    icon: "Flame",
    tone: "positive",
    build: () => ({
      name: "Hot lead alert",
      description: "Auto-notify sales on positive calls.",
      isActive: false,
      trigger: {
        type: "CALL_ENDED",
        config: { outcome: "positive", direction: "any" },
      },
      steps: [
        {
          id: rid(),
          type: "SLACK_NOTIFY",
          config: {
            channel: "#sales",
            message: "🔥 Hot lead from {{contact.firstName}} — check the CRM now.",
          },
        },
      ],
    }),
  },
  {
    id: "missed-call-recovery",
    name: "Missed call → SMS + tag",
    description: "Recover the lead the moment the AI misses a ring.",
    icon: "PhoneMissed",
    tone: "attention",
    build: () => ({
      name: "Missed call recovery",
      description: "Never lose a lead to a missed ring.",
      isActive: false,
      trigger: { type: "CALL_ENDED", config: { outcome: "missed", direction: "any" } },
      steps: [
        {
          id: rid(),
          type: "SEND_SMS",
          config: {
            message:
              "Hi {{contact.firstName}}, sorry we missed your call! Reply here or we'll ring back within an hour.",
          },
        },
        { id: rid(), type: "UPDATE", config: { operation: "add_tag", tag: "missed-call" } },
      ],
    }),
  },
  {
    id: "hot-lead-deal",
    name: "Hot lead → create deal",
    description: "Auto-move qualified leads into the pipeline.",
    icon: "TrendingUp",
    tone: "violet",
    build: () => ({
      name: "Hot lead → create deal",
      description: "AI signals turn into pipeline immediately.",
      isActive: false,
      trigger: {
        type: "CONTACT_MATCHES",
        config: {},
        filter: {
          logical: FilterLogicalOperator.AND,
          conditions: [
            {
              id: rid(),
              fieldId: "score",
              operator: FilterOperator.GREATER_THAN_OR_EQUAL,
              value: "75",
            },
          ],
        },
      },
      steps: [
        {
          id: rid(),
          type: "UPDATE",
          config: {
            operation: "create_deal",
            dealTitle: "{{contact.firstName}} — auto-qualified",
            dealValue: 0,
            dealStage: "Qualified",
          },
        },
        {
          id: rid(),
          type: "SLACK_NOTIFY",
          config: { channel: "#sales", message: "New qualified lead: {{contact.firstName}}." },
        },
      ],
    }),
  },
  {
    id: "cold-followup",
    name: "Cold lead follow-up",
    description: "Re-engage silent, low-score leads.",
    icon: "Snowflake",
    tone: "brand",
    build: () => ({
      name: "Cold lead follow-up",
      description: "Re-engage contacts who've gone quiet.",
      isActive: false,
      trigger: {
        type: "CONTACT_MATCHES",
        config: {},
        filter: {
          logical: FilterLogicalOperator.AND,
          conditions: [
            {
              id: rid(),
              fieldId: "score",
              operator: FilterOperator.LESS_THAN_OR_EQUAL,
              value: "40",
            },
          ],
        },
      },
      steps: [
        {
          id: rid(),
          type: "SEND_SMS",
          config: {
            message: "Hi {{contact.firstName}}, checking in — still interested? Reply YES to book a call.",
          },
        },
        { id: rid(), type: "WAIT", config: { amount: 2, unit: "days" } },
        {
          id: rid(),
          type: "IF",
          config: { field: "contact.sentiment", operator: "gte", value: "0" },
          children: {
            then: [
              { id: rid(), type: "MAKE_CALL", config: { goal: "Confirm interest and book a demo." } },
            ],
            else: [
              { id: rid(), type: "UPDATE", config: { operation: "add_tag", tag: "unresponsive" } },
            ],
          },
        },
      ],
    }),
  },
];

// ─────────────────────────── Helpers ───────────────────────────

export function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function prettyField(k: string): string {
  const map: Record<string, string> = {
    name: "Name",
    email: "Email",
    phone: "Phone",
    createdAt: "Created",
    hasOpenDeals: "Has deals",
    language: "Language",
    score: "Lead score",
  };
  return map[k] || k;
}

function prettyOp(op: string): string {
  const map: Record<string, string> = {
    [FilterOperator.CONTAINS]: "contains",
    [FilterOperator.EQUALS]: "=",
    [FilterOperator.GREATER_THAN_OR_EQUAL]: "≥",
    [FilterOperator.LESS_THAN_OR_EQUAL]: "≤",
    [FilterOperator.IS_EMPTY]: "is empty",
    [FilterOperator.IS_NOT_EMPTY]: "is set",
    [FilterOperator.IS_AFTER]: "after",
    [FilterOperator.IS_BEFORE]: "before",
  };
  return map[op] || op;
}
