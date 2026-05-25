import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { TrendingUp, Plus, ArrowLeft, ArrowRight, Layers, Heart } from "lucide-react";
import { Button } from "@antigravity/ui";
import { toast } from "sonner";

interface PipelineTabProps {
  contacts: any[];
  refetchContacts: () => void;
}

const STAGES = [
  "Contacted Us",
  "Prospect Contacted",
  "Visited",
  "Prospect",
  "Application Received",
];

export function PipelineTab({ contacts, refetchContacts }: PipelineTabProps): React.JSX.Element {
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // New Deal form states
  const [contactId, setContactId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [value, setValue] = React.useState("");
  const [stage, setStage] = React.useState(STAGES[0] || "");

  // 1. Fetch Deals
  const { data: deals = [], isLoading, refetch: refetchDeals } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const res = await api.get("/crm/deals");
      return res.data.data as any[];
    },
  });

  // 2. Create Deal Mutation
  const createDealMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/crm/deals", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully registered deal: "${data.title}"`);
      refetchDeals();
      refetchContacts();
      setIsAddOpen(false);
      setTitle("");
      setValue("");
      setContactId("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create deal opportunity");
    },
  });

  // 3. Move Deal Stage Mutation
  const moveDealMutation = useMutation({
    mutationFn: async (payload: { id: string; stage: string }) => {
      const res = await api.put(`/crm/deals/${payload.id}/stage`, { stage: payload.stage });
      return res.data.data;
    },
    onSuccess: () => {
      refetchDeals();
      refetchContacts();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to shift deal stage");
    },
  });

  const handleCreateDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || !title.trim() || !value.trim()) {
      toast.error("Contact, title, and deal value are required");
      return;
    }

    createDealMutation.mutate({
      contactId,
      title: title.trim(),
      value: Number(value),
      stage,
    });
  };

  const handleShiftStage = (dealId: string, currStage: string, direction: "left" | "right") => {
    const currIdx = STAGES.indexOf(currStage);
    if (currIdx === -1) return;
    const nextIdx = direction === "right" ? currIdx + 1 : currIdx - 1;
    if (nextIdx >= 0 && nextIdx < STAGES.length) {
      const targetStage = STAGES[nextIdx];
      if (targetStage) {
        moveDealMutation.mutate({ id: dealId, stage: targetStage });
      }
    }
  };

  // Group deals by stage
  const dealsByStage = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    STAGES.forEach((s) => {
      groups[s] = [];
    });
    deals.forEach((d) => {
      const g = groups[d.stage];
      if (g) {
        g.push(d);
      }
    });
    return groups;
  }, [deals]);

  // Compute stage values
  const stageSums = React.useMemo(() => {
    const sums: Record<string, number> = {};
    STAGES.forEach((s) => {
      const stageDeals = dealsByStage[s] || [];
      sums[s] = stageDeals.reduce((sum, d) => sum + d.value, 0);
    });
    return sums;
  }, [dealsByStage]);

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      
      {/* Search/Filter bar */}
      <div className="flex items-center justify-between shrink-0 mb-4 select-none">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#2563EB]" />
          <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Deals Sales Pipelines
          </span>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setStage(STAGES[0] || "");
            setIsAddOpen(true);
          }}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs h-9 px-3.5 rounded-[6px] flex items-center gap-1.5 border-none shadow-none"
        >
          <Plus className="h-4 w-4" /> Create Deal
        </Button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 flex gap-5 overflow-x-auto pb-4 select-none min-h-0">
        {isLoading ? (
          <div className="flex gap-5 w-full">
            {STAGES.map((_, idx) => (
              <div key={idx} className="w-64 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] shrink-0 p-4 animate-pulse h-48" />
            ))}
          </div>
        ) : (
          STAGES.map((s) => {
            const list = dealsByStage[s] || [];
            const sum = stageSums[s] || 0;

            return (
              <div
                key={s}
                className="w-64 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] shrink-0 flex flex-col justify-between h-full"
              >
                {/* Stage Header */}
                <div className="p-4 border-b border-[#E5E5E5] bg-[#FFFFFF] rounded-t-[6px] shrink-0 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-[#111111] uppercase tracking-wider leading-none">
                      {s}
                    </h4>
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F7F7F7] border border-[#E5E5E5] text-[#666666]">
                      {list.length}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#999999] font-bold tracking-wide uppercase mt-1">
                    Value: <span className="text-[#111111] font-semibold">Rs. {sum.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Cards List container */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0">
                  {list.length === 0 ? (
                    <div className="h-full border border-dashed border-[#E5E5E5] rounded-[6px] flex flex-col items-center justify-center p-6 text-center text-[#999999]">
                      <Layers className="h-6 w-6 text-[#999999]/50 mb-2" />
                      <span className="text-[10px] font-medium leading-normal">Drag or shift deal records here</span>
                    </div>
                  ) : (
                    list.map((d) => (
                      <div
                        key={d.id}
                        className="bg-white border border-[#E5E5E5] rounded-[6px] p-3.5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/40 hover:shadow-[0_2px_8px_rgba(37,99,235,0.03)] transition-all duration-200"
                      >
                        <div>
                          <h5 className="text-xs font-bold text-[#111111] capitalize leading-snug">{d.title}</h5>
                          <span className="text-[10px] font-bold text-[#999999] capitalize tracking-wide block mt-1">
                            Contact: <span className="font-semibold text-[#666666]">{d.contactName}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#F7F7F7] pt-2">
                          <span className="text-xs font-bold text-[#2563EB]">Rs. {d.value.toLocaleString("en-IN")}</span>

                          {/* Click shifts stage controls */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleShiftStage(d.id, d.stage, "left")}
                              disabled={STAGES.indexOf(d.stage) === 0}
                              className="text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111] border border-[#E5E5E5] rounded-[4px] p-1 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShiftStage(d.id, d.stage, "right")}
                              disabled={STAGES.indexOf(d.stage) === STAGES.length - 1}
                              className="text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111] border border-[#E5E5E5] rounded-[4px] p-1 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* QUICK CREATE DEAL POPUP DIALOG */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-none max-w-sm w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="h-4.5 w-4.5 text-[#2563EB]" /> Register Deal Opportunity
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDealSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">Link Contact Record *</label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-3 focus:outline-none"
                  required
                >
                  <option value="">Select contact profile...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.phones?.[0] || "No Line"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">Deal Opportunity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. drew.coleman real estate deal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">Deal Value (Rs.) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="e.g. 589900"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">Initial Stage *</label>
                <select
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-3 focus:outline-none"
                  required
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setIsAddOpen(false)}
                  type="button"
                  className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-4 rounded-[6px]"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={createDealMutation.isPending}
                  className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8]"
                >
                  {createDealMutation.isPending ? "Registering..." : "Create Deal"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
