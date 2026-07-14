import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { PageHeader, AppButton, Segmented, inputClass } from "../../components/common/UI.tsx";
import { api } from "../../lib/axios.js";
import { toast } from "sonner";
import {
  Bot,
  Plus,
  Phone,
  PhoneCall,
  AlertCircle,
  Settings,
  Activity,
  Trash2,
  Radio,
  Search,
  Clock,
  MessageSquareText,
  ClipboardList,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { AgentWizard } from "./components/AgentWizard.js";
import { TestCallModal } from "./components/TestCallModal.js";
import type { SerializedAgent } from "@antigravity/types";

type StatusFilter = "all" | "active" | "offline";

export function Agents(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<SerializedAgent | null>(null);
  const [testingAgent, setTestingAgent] = React.useState<SerializedAgent | null>(null);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");

  const { data: agents, isLoading, error } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get("/agents");
      return res.data.data as SerializedAgent[];
    },
  });

  const { data: phoneNumbers = [], refetch: refetchPhoneNumbers } = useQuery({
    queryKey: ["telephony-numbers"],
    queryFn: async () => {
      const res = await api.get("/agents/telephony/numbers");
      return res.data.data as any[];
    },
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await api.get("/agents/workflows/list");
      return res.data.data as any[];
    },
  });

  const unassignedPhoneNumbers = React.useMemo(() => {
    if (!phoneNumbers || !agents) return phoneNumbers || [];
    return phoneNumbers.filter((p) => {
      if (editingAgent && editingAgent.phoneNumberId === p.id) return true;
      return !agents.some((a) => a.phoneNumberId === p.id && a.id !== editingAgent?.id);
    });
  }, [phoneNumbers, agents, editingAgent]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/agents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete agent");
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this agent? Any active call handling will stop.")) {
      deleteMutation.mutate(id);
    }
  };

  const handleOpenCreate = () => {
    setEditingAgent(null);
    setIsWizardOpen(true);
  };

  const handleOpenConfigure = (agent: SerializedAgent) => {
    setEditingAgent(agent);
    setIsWizardOpen(true);
  };

  const filteredAgents = React.useMemo(() => {
    if (!agents) return [];
    const q = searchQuery.trim().toLowerCase();
    return agents.filter((a) => {
      const matchesSearch =
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        (a.phoneNumber || "").toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && a.isActive) ||
        (statusFilter === "offline" && !a.isActive);
      return matchesSearch && matchesStatus;
    });
  }, [agents, searchQuery, statusFilter]);

  const stats = React.useMemo(() => {
    if (!agents) return { total: 0, active: 0, callsToday: 0, avgDuration: 0 };
    const total = agents.length;
    const active = agents.filter((a) => a.isActive).length;
    const callsToday = agents.reduce((sum, a) => sum + (a.callsToday || 0), 0);
    const durations = agents
      .filter((a) => (a.callsToday || 0) > 0)
      .map((a) => a.avgDuration || 0);
    const avgDuration = durations.length
      ? durations.reduce((s, d) => s + d, 0) / durations.length
      : 0;
    return { total, active, callsToday, avgDuration };
  }, [agents]);

  if (isWizardOpen) {
    return (
      <PageWrapper noScroll={true}>
        <AgentWizard
          editingAgent={editingAgent}
          onClose={() => setIsWizardOpen(false)}
          phoneNumbers={unassignedPhoneNumbers}
          refetchPhoneNumbers={refetchPhoneNumbers}
          workflows={workflows}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title="AI Agents"
        subtitle={<span>Deploy voice receptionists and outreach agents tuned for Indian markets.</span>}
        actions={
          agents && agents.length > 0 ? (
            <AppButton
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              New Agent
            </AppButton>
          ) : null
        }
      />

      {/* Stats strip */}
      {agents && agents.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <StatCard
            icon={Users}
            label="Total agents"
            value={stats.total.toString()}
            hint={`${stats.active} online`}
          />
          <StatCard
            icon={Radio}
            label="Active now"
            value={stats.active.toString()}
            hint={`${stats.total - stats.active} offline`}
            tone="success"
          />
          <StatCard
            icon={PhoneCall}
            label="Calls today"
            value={stats.callsToday.toString()}
            hint="across all agents"
          />
          <StatCard
            icon={Clock}
            label="Avg handle time"
            value={formatDuration(stats.avgDuration)}
            hint="per call"
          />
        </div>
      )}

      {/* Filter strip */}
      {agents && agents.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
            <input
              type="text"
              placeholder="Search agents by name, role, or line..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-9`}
            />
          </div>
          <Segmented
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Offline", value: "offline" },
            ]}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 border border-[#E5E5E5] rounded-[6px] bg-[#F7F7F7]" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-[6px] border border-[#DC2626]/20 bg-[#DC2626]/5 p-4 text-sm text-[#DC2626] font-medium flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Error loading agents list: {(error as any).message || "Unknown error"}</span>
        </div>
      )}

      {/* Empty */}
      {agents && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] rounded-[8px] bg-[#FAFAFA]/50 py-16 text-center px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white border border-[#E5E5E5] text-[#2563EB] mb-3">
            <Bot className="h-7 w-7" />
          </div>
          <h3 className="text-base font-semibold text-[#111111]">No agents yet</h3>
          <p className="max-w-sm text-xs text-[#666666] mt-1.5 leading-relaxed">
            Create your first AI receptionist to start handling calls automatically with
            Hinglish and Indian regional accents.
          </p>
          <div className="mt-5">
            <AppButton
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Create your first agent
            </AppButton>
          </div>
        </div>
      )}

      {/* Filtered empty */}
      {agents && agents.length > 0 && filteredAgents.length === 0 && (
        <div className="rounded-[8px] border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-8 text-center">
          <div className="text-sm font-semibold text-[#111111]">No agents match your filters</div>
          <div className="text-xs text-[#666666] mt-1">
            Try clearing search or switching the status filter.
          </div>
        </div>
      )}

      {/* Table list — desktop */}
      {agents && filteredAgents.length > 0 && (
        <>
          <div className="hidden lg:block bg-white border border-[#E5E5E5] rounded-[8px] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5]">
                <tr className="text-left">
                  <th className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-4 py-3">
                    Agent
                  </th>
                  <th className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-4 py-3">
                    Line
                  </th>
                  <th className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-4 py-3">
                    Language
                  </th>
                  <th className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-4 py-3">
                    Calls today
                  </th>
                  <th className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-4 py-3">
                    Avg
                  </th>
                  <th className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-4 py-3">
                    Automations
                  </th>
                  <th className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-4 py-3">
                    Status
                  </th>
                  <th className="text-[10px] font-bold text-[#666666] uppercase tracking-wider px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent, idx) => (
                  <tr
                    key={agent.id}
                    className={`border-b border-[#F0F0F0] hover:bg-[#FAFAFA]/60 transition-colors ${
                      idx === filteredAgents.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-9 w-9 bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] rounded-[6px] flex items-center justify-center shrink-0">
                          <Bot className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#111111] truncate">
                            {agent.name}
                          </div>
                          <div className="text-[11px] text-[#666666] truncate">{agent.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5 text-xs text-[#111111] tabular-nums font-medium">
                        <Phone className="h-3.5 w-3.5 text-[#999999]" />
                        <span className="truncate">{agent.phoneNumber || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <LanguagePill language={agent.language} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="text-sm font-semibold text-[#111111] tabular-nums">
                        {agent.callsToday || 0}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="text-xs text-[#666666] tabular-nums font-medium">
                        {formatDuration(agent.avgDuration || 0)}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {agent.intakeEnabled && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] px-1.5 py-0.5 rounded"
                            title="Lead intake"
                          >
                            <ClipboardList className="h-3 w-3" />
                            Intake
                          </span>
                        )}
                        {agent.smsEnabled && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] px-1.5 py-0.5 rounded"
                            title="SMS dispatch"
                          >
                            <MessageSquareText className="h-3 w-3" />
                            SMS
                          </span>
                        )}
                        {!agent.intakeEnabled && !agent.smsEnabled && (
                          <span className="text-[11px] text-[#999999]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <StatusPill active={agent.isActive} />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <RowActions
                        agent={agent}
                        onTest={() => setTestingAgent(agent)}
                        onConfigure={() => handleOpenConfigure(agent)}
                        onLogs={() => navigate(`/agents/${agent.id}/logs`)}
                        onDelete={() => handleDelete(agent.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card list — mobile / tablet */}
          <div className="lg:hidden space-y-2">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white border border-[#E5E5E5] rounded-[8px] p-3.5 hover:border-[#2563EB]/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="h-9 w-9 bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] rounded-[6px] flex items-center justify-center shrink-0">
                      <Bot className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#111111] truncate">
                          {agent.name}
                        </span>
                        <StatusPill active={agent.isActive} />
                      </div>
                      <div className="text-[11px] text-[#666666] mt-0.5">{agent.role}</div>
                    </div>
                  </div>
                  <RowActions
                    agent={agent}
                    compact
                    onTest={() => setTestingAgent(agent)}
                    onConfigure={() => handleOpenConfigure(agent)}
                    onLogs={() => navigate(`/agents/${agent.id}/logs`)}
                    onDelete={() => handleDelete(agent.id)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-[#F0F0F0]">
                  <MobileMetric icon={Phone} label="Line" value={agent.phoneNumber || "—"} />
                  <MobileMetric
                    icon={PhoneCall}
                    label="Calls today"
                    value={`${agent.callsToday || 0} · ${formatDuration(agent.avgDuration || 0)}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <LanguagePill language={agent.language} />
                  {agent.intakeEnabled && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] px-1.5 py-0.5 rounded">
                      <ClipboardList className="h-3 w-3" /> Intake
                    </span>
                  )}
                  {agent.smsEnabled && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] px-1.5 py-0.5 rounded">
                      <MessageSquareText className="h-3 w-3" /> SMS
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {testingAgent && (
        <TestCallModal
          agentId={testingAgent.id}
          agentName={testingAgent.name}
          isOpen={!!testingAgent}
          onClose={() => setTestingAgent(null)}
        />
      )}
    </PageWrapper>
  );
}

export default Agents;

/* ---------------- StatCard ---------------- */

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success";
}

function StatCard({ icon: Icon, label, value, hint, tone = "default" }: StatCardProps): React.JSX.Element {
  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[8px] p-3 flex items-start gap-3">
      <div
        className={`h-8 w-8 rounded-[6px] flex items-center justify-center shrink-0 ${
          tone === "success"
            ? "bg-[#DCFCE7] border border-[#16A34A]/20 text-[#15803D]"
            : "bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB]"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">{label}</div>
        <div className="text-lg font-semibold text-[#111111] tabular-nums leading-tight mt-0.5">
          {value}
        </div>
        {hint && <div className="text-[10px] text-[#999999] mt-0.5 font-medium">{hint}</div>}
      </div>
    </div>
  );
}

/* ---------------- StatusPill ---------------- */

function StatusPill({ active }: { active: boolean }): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
        active
          ? "bg-[#DCFCE7] text-[#15803D] border-[#16A34A]/20"
          : "bg-[#FAFAFA] text-[#666666] border-[#E5E5E5]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#16A34A]" : "bg-[#999999]"} ${
          active ? "animate-pulse" : ""
        }`}
      />
      {active ? "Active" : "Offline"}
    </span>
  );
}

function LanguagePill({ language }: { language: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F7F7F7] border border-[#E5E5E5] text-[#666666]">
      {language}
    </span>
  );
}

/* ---------------- Row Actions ---------------- */

interface RowActionsProps {
  agent: SerializedAgent;
  compact?: boolean;
  onTest: () => void;
  onConfigure: () => void;
  onLogs: () => void;
  onDelete: () => void;
}

function RowActions({
  agent,
  compact,
  onTest,
  onConfigure,
  onLogs,
  onDelete,
}: RowActionsProps): React.JSX.Element {
  if (compact) {
    return (
      <ActionMenu
        items={[
          {
            label: "Test call",
            icon: Radio,
            onClick: onTest,
            disabled: !agent.isActive,
          },
          { label: "Configure", icon: Settings, onClick: onConfigure },
          { label: "View call logs", icon: Activity, onClick: onLogs },
          {
            label: "Delete agent",
            icon: Trash2,
            onClick: onDelete,
            destructive: true,
          },
        ]}
      />
    );
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      <button
        type="button"
        onClick={onTest}
        disabled={!agent.isActive}
        className="inline-flex items-center justify-center gap-1.5 h-8 w-[96px] rounded-[6px] text-xs font-semibold bg-white border border-[#E5E5E5] text-[#111111] hover:bg-[#F7F7F7] hover:border-[#2563EB]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
      >
        <Radio className="h-3.5 w-3.5 text-[#666666]" />
        Test
      </button>
      <button
        type="button"
        onClick={onConfigure}
        className="inline-flex items-center justify-center gap-1.5 h-8 w-[96px] rounded-[6px] text-xs font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
      >
        <Settings className="h-3.5 w-3.5" />
        Configure
      </button>
      <ActionMenu
        items={[
          { label: "View call logs", icon: Activity, onClick: onLogs },
          {
            label: "Delete agent",
            icon: Trash2,
            onClick: onDelete,
            destructive: true,
          },
        ]}
      />
    </div>
  );
}

/* ---------------- Action Menu (kebab dropdown) ---------------- */

interface ActionMenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

const MENU_WIDTH = 188;
const MENU_GAP = 6;

function ActionMenu({ items }: { items: ActionMenuItem[] }): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  const positionMenu = React.useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    // Estimated menu height — enough for up to 6 items + divider
    const estMenuH = items.length * 34 + 12;

    let top = rect.bottom + MENU_GAP;
    if (top + estMenuH > viewportH - 8) {
      // Flip above the button when there isn't room below
      top = Math.max(8, rect.top - MENU_GAP - estMenuH);
    }
    let left = rect.right - MENU_WIDTH;
    if (left + MENU_WIDTH > viewportW - 8) left = viewportW - MENU_WIDTH - 8;
    if (left < 8) left = 8;

    setCoords({ top, left });
  }, [items.length]);

  const handleToggle = () => {
    if (open) {
      setOpen(false);
    } else {
      positionMenu();
      setOpen(true);
    }
  };

  React.useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onWinChange = () => setOpen(false);

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onWinChange);
    window.addEventListener("scroll", onWinChange, true);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onWinChange);
      window.removeEventListener("scroll", onWinChange, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        className={`h-8 w-8 rounded-[6px] flex items-center justify-center border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 ${
          open
            ? "bg-[#F7F7F7] border-[#E5E5E5] text-[#111111]"
            : "bg-white border-[#E5E5E5] text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7]"
        }`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {open && coords &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              width: MENU_WIDTH,
              zIndex: 1000,
            }}
            className="bg-white border border-[#E5E5E5] rounded-[8px] shadow-[0_12px_28px_rgba(17,17,17,0.12)] py-1 animate-in fade-in duration-100"
          >
            {items.map((item, idx) => {
              const Icon = item.icon;
              const isDestructive = item.destructive;
              return (
                <React.Fragment key={item.label}>
                  {isDestructive && idx > 0 && (
                    <div className="h-px bg-[#F0F0F0] my-1" aria-hidden />
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      item.onClick();
                    }}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDestructive
                        ? "text-[#DC2626] hover:bg-[#DC2626]/5"
                        : "text-[#111111] hover:bg-[#F7F7F7]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

/* ---------------- Mobile metric row ---------------- */

interface MobileMetricProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function MobileMetric({ icon: Icon, label, value }: MobileMetricProps): React.JSX.Element {
  return (
    <div className="min-w-0">
      <div className="text-[9px] font-bold text-[#999999] uppercase tracking-wider">{label}</div>
      <div className="flex items-center gap-1 text-xs font-semibold text-[#111111] mt-0.5 min-w-0">
        <Icon className="h-3 w-3 text-[#999999] shrink-0" />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const totalSec = Math.round(minutes * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}
