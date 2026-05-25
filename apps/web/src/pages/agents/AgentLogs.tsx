import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { api } from "../../lib/axios.js";
import { ArrowLeft, PhoneCall, MessageSquare, ShieldCheck, Clock, Filter, AlertCircle, Sparkles } from "lucide-react";
import type { SerializedAgent } from "@antigravity/types";

export function AgentLogs(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Filters state
  const [type, setType] = React.useState("ALL");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  // 1. Fetch Agent Profile details
  const { data: agent } = useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      const res = await api.get(`/agents/${id}`);
      return res.data.data as SerializedAgent;
    },
    enabled: !!id,
  });

  // 2. Fetch Agent Communication Logs
  const { data: logs, isLoading, error } = useQuery({
    queryKey: ["agent-logs", id, type, startDate, endDate],
    queryFn: async () => {
      const params: any = {};
      if (type && type !== "ALL") params.type = type;
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(endDate).toISOString();

      const res = await api.get(`/agents/${id}/logs`, { params });
      return res.data.data as any[];
    },
    enabled: !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "DELIVERED":
      case "SENT":
        return "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20";
      case "FAILED":
        return "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20";
      case "IN_PROGRESS":
      case "ANSWERED":
        return "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20";
      default:
        return "bg-[#999999]/10 text-[#666666] border-[#999999]/20";
    }
  };

  const getLogIcon = (logType: string) => {
    if (logType === "CALL") return <PhoneCall className="h-4 w-4 text-[#2563EB]" />;
    return <MessageSquare className="h-4 w-4 text-[#D97706]" />;
  };

  return (
    <PageWrapper>
      {/* Back navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate("/agents")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#666666] hover:text-[#111111] mb-2 focus:outline-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to AI Agents
          </button>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111111]">
            {agent ? `${agent.name} — Logs` : "Agent Interaction Logs"}
          </h1>
          <p className="text-xs text-[#666666] mt-1">
            Browse call transcripts, sentiment scores, and auto-extracted fields scoped to this agent.
          </p>
        </div>
      </div>

      {/* Filter Bar Grid Card */}
      <div className="rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA] p-5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "CALL", "SMS", "WHATSAPP"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-[6px] px-3.5 py-1.5 text-xs font-semibold transition-all border ${
                type === t
                  ? "bg-[#2563EB] text-white border-[#2563EB] shadow-none"
                  : "bg-white text-[#666666] border-[#E5E5E5] hover:text-[#111111]"
              }`}
            >
              {t === "ALL" ? "All Channels" : t}
            </button>
          ))}
        </div>

        {/* Date Filters */}
        <div className="flex items-center gap-3.5 font-sans">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
            <span>From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-[#E5E5E5] text-xs rounded-[6px] h-9 px-2.5 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#111111]">
            <span>To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-[#E5E5E5] text-xs rounded-[6px] h-9 px-2.5 focus:border-[#2563EB] focus:outline-none"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-[#DC2626] font-semibold hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 border border-[#E5E5E5] rounded-[6px] bg-[#F7F7F7] animate-pulse" />
          ))}
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="rounded-[6px] border border-[#DC2626]/20 bg-[#DC2626]/5 p-5 text-center text-sm text-[#DC2626] font-medium max-w-lg mx-auto flex items-center justify-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>Error loading interaction logs: {error.message}</span>
        </div>
      )}

      {/* Empty State */}
      {logs && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] rounded-[8px] bg-[#F7F7F7]/30 py-20 text-center px-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E5E5E5]/40 text-[#666666] mb-4">
            <Filter className="h-7 w-7 text-[#999999]" />
          </div>
          <h3 className="text-base font-semibold text-[#111111]">No logs yet</h3>
          <p className="max-w-xs text-xs text-[#666666] mt-1.5 leading-relaxed font-medium">
            No logs yet. Logs appear here after your agent handles its first interaction.
          </p>
        </div>
      )}

      {/* Logs Listing */}
      {logs && logs.length > 0 && (
        <div className="border border-[#E5E5E5] rounded-[6px] overflow-hidden bg-white">
          <div className="divide-y divide-[#E5E5E5]">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-[#FAFAFA] transition-colors"
              >
                {/* Channel Icon Bubble */}
                <div className="h-9 w-9 rounded-[6px] bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center shrink-0">
                  {getLogIcon(log.type)}
                </div>

                {/* Details info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#111111]">
                        {log.contact?.name || log.contact?.phone || "Unknown Call"}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border text-[9px] font-bold uppercase tracking-wider ${getStatusColor(log.status)}`}>
                        {log.status}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#666666] font-bold">
                      {new Date(log.occurredAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Summary/Transcript Details */}
                  {log.transcript && (
                    <div className="mt-2 text-xs text-[#666666] border-l-2 border-[#E5E5E5] pl-3 py-1 bg-[#F7F7F7]/60 rounded-r-[4px]">
                      <div className="text-[10px] font-bold text-[#999999] uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-[#2563EB]" /> Post-call Transcript Analysis
                      </div>
                      <p className="italic font-normal leading-relaxed text-[#111111]">{log.transcript}</p>
                    </div>
                  )}

                  {log.duration !== null && (
                    <div className="mt-2.5 flex items-center gap-1 text-[11px] text-[#666666] font-semibold">
                      <Clock className="h-3.5 w-3.5 text-[#999999]" />
                      <span>Duration: <span className="text-[#111111]">{log.duration} seconds</span></span>
                    </div>
                  )}

                  {/* AI Field Extractions */}
                  {log.extractedFields && Object.keys(log.extractedFields as object).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(log.extractedFields as object).map(([k, v]) => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#EFF6FF] border border-[#2563EB]/15 text-[10px] font-semibold text-[#2563EB]"
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
export default AgentLogs;
