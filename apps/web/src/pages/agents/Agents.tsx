import * as React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { ConfirmModal } from "../../components/common/ConfirmModal.js";
import { PageHeader, AppButton, Segmented, inputClass } from "../../components/common/UI.tsx";
import { api } from "../../lib/axios.js";
import { toast } from "sonner";
import {
  Bot,
  Plus,
  Phone,
  PhoneCall,
  AlertCircle,
  Pencil,
  Activity,
  Trash2,
  Radio,
  Search,
  MessageSquareText,
  MessageCircle,
  ClipboardList,
  Users,
  MoreHorizontal,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  Wand2,
  ArrowRight,
  X,
} from "lucide-react";
import { AgentWizard } from "./components/AgentWizard.js";
import { TestCallModal } from "./components/TestCallModal.js";
import { PurchaseNumberModal } from "./components/PurchaseNumberModal.js";
import type { SerializedAgent } from "@antigravity/types";

type StatusFilter = "all" | "active" | "offline";
type ViewMode = "grid" | "list";

// ─────────────────────────────────────────────────────────────
// Per-agent color palette — deterministic by name
// ─────────────────────────────────────────────────────────────
const PALETTE = [
  { from: "#2563EB", to: "#1D4ED8", soft: "#EFF6FF", softText: "#1D4ED8" },
  { from: "#8B5CF6", to: "#6D28D9", soft: "#F5F3FF", softText: "#6D28D9" },
  { from: "#10B981", to: "#059669", soft: "#ECFDF5", softText: "#047857" },
  { from: "#F59E0B", to: "#D97706", soft: "#FFFBEB", softText: "#B45309" },
  { from: "#EC4899", to: "#DB2777", soft: "#FDF2F8", softText: "#BE185D" },
  { from: "#F97316", to: "#EA580C", soft: "#FFF7ED", softText: "#C2410C" },
  { from: "#06B6D4", to: "#0891B2", soft: "#ECFEFF", softText: "#0E7490" },
  { from: "#6366F1", to: "#4F46E5", soft: "#EEF2FF", softText: "#4338CA" },
];

function colorForAgent() {
  return PALETTE[0]!; // Consistently use primary brand blue
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]!.toUpperCase()).join("") || "IA";
}

function LanguagePill({ language }: { language: string }): React.JSX.Element {
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded text-[10px] font-semibold bg-bg-subtle text-fg-secondary border border-line-subtle">
      {language}
    </span>
  );
}

// Suggested prompts for AI-assisted creation
const AI_PROMPTS = [
  { icon: "💇", label: "Salon receptionist that books appointments in Hindi" },
  { icon: "🏥", label: "Clinic front desk that qualifies patients & schedules visits" },
  { icon: "🏠", label: "Real-estate lead qualifier for property inquiries" },
  { icon: "🛒", label: "E-commerce support agent handling order questions" },
];

// ═════════════════════════════════════════════════════════════
// Page
// ═════════════════════════════════════════════════════════════

export function Agents(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<SerializedAgent | null>(null);
  const [testingAgent, setTestingAgent] = React.useState<SerializedAgent | null>(null);
  const [buyingNumberAgent, setBuyingNumberAgent] = React.useState<SerializedAgent | null>(null);
  const [waAgent, setWaAgent] = React.useState<SerializedAgent | null>(null);
  const [aiOpen, setAiOpen] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState("");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);

  const { data: agents, isLoading, error } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => (await api.get("/agents")).data.data as SerializedAgent[],
  });

  const { data: phoneNumbers = [], refetch: refetchPhoneNumbers } = useQuery({
    queryKey: ["telephony-numbers"],
    queryFn: async () => (await api.get("/agents/telephony/numbers")).data.data as any[],
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => (await api.get("/agents/workflows/list")).data.data as any[],
  });

  const unassignedPhoneNumbers = React.useMemo(() => {
    if (!phoneNumbers || !agents) return phoneNumbers || [];
    return phoneNumbers.filter((p) => {
      if (editingAgent && editingAgent.phoneNumberId === p.id) return true;
      return !agents.some((a) => a.phoneNumberId === p.id && a.id !== editingAgent?.id);
    });
  }, [phoneNumbers, agents, editingAgent]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/agents/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent deleted");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to delete agent"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.put(`/agents/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent status updated");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update status"),
  });

  const waToggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await api.put(`/agents/${id}`, { whatsappEnabled: enabled });
    },
    onSuccess: (_d, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(enabled ? "WhatsApp bot is on — number registration runs automatically" : "WhatsApp bot turned off");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update WhatsApp"),
  });

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const handleOpenCreate = () => { setEditingAgent(null); setIsWizardOpen(true); };
  const handleOpenConfigure = (agent: SerializedAgent) => { setEditingAgent(agent); setIsWizardOpen(true); };

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
    const durations = agents.filter((a) => (a.callsToday || 0) > 0).map((a) => a.avgDuration || 0);
    const avgDuration = durations.length ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;
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
        subtitle={
          <span className="flex items-center gap-2">
            <span>Voice receptionists tuned for Indian markets.</span>
            {agents && agents.length > 0 && (
              <span className="inline-flex items-center gap-1 text-positive-500 font-semibold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-positive-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive-500" />
                </span>
                {stats.active} live
              </span>
            )}
          </span>
        }
        actions={
          agents && agents.length > 0 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12.5px] font-bold text-white transition-all hover:brightness-110"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #2563EB 100%)",
                  boxShadow: "0 4px 12px -4px rgba(139,92,246,0.5)",
                }}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Create with AI
              </button>
              <AppButton
                variant="primary"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={handleOpenCreate}
              >
                New Agent
              </AppButton>
            </div>
          ) : null
        }
      />

      {/* Stats — inline single-line strip, not big tiles */}
      {agents && agents.length > 0 && (
        <div
          className="rounded-lg border bg-white flex items-center gap-3 px-3 py-2 mb-3 overflow-x-auto"
          style={{ borderColor: "#E5E7EB" }}
        >
          <InlineStat icon={Users} label="Agents" value={stats.total.toString()} tint={{ bg: "#EFF6FF", fg: "#2563EB" }} />
          <Divider />
          <InlineStat icon={Radio} label="Live now" value={stats.active.toString()} tint={{ bg: "#ECFDF5", fg: "#059669" }} />
          <Divider />
          <InlineStat icon={PhoneCall} label="Calls today" value={stats.callsToday.toString()} tint={{ bg: "#FEF3C7", fg: "#B45309" }} />
          <Divider />
        </div>
      )}

      {/* Toolbar */}
      {agents && agents.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
            <input
              type="text"
              placeholder="Search agents by name, role, or line…"
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
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-line-default bg-white h-[124px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-negative-500/20 bg-negative-50 p-4 text-[13px] text-negative-500 font-medium flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Error loading agents: {(error as any).message || "Unknown error"}</span>
        </div>
      )}

      {/* Empty state */}
      {agents && agents.length === 0 && (
        <EmptyState onCreate={handleOpenCreate} onAiCreate={() => setAiOpen(true)} />
      )}

      {/* Filtered empty */}
      {agents && agents.length > 0 && filteredAgents.length === 0 && (
        <div className="rounded-lg border border-dashed border-line-strong bg-bg-subtle p-6 text-center">
          <div className="text-[12.5px] font-semibold text-fg-primary">No agents match your filters</div>
          <div className="text-[11px] text-fg-secondary mt-1">
            Try clearing search or switching the status filter.
          </div>
        </div>
      )}

      {/* Grid view */}
      {agents && filteredAgents.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onBuyNumber={() => setBuyingNumberAgent(agent)}
              onWhatsApp={() => setWaAgent(agent)}
              onToggleWhatsApp={(enabled) => waToggleMutation.mutate({ id: agent.id, enabled })}
              onTest={() => setTestingAgent(agent)}
              onConfigure={() => handleOpenConfigure(agent)}
              onLogs={() => navigate(`/agents/${agent.id}/logs`)}
              onDelete={() => handleDelete(agent.id)}
              onToggleActive={(isActive) => toggleMutation.mutate({ id: agent.id, isActive })}
              isToggling={toggleMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {agents && filteredAgents.length > 0 && viewMode === "list" && (
        <div className="rounded-lg border border-line-default bg-white overflow-hidden shadow-card">
          <table className="w-full text-[12.5px]">
            <thead className="bg-bg-subtle border-b border-line-subtle">
              <tr className="text-left">
                <th className="text-[10px] font-bold text-fg-muted uppercase tracking-wider px-3 py-2">Agent</th>
                <th className="text-[10px] font-bold text-fg-muted uppercase tracking-wider px-3 py-2">Line</th>
                <th className="text-[10px] font-bold text-fg-muted uppercase tracking-wider px-3 py-2">Lang</th>
                <th className="text-[10px] font-bold text-fg-muted uppercase tracking-wider px-3 py-2 text-right">Calls</th>
                <th className="text-[10px] font-bold text-fg-muted uppercase tracking-wider px-3 py-2 text-right">Avg</th>
                <th className="text-[10px] font-bold text-fg-muted uppercase tracking-wider px-3 py-2">Status</th>
                <th className="text-[10px] font-bold text-fg-muted uppercase tracking-wider px-3 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent) => {
                const c = colorForAgent();
                return (
                  <tr key={agent.id} className="border-b border-line-subtle last:border-b-0 hover:bg-bg-muted/50 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-7 w-7 rounded-md text-white font-bold text-[10.5px] flex items-center justify-center shrink-0"
                          style={{ background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)` }}
                        >
                          {initialsOf(agent.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-semibold text-fg-primary truncate leading-tight">{agent.name}</div>
                          <div className="text-[10.5px] text-fg-muted truncate">{agent.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {agent.phoneNumberId ? (
                        <div className="inline-flex items-center gap-1 text-[11.5px] text-fg-primary tabular-nums font-medium">
                          <Phone className="h-3 w-3 text-fg-muted" />
                          {agent.phoneNumber}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBuyingNumberAgent(agent);
                          }}
                          className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-dashed border-brand-500/40 bg-brand-50/50 text-brand-600 hover:bg-brand-50 text-[10.5px] font-bold transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          Get number
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2"><LanguagePill language={agent.language} /></td>
                    <td className="px-3 py-2 text-right font-semibold text-fg-primary tabular-nums">{agent.callsToday || 0}</td>
                    <td className="px-3 py-2 text-right text-fg-secondary tabular-nums">{formatDuration(agent.avgDuration || 0)}</td>
                    <td className="px-3 py-2"><StatusPill active={agent.isActive} /></td>
                    <td className="px-3 py-2 text-right">
                      <RowActionsCompact
                        agent={agent}
                        onTest={() => setTestingAgent(agent)}
                        onConfigure={() => handleOpenConfigure(agent)}
                        onLogs={() => navigate(`/agents/${agent.id}/logs`)}
                        onDelete={() => handleDelete(agent.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {testingAgent && (
        <TestCallModal
          agentId={testingAgent.id}
          agentName={testingAgent.name}
          isOpen={!!testingAgent}
          onClose={() => setTestingAgent(null)}
        />
      )}

      {buyingNumberAgent && (
        <PurchaseNumberModal
          agentId={buyingNumberAgent.id}
          agentName={buyingNumberAgent.name}
          onClose={() => setBuyingNumberAgent(null)}
        />
      )}

      {waAgent && (
        <WhatsAppSetupModal agent={waAgent} onClose={() => setWaAgent(null)} />
      )}

      {aiOpen && (
        <AiCreateModal
          prompt={aiPrompt}
          setPrompt={setAiPrompt}
          onClose={() => setAiOpen(false)}
          onFallback={() => {
            setAiOpen(false);
            handleOpenCreate();
          }}
        />
      )}

      <ConfirmModal
        isOpen={deleteTargetId !== null}
        title="Delete agent"
        message="Delete this agent? Any active call handling will stop."
        confirmText="Delete agent"
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId);
          }
        }}
        onClose={() => setDeleteTargetId(null)}
      />
    </PageWrapper>
  );
}

export default Agents;

// ═════════════════════════════════════════════════════════════
// Compact agent card
// ═════════════════════════════════════════════════════════════

interface AgentCardProps {
  agent: SerializedAgent;
  onTest: () => void;
  onConfigure: () => void;
  onLogs: () => void;
  onDelete: () => void;
  onToggleActive: (isActive: boolean) => void;
  isToggling: boolean;
}

function AgentCard({ agent, onTest, onConfigure, onLogs, onDelete, onToggleActive, isToggling, onBuyNumber, onWhatsApp, onToggleWhatsApp }: AgentCardProps & { onBuyNumber: () => void; onWhatsApp: () => void; onToggleWhatsApp: (enabled: boolean) => void }): React.JSX.Element {
  const c = colorForAgent();
  const initials = initialsOf(agent.name);
  const gradient = `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`;

  return (
    <div
      className="group relative rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-line-strong transition-all duration-200 flex flex-col h-full"
      style={{ borderColor: "#E5E7EB" }}
    >
      {/* Top Header Section */}
      <div className="p-4 pb-0 flex items-start justify-between relative">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0 group-hover:scale-105 transition-transform duration-300">
            <div
              className="h-11 w-11 rounded-full text-white font-bold text-[14px] flex items-center justify-center shadow-md ring-2 ring-white"
              style={{ background: gradient }}
            >
              {initials}
            </div>
            {agent.isActive && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-positive-500 ring-2 ring-white shadow-sm" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[14px] font-bold text-fg-primary truncate">{agent.name}</span>
            </div>
            <div className="text-[11.5px] font-medium text-fg-muted truncate mt-0.5">{agent.role}</div>
          </div>
        </div>

        {/* Actions (Toggle & Delete) */}
        <div className="flex items-center gap-1 shrink-0">
          <label className="relative inline-flex items-center cursor-pointer" title="Toggle active status">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={agent.isActive}
              onChange={(e) => onToggleActive(e.target.checked)}
              disabled={isToggling}
            />
            <div className="w-8 h-4 bg-line-default peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line-default after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-positive-500" />
          </label>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 text-fg-muted hover:text-negative-500 hover:bg-negative-50 rounded-md transition-colors shrink-0"
            title="Delete agent"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col relative z-10">
        {/* Meta chips row */}
        <div className="flex items-center gap-1.5 flex-wrap mt-1 mb-4">
          <LanguagePill language={agent.language} />
          {agent.intakeEnabled && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-bg-subtle text-fg-secondary border border-line-subtle">
              <ClipboardList className="h-3 w-3" />
              Intake
            </span>
          )}
          {agent.smsEnabled && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-bg-subtle text-fg-secondary border border-line-subtle">
              <MessageSquareText className="h-3 w-3" />
              SMS
            </span>
          )}
        </div>

        {/* WhatsApp Bot row — a first-class channel control, not a chip */}
        <div className="flex items-center justify-between rounded-lg border bg-bg-subtle border-line-subtle px-2.5 py-2 mb-3 transition-colors">
          <div className="flex items-center gap-1.5 min-w-0">
            <MessageCircle
              className={`h-3.5 w-3.5 shrink-0 ${agent.whatsappEnabled ? "text-emerald-600" : "text-fg-muted"}`}
            />
            <span className="text-[11px] font-bold text-fg-secondary">
              WhatsApp Bot
            </span>
            <span
              className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded ${agent.whatsappEnabled ? "bg-emerald-100 text-emerald-700" : "bg-bg-muted text-fg-muted"
                }`}
            >
              {agent.whatsappEnabled ? "On" : "Off"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWhatsApp();
              }}
              className="text-[10.5px] font-bold text-fg-secondary hover:text-fg-primary underline-offset-2 hover:underline"
            >
              Configure
            </button>
            <label
              className="relative inline-flex items-center cursor-pointer"
              title={
                !agent.phoneNumberId
                  ? "WhatsApp needs a phone number first"
                  : agent.whatsappEnabled
                    ? "Turn WhatsApp bot off"
                    : "Turn WhatsApp bot on"
              }
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                className="sr-only peer"
                checked={agent.whatsappEnabled}
                disabled={!agent.phoneNumberId}
                onChange={(e) => onToggleWhatsApp(e.target.checked)}
              />
              <div className="w-8 h-4 bg-line-default peer-disabled:opacity-40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line-default after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <div className="rounded-lg border border-line-subtle bg-bg-subtle p-2 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[10px] text-fg-muted font-semibold uppercase tracking-wider mb-1">
              <Phone className="h-3 w-3" /> Number
            </div>
            {agent.phoneNumberId ? (
              <span className="text-[12px] font-bold text-fg-primary truncate">{agent.phoneNumber}</span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onBuyNumber();
                }}
                className="text-[11px] font-bold text-brand-600 hover:text-brand-700 text-left"
              >
                + Get number
              </button>
            )}
          </div>
          <div className="rounded-lg border border-line-subtle bg-bg-subtle p-2 flex flex-col justify-center">
            <div className="flex items-center gap-1 text-[10px] text-fg-muted font-semibold uppercase tracking-wider mb-1">
              <Activity className="h-3 w-3" /> Today
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-fg-primary truncate">{agent.callsToday || 0} calls</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 pt-0 mt-auto relative z-10 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTest(); }}
          disabled={!agent.isActive}
          className="col-span-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11.5px] font-bold text-fg-secondary bg-white border border-line-default hover:bg-bg-subtle hover:text-fg-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PhoneCall className="h-3.5 w-3.5" />
          Test Call
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onLogs(); }}
          className="col-span-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11.5px] font-bold text-fg-secondary bg-white border border-line-default hover:bg-bg-subtle hover:text-fg-primary transition-all"
        >
          <ListIcon className="h-3.5 w-3.5" />
          Logs
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConfigure(); }}
          className="col-span-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11.5px] font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] shadow-sm transition-all"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// WhatsApp quick-setup modal
// ═════════════════════════════════════════════════════════════

const SENDER_STATUS_UI: Record<string, { label: string; cls: string; dot: string }> = {
  ONLINE: { label: "WhatsApp number live", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  CREATING: { label: "Registering with WhatsApp…", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  UPDATING: { label: "Updating registration…", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  PENDING_VERIFICATION: { label: "Pending Meta review", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  OFFLINE: { label: "Sender offline — check Twilio Console", cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  NOT_REGISTERED: { label: "Will be registered automatically on save", cls: "bg-bg-muted text-fg-secondary border-line-default", dot: "bg-fg-muted" },
};

function WhatsAppSetupModal({
  agent,
  onClose,
}: {
  agent: SerializedAgent;
  onClose: () => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = React.useState(agent.whatsappEnabled);
  const [prompt, setPrompt] = React.useState(agent.whatsappPrompt ?? "");

  const { data: sender } = useQuery({
    queryKey: ["wa-sender-status", agent.id],
    queryFn: async () => {
      const res = await api.get(`/whatsapp/sender-status/${agent.id}`);
      return res.data.data as { status: string; webhookConfigured: boolean } | null;
    },
    enabled: !!agent.phoneNumberId,
    refetchInterval: 15_000,
  });
  const senderUi = sender ? SENDER_STATUS_UI[sender.status] : undefined;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/agents/${agent.id}`, {
        whatsappEnabled: enabled,
        whatsappPrompt: prompt.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success(enabled ? "WhatsApp bot is on" : "WhatsApp bot turned off");
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to save"),
  });

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-5 py-4 text-white"
          style={{ background: "linear-gradient(135deg, #059669 0%, #10B981 100%)" }}
        >
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/25 backdrop-blur flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold leading-tight">WhatsApp Bot — {agent.name}</div>
              <div className="text-[11.5px] opacity-90 mt-0.5">
                Auto-replies on {agent.phoneNumber || "this agent's number"} using the same persona
                and knowledge base as calls.
              </div>
            </div>
            <button type="button" onClick={onClose} className="opacity-80 hover:opacity-100 transition-opacity p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {!agent.phoneNumberId && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11.5px] text-amber-800 leading-snug">
                This agent has no phone number yet. WhatsApp needs a number — get one from the
                agent card first.
              </p>
            </div>
          )}

          {agent.phoneNumberId && senderUi && (
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${senderUi.cls}`}>
              <span className={`h-2 w-2 rounded-full ${senderUi.dot} ${sender?.status !== "ONLINE" && sender?.status !== "NOT_REGISTERED" ? "animate-pulse" : ""}`} />
              <span className="text-[11.5px] font-semibold">{senderUi.label}</span>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-line-default p-3.5">
            <div>
              <div className="text-[13px] font-semibold text-fg-primary">Enable WhatsApp bot</div>
              <div className="text-[11px] text-fg-muted mt-0.5">
                Replies instantly, remembers the conversation, logs everything to CRM.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <div className="w-10 h-5 bg-line-default rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-line-default after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
            </label>
          </div>

          {enabled && (
            <div>
              <label className="block text-[12px] font-semibold text-fg-primary mb-1">
                Extra instructions <span className="font-normal text-fg-muted">(optional)</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Share our catalog when someone asks about products. For bulk orders, collect quantity and city."
                className="w-full text-[12px] bg-white border border-line-default rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[76px]"
              />
              <p className="text-[10.5px] text-fg-muted mt-1">
                Works out of the box without this — add guidance only if you want channel-specific behavior.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-bg-subtle border-t border-line-subtle flex items-center justify-between">
          <a href="/chats" className="text-[11.5px] font-semibold text-emerald-700 hover:text-emerald-800">
            View chats →
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-lg text-[12px] font-semibold text-fg-secondary hover:bg-bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-8 px-4 rounded-lg text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors shadow-sm"
            >
              {saveMutation.isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ═════════════════════════════════════════════════════════════
// AI Create Modal
// ═════════════════════════════════════════════════════════════

function AiCreateModal({
  prompt,
  setPrompt,
  onClose,
  onFallback,
}: {
  prompt: string;
  setPrompt: (s: string) => void;
  onClose: () => void;
  onFallback: () => void;
}): React.JSX.Element {
  const [generating, setGenerating] = React.useState(false);

  const generate = () => {
    if (!prompt.trim()) {
      toast.error("Describe the agent you want first.");
      return;
    }
    setGenerating(true);
    // Placeholder — real AI generation call goes here
    setTimeout(() => {
      setGenerating(false);
      toast.success("AI is drafting your agent. Opening the wizard so you can review…");
      onFallback();
    }, 900);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient header */}
        <div
          className="relative px-5 py-4 text-white"
          style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 55%, #EC4899 100%)" }}
        >
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/25 backdrop-blur flex items-center justify-center shrink-0">
              <Wand2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-[15px] font-bold leading-tight">Create with AI</div>
              <div className="text-[11.5px] opacity-90 mt-0.5">
                Describe what your agent should do. We'll pick the voice, language, tone & tools.
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="opacity-80 hover:opacity-100 transition-opacity p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-fg-muted mb-2">
            Your prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="e.g. A friendly receptionist for my salon in Pune. Books appointments in Marathi & Hindi. Tells customers about our Diwali offers."
            className={`w-full px-3 py-2.5 rounded-lg border border-line-default bg-white text-[13px] text-fg-primary placeholder:text-fg-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 transition-all outline-none resize-none`}
          />

          <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted mt-4 mb-2">
            Try one of these
          </div>
          <div className="space-y-1.5">
            {AI_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPrompt(p.label)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-line-default bg-bg-subtle hover:bg-bg-muted transition-colors text-left"
              >
                <span className="text-base">{p.icon}</span>
                <span className="text-[12px] text-fg-primary font-medium flex-1">{p.label}</span>
                <ArrowRight className="h-3 w-3 text-fg-muted" />
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onFallback}
              className="text-[11.5px] font-semibold text-fg-secondary hover:text-fg-primary transition-colors"
            >
              Build manually instead
            </button>
            <div className="flex items-center gap-2">
              <AppButton variant="secondary" onClick={onClose} size="sm">
                Cancel
              </AppButton>
              <button
                type="button"
                onClick={generate}
                disabled={generating}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-bold text-white transition-all hover:brightness-110 disabled:opacity-60"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #2563EB 100%)",
                  boxShadow: "0 4px 12px -4px rgba(139,92,246,0.5)",
                }}
              >
                {generating ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate agent
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ═════════════════════════════════════════════════════════════
// Inline stats bar (top compact strip)
// ═════════════════════════════════════════════════════════════

function InlineStat({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tint: { bg: string; fg: string };
}): React.JSX.Element {
  return (
    <div className="inline-flex items-center gap-2 shrink-0">
      <span
        className="h-6 w-6 rounded-md flex items-center justify-center"
        style={{ backgroundColor: tint.bg, color: tint.fg }}
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[13px] font-semibold text-fg-primary tabular-nums leading-none">{value}</span>
        <span className="text-[10.5px] font-medium text-fg-muted uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

function Divider(): React.JSX.Element {
  return <span className="h-4 w-px bg-line-subtle shrink-0" />;
}

function StatusPill({ active }: { active: boolean }): React.JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[9px] font-bold uppercase tracking-wider"
      style={
        active
          ? { backgroundColor: "#DCFCE7", color: "#15803D", boxShadow: "inset 0 0 0 1px rgba(22,163,74,0.25)" }
          : { backgroundColor: "#F1F5F9", color: "#64748B", boxShadow: "inset 0 0 0 1px #E5E7EB" }
      }
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: active ? "#16A34A" : "#94A3B8" }}
      />
      {active ? "Live" : "Off"}
    </span>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }): React.JSX.Element {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg p-1 border"
      style={{ backgroundColor: "#F1F5F9", borderColor: "#E5E7EB" }}
    >
      {[
        { value: "grid" as ViewMode, icon: LayoutGrid },
        { value: "list" as ViewMode, icon: ListIcon },
      ].map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="h-7 w-7 rounded-md flex items-center justify-center transition-all"
            style={
              active
                ? {
                  backgroundColor: "#2563EB",
                  color: "#FFFFFF",
                  boxShadow: "0 1px 2px rgba(37,99,235,0.35), 0 1px 3px rgba(0,0,0,0.08)",
                }
                : { backgroundColor: "transparent", color: "#475569" }
            }
          >
            <opt.icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Empty state
// ═════════════════════════════════════════════════════════════

function EmptyState({ onCreate, onAiCreate }: { onCreate: () => void; onAiCreate: () => void }): React.JSX.Element {
  return (
    <div
      className="relative rounded-2xl overflow-hidden p-8"
      style={{
        background: "linear-gradient(135deg, #EEF2FF 0%, #FDF4FF 55%, #FFF1F2 100%)",
        border: "1px solid rgba(139,92,246,0.2)",
      }}
    >
      <div className="absolute -top-12 -right-8 h-40 w-40 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(236,72,153,0.28)" }} />
      <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: "rgba(99,102,241,0.28)" }} />

      <div className="relative flex flex-col items-center text-center max-w-lg mx-auto">
        <div
          className="h-14 w-14 rounded-2xl text-white flex items-center justify-center shadow-lg mb-3"
          style={{ background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 55%, #EC4899 100%)" }}
        >
          <Bot className="h-7 w-7" />
        </div>
        <h3 className="text-[17px] font-semibold text-fg-primary tracking-tight">
          Deploy your first AI receptionist
        </h3>
        <p className="text-[12.5px] text-fg-secondary mt-1.5 leading-relaxed">
          Answer every customer call in Hindi, Tamil, Bengali, Marathi and 10+ Indian languages, 24 × 7. Or let AI set one up from your prompt.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4">
          {["Hindi", "English", "Tamil", "Marathi", "Bengali", "+6 more"].map((l) => (
            <span
              key={l}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/70 backdrop-blur border border-white/60 text-fg-secondary"
            >
              {l}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-5">
          <button
            type="button"
            onClick={onAiCreate}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-white font-bold text-[12.5px] transition-all hover:brightness-110"
            style={{
              background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #2563EB 100%)",
              boxShadow: "0 8px 20px -6px rgba(139,92,246,0.5)",
            }}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Create with AI
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold border transition-all hover:bg-white"
            style={{ backgroundColor: "rgba(255,255,255,0.7)", borderColor: "#E5E7EB", color: "#0F172A" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Manual setup
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Row actions (list view)
// ═════════════════════════════════════════════════════════════

interface RowActionsProps {
  agent: SerializedAgent;
  onTest: () => void;
  onConfigure: () => void;
  onLogs: () => void;
  onDelete: () => void;
}

function RowActionsCompact({ agent, onTest, onConfigure, onLogs, onDelete }: RowActionsProps): React.JSX.Element {
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={onTest}
        disabled={!agent.isActive}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#F8FAFC", borderColor: "#E5E7EB", color: "#0F172A" }}
      >
        <Radio className="h-3 w-3" />
        Test
      </button>
      <button
        type="button"
        onClick={onConfigure}
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] transition-all"
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
      <ActionMenu
        items={[
          { label: "View call logs", icon: Activity, onClick: onLogs },
          { label: "Delete agent", icon: Trash2, onClick: onDelete, destructive: true },
        ]}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Action menu (portaled kebab)
// ═════════════════════════════════════════════════════════════

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
    const estMenuH = items.length * 34 + 12;
    let top = rect.bottom + MENU_GAP;
    if (top + estMenuH > viewportH - 8) top = Math.max(8, rect.top - MENU_GAP - estMenuH);
    let left = rect.right - MENU_WIDTH;
    if (left + MENU_WIDTH > viewportW - 8) left = viewportW - MENU_WIDTH - 8;
    if (left < 8) left = 8;
    setCoords({ top, left });
  }, [items.length]);

  const handleToggle = () => {
    if (open) setOpen(false);
    else { positionMenu(); setOpen(true); }
  };

  React.useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
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
        className="h-6 w-6 rounded-md flex items-center justify-center transition-colors focus:outline-none shrink-0"
        style={
          open
            ? { backgroundColor: "#F1F5F9", color: "#0F172A" }
            : { backgroundColor: "transparent", color: "#64748B" }
        }
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
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
              backgroundColor: "#FFFFFF",
              boxShadow: "0 12px 28px rgba(15,23,42,0.15)",
              borderRadius: 8,
              border: "1px solid #E5E7EB",
            }}
            className="py-1 animate-in fade-in duration-100"
          >
            {items.map((item, idx) => {
              const Icon = item.icon;
              const isDestructive = item.destructive;
              return (
                <React.Fragment key={item.label}>
                  {isDestructive && idx > 0 && <div className="h-px bg-line-subtle my-1" aria-hidden />}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setOpen(false); item.onClick(); }}
                    disabled={item.disabled}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    style={isDestructive ? { color: "#DC2626" } : { color: "#0F172A" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = isDestructive ? "#FEF2F2" : "#F8FAFC";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
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

// ═════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  const totalSec = Math.round(minutes * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}
