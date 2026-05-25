import * as React from "react";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { Badge, Button } from "@antigravity/ui";
import { Phone, MessageSquare, TrendingUp, Users, ArrowUpRight, Plus, Activity as ActivityIcon, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";

export function Dashboard(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);

  // Clean metrics mirroring typical CRM elements
  const metrics = [
    { name: "Total Contacts", value: "1,248", change: "+12% this week", icon: Users, color: "text-[#2563EB]" },
    { name: "Calls Handled (AI)", value: "384", change: "+8% today", icon: Phone, color: "text-[#16A34A]" },
    { name: "Outbound SMS Sent", value: "2,450", change: "+24% this week", icon: MessageSquare, color: "text-[#D97706]" },
    { name: "Active Pipelines", value: "₹4,82,000", change: "18 open deals", icon: TrendingUp, color: "text-[#2563EB]" },
  ];

  // Pre-computed system timeline logs
  const recentActivities = [
    {
      id: "act-1",
      type: "CALL_INBOUND",
      summary: "Inbound call from Ramesh Patel. Transcript analyzed: 'Interested in bulk steel supply'.",
      occurredAt: "2 mins ago",
    },
    {
      id: "act-2",
      type: "WORKFLOW_TRIGGERED",
      summary: "Outbound welcome SMS triggered successfully to contact 'Aisha Sharma'.",
      occurredAt: "15 mins ago",
    },
    {
      id: "act-3",
      type: "DEAL_CREATED",
      summary: "New deal 'Steel Pipeline Supply' created with deal value ₹1,20,000.",
      occurredAt: "1 hour ago",
    },
    {
      id: "act-4",
      type: "NOTE_ADDED",
      summary: "System note appended by AI post-call: Customer requested callback tomorrow.",
      occurredAt: "3 hours ago",
    },
  ];

  return (
    <PageWrapper>
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111111]">
            Welcome back, {user?.name || "Business Owner"}
          </h1>
          <p className="text-xs text-[#666666] mt-1">
            Workspace: <span className="text-[#2563EB] font-semibold">{tenant?.name || "Workspace"}</span> • Isolated tenancy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Secondary Button: bg white, border #E5E5E5, text #111111, height 40px, 6px radius */}
          <Button variant="secondary" className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-10 px-4 rounded-[6px] shadow-none">
            Export Report
          </Button>
          {/* Primary Button: bg #2563EB, text white, hover #1D4ED8, height 40px, 6px radius */}
          <Button variant="primary" className="bg-[#2563EB] text-white font-semibold text-xs h-10 px-4 rounded-[6px] hover:bg-[#1D4ED8] flex items-center gap-2 shadow-none border-none">
            <Plus className="h-4 w-4" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Metrics Row - Card background #F7F7F7, border 1px solid #E5E5E5, radius 6px, padding 24px (p-6) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.name}
              className="rounded-[6px] border border-[#E5E5E5] bg-[#F7F7F7] p-6 hover:bg-[#E5E5E5]/20 transition-all shadow-none"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666]">{m.name}</span>
                <div className={`rounded-[6px] p-1.5 bg-white border border-[#E5E5E5] ${m.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-semibold text-[#111111]">{m.value}</span>
                <span className="flex items-center gap-1 text-[10px] text-[#666666] font-bold mt-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-[#16A34A]" />
                  {m.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid splits for Activity Timeline and System Health */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Timeline block - card styling */}
        <div className="lg:col-span-2 rounded-[6px] border border-[#E5E5E5] bg-white p-6 shadow-none">
          <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-4 mb-6">
            <div className="flex items-center gap-2">
              <ActivityIcon className="h-4.5 w-4.5 text-[#2563EB]" />
              <h3 className="text-base font-semibold text-[#111111]">Unified Activity Timeline</h3>
            </div>
            <Badge variant="primary" className="bg-[#EFF6FF] text-[#2563EB] border-[#EFF6FF]/20 font-bold uppercase text-[9px] tracking-wider px-2 py-0.5 rounded-full shadow-none">
              Auto Sync
            </Badge>
          </div>

          {/* Activities List */}
          <div className="space-y-6">
            {recentActivities.map((act) => (
              <div key={act.id} className="relative flex gap-4 pl-6 before:absolute before:left-[11px] before:top-2.5 before:bottom-[-24px] before:w-[2px] before:bg-[#E5E5E5] last:before:hidden">
                
                {/* Clean circle bullet node */}
                <div className="absolute left-[6px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#2563EB] border-2 border-white z-10" />

                <div className="flex-1 rounded-[6px] border border-[#E5E5E5] bg-white p-4">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider">
                      {act.type.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-[#666666] font-bold">{act.occurredAt}</span>
                  </div>
                  <p className="text-sm text-[#111111] leading-relaxed font-normal">{act.summary}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-[#E5E5E5] pt-4 text-center">
            {/* Ghost Button: no border, no bg, text #666666, hover bg #F7F7F7 */}
            <Button variant="ghost" size="sm" className="text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111] font-semibold text-xs rounded-[6px] h-10 px-4">
              View All 20 items (Next Page cursor: "act-4")
            </Button>
          </div>
        </div>

        {/* Status System blocks */}
        <div className="space-y-6">
          
          {/* Active AI Agent */}
          <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-6 shadow-none">
            <h3 className="text-xs font-bold text-[#666666] border-b border-[#E5E5E5] pb-3 mb-4 uppercase tracking-wider">
              AI Copilot Integration
            </h3>
            <div className="rounded-[6px] bg-[#F7F7F7] p-4 border border-[#E5E5E5] border-dashed">
              <div className="text-sm font-semibold text-[#111111]">Antigravity Support Agent</div>
              <p className="text-xs text-[#666666] mt-1 leading-normal font-normal">
                Extracts custom field parameters and logs timeline entries immediately post-call.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#16A34A]" />
                <span className="text-[10px] font-bold text-[#16A34A] uppercase tracking-wider">Active</span>
              </div>
            </div>
          </div>

          {/* Database & Typesense Status */}
          <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-6 shadow-none">
            <div className="flex items-center gap-2 border-b border-[#E5E5E5] pb-3 mb-4">
              <ShieldCheck className="h-4 w-4 text-[#16A34A]" />
              <h3 className="text-xs font-bold text-[#666666] uppercase tracking-wider">
                Security & Node Status
              </h3>
            </div>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#666666]">PostgreSQL Node</span>
                <span className="text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-0.5 rounded-[6px] border border-[#16A34A]/20 uppercase text-[9px] tracking-wider">Online</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#666666]">Typesense Search Node</span>
                <span className="text-[#16A34A] bg-[#16A34A]/10 px-2.5 py-0.5 rounded-[6px] border border-[#16A34A]/20 uppercase text-[9px] tracking-wider">Online</span>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#666666]">Multi-Tenancy Guard</span>
                <span className="text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-[6px] border border-[#2563EB]/20 uppercase text-[9px] tracking-wider">Strict Isolated</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
export default Dashboard;
