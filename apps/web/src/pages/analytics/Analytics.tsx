import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/axios.js";
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
  ArrowUpRight,
  Download,
  Star,
  Clock,
  Sparkles,
  MessageSquare,
  Bot,
  ChevronDown,
  CalendarDays,
} from "lucide-react";

type Period = "today" | "7d" | "30d" | "90d";

const PERIODS = [
  { label: "Today",   value: "today" as Period },
  { label: "7 days",  value: "7d"    as Period },
  { label: "30 days", value: "30d"   as Period },
  { label: "90 days", value: "90d"   as Period },
];

const OUTCOME_HEX = {
  booked:   "#16A34A", // null sentiment (handled/booked)
  lead:     "#2563EB", // >= 70
  followup: "#D97706", // 40-69
  missed:   "#DC2626", // < 40
};

const HEAT_HEX = ["#F1F5F9", "#DBEAFE", "#93C5FD", "#2563EB", "#1E40AF"];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** One chart bucket from the backend — `label` is already human-friendly
 *  ("Tue, Jul 15" daily · "Jul 8 – Jul 14" weekly). */
type SeriesRow = {
  date: string;
  label: string;
  booked: number;
  lead: number;
  missed: number;
  followup: number;
  total: number;
};

/** With many buckets, print only every Nth x-axis label so they stay legible. */
const labelStep = (count: number): number => Math.max(1, Math.ceil(count / 8));

function XAxis({ data }: { data: SeriesRow[] }): React.JSX.Element {
  const step = labelStep(data.length);
  return (
    <div className="flex text-[10px] font-semibold text-fg-secondary">
      {data.map((d, i) => (
        <div key={d.date} className="flex-1 text-center truncate px-0.5" title={d.label}>
          {i % step === 0 ? d.label : ""}
        </div>
      ))}
    </div>
  );
}

function StackedBars({ data }: { data: SeriesRow[] }): React.JSX.Element {
  if (data.length === 0) return <EmptyChart />;
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="relative h-40">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-line-subtle" />
        ))}
      </div>
      <div className="relative flex items-end gap-1.5 h-[calc(100%-20px)] pt-1">
        {data.map((d) => {
          const h = d.total === 0 ? 2 : Math.max(8, (d.total / max) * 100);
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center group h-full justify-end">
              <span className="text-[10px] font-bold text-fg-primary tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                {d.total}
              </span>
              <div className="w-full h-full flex items-end">
                <div
                  className="w-full flex flex-col rounded-t-md overflow-hidden transition-transform group-hover:-translate-y-0.5 bg-bg-muted"
                  style={{ height: `${h}%`, boxShadow: "0 1px 2px rgba(15,23,42,0.08)" }}
                  title={`${d.label} — ${d.total} calls (${d.lead} hot leads, ${d.followup} follow-ups, ${d.missed} negative, ${d.booked} other)`}
                >
                  <div style={{ flexGrow: d.booked, backgroundColor: OUTCOME_HEX.booked }} />
                  <div style={{ flexGrow: d.lead, backgroundColor: OUTCOME_HEX.lead }} />
                  <div style={{ flexGrow: d.followup, backgroundColor: OUTCOME_HEX.followup }} />
                  <div style={{ flexGrow: d.missed, backgroundColor: OUTCOME_HEX.missed }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-0 left-0 w-full">
        <XAxis data={data} />
      </div>
    </div>
  );
}

/** One clean solid line — how many calls came in, nothing else. */
function LineChart({ data }: { data: SeriesRow[] }): React.JSX.Element {
  if (data.length === 0) return <EmptyChart />;
  const max = Math.max(...data.map((d) => d.total), 1);
  const w = 100 / data.length;
  // 4% padding top/bottom so the line never kisses the chart edges.
  const y = (t: number) => 96 - (t / max) * 92;
  const points = data.map((d, i) => `${(i + 0.5) * w},${y(d.total)}`).join(" ");

  return (
    <div className="relative h-40">
      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-line-subtle" />
        ))}
      </div>
      <div className="relative h-full w-full pt-1 pb-[20px]">
        <svg
          className="absolute top-1 left-0 w-full h-[calc(100%-24px)]"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          <polyline
            points={points}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Invisible hover columns → precise per-day tooltip */}
        <div className="absolute top-1 left-0 w-full h-[calc(100%-24px)] flex">
          {data.map((d) => (
            <div key={d.date} className="flex-1" title={`${d.label} — ${d.total} calls`} />
          ))}
        </div>
        <div className="absolute bottom-0 left-0 w-full">
          <XAxis data={data} />
        </div>
      </div>
    </div>
  );
}

function EmptyChart(): React.JSX.Element {
  return (
    <div className="h-40 flex items-center justify-center text-[11.5px] text-fg-muted font-medium">
      No calls in this period yet
    </div>
  );
}

function Heatmap({
  grid,
  counts,
  hours,
}: {
  grid: number[][];
  counts: number[][];
  hours: string[];
}): React.JSX.Element {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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
        <div className="flex justify-between text-[8.5px] font-bold text-fg-muted mb-1.5 tabular-nums">
          {hours.map((h, i) => (
            <span key={i} className="flex-1 text-center whitespace-nowrap">
              {h}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-1.5">
          {grid.map((row, r) => (
            <div key={r} className="flex gap-1.5">
              {row.map((v, c) => (
                <div
                  key={c}
                  className="h-6 flex-1 rounded-md transition-transform hover:scale-110 cursor-pointer"
                  style={{
                    backgroundColor: HEAT_HEX[Math.min(v, 4)],
                    border: "1px solid rgba(255,255,255,0.7)",
                  }}
                  title={`${days[r]} · ${hours[c]} — ${counts[r]?.[c] ?? 0} call${(counts[r]?.[c] ?? 0) === 1 ? "" : "s"}`}
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
  agents: any[];
}> = ({ value, onChange, agents }) => {
  const current = agents.find((a) => a.id === value) || agents[0]!;
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-9 pr-8 h-9 rounded-lg border text-[12.5px] font-semibold cursor-pointer focus:outline-none"
        style={{
          backgroundColor: "rgb(var(--bg-raised))",
          borderColor: "rgb(var(--line-default))",
          color: "rgb(var(--fg-primary))",
          boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        }}
      >
        {agents.map((a) => (
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

  const { data: dbAgents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => (await api.get("/agents")).data.data as any[],
  });

  const agents = React.useMemo(() => {
    return [
      { id: "all", name: "All agents", role: "Aggregate", hex: "#64748B" },
      ...dbAgents.map((a: any) => ({
        id: a.id,
        name: a.name,
        role: a.role || "Support",
        hex: "#2563EB",
      })),
    ];
  }, [dbAgents]);

  // Send the browser's own timezone so the backend groups days/hours exactly
  // as this user experiences them (a Saturday call must show on Saturday).
  const tz = React.useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const { data: analyticsData } = useQuery({
    queryKey: ["analytics", agentId, period, tz],
    queryFn: async () =>
      (
        await api.get(
          `/dashboard/analytics?agentId=${agentId}&period=${period}&tz=${encodeURIComponent(tz)}`,
        )
      ).data.data,
  });

  const stats = analyticsData?.stats || {
    calls: 0, callsDelta: { pct: 0, direction: "up" },
    whatsapp: 0, whatsappDelta: { pct: 0, direction: "up" },
    conv: 0, convDelta: { pct: 0, direction: "up" },
    duration: "0s", durationDelta: { pct: 0, direction: "up" },
    minutes: 0, rating: "0.0", daily: [], sentiment: [], funnel: []
  };

  const zeroGrid = React.useMemo(() => Array.from({ length: 7 }, () => Array(12).fill(0)), []);
  const heatmapGrid: number[][] = analyticsData?.heatmap || zeroGrid;
  const heatmapCounts: number[][] = analyticsData?.heatmapCounts || zeroGrid;
  const heatmapHours: string[] =
    analyticsData?.heatmapHours ||
    ["9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM"];
  const rangeLabel: string = analyticsData?.range?.label || "";
  const isAll = agentId === "all";
  const agent = agents.find((a) => a.id === agentId) || agents[0]!;

  const kpis = [
    {
      label: "Calls answered",
      value: stats.calls,
      delta: stats.callsDelta,
      tone: "positive" as const,
      icon: PhoneCall,
      hint: "vs previous period",
    },
    {
      label: "WhatsApp messages",
      value: stats.whatsapp,
      delta: stats.whatsappDelta,
      tone: "attention" as const,
      icon: MessageSquare,
      hint: "sent & received",
    },
    {
      label: "Calls that became leads",
      value: `${stats.conv}%`,
      delta: stats.convDelta,
      tone: "brand" as const,
      icon: Users,
      hint: "Interested callers out of all calls",
    },
    {
      label: "Avg call duration",
      value: stats.duration,
      delta: stats.durationDelta,
      tone: "attention" as const,
      icon: Clock,
      hint: "vs previous period",
    },
  ];

  return (
    <PageWrapper noScroll={true}>
      <PageHeader
        title="Analytics"
        subtitle={
          <>
            <span>How your AI receptionists performed.</span>
            {rangeLabel && (
              <span className="inline-flex items-center gap-1 rounded-md bg-bg-subtle border border-line-default px-2 py-0.5 text-[10.5px] font-semibold text-fg-secondary">
                <CalendarDays className="h-3 w-3" />
                {rangeLabel}
              </span>
            )}
          </>
        }
        actions={
          <>
            <AgentFilter value={agentId} onChange={setAgentId} agents={agents} />
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

      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mx-1 px-1 pb-4">
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
                  (k.tone as string) === "negative"  && "bg-negative-50 text-negative-500 ring-negative-500/15",
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
                  k.delta.direction === "up" ? "text-positive-500" : "text-negative-500",
                ].join(" ")}>
                  <ArrowUpRight className={`h-3 w-3 ${k.delta.direction === "down" ? "rotate-90" : ""}`} />
                  {k.delta.pct}%
                </span>
              </div>
              <div className="mt-1 text-[10.5px] font-medium text-fg-muted">{k.hint}</div>
            </div>
          ))}
        </div>

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
                ? "Your agents are actively engaging leads. Consider routing weekend spillover to your primary agent."
                : `${agent.name} is performing well! They're successfully capturing leads and advancing them down the funnel.`}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold shrink-0 pr-1">
            View report <ArrowUpRight className="h-3 w-3" />
          </span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <Card>
            <SectionHead
              title="Call volume trend"
              hint={`How many calls came in each ${period === "90d" ? "week" : "day"}${rangeLabel ? ` · ${rangeLabel}` : ""}`}
            />
            <LineChart data={stats.daily} />
          </Card>
          <Card>
            <SectionHead
              title="Calls by outcome"
              hint={`What each call turned into${rangeLabel ? ` · ${rangeLabel}` : ""}`}
              action={
                <div className="hidden md:flex items-center gap-3 text-[10px] font-semibold">
                  <Legend color={OUTCOME_HEX.booked}   label="Completed/Unknown" />
                  <Legend color={OUTCOME_HEX.lead}     label="Hot Lead" />
                  <Legend color={OUTCOME_HEX.followup} label="Follow-up" />
                  <Legend color={OUTCOME_HEX.missed}   label="Negative" />
                </div>
              }
            />
            <StackedBars data={stats.daily} />
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <Card>
            <SectionHead
              title="Peak hours"
              hint="When your phone rings the most — darker means busier"
            />
            <Heatmap grid={heatmapGrid} counts={heatmapCounts} hours={heatmapHours} />
            <div className="flex items-center gap-1.5 justify-end mt-2 text-[9.5px] text-fg-muted font-medium">
              <span>Less</span>
              {HEAT_HEX.map((h, i) => (
                <span key={i} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: h }} />
              ))}
              <span>More</span>
            </div>
          </Card>

          <Card>
            <SectionHead title="Caller sentiment" hint="How callers felt, judged by AI after each call" />
            <div className="space-y-2">
              {stats.sentiment.map((s: any) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-fg-secondary w-14">{s.label}</span>
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgb(var(--line-subtle))" }}>
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
                  </div>
                  <span className="text-[11px] font-semibold text-fg-primary tabular-nums w-8 text-right">{s.pct}%</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-line-subtle flex items-center justify-between text-[10.5px]">
              <span className="text-fg-muted font-medium">Est. CSAT (post-call)</span>
              <span className="inline-flex items-center gap-0.5 text-attention-500 font-bold">
                <Star className="h-3 w-3 fill-attention-500 stroke-attention-500" />
                {stats.rating} / 5.0
              </span>
            </div>
          </Card>
        </div>

        {isAll && (
          <Card className="mb-3">
            <SectionHead
              title="Agent performance"
              hint={`Each agent's totals${rangeLabel ? ` · ${rangeLabel}` : ""} — click a row to see just that agent`}
              action={<span className="text-[10.5px] font-semibold text-fg-muted">{agents.length - 1} agents</span>}
            />
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold border-b border-line-subtle">
                    <th className="text-left font-semibold px-2 py-2">Agent</th>
                    <th className="text-right font-semibold px-2 py-2">Calls answered</th>
                    <th className="text-right font-semibold px-2 py-2">Talk time</th>
                    <th className="text-right font-semibold px-2 py-2">Hot leads</th>
                    <th className="text-right font-semibold px-2 py-2">Rating</th>
                    <th className="text-right font-semibold px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {agents.filter((a) => a.id !== "all").map((a) => {
                    const perf = stats.agentPerformance?.find((p: any) => p.agentId === a.id);
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
                        <td className="text-right px-2 py-2.5 font-semibold text-fg-primary tabular-nums">
                          {perf?.calls ?? 0}
                        </td>
                        <td className="text-right px-2 py-2.5 text-fg-secondary tabular-nums">
                          {perf?.minutes ?? 0} min
                        </td>
                        <td className="text-right px-2 py-2.5 font-semibold text-brand-600 tabular-nums">
                          {perf?.leads ?? 0}
                        </td>
                        <td className="text-right px-2 py-2.5">
                          <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-attention-500">
                            <Star className="h-3 w-3 fill-attention-500 stroke-attention-500" />
                            {perf?.rating ?? "0.0"}
                          </span>
                        </td>
                        <td className="text-right px-2 py-2.5">
                          <ArrowUpRight className="h-3.5 w-3.5 text-fg-muted inline-block" />
                        </td>
                      </tr>
                    );
                  })}
                  {agents.length === 1 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-6 text-center text-[11.5px] text-fg-muted">
                        No agents yet — create your first AI agent to see performance here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-3 mb-3">
          <Card>
            <SectionHead
              title="Conversion funnel"
              hint={`From first call to closed deal${rangeLabel ? ` · ${rangeLabel}` : ""}`}
            />
            <div className="space-y-2">
              {stats.funnel.map((f: any, i: number) => {
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
        </div>

      </div>
    </PageWrapper>
  );
}

export default Analytics;
