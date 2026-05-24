import * as React from "react";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { Badge, Button } from "@antigravity/ui";
import { Phone, MessageSquare, TrendingUp, Users, ArrowUpRight, Plus } from "lucide-react";

export function Dashboard(): React.JSX.Element {
  // Mock metrics mirroring typical CRM elements
  const metrics = [
    { name: "Total Contacts", value: "1,248", change: "+12% this week", icon: Users, color: "text-primary" },
    { name: "Calls Handled (AI)", value: "384", change: "+8% today", icon: Phone, color: "text-success" },
    { name: "Outbound SMS Sent", value: "2,450", change: "+24% this week", icon: MessageSquare, color: "text-warning" },
    { name: "Active Pipelines", value: "₹4,82,000", change: "18 open deals", icon: TrendingUp, color: "text-primary" },
  ];

  // Mock timeline matching activity layout guidelines
  const recentActivities = [
    {
      id: "act-1",
      type: "CALL_INBOUND",
      summary: "Inbound call from Ramesh Patel. Transcript analyzed: 'Interested in bulk pricing'.",
      occurredAt: "2 mins ago",
      badge: "success",
    },
    {
      id: "act-2",
      type: "WORKFLOW_TRIGGERED",
      summary: "Outbound welcome SMS triggered successfully to contact 'Aisha Sharma'.",
      occurredAt: "15 mins ago",
      badge: "primary",
    },
    {
      id: "act-3",
      type: "DEAL_CREATED",
      summary: "New deal 'Steel Pipeline Supply' created with deal value ₹1,20,000.",
      occurredAt: "1 hour ago",
      badge: "warning",
    },
    {
      id: "act-4",
      type: "NOTE_ADDED",
      summary: "System note appended by AI post-call: Customer requested callback tomorrow.",
      occurredAt: "3 hours ago",
      badge: "secondary",
    },
  ];

  return (
    <PageWrapper>
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-dark">CRM Timeline Dashboard</h1>
          <p className="text-muted mt-1 text-sm">
            Real-time multi-tenant monitoring hub. AI agents active.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2 h-10">
            Export Report
          </Button>
          <Button variant="primary" className="flex items-center gap-2 h-10">
            <Plus className="h-4 w-4" /> Add Contact
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.name}
              className="rounded-xl border border-border-dark bg-surface-dark bg-opacity-40 p-6 hover:border-primary hover:border-opacity-30 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">{m.name}</span>
                <div className={`rounded-lg p-2 bg-black bg-opacity-20 ${m.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold text-text-dark">{m.value}</span>
                <span className="flex items-center gap-1 text-xs text-muted font-medium mt-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-success" />
                  {m.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid splits for Activity Timeline and System Health */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Timeline block */}
        <div className="lg:col-span-2 rounded-xl border border-border-dark bg-surface-dark bg-opacity-30 p-6">
          <div className="flex items-center justify-between border-b border-border-dark pb-4 mb-6">
            <h3 className="text-lg font-bold text-text-dark">Unified Activity Timeline</h3>
            <Badge variant="success">Auto Sync Active</Badge>
          </div>

          {/* Activities List */}
          <div className="space-y-6">
            {recentActivities.map((act) => (
              <div key={act.id} className="relative flex gap-4 pl-6 before:absolute before:left-[11px] before:top-2.5 before:bottom-[-24px] before:w-[2px] before:bg-border-dark last:before:hidden">
                
                {/* Visual Bullet */}
                <div className="absolute left-[5px] top-1.5 h-3.5 w-3.5 rounded-full bg-primary border-[3px] border-background-dark z-10" />

                <div className="flex-1 rounded-lg border border-border-dark bg-black bg-opacity-20 p-4">
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                      {act.type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted font-medium">{act.occurredAt}</span>
                  </div>
                  <p className="text-sm text-text-dark leading-relaxed">{act.summary}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-border-dark pt-4 text-center">
            <Button variant="ghost" size="sm" className="text-primary hover:underline font-medium">
              View All 20 items (Next Page cursor: "act-4")
            </Button>
          </div>
        </div>

        {/* Status System blocks */}
        <div className="space-y-6">
          
          {/* Active AI Agent */}
          <div className="rounded-xl border border-border-dark bg-surface-dark bg-opacity-30 p-6">
            <h3 className="text-base font-bold text-text-dark border-b border-border-dark pb-3 mb-4">
              AI Copilot Integration
            </h3>
            <div className="rounded-lg bg-black bg-opacity-25 p-4 border border-border-dark border-dashed">
              <div className="text-sm font-semibold text-text-dark">Antigravity Hinglish Agent</div>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Extracts custom field parameters and logs timeline entries immediately post inbound call calls.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-ping" />
                <span className="text-xs font-semibold text-success uppercase">Listening</span>
              </div>
            </div>
          </div>

          {/* Database & Typesense Status */}
          <div className="rounded-xl border border-border-dark bg-surface-dark bg-opacity-30 p-6">
            <h3 className="text-base font-bold text-text-dark border-b border-border-dark pb-3 mb-4">
              Infrastructure Node Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">PostgreSQL Database</span>
                <Badge variant="success">Online</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Typesense search v27</span>
                <Badge variant="success">Online</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">JWT Token Expiry</span>
                <Badge variant="secondary">15 Mins / 7 Days</Badge>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
export default Dashboard;
