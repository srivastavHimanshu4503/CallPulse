import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { api } from "../../lib/axios.js";
import { formatINR } from "@antigravity/utils";
import {
  TrendingUp,
  Users,
  Plus,
  PhoneCall,
  ArrowRight,
  ArrowUpRight,
  Star,
  Clock,
  MessageSquare,
  Workflow,
  Gift,
  Sparkles,
  X,
} from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";

// ─────────────────────────────────────────────────────────────
// Local primitives
// ─────────────────────────────────────────────────────────────

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`rounded-xl border border-line-default bg-bg-raised shadow-card p-4 ${className}`}>
    {children}
  </div>
);

interface KpiProps {
  label: string;
  value: string | number;
  delta?: { pct: number; direction: "up" | "down" };
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "brand" | "positive" | "attention" | "accent";
  onClick?: () => void;
}
const KPI_TONES: Record<KpiProps["tone"], { icon: string; deltaUp: string }> = {
  brand:     { icon: "bg-brand-50 text-brand-600 ring-brand-500/15",         deltaUp: "text-brand-600" },
  positive:  { icon: "bg-positive-50 text-positive-500 ring-positive-500/15", deltaUp: "text-positive-500" },
  attention: { icon: "bg-attention-50 text-attention-500 ring-attention-500/15", deltaUp: "text-attention-500" },
  accent:    { icon: "bg-accent-100 text-accent-700 ring-accent-500/20",      deltaUp: "text-accent-700" },
};

const Kpi: React.FC<KpiProps> = ({ label, value, delta, hint, icon: Icon, tone = "brand", onClick }) => {
  const t = KPI_TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full rounded-xl border border-line-default bg-bg-raised p-4 shadow-card hover:shadow-raised hover:border-line-strong transition-all"
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{label}</span>
        {Icon && <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${t.icon}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[22px] font-semibold text-fg-primary tracking-tight leading-none">{value}</span>
        {delta && (
          <span className={`inline-flex items-center gap-0.5 text-[10.5px] font-semibold ${
            delta.direction === "up" ? "text-positive-500" : "text-negative-500"
          }`}>
            <ArrowUpRight className={`h-3 w-3 ${delta.direction === "down" ? "rotate-90" : ""}`} />
            {delta.pct}%
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-[10.5px] font-medium text-fg-muted">{hint}</div>}
    </button>
  );
};

const SectionHead: React.FC<{ title: string; hint?: string; action?: React.ReactNode }> = ({ title, hint, action }) => (
  <div className="flex items-center justify-between mb-3 shrink-0">
    <div className="min-w-0">
      <h3 className="text-[13px] font-semibold text-fg-primary tracking-tight">{title}</h3>
      {hint && <p className="text-[10.5px] text-fg-muted mt-0.5 truncate">{hint}</p>}
    </div>
    {action}
  </div>
);

const OUTCOME_STYLES: Record<string, string> = {
  Booked:      "bg-positive-50 text-positive-500 ring-positive-500/20",
  "Hot lead":  "bg-accent-100 text-accent-700 ring-accent-500/25",
  "Follow-up": "bg-attention-50 text-attention-600 ring-attention-500/20",
};

const LANG_STYLES: Record<string, string> = {
  Hindi:    "bg-orange-100 text-orange-700",
  Tamil:    "bg-emerald-100 text-emerald-700",
  Gujarati: "bg-rose-100 text-rose-700",
  Marathi:  "bg-indigo-100 text-indigo-700",
  English:  "bg-brand-50 text-brand-600",
  Bengali:  "bg-rose-100 text-rose-700",
};

const Avatar: React.FC<{ name: string; colorClass?: string; size?: number }> = ({ name, colorClass, size = 28 }) => {
  const initial = name.trim().charAt(0).toUpperCase();
  const style: React.CSSProperties = { width: size, height: size, fontSize: size * 0.42 };
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0 ${
        colorClass ? colorClass : "bg-blue-500"
      }`}
      style={style}
    >
      {initial}
    </span>
  );
};

function WeekBars({ data }: { data: number[] }): React.JSX.Element {
  const max = Math.max(...data, 1);
  // Rolling last-7-days window ending today — label each bar by its real day.
  const labels = data.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (data.length - 1 - i));
    return d.toLocaleDateString("en-US", { weekday: "narrow" });
  });
  return (
    <div className="flex items-end gap-2 h-full min-h-[10rem]">
      {data.map((v, i) => {
        const h = Math.max(8, (v / max) * 100);
        const isPeak = v === max;
        let barColor = "bg-blue-300";
        if (isPeak) barColor = "bg-brand-600";
        else if (v > 60) barColor = "bg-blue-500";
        else if (v > 30) barColor = "bg-blue-400";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end">
            <span className={`text-[10px] font-bold ${isPeak ? "text-brand-600" : "text-slate-500"}`}>
              {v}
            </span>
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-md transition-all hover:brightness-110 ${barColor}`}
                style={{ height: `${h}%` }}
                title={`${labels[i]}: ${v} calls`}
              />
            </div>
            <span className={`text-[9.5px] font-semibold tracking-wider ${isPeak ? "text-brand-600" : "text-fg-muted"}`}>
              {labels[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dashboard page
// ─────────────────────────────────────────────────────────────

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  // Restore API Queries
  const { data: statsData } = useQuery({ 
    queryKey: ["dashboard", "stats"], 
    queryFn: () => api.get("/dashboard/stats").then(r => r.data.data) 
  });
  const { data: recentCallsData } = useQuery({ 
    queryKey: ["dashboard", "recent-calls"], 
    queryFn: () => api.get("/dashboard/recent-calls").then(r => r.data.data) 
  });
  const { data: topAgentsData } = useQuery({ 
    queryKey: ["dashboard", "top-agents"], 
    queryFn: () => api.get("/dashboard/top-agents").then(r => r.data.data) 
  });
  const { data: weekCallsData } = useQuery({ 
    queryKey: ["dashboard", "week-calls"], 
    queryFn: () => api.get("/dashboard/week-calls").then(r => r.data.data) 
  });
  const { data: activeWorkflowsData } = useQuery({ 
    queryKey: ["dashboard", "active-workflows"], 
    queryFn: () => api.get("/dashboard/active-workflows").then(r => r.data.data) 
  });
  const { data: agentsData } = useQuery({ 
    queryKey: ["agents"], 
    queryFn: () => api.get("/agents").then(r => r.data.data) 
  });

  const stats = statsData || {
    callsHandledToday: 0,
    totalContacts: 0,
    openDeals: 0,
    dealsPipelineValue: 0,
  };
  const recentCalls = recentCallsData || [];
  const topAgents = topAgentsData || [];
  const weekCalls = weekCallsData || [0, 0, 0, 0, 0, 0, 0];
  const activeWorkflows = activeWorkflowsData || [];
  const agents = agentsData || [];

  const firstName = (user?.name || "there").split(" ")[0];
  const activeAgentCount = agents.filter((a: any) => a.isActive).length || 0;

  // Peak day + average call length, derived from live data.
  const peakIdx = weekCalls.indexOf(Math.max(...weekCalls));
  const peakDate = new Date();
  peakDate.setDate(peakDate.getDate() - (weekCalls.length - 1 - Math.max(0, peakIdx)));
  const peakDay =
    Math.max(...weekCalls) > 0
      ? `${peakDate.toLocaleDateString("en-US", { weekday: "short" })} · ${Math.max(...weekCalls)}`
      : "—";
  const avgSec = stats?.avgCallDurationSec || 0;
  const avgCall = avgSec > 0 ? `${Math.floor(avgSec / 60)}:${String(avgSec % 60).padStart(2, "0")}` : "—";

  const kpis = [
    {
      label: "Calls today",
      value: String(stats?.callsHandledToday || 0),
      delta: stats?.callsHandledTodayDelta,
      hint: "vs yesterday",
      icon: PhoneCall,
      tone: "positive" as const,
    },
    {
      label: "Active leads",
      value: String(stats?.openDeals || 0),
      hint: "open deals in CRM",
      icon: Users,
      tone: "brand" as const,
    },
    {
      label: "WhatsApp this week",
      value: String(stats?.whatsappThisWeek || 0),
      delta: stats?.whatsappThisWeekDelta,
      hint: "sent & received",
      icon: MessageSquare,
      tone: "attention" as const,
    },
    {
      label: "Pipeline value",
      value: formatINR(stats?.dealsPipelineValue || 0),
      delta: stats?.dealsPipelineValueDelta,
      hint: "across all open deals",
      icon: TrendingUp,
      tone: "accent" as const,
    },
  ];

  return (
    <PageWrapper noScroll={true}>
      {/* ============ HERO ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 shrink-0 mb-4">
        <div className="min-w-0">
          <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-fg-primary">
            Good to see you, {firstName}
          </h1>
          <p className="text-[12px] text-fg-secondary mt-0.5 truncate flex items-center gap-2 flex-wrap">
            <span>{tenant?.name || "Workspace"}</span>
            <span className="text-fg-muted">·</span>
            <span className="inline-flex items-center gap-1.5 text-positive-500 font-semibold">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-positive-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive-500" />
              </span>
              {activeAgentCount} agent{activeAgentCount === 1 ? "" : "s"} live
            </span>
            <span className="text-fg-muted">·</span>
            <span className="text-fg-secondary font-medium">All systems normal</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate("/crm")}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-line-default bg-bg-raised hover:bg-bg-muted text-fg-primary text-[12.5px] font-semibold transition-all"
          >
            <Users className="h-3.5 w-3.5" />
            Open CRM
          </button>
          <button
            type="button"
            onClick={() => navigate("/agents")}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-semibold transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New agent
          </button>
        </div>
      </div>

      {/* ============ KPI ROW ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 mb-4">
        {kpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      {/* ============ MAIN GRID ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* ── LEFT COL: chart + recent calls ── */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
          {/* Weekly volume — absorbs all spare column height */}
          <Card className="flex-1 min-h-0 flex flex-col">
            <SectionHead
              title="This week"
              hint="Calls answered by your AI receptionists"
              action={
                <button
                  type="button"
                  onClick={() => navigate("/analytics")}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                >
                  Analytics <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:gap-6 items-end flex-1 min-h-0">
              <WeekBars data={weekCalls} />
              <div className="grid grid-cols-3 gap-4 lg:min-w-[260px]">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">Total</div>
                  <div className="text-[18px] font-semibold text-fg-primary mt-0.5">
                    {weekCalls.reduce((a: number, b: number) => a + b, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">Peak day</div>
                  <div className="text-[18px] font-semibold text-brand-600 mt-0.5">{peakDay}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">Avg call</div>
                  <div className="text-[18px] font-semibold text-fg-primary mt-0.5">{avgCall}</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent conversations table — natural height, no bottom gap */}
          <Card className="shrink-0 flex flex-col">
            <SectionHead
              title="Recent conversations"
              hint="Live · updates every 30 seconds"
              action={
                <button
                  type="button"
                  onClick={() => navigate("/crm")}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <div className="flex-1 min-h-0 overflow-x-auto lg:overflow-hidden -mx-1">
              <table className="w-full text-[12px] min-w-[520px] lg:min-w-0">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold border-b border-line-subtle">
                    <th className="text-left font-semibold px-2 py-2">Contact</th>
                    <th className="text-left font-semibold px-2 py-2">Agent</th>
                    <th className="text-left font-semibold px-2 py-2">Language</th>
                    <th className="text-left font-semibold px-2 py-2">Outcome</th>
                    <th className="text-right font-semibold px-2 py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCalls.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-2 py-8 text-center text-fg-muted text-[11px]">
                        No recent conversations found.
                      </td>
                    </tr>
                  ) : (
                    recentCalls.slice(0, 5).map((c: any) => (
                    <tr key={c.id} className="border-b border-line-subtle hover:bg-bg-muted/60 transition-colors">
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={c.name} colorClass={c.color} size={26} />
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold text-fg-primary truncate leading-tight">
                              {c.name}
                            </div>
                            <div className="text-[10.5px] text-fg-muted truncate">
                              {c.phone} · {new Intl.DateTimeFormat('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              }).format(new Date(c.time))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="h-5 w-5 rounded-full bg-blue-500 text-white text-[10px] font-semibold inline-flex items-center justify-center">
                            {c.agent.charAt(0)}
                          </span>
                          <span className="text-[12px] text-fg-secondary font-medium">{c.agent}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${LANG_STYLES[c.lang] || "bg-slate-100 text-slate-700"}`}>
                          {c.lang}
                        </span>
                      </td>
                      <td className="px-2 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ring-1 ${OUTCOME_STYLES[c.outcome] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>
                          {c.outcome}
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[11.5px] text-fg-secondary font-medium">
                          <Clock className="h-3 w-3 text-fg-muted" />
                          {c.duration}
                        </span>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* ── RIGHT COL: Workflows, Chat Widget, AI Banner ── */}
        <div className="flex flex-col gap-3 min-h-0 h-full">
          {/* Active Agents */}
          <Card className="flex-[3] min-h-0 flex flex-col overflow-hidden">
            <SectionHead
              title="Active agents"
              action={
                <button
                  type="button"
                  onClick={() => navigate(agents.length > 0 ? `/agents/${agents[0].id}/logs` : "/crm")}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <ul className="space-y-2.5">
              {topAgents.length === 0 ? (
                <div className="text-[11px] text-fg-muted py-2">No agent data yet.</div>
              ) : (
                topAgents.slice(0, 2).map((a: any, i: number) => (
                <li key={a.name} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar name={a.name} colorClass={a.color} size={34} />
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-bg-raised border border-line-default text-[9px] font-bold text-fg-secondary flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-semibold text-fg-primary truncate">{a.name}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-attention-500">
                        <Star className="h-3 w-3 fill-attention-500 stroke-attention-500" />
                        {a.rating}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${a.color}`}
                          style={{ width: `${(a.calls / Math.max(1, topAgents[0]?.calls || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-fg-secondary tabular-nums shrink-0">
                        {a.calls}
                      </span>
                    </div>
                    <div className="text-[10px] text-fg-muted mt-0.5">
                      {a.role} · {a.minutes} min
                    </div>
                  </div>
                </li>
                ))
              )}
            </ul>
          </Card>

          {/* Active Workflows */}
          <Card className="flex-[3] min-h-0 flex flex-col overflow-hidden">
            <SectionHead
              title="Active Workflows"
              hint="Automations running"
              action={
                <button
                  type="button"
                  onClick={() => navigate("/workflows")}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <ul className="space-y-4 mt-2">
              {activeWorkflows.length === 0 ? (
                <div className="text-[11px] text-fg-muted py-2">No active workflows yet.</div>
              ) : (
                activeWorkflows.slice(0, 2).map((w: any) => (
                  <li key={w.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Workflow className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[12.5px] font-semibold text-fg-primary">{w.name}</div>
                        <div className="text-[10.5px] text-fg-muted mt-0.5">{w.runsThisWeek} triggered this week</div>
                      </div>
                    </div>
                    <span className="inline-flex h-2 w-2 rounded-full bg-positive-500"></span>
                  </li>
                ))
              )}
            </ul>
          </Card>

          {/* Chat Widget */}
          <Card className="!p-3 flex-[2] min-h-0 flex flex-col justify-center overflow-hidden">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-fg-primary leading-tight">Chat Widget</div>
                <div className="text-[10.5px] text-fg-muted leading-tight">Your AI, on your website</div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/widget")}
                className="h-7 px-3 text-[11px] font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors shrink-0"
              >
                Setup
              </button>
            </div>
            <ul className="mt-2 space-y-1 border-t border-line-subtle pt-2">
              <li className="flex items-start gap-1.5 text-[10.5px] text-fg-secondary leading-snug">
                <span className="mt-[5px] h-1 w-1 rounded-full bg-indigo-400 shrink-0" />
                Visitors chat with the same AI that answers your calls
              </li>
              <li className="flex items-start gap-1.5 text-[10.5px] text-fg-secondary leading-snug">
                <span className="mt-[5px] h-1 w-1 rounded-full bg-indigo-400 shrink-0" />
                Every conversation lands in your CRM as a lead — automatically
              </li>
            </ul>
          </Card>

          {/* WhatsApp Agent */}
          <Card className="!p-3 flex-[2] min-h-0 flex flex-col justify-center overflow-hidden border-emerald-500/25 bg-emerald-50/40">
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-semibold text-fg-primary leading-tight">WhatsApp Agent</div>
                <div className="text-[10.5px] text-fg-muted leading-tight">Same AI brain, on WhatsApp</div>
              </div>
              <span className="rounded-full bg-emerald-100 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700 shrink-0">
                Coming soon
              </span>
            </div>
            <ul className="mt-2 space-y-1 border-t border-emerald-500/15 pt-2">
              <li className="flex items-start gap-1.5 text-[10.5px] text-fg-secondary leading-snug">
                <span className="mt-[5px] h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                Connect your WhatsApp Business number in one click
              </li>
              <li className="flex items-start gap-1.5 text-[10.5px] text-fg-secondary leading-snug">
                <span className="mt-[5px] h-1 w-1 rounded-full bg-emerald-500 shrink-0" />
                Capture leads and reply to customers 24×7
              </li>
            </ul>
          </Card>
        </div>
      </div>
      <OfferPopup navigate={navigate} />
    </PageWrapper>
  );
}

/**
 * Bottom-right offer popup — slides in when the dashboard loads, once per
 * browser session (sessionStorage), dismissible with the close icon.
 */
function OfferPopup({ navigate }: { navigate: (to: string) => void }): React.JSX.Element | null {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (sessionStorage.getItem("offer-popup-dismissed")) return;
    const t = setTimeout(() => setVisible(true), 1200); // let the page settle first
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("offer-popup-dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[400px] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-500 via-brand-600 to-brand-800 p-5 text-white shadow-[0_16px_48px_-12px_rgba(37,99,235,0.55)] border border-brand-400/30">
        <div className="absolute top-0 right-0 p-2 opacity-15 pointer-events-none">
          <Gift className="h-32 w-32 transform rotate-12" />
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss offer"
          className="absolute top-2.5 right-2.5 z-20 h-6 w-6 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="relative z-10 flex flex-col gap-2.5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/10 mb-1.5">
              <Sparkles className="h-2.5 w-2.5 text-amber-300" />
              Limited Time Offer
            </div>
            <h3 className="text-[20px] font-extrabold leading-tight text-white drop-shadow-sm">
              Get 30% Off Pro
            </h3>
            <p className="text-[12px] text-white/75 mt-1.5 leading-relaxed">
              Unlock analytics, workflows, contact timelines and dedicated numbers.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[11px] text-white/60 line-through">₹2,999</span>
              <span className="text-[18px] font-bold text-amber-300">₹2,099/mo</span>
            </div>
            <button
              type="button"
              onClick={() => {
                dismiss();
                navigate("/settings?tab=billing");
              }}
              className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-white text-brand-700 text-[12.5px] font-bold transition-all hover:bg-brand-50 hover:scale-[1.02] shadow-sm"
            >
              Claim discount
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
