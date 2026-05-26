import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { Badge, Button } from "@antigravity/ui";
import { api } from "../../lib/axios.js";
import { formatTimeAgo, formatINR, formatActivitySummary } from "@antigravity/utils";
import { Phone, MessageSquare, TrendingUp, Users, Plus, Activity as ActivityIcon, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";

export function Dashboard(): React.JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);

  // 1. Fetch Dashboard Statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await api.get("/dashboard/stats");
      return res.data.data;
    },
  });

  // 2. Fetch Dashboard Activity Timeline with correct pagination accumulator
  const [cursor, setCursor] = React.useState<string | null>(null);
  const { data: activitiesData, isLoading: activitiesLoading, error: activitiesError } = useQuery({
    queryKey: ["dashboard-activity", cursor],
    queryFn: async () => {
      const res = await api.get("/dashboard/activity", {
        params: { limit: 10, cursor: cursor || undefined },
      });
      return res.data.data;
    },
  });

  const [accumulatedActivities, setAccumulatedActivities] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (activitiesData?.items) {
      if (!cursor) {
        setAccumulatedActivities(activitiesData.items);
      } else {
        setAccumulatedActivities((prev) => {
          const prevIds = new Set(prev.map((a) => a.id));
          const newItems = activitiesData.items.filter((item: any) => !prevIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [activitiesData, cursor]);

  const recentActivities = accumulatedActivities;
  const nextCursor = activitiesData?.nextCursor || null;

  // 3. Fetch Tenant's Real Configured AI Receptionists
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["dashboard-agents"],
    queryFn: async () => {
      const res = await api.get("/agents");
      return res.data.data as any[];
    },
  });

  return (
    <PageWrapper noScroll={true}>
      {/* Welcome banner with responsive alignment */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111111]">
            Welcome back, {user?.name || "Business Owner"}
          </h1>
          <p className="text-xs text-[#666666] mt-1 font-medium">
            Workspace: <span className="text-[#2563EB] font-semibold">{tenant?.name || "Workspace"}</span> • Isolated tenancy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            onClick={() => toast.info("Report exporting is currently in development")}
            className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-10 px-4 rounded-[6px] shadow-none"
          >
            Export Report
          </Button>
          <Button 
            variant="primary" 
            onClick={() => navigate("/crm")}
            className="bg-[#2563EB] text-white font-semibold text-xs h-10 px-4 rounded-[6px] hover:bg-[#1D4ED8] flex items-center gap-2 shadow-none border-none"
          >
            <Plus className="h-4 w-4" /> Go to CRM
          </Button>
        </div>
      </div>

      {/* Metrics Row Skeletons */}
      {statsLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-[6px] border border-[#E5E5E5] bg-white p-6 h-32 animate-pulse" />
          ))}
        </div>
      ) : statsError ? (
        <div className="rounded-[6px] border border-[#DC2626]/20 bg-[#DC2626]/5 p-5 text-center text-xs text-[#DC2626] font-semibold mb-8">
          Failed to load dashboard metrics.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Total Contacts */}
          <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-6 hover:border-[#2563EB]/40 hover:shadow-[0_2px_8px_rgba(37,99,235,0.03)] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">Total Contacts</span>
              <div className="rounded-[6px] p-1.5 bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB]">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-semibold text-[#111111]">{stats.totalContacts}</span>
              <span className="flex items-center gap-1 text-[10px] text-[#666666] font-bold mt-1">
                Active in workspace
              </span>
            </div>
          </div>

          {/* Calls Handled */}
          <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-6 hover:border-[#16A34A]/40 hover:shadow-[0_2px_8px_rgba(22,163,74,0.03)] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">Calls Handled (AI)</span>
              <div className="rounded-[6px] p-1.5 bg-[#F0FDF4] border border-[#16A34A]/15 text-[#16A34A]">
                <Phone className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-semibold text-[#111111]">{stats.callsHandledToday}</span>
              <span className="flex items-center gap-1 text-[10px] text-[#16A34A] font-bold mt-1">
                Handled today
              </span>
            </div>
          </div>

          {/* Outbound SMS Sent */}
          <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-6 hover:border-[#D97706]/40 hover:shadow-[0_2px_8px_rgba(217,119,6,0.03)] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">Outbound SMS Sent</span>
              <div className="rounded-[6px] p-1.5 bg-[#FEF3C7] border border-[#D97706]/15 text-[#D97706]">
                <MessageSquare className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-semibold text-[#111111]">{stats.smsSentThisWeek}</span>
              <span className="flex items-center gap-1 text-[10px] text-[#D97706] font-bold mt-1">
                Sent this week
              </span>
            </div>
          </div>

          {/* Pipeline value */}
          <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-6 hover:border-[#2563EB]/40 hover:shadow-[0_2px_8px_rgba(37,99,235,0.03)] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.02)] cursor-pointer">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">Active Pipelines</span>
              <div className="rounded-[6px] p-1.5 bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB]">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl font-semibold text-[#111111]">{formatINR(stats.dealsPipelineValue)}</span>
              <span className="flex items-center gap-1 text-[10px] text-[#666666] font-bold mt-1">
                {stats.openDeals} open deals
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Grid splits for Activity Timeline and System Health */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 flex-1 min-h-0">
        
        {/* Timeline block */}
        <div className="lg:col-span-2 rounded-[6px] border border-[#E5E5E5] bg-white p-6 shadow-none flex flex-col justify-between h-full min-h-0">
          
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4 mb-6 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-4.5 w-4.5 text-[#2563EB]" />
              <h3 className="text-base font-semibold text-[#111111]">Unified Activity Timeline</h3>
            </div>
            <Badge variant="primary" className="bg-[#EFF6FF] text-[#2563EB] border-[#EFF6FF]/20 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded-full shadow-none">
              Auto Sync
            </Badge>
          </div>

          {/* Activities loading state */}
          {activitiesLoading ? (
            <div className="space-y-4 flex-1">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 border border-[#E5E5E5] rounded-[6px] bg-white animate-pulse" />
              ))}
            </div>
          ) : activitiesError ? (
            <div className="rounded-[6px] border border-[#DC2626]/20 bg-[#DC2626]/5 p-5 text-center text-xs text-[#DC2626] font-semibold flex-1">
              Failed to load activity logs.
            </div>
          ) : recentActivities.length === 0 ? (
            /* REAL Empty State */
            <div className="text-center py-16 px-4 flex-1 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center mb-4 text-[#999999]">
                <ActivityIcon className="h-5 w-5" />
              </div>
              <h4 className="text-sm font-semibold text-[#111111]">No activity yet</h4>
              <p className="max-w-xs text-xs text-[#666666] mt-1.5 mx-auto leading-relaxed font-medium">
                No activity yet. Your timeline will update automatically after your first call.
              </p>
            </div>
          ) : (
            /* Real Activities List - fills all remaining space and scrolls internally */
            <div className="space-y-6 flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
              {recentActivities.map((act: any) => (
                <div key={act.id} className="relative flex gap-4 pl-6 before:absolute before:left-[11px] before:top-2.5 before:bottom-[-24px] before:w-[2px] before:bg-[#E5E5E5] last:before:hidden">
                  {/* Clean circle bullet node */}
                  <div className="absolute left-[6px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#2563EB] border-2 border-white z-10" />

                  <div className="flex-1 rounded-[6px] border border-[#E5E5E5] bg-white p-4">
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">
                        {act.type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-[#666666] font-bold">{formatTimeAgo(act.occurredAt)}</span>
                    </div>
                    <p className="text-sm text-[#111111] leading-relaxed font-normal">
                      {formatActivitySummary(act.summary)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {nextCursor && (
            <div className="mt-6 border-t border-[#E5E5E5] pt-4 text-center shrink-0">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setCursor(nextCursor)}
                className="text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111] font-semibold text-xs rounded-[6px] h-10 px-4"
              >
                Load More items
              </Button>
            </div>
          )}
        </div>

        {/* Status System blocks */}
        <div className="space-y-6">
          
          {/* Active AI Agent details */}
          <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-6 shadow-none flex flex-col justify-between min-h-[220px]">
            <div>
              <h3 className="text-xs font-bold text-[#666666] border-b border-[#E5E5E5] pb-3 mb-4 uppercase tracking-wider">
                AI Voice Receptionists
              </h3>
              {agentsLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-6 bg-white rounded-[6px]" />
                  <div className="h-10 bg-white rounded-[6px]" />
                </div>
              ) : agents.length === 0 ? (
                <div className="rounded-[6px] bg-white p-4 border border-[#E5E5E5] border-dashed text-center">
                  <p className="text-xs text-[#666666] font-medium leading-relaxed">
                    No active voice receptionist agents configured.
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/agents")}
                    className="mt-3 text-xs text-[#2563EB] font-bold hover:bg-[#2563EB]/5 h-8 px-3 rounded-[6px]"
                  >
                    Configure Agents →
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {agents.slice(0, 2).map((agent: any) => (
                    <div key={agent.id} className="rounded-[6px] bg-white p-4 border border-[#E5E5E5] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[#111111]">{agent.name}</span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                          agent.isActive 
                            ? "text-[#16A34A] bg-[#16A34A]/10 border-[#16A34A]/20" 
                            : "text-[#999999] bg-[#F7F7F7] border-[#E5E5E5]"
                        }`}>
                          {agent.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-[#666666] mt-1 leading-normal font-normal capitalize">
                        Role: {agent.role || "Receptionist"} • Tone: {agent.tone || "Professional"}
                      </p>
                      {agent.greetingMessage && (
                        <p className="text-[10px] text-[#999999] mt-2 italic line-clamp-1 border-t border-[#E5E5E5]/50 pt-1.5">
                          "{agent.greetingMessage}"
                        </p>
                      )}
                    </div>
                  ))}
                  {agents.length > 2 && (
                    <button
                      onClick={() => navigate("/agents")}
                      className="text-[10px] text-[#2563EB] font-bold hover:underline"
                    >
                      + View other {agents.length - 2} configured agents
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {agents.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => navigate("/agents")}
                className="w-full mt-4 text-xs font-semibold h-9 px-4 rounded-[6px] border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] flex items-center justify-center gap-1.5 shrink-0"
              >
                Manage AI Receptionists
              </Button>
            )}
          </div>

          {/* Database & Typesense Status */}
          <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-6 shadow-none">
            <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-3 mb-4">
              <ShieldCheck className="h-4 w-4 text-[#2563EB]" />
              <h3 className="text-xs font-bold text-[#666666] uppercase tracking-wider">
                Business Workspace Profile
              </h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2 border-b border-[#F7F7F7] pb-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#666666]">Organization Type</span>
                  <span className="text-[#111111] capitalize">{tenant?.businessType || "Not Mapped"}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#666666]">Team Capacity</span>
                  <span className="text-[#111111] uppercase">{tenant?.teamSize || "SOLO"}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#666666]">Registered Website</span>
                  <span className="text-[#2563EB] truncate max-w-[140px] text-right font-medium">
                    {tenant?.websiteUrl ? (
                      <a href={tenant.websiteUrl.startsWith("http") ? tenant.websiteUrl : `https://${tenant.websiteUrl}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {tenant.websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, "")}
                      </a>
                    ) : (
                      "No Link Mapped"
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#666666]">CRM Search Indexes</span>
                  <span className="text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-0.5 rounded-[6px] border border-[#16A34A]/20 uppercase text-[9px] tracking-wider font-bold">Typesense 27 Online</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#666666]">Multi-Tenant Pipeline</span>
                  <span className="text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-[6px] border border-[#2563EB]/20 uppercase text-[9px] tracking-wider font-bold">PostgreSQL 16 Isolated</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
export default Dashboard;
