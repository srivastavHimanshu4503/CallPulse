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
  MessageCircle,
} from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";

// ─────────────────────────────────────────────────────────────
// Demo data — replace with real endpoints as they land.
// Chosen to reflect a real Indian SMB (salon / clinic / real-estate)
// so numbers, names and languages feel authentic in review.
// ─────────────────────────────────────────────────────────────

const RECENT_CALLS = [
  { id: "c1", name: "Amit Sharma",     phone: "+91 98765 43210", agent: "Priya", lang: "Hindi",     duration: "3m 42s", outcome: "Booked",     time: "2m ago",  sentiment: "positive", color: "bg-blue-500" },
  { id: "c2", name: "Meera Iyer",      phone: "+91 90000 12345", agent: "Priya", lang: "Tamil",     duration: "1m 58s", outcome: "Hot lead",   time: "12m ago", sentiment: "positive", color: "bg-emerald-500" },
  { id: "c3", name: "Ravi Patel",      phone: "+91 99000 54321", agent: "Kabir", lang: "Gujarati",  duration: "4m 12s", outcome: "Booked",     time: "24m ago", sentiment: "positive", color: "bg-orange-500" },
  { id: "c4", name: "Sneha Deshmukh",  phone: "+91 98111 22222", agent: "Priya", lang: "Marathi",   duration: "2m 30s", outcome: "Follow-up",  time: "48m ago", sentiment: "neutral" , color: "bg-violet-500" },
  { id: "c5", name: "Rohit Verma",     phone: "+91 91234 56789", agent: "Kabir", lang: "Hindi",     duration: "5m 08s", outcome: "Booked",     time: "1h ago",  sentiment: "positive", color: "bg-rose-500" },
  { id: "c6", name: "Anjali Gupta",    phone: "+91 98888 77777", agent: "Neha",  lang: "English",   duration: "1m 15s", outcome: "Hot lead",   time: "1h 15m ago", sentiment: "positive", color: "bg-blue-500" },
  { id: "c7", name: "Vikram Singh",    phone: "+91 99999 88888", agent: "Kabir", lang: "Hindi",     duration: "4m 20s", outcome: "Follow-up",  time: "2h ago", sentiment: "neutral" , color: "bg-emerald-500" },
  { id: "c8", name: "Pooja Reddy",     phone: "+91 97777 66666", agent: "Priya", lang: "Telugu",    duration: "2m 45s", outcome: "Booked",     time: "2h 30m ago", sentiment: "positive", color: "bg-orange-500" },
] as const;

const TOP_AGENTS = [
  { name: "Priya",  role: "Front desk", calls: 128, minutes: 342, rating: 4.9, color: "bg-blue-600" },
  { name: "Kabir",  role: "Bookings",   calls: 87,  minutes: 268, rating: 4.7, color: "bg-indigo-500" },
  { name: "Neha",   role: "Support",    calls: 42,  minutes: 118, rating: 4.6, color: "bg-emerald-500" },
];

const WEEK_CALLS = [42, 58, 71, 63, 89, 34, 27];

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

const Kpi: React.FC<KpiProps> = ({ label, value, delta, hint, icon: Icon, tone, onClick }) => {
  const t = KPI_TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full rounded-xl border border-line-default bg-bg-raised p-4 shadow-card hover:shadow-raised hover:border-line-strong transition-all"
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">{label}</span>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 ${t.icon}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
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
  Gujarati: "bg-pink-100 text-pink-700",
  Marathi:  "bg-violet-100 text-violet-700",
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
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="flex items-end gap-2 h-28">
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

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await api.get("/dashboard/stats")).data.data,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ["dashboard-agents"],
    queryFn: async () => (await api.get("/agents")).data.data as any[],
  });

  const firstName = (user?.name || "there").split(" ")[0];
  const activeAgentCount = agents.filter((a: any) => a.isActive).length || TOP_AGENTS.length;

  const kpis: KpiProps[] = [
    {
      label: "Calls today",
      value: stats?.callsHandledToday ?? 47,
      delta: { pct: 18, direction: "up" },
      hint: "AI answered · 0 missed",
      icon: PhoneCall,
      tone: "positive",
      onClick: () => navigate("/analytics"),
    },
    {
      label: "Leads captured",
      value: stats?.totalContacts ?? 214,
      delta: { pct: 12, direction: "up" },
      hint: "8 hot this week",
      icon: Users,
      tone: "brand",
      onClick: () => navigate("/crm"),
    },
    {
      label: "SMS Sent",
      value: "1,250",
      delta: { pct: 24, direction: "up" },
      hint: "Automated via AI",
      icon: MessageSquare,
      tone: "attention",
      onClick: () => navigate("/crm"),
    },
    {
      label: "Pipeline value",
      value: stats ? formatINR(stats.dealsPipelineValue || 425000) : formatINR(425000),
      delta: { pct: 9, direction: "up" },
      hint: `${stats?.openDeals ?? 12} open deals`,
      icon: TrendingUp,
      tone: "accent",
      onClick: () => navigate("/crm"),
    },
  ];

  return (
    <PageWrapper noScroll={true}>
      {/* ============ HERO ============ */}
      <div className="flex items-center justify-between gap-4 shrink-0 mb-4">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-fg-primary">
            Good to see you, {firstName}
          </h1>
          <p className="text-[12px] text-fg-secondary mt-0.5 truncate flex items-center gap-2">
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
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-line-default bg-white hover:bg-bg-muted text-fg-primary text-[12.5px] font-semibold transition-all"
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
          {/* Weekly volume */}
          <Card>
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
            <div className="grid grid-cols-[1fr_auto] gap-6 items-end">
              <WeekBars data={WEEK_CALLS} />
              <div className="grid grid-cols-3 gap-4 min-w-[260px]">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">Total</div>
                  <div className="text-[18px] font-semibold text-fg-primary mt-0.5">
                    {WEEK_CALLS.reduce((a, b) => a + b, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">Peak day</div>
                  <div className="text-[18px] font-semibold text-brand-600 mt-0.5">Fri · 89</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">Avg call</div>
                  <div className="text-[18px] font-semibold text-fg-primary mt-0.5">2:14</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Recent conversations table */}
          <Card className="flex-1 min-h-[400px] flex flex-col">
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
            <div className="flex-1 min-h-0 overflow-y-auto -mx-1">
              <table className="w-full text-[12px]">
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
                  {RECENT_CALLS.map((c) => (
                    <tr key={c.id} className="border-b border-line-subtle hover:bg-bg-muted/60 transition-colors">
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar name={c.name} colorClass={c.color} size={26} />
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold text-fg-primary truncate leading-tight">
                              {c.name}
                            </div>
                            <div className="text-[10.5px] text-fg-muted truncate">{c.phone} · {c.time}</div>
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
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line-subtle pt-3 pb-1 mt-auto shrink-0 flex justify-center">
              <button
                type="button"
                className="text-[11.5px] font-semibold text-fg-secondary hover:text-fg-primary transition-colors py-1.5 px-4 rounded-md hover:bg-bg-muted"
              >
                Load more calls...
              </button>
            </div>
          </Card>
        </div>

        {/* ── RIGHT COL: Workflows, Chat Widget, AI Banner ── */}
        <div className="flex flex-col gap-3 min-h-0 h-full pb-4">
          {/* Active Agents */}
          <Card>
            <SectionHead
              title="Active agents"
              action={
                <button
                  type="button"
                  onClick={() => navigate("/agents")}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </button>
              }
            />
            <ul className="space-y-2.5">
              {TOP_AGENTS.map((a, i) => (
                <li key={a.name} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar name={a.name} colorClass={a.color} size={34} />
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white border border-line-default text-[9px] font-bold text-fg-secondary flex items-center justify-center">
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
                          style={{ width: `${(a.calls / TOP_AGENTS[0]!.calls) * 100}%` }}
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
              ))}
            </ul>
          </Card>

          {/* Active Workflows */}
          <Card>
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
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Workflow className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[12.5px] font-semibold text-fg-primary">Missed Call Follow-up</div>
                    <div className="text-[10.5px] text-fg-muted mt-0.5">342 triggered this week</div>
                  </div>
                </div>
                <span className="inline-flex h-2 w-2 rounded-full bg-positive-500"></span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[12.5px] font-semibold text-fg-primary">WhatsApp Outreach</div>
                    <div className="text-[10.5px] text-fg-muted mt-0.5">128 active campaigns</div>
                  </div>
                </div>
                <span className="inline-flex h-2 w-2 rounded-full bg-positive-500"></span>
              </li>
            </ul>
          </Card>

          {/* Chat Widget feature */}
          <Card>
            <SectionHead title="Chat Widget" hint="Website integration" />
            <div className="mt-1 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[12px] font-semibold text-fg-primary">Capture leads 24/7</div>
                <div className="text-[11px] text-fg-muted mt-1 leading-relaxed">
                  Embed our AI assistant on your website to instantly chat with visitors.
                </div>
              </div>
              <button
                type="button"
                className="h-8 px-3 text-[11px] font-semibold rounded-md bg-bg-muted hover:bg-line-default text-fg-primary transition-colors"
              >
                Setup
              </button>
            </div>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}

export default Dashboard;
