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
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  Wand2,
  ArrowRight,
  X,
} from "lucide-react";
import { AgentWizard } from "./components/AgentWizard.js";
import { TestCallModal } from "./components/TestCallModal.js";
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

function colorForAgent(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length]!;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]!.toUpperCase()).join("") || "IA";
}

const LANG_HEX: Record<string, { bg: string; fg: string }> = {
  Hindi:    { bg: "#FFEDD5", fg: "#C2410C" },
  Hinglish: { bg: "#FFE4E6", fg: "#BE123C" },
  English:  { bg: "#EFF6FF", fg: "#1D4ED8" },
  Marathi:  { bg: "#EDE9FE", fg: "#6D28D9" },
  Tamil:    { bg: "#D1FAE5", fg: "#047857" },
  Telugu:   { bg: "#FCE7F3", fg: "#BE185D" },
  Bengali:  { bg: "#FFE4E6", fg: "#BE123C" },
  Gujarati: { bg: "#FEF3C7", fg: "#B45309" },
  Kannada:  { bg: "#DCFCE7", fg: "#166534" },
};

function LanguagePill({ language }: { language: string }): React.JSX.Element {
  const c = LANG_HEX[language] || { bg: "#F1F5F9", fg: "#475569" };
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded text-[10px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.fg }}
    >
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
          <InlineStat icon={Users}       label="Agents"       value={stats.total.toString()}        tint={{ bg: "#EFF6FF", fg: "#2563EB" }} />
          <Divider />
          <InlineStat icon={Radio}       label="Live now"     value={stats.active.toString()}       tint={{ bg: "#ECFDF5", fg: "#059669" }} />
          <Divider />
          <InlineStat icon={PhoneCall}   label="Calls today"  value={stats.callsToday.toString()}   tint={{ bg: "#FEF3C7", fg: "#B45309" }} />
          <Divider />
          <InlineStat icon={Clock}       label="Avg handle"   value={formatDuration(stats.avgDuration)} tint={{ bg: "#FDF2F8", fg: "#BE185D" }} />
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
                const c = colorForAgent(agent.name);
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
                      <div className="inline-flex items-center gap-1 text-[11.5px] text-fg-primary tabular-nums font-medium">
                        <Phone className="h-3 w-3 text-fg-muted" />
                        {agent.phoneNumber || "—"}
                      </div>
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

function AgentCard({ agent, onTest, onConfigure, onLogs, onDelete, onToggleActive, isToggling }: AgentCardProps): React.JSX.Element {
  const c = colorForAgent(agent.name);
  const initials = initialsOf(agent.name);
  const gradient = `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)`;

  return (
    <div
      className="group relative rounded-xl border bg-white overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
      style={{ borderColor: "#E5E7EB" }}
    >
      {/* Decorative blurred background blob */}
      <div 
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none transition-opacity group-hover:opacity-40"
        style={{ backgroundColor: c.from }}
      />
      
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
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors"
              style={{ backgroundColor: c.soft, color: c.softText }}
            >
              <ClipboardList className="h-3 w-3" />
              Intake
            </span>
          )}
          {agent.smsEnabled && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors"
              style={{ backgroundColor: c.soft, color: c.softText }}
            >
              <MessageSquareText className="h-3 w-3" />
              SMS
            </span>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <div className="rounded-lg border border-line-subtle bg-bg-subtle p-2 flex flex-col justify-center">
             <div className="flex items-center gap-1 text-[10px] text-fg-muted font-semibold uppercase tracking-wider mb-1">
               <Phone className="h-3 w-3" /> Number
             </div>
             <span className="text-[12px] font-bold text-fg-primary truncate">{agent.phoneNumber || "Unassigned"}</span>
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
          className="col-span-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11.5px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed group/btn hover:brightness-110"
          style={{ backgroundColor: agent.isActive ? c.soft : "#F1F5F9", color: agent.isActive ? c.from : "#94A3B8" }}
        >
          <PhoneCall className="h-3.5 w-3.5 transition-transform group-hover/btn:scale-110" />
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
          className="col-span-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-lg text-[11.5px] font-bold text-white shadow-sm transition-all hover:shadow-md hover:brightness-110"
          style={{ background: gradient }}
        >
          <Settings className="h-3.5 w-3.5" />
          Config
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// AI-create tile (inline in the grid)
// ═════════════════════════════════════════════════════════════

function AiCreateTile({ onClick }: { onClick: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-lg overflow-hidden text-left transition-transform hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #EEF2FF 0%, #FDF4FF 55%, #FFF1F2 100%)",
        border: "1px dashed rgba(139,92,246,0.4)",
      }}
    >
      <div
        className="absolute -top-8 -right-6 h-24 w-24 rounded-full blur-2xl opacity-70 pointer-events-none"
        style={{ backgroundColor: "rgba(236,72,153,0.35)" }}
      />
      <div
        className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full blur-2xl opacity-70 pointer-events-none"
        style={{ backgroundColor: "rgba(99,102,241,0.35)" }}
      />

      <div className="relative p-3">
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-lg text-white flex items-center justify-center shadow-md"
            style={{ background: "linear-gradient(135deg, #8B5CF6 0%, #6366F1 50%, #2563EB 100%)" }}
          >
            <Wand2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-bold text-fg-primary leading-tight">Let AI create it</div>
            <div className="text-[10.5px] text-fg-secondary mt-0.5 leading-tight">Describe your business, we'll set up the agent.</div>
          </div>
        </div>

        <div className="mt-2 space-y-1">
          {AI_PROMPTS.slice(0, 2).map((p) => (
            <div
              key={p.label}
              className="flex items-center gap-1.5 rounded-md bg-white/60 backdrop-blur border border-white/60 px-2 py-1 text-[10.5px] text-fg-secondary"
            >
              <span>{p.icon}</span>
              <span className="truncate italic">"{p.label}"</span>
            </div>
          ))}
        </div>

        <div className="mt-2.5 pt-2 border-t border-white/70 flex items-center justify-between text-[11px] font-bold text-brand-600 group-hover:text-brand-700">
          <span>Start with AI</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
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
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-bold text-white transition-all hover:brightness-110"
        style={{ background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)" }}
      >
        <Settings className="h-3 w-3" />
        Configure
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
