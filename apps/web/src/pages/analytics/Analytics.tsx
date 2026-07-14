import * as React from "react";
import { toast } from "sonner";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import {
  Card,
  SectionHead,
  PageHeader,
  AppButton,
  Segmented,
} from "../../components/common/UI.tsx";
import {
  PhoneCall,
  Users,
  CalendarCheck,
  ArrowUpRight,
  Download,
  Star,
  Clock,
  Sparkles,
  PhoneMissed,
  MessageSquareQuote,
  Bot,
  ChevronDown,
  TrendingUp,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Demo dataset — realistic Indian SMB (salon / clinic / real-estate)
// Structured so an "agent" filter can slice everything.
// ─────────────────────────────────────────────────────────────

type Period = "today" | "7d" | "30d" | "90d";

const PERIODS = [
  { label: "Today",   value: "today" as Period },
  { label: "7 days",  value: "7d"    as Period },
  { label: "30 days", value: "30d"   as Period },
  { label: "90 days", value: "90d"   as Period },
];

interface Agent {
  id: string;
  name: string;
  role: string;
  hex: string; // inline color
}

const AGENTS: Agent[] = [
  { id: "all",   name: "All agents",  role: "Aggregate",    hex: "#64748B" },
  { id: "priya", name: "Priya",       role: "Front desk",   hex: "#2563EB" },
  { id: "kabir", name: "Kabir",       role: "Bookings",     hex: "#6366F1" },
  { id: "neha",  name: "Neha",        role: "Support",      hex: "#059669" },
  { id: "rahul", name: "Rahul",       role: "Sales",        hex: "#F97316" },
];

// Outcome colors — used in bars, legend, everywhere
const OUTCOME_HEX = {
  booked:   "#16A34A", // positive green
  lead:     "#2563EB", // brand blue
  followup: "#D97706", // attention amber
  missed:   "#DC2626", // negative red
};

// Heatmap intensities — pale gray → deep blue
const HEAT_HEX = ["#F1F5F9", "#DBEAFE", "#93C5FD", "#2563EB", "#1E40AF"];

// Per-agent numbers for the 7-day window. `all` = sum.
const AGENT_STATS: Record<string, {
  calls: number;
  missed: number;
  bookings: number;
  conv: number;
  duration: string;
  rating: number;
  minutes: number;
  daily: { d: string; booked: number; lead: number; missed: number; followup: number }[];
  languages: { name: string; pct: number; dot: string }[];
  sentiment: { label: string; pct: number; color: string }[];
  funnel:  { label: string; value: number; pct: number }[];
  intents: { name: string; count: number; tone: "positive" | "brand" | "attention" | "negative" }[];
}> = {
  all: {
    calls: 843, missed: 18, bookings: 214, conv: 25, duration: "2m 14s", rating: 4.7, minutes: 1892,
    daily: [
      { d: "Mon", booked: 22, lead: 12, missed: 3, followup: 5  },
      { d: "Tue", booked: 30, lead: 18, missed: 2, followup: 8  },
      { d: "Wed", booked: 41, lead: 16, missed: 4, followup: 10 },
      { d: "Thu", booked: 34, lead: 20, missed: 1, followup: 8  },
      { d: "Fri", booked: 52, lead: 22, missed: 5, followup: 10 },
      { d: "Sat", booked: 18, lead: 8,  missed: 2, followup: 6  },
      { d: "Sun", booked: 12, lead: 6,  missed: 1, followup: 8  },
    ],
    languages: [
      { name: "Hindi",    pct: 42, dot: "#F97316" },
      { name: "English",  pct: 24, dot: "#2563EB" },
      { name: "Marathi",  pct: 14, dot: "#8B5CF6" },
      { name: "Tamil",    pct: 10, dot: "#10B981" },
      { name: "Gujarati", pct:  6, dot: "#EC4899" },
      { name: "Others",   pct:  4, dot: "#94A3B8" },
    ],
    sentiment: [
      { label: "Positive", pct: 68, color: "#16A34A" },
      { label: "Neutral",  pct: 24, color: "#CBD5E1" },
      { label: "Negative", pct:  8, color: "#DC2626" },
    ],
    funnel: [
      { label: "Calls answered",  value: 843, pct: 100 },
      { label: "Qualified leads", value: 512, pct: 61  },
      { label: "Bookings made",   value: 214, pct: 25  },
      { label: "Deals closed",    value: 68,  pct: 8   },
    ],
    intents: [
      { name: "Book an appointment",  count: 214, tone: "positive" },
      { name: "Ask for pricing",      count: 187, tone: "brand" },
      { name: "Reschedule booking",   count: 132, tone: "attention" },
      { name: "Check availability",   count: 96,  tone: "brand" },
      { name: "Cancel appointment",   count: 42,  tone: "negative" },
      { name: "Speak to human",       count: 28,  tone: "attention" },
    ],
  },
  priya: {
    calls: 342, missed: 6, bookings: 108, conv: 32, duration: "2m 22s", rating: 4.9, minutes: 762,
    daily: [
      { d: "Mon", booked: 12, lead: 6,  missed: 1, followup: 2 },
      { d: "Tue", booked: 14, lead: 9,  missed: 1, followup: 3 },
      { d: "Wed", booked: 18, lead: 7,  missed: 2, followup: 4 },
      { d: "Thu", booked: 15, lead: 10, missed: 0, followup: 3 },
      { d: "Fri", booked: 24, lead: 11, missed: 2, followup: 4 },
      { d: "Sat", booked: 8,  lead: 3,  missed: 0, followup: 2 },
      { d: "Sun", booked: 5,  lead: 2,  missed: 0, followup: 3 },
    ],
    languages: [
      { name: "Hindi",   pct: 54, dot: "#F97316" },
      { name: "English", pct: 22, dot: "#2563EB" },
      { name: "Marathi", pct: 14, dot: "#8B5CF6" },
      { name: "Others",  pct: 10, dot: "#94A3B8" },
    ],
    sentiment: [
      { label: "Positive", pct: 76, color: "#16A34A" },
      { label: "Neutral",  pct: 20, color: "#CBD5E1" },
      { label: "Negative", pct:  4, color: "#DC2626" },
    ],
    funnel: [
      { label: "Calls answered",  value: 342, pct: 100 },
      { label: "Qualified leads", value: 232, pct: 68 },
      { label: "Bookings made",   value: 108, pct: 32 },
      { label: "Deals closed",    value: 42,  pct: 12 },
    ],
    intents: [
      { name: "Book an appointment", count: 108, tone: "positive" },
      { name: "Reschedule booking",  count: 62,  tone: "attention" },
      { name: "Ask for pricing",     count: 58,  tone: "brand" },
      { name: "Check availability",  count: 42,  tone: "brand" },
      { name: "Cancel appointment",  count: 12,  tone: "negative" },
    ],
  },
  kabir: {
    calls: 264, missed: 5, bookings: 62, conv: 24, duration: "3m 04s", rating: 4.7, minutes: 812,
    daily: [
      { d: "Mon", booked: 6,  lead: 4,  missed: 1, followup: 2 },
      { d: "Tue", booked: 10, lead: 6,  missed: 0, followup: 3 },
      { d: "Wed", booked: 12, lead: 5,  missed: 1, followup: 3 },
      { d: "Thu", booked: 10, lead: 6,  missed: 0, followup: 3 },
      { d: "Fri", booked: 14, lead: 8,  missed: 2, followup: 4 },
      { d: "Sat", booked: 6,  lead: 3,  missed: 1, followup: 2 },
      { d: "Sun", booked: 4,  lead: 2,  missed: 0, followup: 3 },
    ],
    languages: [
      { name: "Hindi",    pct: 38, dot: "#F97316" },
      { name: "English",  pct: 28, dot: "#2563EB" },
      { name: "Gujarati", pct: 20, dot: "#EC4899" },
      { name: "Others",   pct: 14, dot: "#94A3B8" },
    ],
    sentiment: [
      { label: "Positive", pct: 64, color: "#16A34A" },
      { label: "Neutral",  pct: 28, color: "#CBD5E1" },
      { label: "Negative", pct:  8, color: "#DC2626" },
    ],
    funnel: [
      { label: "Calls answered",  value: 264, pct: 100 },
      { label: "Qualified leads", value: 148, pct: 56 },
      { label: "Bookings made",   value: 62,  pct: 24 },
      { label: "Deals closed",    value: 18,  pct: 7  },
    ],
    intents: [
      { name: "Ask for pricing",     count: 82, tone: "brand" },
      { name: "Book an appointment", count: 62, tone: "positive" },
      { name: "Check availability",  count: 48, tone: "brand" },
      { name: "Reschedule booking",  count: 32, tone: "attention" },
      { name: "Speak to human",      count: 12, tone: "attention" },
    ],
  },
  neha: {
    calls: 138, missed: 4, bookings: 28, conv: 20, duration: "1m 48s", rating: 4.6, minutes: 214,
    daily: [
      { d: "Mon", booked: 3, lead: 2, missed: 1, followup: 1 },
      { d: "Tue", booked: 4, lead: 3, missed: 1, followup: 1 },
      { d: "Wed", booked: 6, lead: 3, missed: 1, followup: 2 },
      { d: "Thu", booked: 5, lead: 3, missed: 0, followup: 1 },
      { d: "Fri", booked: 8, lead: 2, missed: 1, followup: 1 },
      { d: "Sat", booked: 2, lead: 1, missed: 0, followup: 1 },
      { d: "Sun", booked: 0, lead: 1, missed: 0, followup: 1 },
    ],
    languages: [
      { name: "English", pct: 42, dot: "#2563EB" },
      { name: "Hindi",   pct: 32, dot: "#F97316" },
      { name: "Tamil",   pct: 18, dot: "#10B981" },
      { name: "Others",  pct:  8, dot: "#94A3B8" },
    ],
    sentiment: [
      { label: "Positive", pct: 60, color: "#16A34A" },
      { label: "Neutral",  pct: 28, color: "#CBD5E1" },
      { label: "Negative", pct: 12, color: "#DC2626" },
    ],
    funnel: [
      { label: "Calls answered",  value: 138, pct: 100 },
      { label: "Qualified leads", value: 84,  pct: 61 },
      { label: "Bookings made",   value: 28,  pct: 20 },
      { label: "Deals closed",    value: 6,   pct: 4  },
    ],
    intents: [
      { name: "Speak to human",      count: 28, tone: "attention" },
      { name: "Cancel appointment",  count: 22, tone: "negative" },
      { name: "Check availability",  count: 18, tone: "brand" },
      { name: "Reschedule booking",  count: 12, tone: "attention" },
    ],
  },
  rahul: {
    calls: 99, missed: 3, bookings: 16, conv: 16, duration: "2m 40s", rating: 4.5, minutes: 104,
    daily: [
      { d: "Mon", booked: 1, lead: 0, missed: 0, followup: 0 },
      { d: "Tue", booked: 2, lead: 0, missed: 0, followup: 1 },
      { d: "Wed", booked: 5, lead: 1, missed: 0, followup: 1 },
      { d: "Thu", booked: 4, lead: 1, missed: 1, followup: 1 },
      { d: "Fri", booked: 6, lead: 1, missed: 0, followup: 1 },
      { d: "Sat", booked: 2, lead: 1, missed: 1, followup: 1 },
      { d: "Sun", booked: 3, lead: 1, missed: 1, followup: 1 },
    ],
    languages: [
      { name: "Hindi",    pct: 46, dot: "#F97316" },
      { name: "English",  pct: 26, dot: "#2563EB" },
      { name: "Marathi",  pct: 20, dot: "#8B5CF6" },
      { name: "Others",   pct:  8, dot: "#94A3B8" },
    ],
    sentiment: [
      { label: "Positive", pct: 58, color: "#16A34A" },
      { label: "Neutral",  pct: 30, color: "#CBD5E1" },
      { label: "Negative", pct: 12, color: "#DC2626" },
    ],
    funnel: [
      { label: "Calls answered",  value: 99, pct: 100 },
      { label: "Qualified leads", value: 48, pct: 48 },
      { label: "Bookings made",   value: 16, pct: 16 },
      { label: "Deals closed",    value: 2,  pct: 2  },
    ],
    intents: [
      { name: "Ask for pricing",     count: 46, tone: "brand" },
      { name: "Book an appointment", count: 16, tone: "positive" },
      { name: "Speak to human",      count: 8,  tone: "attention" },
    ],
  },
};

// Peak-hour heatmap (7d × 12 hours, 9AM–8PM). Used for "all" only for now.
const HEATMAP: number[][] = [
  [0,1,2,3,3,4,3,2,3,2,1,0],
  [1,2,3,4,4,3,3,3,2,2,1,0],
  [1,2,3,3,4,4,4,3,3,2,1,0],
  [0,1,3,3,4,3,3,4,3,2,1,0],
  [1,3,4,4,4,4,3,3,4,3,2,1],
  [0,1,2,2,3,3,2,2,2,1,1,0],
  [0,0,1,1,2,2,2,1,1,1,0,0],
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const INTENT_TONE: Record<string, string> = {
  positive:  "bg-positive-50 text-positive-500 ring-positive-500/20",
  brand:     "bg-brand-50 text-brand-600 ring-brand-500/20",
  attention: "bg-attention-50 text-attention-600 ring-attention-500/20",
  negative:  "bg-negative-50 text-negative-500 ring-negative-500/20",
};

type DailyRow = { d: string; booked: number; lead: number; missed: number; followup: number };
function StackedBars({ data }: { data: DailyRow[] }): React.JSX.Element {
  const totals = data.map((d) => d.booked + d.lead + d.missed + d.followup);
  const max = Math.max(...totals, 1);
  return (
    <div className="relative h-40">
      {/* horizontal gridlines */}
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-line-subtle" />
        ))}
      </div>
      <div className="relative flex items-end gap-2.5 h-full pt-1">
        {data.map((d) => {
          const total = d.booked + d.lead + d.missed + d.followup;
          const h = Math.max(14, (total / max) * 100);
          return (
            <div key={d.d} className="flex-1 flex flex-col items-center gap-1 group h-full justify-end">
              <span className="text-[10px] font-bold text-fg-primary tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                {total}
              </span>
              <div className="w-full h-full flex items-end">
                <div
                  className="w-full flex flex-col rounded-t-md overflow-hidden transition-transform group-hover:-translate-y-0.5"
                  style={{ height: `${h}%`, boxShadow: "0 1px 2px rgba(15,23,42,0.08)" }}
                  title={`${d.d}: ${total} calls`}
                >
                  <div style={{ flexGrow: d.booked,   backgroundColor: OUTCOME_HEX.booked }} />
                  <div style={{ flexGrow: d.lead,     backgroundColor: OUTCOME_HEX.lead }} />
                  <div style={{ flexGrow: d.followup, backgroundColor: OUTCOME_HEX.followup }} />
                  <div style={{ flexGrow: d.missed,   backgroundColor: OUTCOME_HEX.missed }} />
                </div>
              </div>
              <span className="text-[10px] font-semibold tracking-wider text-fg-secondary mt-1">
                {d.d}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Heatmap(): React.JSX.Element {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hoursLabel = ["9a", "10", "11a", "12p", "1p", "2p", "3p", "4p", "5p", "6p", "7p", "8p"];
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col gap-1.5 pt-5">
        {days.map((d, i) => (
          <span key={i} className="h-6 flex items-center text-[10px] font-semibold text-fg-secondary">
            {d}
          </span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[9.5px] font-semibold text-fg-muted mb-1.5 tabular-nums">
          {hoursLabel.map((h, i) => (
            <span key={i} className="flex-1 text-center">{h}</span>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {HEATMAP.map((row, r) => (
            <div key={r} className="flex gap-1.5">
              {row.map((v, c) => (
                <div
                  key={c}
                  className="h-6 flex-1 rounded-md transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: HEAT_HEX[v],
                    border: "1px solid rgba(255,255,255,0.7)",
                  }}
                  title={`${days[r]} · ${9 + c}:00 · ${v * 5} calls`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const AgentFilter: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
  const current = AGENTS.find((a) => a.id === value) || AGENTS[0]!;
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-9 pr-8 h-9 rounded-lg border text-[12.5px] font-semibold cursor-pointer focus:outline-none"
        style={{
          backgroundColor: "#FFFFFF",
          borderColor: "#E5E7EB",
          color: "#0F172A",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        {AGENTS.map((a) => (
          <option key={a.id} value={a.id}>{a.name === "All agents" ? a.name : `${a.name} · ${a.role}`}</option>
        ))}
      </select>
      <div
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
        style={{ backgroundColor: current.hex }}
      >
        {current.id === "all" ? <Bot className="h-3 w-3" /> : current.name.charAt(0)}
      </div>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
    </div>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <span className="inline-flex items-center gap-1 text-fg-secondary">
    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    {label}
  </span>
);

// ─────────────────────────────────────────────────────────────
// Analytics page
// ─────────────────────────────────────────────────────────────

export function Analytics(): React.JSX.Element {
  const [period, setPeriod] = React.useState<Period>("7d");
  const [agentId, setAgentId] = React.useState<string>("all");

  const stats = AGENT_STATS[agentId] || AGENT_STATS.all!;
  const isAll = agentId === "all";
  const agent = AGENTS.find((a) => a.id === agentId) || AGENTS[0]!;

  const kpis = [
    {
      label: "Calls answered",
      value: stats.calls,
      delta: 18,
      tone: "positive" as const,
      icon: PhoneCall,
      hint: "vs previous period",
    },
    {
      label: "Missed calls",
      value: stats.missed,
      delta: -32,
      tone: "negative" as const,
      icon: PhoneMissed,
      hint: "AI recovery in progress",
    },
    {
      label: "Booking conversion",
      value: `${stats.conv}%`,
      delta: 6,
      tone: "brand" as const,
      icon: CalendarCheck,
      hint: "Call → booking rate",
    },
    {
      label: "Avg call duration",
      value: stats.duration,
      delta: -8,
      tone: "attention" as const,
      icon: Clock,
      hint: "Faster than last period",
    },
  ];

  return (
    <PageWrapper noScroll={true}>
      {/* Header with agent filter + period + export */}
      <PageHeader
        title="Analytics"
        subtitle={
          <>
            <span>Call & CRM performance across your AI receptionists.</span>
          </>
        }
        actions={
          <>
            <AgentFilter value={agentId} onChange={setAgentId} />
            <Segmented options={PERIODS} value={period} onChange={setPeriod} />
            <AppButton
              variant="primary"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() => toast.info("Report export coming soon.")}
            >
              Export
            </AppButton>
          </>
        }
      />

      {/* Scrollable body — hidden scrollbar, with real bottom breathing room */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mx-1 px-1 pb-4">
        {/* Agent hero strip — only when filtering to a specific agent */}
        {!isAll && (
          <div className="rounded-xl border border-line-default bg-bg-raised shadow-card p-4 mb-3 flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-[14px]"
              style={{ backgroundColor: agent.hex }}
            >
              {agent.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-fg-primary">{agent.name}</span>
                <span className="text-[11px] text-fg-muted">· {agent.role}</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-fg-secondary mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <PhoneCall className="h-3 w-3" />
                  {stats.calls} calls
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {stats.minutes} min talk time
                </span>
                <span className="inline-flex items-center gap-1 text-attention-500 font-semibold">
                  <Star className="h-3 w-3 fill-attention-500 stroke-attention-500" />
                  {stats.rating}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAgentId("all")}
              className="text-[11.5px] font-semibold text-fg-secondary hover:text-fg-primary"
            >
              ← Back to all agents
            </button>
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-xl border border-line-default bg-bg-raised p-4 shadow-card"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                  {k.label}
                </span>
                <span className={[
                  "inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1",
                  k.tone === "positive"  && "bg-positive-50 text-positive-500 ring-positive-500/15",
                  k.tone === "negative"  && "bg-negative-50 text-negative-500 ring-negative-500/15",
                  k.tone === "brand"     && "bg-brand-50 text-brand-600 ring-brand-500/15",
                  k.tone === "attention" && "bg-attention-50 text-attention-500 ring-attention-500/15",
                ].filter(Boolean).join(" ")}>
                  <k.icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-[22px] font-semibold text-fg-primary tracking-tight leading-none">
                  {k.value}
                </span>
                <span className={[
                  "inline-flex items-center gap-0.5 text-[10.5px] font-semibold",
                  k.delta >= 0 ? "text-positive-500" : "text-negative-500",
                ].join(" ")}>
                  <ArrowUpRight className={`h-3 w-3 ${k.delta < 0 ? "rotate-90" : ""}`} />
                  {Math.abs(k.delta)}%
                </span>
              </div>
              <div className="mt-1 text-[10.5px] font-medium text-fg-muted">{k.hint}</div>
            </div>
          ))}
        </div>

        {/* Compact AI insight banner — horizontal strip, no tall tile */}
        <button
          type="button"
          onClick={() => toast.info("Detailed insight report coming soon.")}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 mb-3 shadow-goldGlow text-left transition-transform hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(90deg, #FFE9A0 0%, #F5B849 55%, #F97316 100%)",
            color: "#0a0416",
          }}
        >
          <span
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">AI Insight</div>
            <p className="text-[12.5px] font-bold leading-snug">
              {isAll
                ? "Fridays convert 40% higher — schedule extra agent capacity between 11 AM & 3 PM."
                : `${agent.name} closes fastest on Fri. Consider routing weekend spillover here.`}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0 pr-1">
            View report <ArrowUpRight className="h-3 w-3" />
          </span>
        </button>

        {/* Row: Call volume by outcome */}
        <div className="mb-3">
          <Card>
            <SectionHead
              title="Call volume by outcome"
              hint="Stacked · last 7 days"
              action={
                <div className="hidden md:flex items-center gap-3 text-[10px] font-semibold">
                  <Legend color={OUTCOME_HEX.booked}   label="Booked" />
                  <Legend color={OUTCOME_HEX.lead}     label="Lead" />
                  <Legend color={OUTCOME_HEX.followup} label="Follow-up" />
                  <Legend color={OUTCOME_HEX.missed}   label="Missed" />
                </div>
              }
            />
            <StackedBars data={stats.daily} />
          </Card>
        </div>

        {/* Row: Heatmap + Language mix + Sentiment (3 compact cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          <Card>
            <SectionHead title="Peak hours" hint="Calls by day × hour" />
            <Heatmap />
            <div className="flex items-center gap-1.5 justify-end mt-2 text-[9.5px] text-fg-muted font-medium">
              <span>Less</span>
              {HEAT_HEX.map((h, i) => (
                <span key={i} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: h }} />
              ))}
              <span>More</span>
            </div>
          </Card>

          <Card>
            <SectionHead title="Languages spoken" hint="Share of calls" />
            <div className="h-2 w-full rounded-full overflow-hidden flex mb-3" style={{ backgroundColor: "#F1F5F9" }}>
              {stats.languages.map((l) => (
                <div key={l.name} className="h-full" style={{ width: `${l.pct}%`, backgroundColor: l.dot }} />
              ))}
            </div>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
              {stats.languages.map((l) => (
                <li key={l.name} className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 text-fg-secondary font-medium">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.dot }} />
                    {l.name}
                  </span>
                  <span className="text-fg-primary font-semibold tabular-nums">{l.pct}%</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <SectionHead title="Caller sentiment" hint="AI-scored" />
            <div className="space-y-2">
              {stats.sentiment.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-fg-secondary w-14">{s.label}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#F1F5F9" }}>
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                  </div>
                  <span className="text-[11px] font-semibold text-fg-primary tabular-nums w-8 text-right">{s.pct}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-line-subtle flex items-center justify-between text-[10.5px]">
              <span className="text-fg-muted font-medium">CSAT (post-call)</span>
              <span className="inline-flex items-center gap-0.5 text-attention-500 font-bold">
                <Star className="h-3 w-3 fill-attention-500 stroke-attention-500" />
                {stats.rating} / 5.0
              </span>
            </div>
          </Card>
        </div>

        {/* Row: Agent performance leaderboard — hidden when a single agent is selected */}
        {isAll && (
          <Card className="mb-3">
            <SectionHead
              title="Agent performance"
              hint="Click a row to filter the whole page by that agent."
              action={<span className="text-[10.5px] font-semibold text-fg-muted">{AGENTS.length - 1} agents</span>}
            />
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold border-b border-line-subtle">
                    <th className="text-left font-semibold px-2 py-2">Agent</th>
                    <th className="text-right font-semibold px-2 py-2">Calls</th>
                    <th className="text-right font-semibold px-2 py-2">Talk time</th>
                    <th className="text-left font-semibold px-2 py-2 w-[30%]">Conversion</th>
                    <th className="text-right font-semibold px-2 py-2">Rating</th>
                    <th className="text-right font-semibold px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {AGENTS.filter((a) => a.id !== "all").map((a) => {
                    const s = AGENT_STATS[a.id]!;
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setAgentId(a.id)}
                        className="border-b border-line-subtle hover:bg-bg-muted/60 transition-colors cursor-pointer"
                      >
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-7 w-7 rounded-full text-white text-[11px] font-semibold flex items-center justify-center"
                              style={{ backgroundColor: a.hex }}
                            >
                              {a.name.charAt(0)}
                            </span>
                            <div>
                              <div className="text-[12.5px] font-semibold text-fg-primary leading-tight">{a.name}</div>
                              <div className="text-[10.5px] text-fg-muted">{a.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right px-2 py-2.5 font-semibold text-fg-primary tabular-nums">{s.calls}</td>
                        <td className="text-right px-2 py-2.5 text-fg-secondary tabular-nums">{s.minutes}m</td>
                        <td className="px-2 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                                style={{ width: `${s.conv}%` }}
                              />
                            </div>
                            <span className="text-[10.5px] font-semibold text-fg-secondary tabular-nums w-8 text-right">{s.conv}%</span>
                          </div>
                        </td>
                        <td className="text-right px-2 py-2.5">
                          <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-attention-500">
                            <Star className="h-3 w-3 fill-attention-500 stroke-attention-500" />
                            {s.rating}
                          </span>
                        </td>
                        <td className="text-right px-2 py-2.5">
                          <ArrowUpRight className="h-3.5 w-3.5 text-fg-muted inline-block" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Row: Funnel + Intents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <Card>
            <SectionHead title="Conversion funnel" hint="Call → deal closed" />
            <div className="space-y-2">
              {stats.funnel.map((f, i) => {
                const shade = ["bg-brand-500", "bg-brand-500/85", "bg-brand-500/70", "bg-brand-500/55"][i] || "bg-brand-500";
                return (
                  <div key={f.label}>
                    <div className="flex items-center justify-between text-[11.5px] mb-1">
                      <span className="font-semibold text-fg-primary">{f.label}</span>
                      <span className="text-fg-secondary font-medium tabular-nums">
                        {f.value} · <span className="text-fg-muted">{f.pct}%</span>
                      </span>
                    </div>
                    <div className="h-6 bg-bg-muted rounded-md overflow-hidden">
                      <div
                        className={`h-full ${shade} rounded-md flex items-center px-2 text-[10px] font-semibold text-white transition-all`}
                        style={{ width: `${f.pct}%` }}
                      >
                        {f.pct}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionHead
              title="Top caller intents"
              hint="What visitors ask most"
              action={<MessageSquareQuote className="h-3.5 w-3.5 text-fg-muted" />}
            />
            <ul className="space-y-1">
              {stats.intents.map((intent) => (
                <li key={intent.name} className="flex items-center justify-between gap-2 py-1">
                  <span className="text-[12px] font-medium text-fg-primary truncate">{intent.name}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 tabular-nums shrink-0 ${INTENT_TONE[intent.tone]}`}>
                    {intent.count}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Bottom: secondary metric strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-muted">
                Outbound campaigns
              </span>
              <TrendingUp className="h-3.5 w-3.5 text-fg-muted" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[19px] font-semibold text-fg-primary tabular-nums">1,204</span>
              <span className="text-[11px] font-semibold text-positive-500">↑ 22%</span>
            </div>
            <div className="text-[10.5px] text-fg-muted mt-0.5">42 workflows active</div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-muted">
                Avg first-response
              </span>
              <Clock className="h-3.5 w-3.5 text-fg-muted" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[19px] font-semibold text-fg-primary tabular-nums">3m 42s</span>
              <span className="text-[11px] font-semibold text-positive-500">↓ 18%</span>
            </div>
            <div className="text-[10.5px] text-fg-muted mt-0.5">Faster than industry avg (8m)</div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-muted">
                Callers this period
              </span>
              <Users className="h-3.5 w-3.5 text-fg-muted" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[19px] font-semibold text-fg-primary tabular-nums">628</span>
              <span className="text-[11px] font-semibold text-positive-500">↑ 12%</span>
            </div>
            <div className="text-[10.5px] text-fg-muted mt-0.5">312 first-time · 316 returning</div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}

export default Analytics;
