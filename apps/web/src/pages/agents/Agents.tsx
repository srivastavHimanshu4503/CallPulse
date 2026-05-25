import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { Button } from "@antigravity/ui";
import { api } from "../../lib/axios.js";
import { toast } from "sonner";
import { Bot, Plus, Phone, PhoneCall, AlertCircle, Settings, Activity, Trash2 } from "lucide-react";
import { AgentWizard } from "./components/AgentWizard.js";
import type { SerializedAgent } from "@antigravity/types";

export function Agents(): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Wizard active/inactive states
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);
  const [editingAgent, setEditingAgent] = React.useState<SerializedAgent | null>(null);

  // 1. Fetch AI Agents List
  const { data: agents, isLoading, error } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get("/agents");
      return res.data.data as SerializedAgent[];
    },
  });

  // 2. Fetch Telephony Numbers for the tenant
  const { data: phoneNumbers = [], refetch: refetchPhoneNumbers } = useQuery({
    queryKey: ["telephony-numbers"],
    queryFn: async () => {
      const res = await api.get("/agents/telephony/numbers");
      return res.data.data as any[];
    },
  });

  // 3. Fetch Workflows List for the tenant
  const { data: workflows = [] } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await api.get("/agents/workflows/list");
      return res.data.data as any[];
    },
  });

  // Filter out phone numbers already assigned to OTHER agents
  const unassignedPhoneNumbers = React.useMemo(() => {
    if (!phoneNumbers || !agents) return phoneNumbers || [];
    return phoneNumbers.filter((p) => {
      // Keep it if it is the current editing agent's assigned number
      if (editingAgent && editingAgent.phoneNumberId === p.id) return true;
      // Otherwise, filter out if it is assigned to any active agent
      return !agents.some((a) => a.phoneNumberId === p.id && a.id !== editingAgent?.id);
    });
  }, [phoneNumbers, agents, editingAgent]);

  // 4. Delete Agent Mutation
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
    if (window.confirm("Are you sure you want to delete this agent receptionist? This will stop active handling.")) {
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

  if (isWizardOpen) {
    return (
      <PageWrapper noScroll={true}>
        <div className="mb-4 flex items-center justify-between border-b border-[#E5E5E5] pb-3 shrink-0 select-none">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsWizardOpen(false)}
              className="text-xs font-semibold text-[#666666] hover:text-[#111111] flex items-center gap-1 focus:outline-none transition-colors"
            >
              ← Back
            </button>
            <span className="h-4 w-[1px] bg-[#E5E5E5] shrink-0" />
            <h2 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
              {editingAgent ? "Configure Agent receptionist" : "Deploy new Agent"}
            </h2>
          </div>
        </div>
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
      {/* Header index section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-[#111111]">AI Agents</h1>
            {agents && agents.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/10">
                {agents.length} Total
              </span>
            )}
          </div>
          <p className="text-xs text-[#666666] mt-1">
            Build and deploy automated Twilio voice receptionists and customer outreach agents.
          </p>
        </div>
        <div>
          {agents && agents.length > 0 && (
            <Button
              variant="primary"
              onClick={handleOpenCreate}
              className="bg-[#2563EB] text-white font-semibold text-xs h-10 px-4 rounded-[6px] hover:bg-[#1D4ED8] flex items-center gap-2 border-none shadow-none"
            >
              <Plus className="h-4 w-4" /> New Agent
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 border border-[#E5E5E5] rounded-[6px] bg-[#F7F7F7]" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-[6px] border border-[#DC2626]/20 bg-[#DC2626]/5 p-5 text-center text-sm text-[#DC2626] font-medium leading-relaxed max-w-lg mx-auto mt-12 flex items-center gap-3 justify-center">
          <AlertCircle className="h-5 w-5" />
          <span>Error loading agents list: {error.message || "Unknown error"}</span>
        </div>
      )}

      {agents && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] rounded-[8px] bg-[#F7F7F7]/30 py-20 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E5E5E5]/40 text-[#666666] mb-4">
            <Bot className="h-8 w-8 text-[#999999]" />
          </div>
          <h3 className="text-base font-semibold text-[#111111]">No agents yet</h3>
          <p className="max-w-xs text-xs text-[#666666] mt-1.5 leading-relaxed">
            Create your first Twilio AI receptionist to start handling calls automatically with Hinglish and Indian regional accents.
          </p>
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            className="bg-[#2563EB] text-white font-semibold text-xs h-10 px-6 rounded-[6px] hover:bg-[#1D4ED8] mt-6 shadow-none border-none"
          >
            + Create Agent receptionist
          </Button>
        </div>
      )}

      {agents && agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white border border-[#E5E5E5] rounded-[6px] hover:border-[#2563EB]/40 hover:shadow-[0_2px_8px_rgba(37,99,235,0.03)] transition-all duration-200 flex flex-col justify-between"
            >
              {/* Card Top */}
              <div className="p-5 space-y-4 flex-1">
                {/* Header title & active pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-[#EFF6FF] border border-[#2563EB]/10 text-[#2563EB] rounded-[6px] flex items-center justify-center shrink-0">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wide">{agent.name}</h3>
                      <p className="text-[11px] text-[#666666] font-medium mt-0.5">
                        Role: <span className="font-semibold text-[#111111]">{agent.role}</span>
                      </p>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider select-none border ${
                    agent.isActive
                      ? "bg-[#EFF6FF] text-[#2563EB] border-[#2563EB]/10"
                      : "bg-[#FAFAFA] text-[#666666] border-[#E5E5E5]"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${agent.isActive ? "bg-[#2563EB]" : "bg-[#999999]"}`} />
                    {agent.isActive ? "ACTIVE" : "OFFLINE"}
                  </span>
                </div>

                {/* Details info */}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#F7F7F7]">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider block">Assigned Line</span>
                    <span className="text-xs font-semibold text-[#111111] flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-[#999999]" />
                      {agent.phoneNumber}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider block">Calls Today</span>
                    <span className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
                      <PhoneCall className="h-3.5 w-3.5 text-[#999999]" />
                      {agent.callsToday}
                      <span className="text-[10px] text-[#999999] font-medium">({agent.avgDuration}m avg)</span>
                    </span>
                  </div>
                </div>

                {/* Features Pill */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F7F7F7]">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#FAFAFA] border border-[#E5E5E5] text-[#666666]">
                    {agent.language}
                  </span>
                  {agent.intakeEnabled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#EFF6FF] border border-[#2563EB]/10 text-[#2563EB]">
                      Intake Questionnaire
                    </span>
                  )}
                  {agent.smsEnabled && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#EFF6FF] border border-[#2563EB]/10 text-[#2563EB]">
                      SMS Sequences
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="bg-[#FAFAFA] border-t border-[#E5E5E5] px-5 py-3 rounded-b-[6px] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => handleOpenConfigure(agent)}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs h-8 px-3.5 rounded-[6px] flex items-center gap-1.5 shadow-none border-none"
                  >
                    <Settings className="h-3.5 w-3.5" /> Configure
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/agents/${agent.id}/logs`)}
                    className="bg-white hover:bg-[#F7F7F7] border border-[#E5E5E5] text-[#111111] font-semibold text-xs h-8 px-3.5 rounded-[6px] flex items-center gap-1.5 shadow-none"
                  >
                    <Activity className="h-3.5 w-3.5 text-[#666666]" /> View Logs
                  </Button>
                </div>

                <Button
                  variant="danger"
                  onClick={() => handleDelete(agent.id)}
                  className="bg-white hover:bg-[#DC2626]/5 border border-[#DC2626] text-[#DC2626] font-semibold text-xs h-8 px-3 rounded-[6px] flex items-center gap-1 hover:border-[#DC2626] shadow-none"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}

export default Agents;
