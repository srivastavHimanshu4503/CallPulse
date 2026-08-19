import * as React from "react";
import { createPortal } from "react-dom";
import { RecordingPlayer } from "../../components/common/RecordingPlayer.js";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { ConfirmModal } from "../../components/common/ConfirmModal.js";
import { formatDateTime, formatTime } from "@antigravity/utils";
import { api } from "../../lib/axios.js";
import {
  ArrowLeft,
  Search,
  Filter,
  Phone,
  PhoneCall,
  PhoneForwarded,
  MessageSquare,
  MessageCircle,
  Trash2,
  ShieldCheck,
  Sparkles,
  User,
  FileText,
  PhoneIncoming,
  PhoneOutgoing,
  Activity,
  X,
  ChevronLeft,
} from "lucide-react";
import type { SerializedAgent } from "@antigravity/types";
import { toast } from "sonner";
import { computeLeadScore } from "../../components/ui-ext/index.js";

export function AgentLogs(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [type, setType] = React.useState("ALL");
  const [extractionStatus, setExtractionStatus] = React.useState("ALL");
  const [selectedLog, setSelectedLog] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState<"transcript" | "summary" | "extractions">(
    "transcript",
  );
  const [logToDelete, setLogToDelete] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<"logs" | "chats">("logs");
  const [composeOpen, setComposeOpen] = React.useState(false);
  const [pendingSelectLogId, setPendingSelectLogId] = React.useState<string | null>(null);

  const { data: agent } = useQuery({
    queryKey: ["agent", id],
    queryFn: async () => {
      const res = await api.get(`/agents/${id}`);
      return res.data.data as SerializedAgent;
    },
    enabled: !!id,
  });

  const { data: logs, isLoading } = useQuery({
    queryKey: ["agent-logs", id, type, extractionStatus],
    queryFn: async () => {
      const params: any = {};
      if (type && type !== "ALL") params.type = type;
      if (extractionStatus && extractionStatus !== "ALL")
        params.extractionStatus = extractionStatus;
      const res = await api.get(`/agents/${id}/logs`, { params });
      return res.data.data as any[];
    },
    enabled: !!id,
    // Live-refresh while a WhatsApp conversation is open in the detail pane,
    // so new turns appear without a manual reload.
    refetchInterval: selectedLog?.type === "WHATSAPP" ? 8_000 : false,
  });

  // Chats view: WhatsApp conversations only, refreshed live.
  const { data: waLogs = [] } = useQuery({
    queryKey: ["agent-wa-logs", id],
    queryFn: async () => {
      const res = await api.get(`/agents/${id}/logs`, { params: { type: "WHATSAPP" } });
      return res.data.data as any[];
    },
    enabled: !!id && viewMode === "chats",
    refetchInterval: viewMode === "chats" ? 6_000 : false,
  });

  // Keep the open detail pane in sync with refetched logs (live transcript).
  React.useEffect(() => {
    if (!selectedLog) return;
    const fresh =
      (logs ?? []).find((l: any) => l.id === selectedLog.id) ??
      waLogs.find((l: any) => l.id === selectedLog.id);
    if (fresh && fresh !== selectedLog) setSelectedLog(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, waLogs]);

  // Chats view selection: prefer a just-composed chat, else the newest one.
  React.useEffect(() => {
    if (viewMode !== "chats" || waLogs.length === 0) return;
    if (pendingSelectLogId) {
      const target = waLogs.find((l: any) => l.id === pendingSelectLogId);
      if (target) {
        setSelectedLog(target);
        setPendingSelectLogId(null);
        return;
      }
    }
    if (!selectedLog || selectedLog.type !== "WHATSAPP") setSelectedLog(waLogs[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, waLogs, pendingSelectLogId]);

  // WhatsApp session state — drives the reply box / takeover controls.
  const { data: waSession } = useQuery({
    queryKey: ["wa-session", selectedLog?.id],
    queryFn: async () => {
      const res = await api.get(`/whatsapp/sessions/by-log/${selectedLog.id}`);
      return res.data.data as {
        sessionId: string;
        status: "OPEN" | "PROCESSED";
        humanTakeover: boolean;
      } | null;
    },
    enabled: !!selectedLog?.id && selectedLog?.type === "WHATSAPP",
    refetchInterval: 8_000,
  });

  const [replyText, setReplyText] = React.useState("");
  const invalidateWa = () => {
    queryClient.invalidateQueries({ queryKey: ["agent-logs", id] });
    queryClient.invalidateQueries({ queryKey: ["wa-session", selectedLog?.id] });
  };

  const replyMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/whatsapp/sessions/${waSession!.sessionId}/reply`, {
        message: replyText.trim(),
      });
    },
    onSuccess: () => {
      setReplyText("");
      invalidateWa();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to send reply"),
  });

  const takeoverMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await api.post(`/whatsapp/sessions/${waSession!.sessionId}/takeover`, { enabled });
    },
    onSuccess: (_d, enabled) => {
      toast.success(enabled ? "You've taken over — AI is paused" : "Handed back to AI");
      invalidateWa();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update"),
  });

  const closeSessionMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/whatsapp/sessions/${waSession!.sessionId}/close`);
    },
    onSuccess: () => {
      toast.success("Conversation ended — insights will be processed shortly");
      invalidateWa();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to end conversation"),
  });

  const chatBottomRef = React.useRef<HTMLDivElement | null>(null);
  const turnCount = Array.isArray(selectedLog?.transcriptJson)
    ? selectedLog.transcriptJson.length
    : 0;
  React.useEffect(() => {
    if (viewMode === "chats") chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [viewMode, turnCount, selectedLog?.id]);

  const waSessionControls =
    selectedLog?.type === "WHATSAPP" && waSession ? (
      <div className="rounded-xl border border-border bg-bg-raised shadow-sm p-3">
        {waSession.status === "OPEN" ? (
          <>
            <div className="flex items-center justify-between mb-2.5">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                  waSession.humanTakeover
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full animate-pulse ${
                    waSession.humanTakeover ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
                {waSession.humanTakeover ? "You're replying — AI paused" : "Live — AI replying"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => takeoverMutation.mutate(!waSession.humanTakeover)}
                  disabled={takeoverMutation.isPending}
                  className="text-[11px] font-bold text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-md border border-border hover:bg-surface transition-colors"
                >
                  {waSession.humanTakeover ? "Hand back to AI" : "Take over"}
                </button>
                <button
                  type="button"
                  onClick={() => closeSessionMutation.mutate()}
                  disabled={closeSessionMutation.isPending}
                  className="text-[11px] font-bold text-negative-500 hover:text-negative-600 px-2.5 py-1 rounded-md border border-negative-200 hover:bg-negative-50 transition-colors"
                >
                  End conversation
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && replyText.trim() && !replyMutation.isPending) {
                    replyMutation.mutate();
                  }
                }}
                placeholder="Reply as a human — sending pauses the AI…"
                className="flex-1 h-9 px-3 text-[12.5px] bg-surface/50 border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                type="button"
                onClick={() => replyMutation.mutate()}
                disabled={!replyText.trim() || replyMutation.isPending}
                className="h-9 px-4 rounded-lg text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {replyMutation.isPending ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-[11.5px] text-text-secondary">
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
            Conversation ended — insights extracted to CRM.
          </div>
        )}
      </div>
    ) : null;

  const { data: contactDetails } = useQuery({
    queryKey: ["contact-details", selectedLog?.contactId],
    queryFn: async () => {
      const res = await api.get(`/crm/contacts/${selectedLog?.contactId}`);
      return res.data.data;
    },
    enabled: !!selectedLog?.contactId,
  });

  const contactScore = contactDetails ? computeLeadScore(contactDetails).score : null;

  const deleteMutation = useMutation({
    mutationFn: async (logId: string) => {
      await api.delete(`/agents/${id}/logs/${logId}`);
    },
    onSuccess: () => {
      toast.success("Log deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["agent-logs", id] });
      if (selectedLog?.id === logToDelete) setSelectedLog(null);
      setLogToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete log");
      setLogToDelete(null);
    },
  });

  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(new Set());

  const bulkDeleteMutation = useMutation({
    mutationFn: async (logIds: string[]) => {
      await Promise.all(logIds.map((logId) => api.delete(`/agents/${id}/logs/${logId}`)));
    },
    onSuccess: () => {
      toast.success("Logs deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["agent-logs", id] });
      setSelectedLogIds(new Set());
      if (selectedLog && selectedLogIds.has(selectedLog.id)) setSelectedLog(null);
    },
    onError: () => toast.error("Failed to delete logs"),
  });

  const handleDelete = (e: React.MouseEvent, logId: string) => {
    e.stopPropagation();
    setLogToDelete(logId);
  };

  const filteredLogs = React.useMemo(() => {
    if (!logs) return [];
    return logs.filter((log) => {
      // WhatsApp conversations live in the Chats view, not the call-log list.
      if (log.type === "WHATSAPP") return false;
      if (!searchTerm) return true;
      const name = log.contact?.name || log.contact?.firstName || log.contact?.phones?.[0] || "";
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [logs, searchTerm]);

  // Chats view: sessions grouped per contact — one customer can hold many
  // separate conversations (different asks), so the list nests them.
  const [expandedContactId, setExpandedContactId] = React.useState<string | null>(null);
  const chatsByContact = React.useMemo(() => {
    const groups = new Map<string, any[]>();
    for (const log of waLogs) {
      const key = log.contactId ?? "unknown";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(log);
    }
    return [...groups.entries()]
      .map(([contactId, groupLogs]) => {
        const sorted = [...groupLogs].sort((a, b) =>
          String(b.occurredAt).localeCompare(String(a.occurredAt)),
        );
        return {
          contactId,
          contact: sorted[0].contact,
          logs: sorted,
          lastAt: sorted[0].occurredAt,
          hasLive: sorted.some((l) => l.status === "IN_PROGRESS"),
        };
      })
      .sort((a, b) => String(b.lastAt).localeCompare(String(a.lastAt)));
  }, [waLogs]);

  // Keep the selected conversation's contact group expanded.
  React.useEffect(() => {
    if (viewMode === "chats" && selectedLog?.type === "WHATSAPP" && selectedLog.contactId) {
      setExpandedContactId(selectedLog.contactId);
    }
  }, [viewMode, selectedLog?.id, selectedLog?.contactId, selectedLog?.type]);

  React.useEffect(() => {
    if (!selectedLog && filteredLogs.length > 0) {
      setSelectedLog(filteredLogs[0]);
    }
  }, [filteredLogs, selectedLog]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
      case "DELIVERED":
      case "SENT":
        return "bg-success/10 text-success border-success/20";
      case "FAILED":
        return "bg-error/10 text-error border-error/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const renderChatBubbles = (transcriptJson: any) => {
    if (!transcriptJson || !Array.isArray(transcriptJson) || transcriptJson.length === 0)
      return null;
    // Render strictly in message-time order, whatever order they were stored in.
    const ordered = [...transcriptJson].sort((a: any, b: any) =>
      String(a?.at ?? "").localeCompare(String(b?.at ?? "")),
    );
    return (
      <div className="flex flex-col w-full pb-8">
        {ordered.map((msg, idx) => {
          const isAgent = msg.role === "agent" || msg.role === "assistant";
          const text = msg.text || msg.content || "";
          const name = isAgent
            ? msg.by === "human"
              ? "You"
              : agent?.name || "AI Agent"
            : selectedLog?.contact?.name || selectedLog?.contact?.firstName || "User";
          const time = msg.at ? formatTime(msg.at) : "";

          return (
            <div
              key={idx}
              className={`flex w-full mb-6 ${isAgent ? "justify-start" : "justify-end"}`}
            >
              <div className={`flex flex-col w-[50%] ${isAgent ? "items-start" : "items-end"}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-bold text-text-secondary">{name}</span>
                  {time && <span className="text-[10px] font-medium text-text-muted">{time}</span>}
                </div>
                <div
                  className={`px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                    isAgent
                      ? "bg-bg-raised border border-border text-text-primary rounded-2xl rounded-tl-sm"
                      : "bg-primary text-white rounded-2xl rounded-tr-sm"
                  }`}
                >
                  {text}
                </div>
                {msg.failed && (
                  <div className="mt-1 px-1 text-[10px] font-bold text-amber-600">
                    ⚠ Not delivered
                    {String(msg.errorCode) === "63016"
                      ? " — WhatsApp blocks messages to customers who haven't messaged you in 24h. Ask them to message this number first."
                      : msg.errorCode
                        ? ` (Twilio error ${msg.errorCode})`
                        : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {selectedLog?.metadata?.transfer?.initiated && (
          <div className="flex w-full mb-6 justify-center">
            <div className="bg-slate-100 text-slate-600 text-[11px] font-bold px-3 py-1.5 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5">
              <PhoneForwarded className="h-3 w-3" />
              {selectedLog.metadata.transfer.status === "failed"
                ? `Call transfer to ${selectedLog.metadata.transfer.to} failed or was unanswered.`
                : `Call transferred to ${selectedLog.metadata.transfer.to}`}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageWrapper noScroll>
      <div className="flex-1 flex flex-col min-h-0 bg-bg-raised border border-border rounded-2xl overflow-hidden shadow-sm font-sans text-text-primary">
        {/* Top Header — flex-wrap so it stacks on narrow viewports */}
        <div className="flex-none border-b border-border flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2 lg:py-0 lg:h-14 bg-surface/50 shrink-0 z-10">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate("/agents")}
              className="inline-flex items-center gap-1.5 h-8 px-2 sm:px-2.5 -ml-1 sm:-ml-1.5 rounded-md text-[12.5px] font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-colors shrink-0"
              aria-label="Back to Agents"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Agents</span>
            </button>
            <h1 className="text-sm font-bold text-text-primary tracking-tight truncate hidden md:block">
              {agent ? `${agent.name} — Logs` : "Agent Logs"}
            </h1>
            <div className="flex items-center rounded-lg border border-border bg-bg-raised p-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("logs")}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-7 rounded-md text-[11.5px] font-bold transition-colors ${
                  viewMode === "logs"
                    ? "bg-primary text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <FileText className="h-3 w-3" />
                <span className="hidden xs:inline">Call </span>Logs
              </button>
              <button
                type="button"
                onClick={() => setViewMode("chats")}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-7 rounded-md text-[11.5px] font-bold transition-colors ${
                  viewMode === "chats"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <MessageCircle className="h-3 w-3" />
                <span className="hidden xs:inline">WhatsApp </span>Chats
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!agent?.phoneNumberId) {
                toast.error("This agent needs a phone number first — get one from the agent card.");
                return;
              }
              if (!agent?.whatsappEnabled) {
                toast.error(
                  "Turn on the WhatsApp Bot for this agent first (Agents page → WhatsApp Bot toggle).",
                );
                return;
              }
              setComposeOpen(true);
            }}
            title={
              !agent?.phoneNumberId
                ? "Agent needs a phone number"
                : !agent?.whatsappEnabled
                  ? "Enable the WhatsApp Bot first"
                  : "Start a WhatsApp conversation with any number"
            }
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-lg text-[12px] font-bold transition-colors shadow-sm shrink-0 ${
              agent?.whatsappEnabled && agent?.phoneNumberId
                ? "text-white bg-emerald-600 hover:bg-emerald-700"
                : "text-text-muted bg-surface border border-border cursor-not-allowed"
            }`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New WhatsApp chat</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Split Pane Content */}
        {viewMode === "logs" && (
          <div className="flex-1 flex min-h-0 bg-bg-raised">
            {/* LEFT PANE - INBOX STYLE */}
            <div
              className={`${selectedLog ? "hidden lg:flex" : "flex"} w-full lg:w-[340px] bg-bg-canvas lg:border-r border-border flex-col h-full shrink-0`}
            >
              {/* Search and Filters Header */}
              <div className="p-3 border-b border-border bg-bg-raised flex flex-col gap-2 shrink-0 z-10">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search interactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-surface border border-border rounded-md text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-text-muted"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="flex-1 bg-bg-raised border border-border hover:border-primary/50 rounded-md text-xs px-2 py-1.5 outline-none font-medium text-text-primary transition-colors cursor-pointer"
                  >
                    <option value="ALL">All Channels</option>
                    <option value="CALL">Calls (in & out)</option>
                    <option value="SMS">SMS</option>
                  </select>
                  <select
                    value={extractionStatus}
                    onChange={(e) => setExtractionStatus(e.target.value)}
                    className="flex-1 bg-bg-raised border border-border hover:border-primary/50 rounded-md text-xs px-2 py-1.5 outline-none font-medium text-text-primary transition-colors cursor-pointer"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedLogIds.size > 0 && (
                <div className="px-3 py-2 bg-primary/5 border-b border-border flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {selectedLogIds.size} selected
                  </span>
                  <button
                    onClick={() => bulkDeleteMutation.mutate(Array.from(selectedLogIds))}
                    disabled={bulkDeleteMutation.isPending}
                    className="flex items-center gap-1.5 px-2 py-1 bg-error text-white text-[10px] font-bold rounded shadow-sm hover:bg-error/90 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Selected"}
                  </button>
                </div>
              )}

              {/* Logs List */}
              <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                  <div className="p-3 space-y-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-16 bg-bg-raised shadow-sm animate-pulse rounded-lg border border-border"
                      />
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center text-center h-full">
                    <div className="h-10 w-10 bg-bg-raised rounded-full flex items-center justify-center mb-3 shadow-sm border border-border">
                      <Filter className="h-4 w-4 text-text-muted" />
                    </div>
                    <p className="text-xs font-semibold text-text-primary mb-1">No logs found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {filteredLogs.map((log) => {
                      const name =
                        log.contact?.name ||
                        log.contact?.firstName ||
                        log.contact?.phones?.[0] ||
                        "Unknown";
                      const initial = name.charAt(0).toUpperCase();
                      const intent =
                        log.extractedFields?.intent?.primary || log.extractedFields?.intent;
                      const isSelected = selectedLog?.id === log.id;
                      const direction = log.direction || "INBOUND";
                      const isCall = log.type === "CALL";

                      return (
                        <div
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`group cursor-pointer p-3 transition-all relative ${
                            isSelected
                              ? "bg-active-nav-bg border-l-2 border-l-primary"
                              : "hover:bg-bg-raised bg-transparent border-l-2 border-l-transparent"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Checkbox */}
                              <div
                                className="shrink-0 flex items-center h-8"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedLogIds.has(log.id)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedLogIds);
                                    if (e.target.checked) newSet.add(log.id);
                                    else newSet.delete(log.id);
                                    setSelectedLogIds(newSet);
                                  }}
                                  className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer"
                                />
                              </div>
                              {/* Profile Avatar */}
                              <div
                                className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                                  isSelected
                                    ? "bg-primary text-white"
                                    : "bg-bg-raised border border-border text-primary"
                                }`}
                              >
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <p
                                    className={`text-sm font-bold truncate leading-none ${
                                      isSelected ? "text-primary" : "text-text-primary"
                                    }`}
                                  >
                                    {name}
                                  </p>
                                  {/* Direction Badge */}
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                      direction === "INBOUND"
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-emerald-100 text-emerald-700"
                                    }`}
                                  >
                                    {direction === "INBOUND" ? (
                                      <PhoneIncoming className="h-2 w-2" />
                                    ) : (
                                      <PhoneOutgoing className="h-2 w-2" />
                                    )}
                                    {direction}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-muted">
                                  {isCall ? (
                                    <PhoneCall className="h-3 w-3 text-text-secondary" />
                                  ) : (
                                    <MessageSquare className="h-3 w-3 text-text-secondary" />
                                  )}
                                  <span>{formatTime(log.occurredAt)}</span>
                                  <span>•</span>
                                  <span>{new Date(log.occurredAt).toLocaleDateString()}</span>
                                </div>
                                {log.contact?.phones?.[0] && (
                                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-text-muted">
                                    <Phone className="h-2.5 w-2.5" />
                                    <span>{log.contact.phones[0]}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions / Intent */}
                            <div className="flex flex-col items-end justify-between h-full shrink-0">
                              <button
                                onClick={(e) => handleDelete(e, log.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-error hover:bg-error/10 rounded transition-all absolute top-2 right-2"
                                title="Delete Log"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                              <div className="mt-5">
                                {intent && typeof intent === "string" && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    {intent}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANE - DETAILS */}
            <div
              className={`${selectedLog ? "flex" : "hidden lg:flex"} flex-1 flex-col min-w-0 bg-bg-raised lg:border-l border-border`}
            >
              {!selectedLog ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface/30">
                  <div className="h-12 w-12 bg-bg-raised rounded-full flex items-center justify-center mb-4 shadow-sm border border-border">
                    <Activity className="h-5 w-5 text-primary/50" />
                  </div>
                  <h3 className="text-base font-bold text-text-primary mb-1">
                    No Interaction Selected
                  </h3>
                  <p className="text-xs font-medium text-text-secondary">
                    Select an interaction from the inbox to view details.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  {/* Ultra Thin Detail Header — wraps on narrow viewports */}
                  <div className="px-3 sm:px-5 py-2 border-b border-border bg-surface/30 shrink-0 flex flex-wrap items-start sm:items-center justify-between z-10 relative gap-2">
                    <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(null)}
                        className="lg:hidden h-8 w-8 rounded-md flex items-center justify-center text-text-secondary hover:bg-bg-muted shrink-0"
                        aria-label="Back to inbox"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shrink-0">
                        {(
                          selectedLog.contact?.name ||
                          selectedLog.contact?.firstName ||
                          selectedLog.contact?.phones?.[0] ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-sm font-bold text-text-primary">
                          {selectedLog.contact?.name ||
                            selectedLog.contact?.firstName ||
                            selectedLog.contact?.phones?.[0] ||
                            "Unknown Call"}
                        </h2>
                        {selectedLog.contact?.phones?.[0] && (
                          <>
                            <span className="hidden sm:inline text-border text-xs">|</span>
                            <span className="text-xs font-medium text-text-secondary flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {selectedLog.contact.phones[0]}
                            </span>
                          </>
                        )}
                        <span
                          className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getStatusColor(selectedLog.extractionStatus)}`}
                        >
                          {selectedLog.extractionStatus}
                        </span>
                        <span className="hidden sm:inline text-border text-xs">|</span>
                        <span className="text-xs font-medium text-text-secondary">
                          {formatDateTime(selectedLog.occurredAt)}
                        </span>
                        {selectedLog.duration && (
                          <>
                            <span className="hidden sm:inline text-border text-xs">|</span>
                            <span className="text-xs font-medium text-text-secondary">
                              {selectedLog.metadata?.transfer?.initiated
                                ? `AI ${selectedLog.duration}s`
                                : `${selectedLog.duration}s`}
                            </span>
                          </>
                        )}
                        {selectedLog.metadata?.transfer?.initiated && (
                          <>
                            <span className="hidden sm:inline text-border text-xs">|</span>
                            <span className="text-xs font-medium text-text-secondary flex items-center gap-1">
                              <PhoneForwarded className="h-3 w-3" />
                              {selectedLog.metadata.transfer.status === "failed"
                                ? `Transfer to ${selectedLog.metadata.transfer.to} not answered`
                                : `Transferred → ${selectedLog.metadata.transfer.to}`}
                              {Number(selectedLog.metadata.transfer.durationSeconds) > 0 &&
                                ` · ${selectedLog.metadata.transfer.durationSeconds}s`}
                              {selectedLog.metadata.transfer.simulated && " (test)"}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {selectedLog.contactId && (
                        <button
                          onClick={() => navigate(`/crm/contacts/${selectedLog.contactId}`)}
                          className="px-2.5 py-1 bg-bg-raised border border-border hover:border-primary/50 hover:text-primary text-[10px] font-bold text-text-primary rounded transition-all flex items-center gap-1.5 shadow-sm"
                          title="View contact in CRM"
                        >
                          <User className="h-3 w-3" />
                          <span className="hidden md:inline">View contact in CRM</span>
                          <span className="md:hidden">CRM</span>
                        </button>
                      )}
                      {selectedLog.activities?.some((a: any) => a.type === "DEAL_CREATED") && (
                        <button className="px-2.5 py-1 bg-success text-white hover:bg-success/90 text-[10px] font-bold rounded transition-all flex items-center gap-1.5 shadow-sm">
                          <FileText className="h-3 w-3" /> Deal
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tabs Navigation — horizontal scroll on narrow viewports */}
                  <div className="flex items-center px-3 sm:px-5 bg-bg-raised border-b border-border shrink-0 overflow-x-auto no-scrollbar">
                    <button
                      onClick={() => setActiveTab("transcript")}
                      className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === "transcript" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                    >
                      Transcript
                    </button>
                    <button
                      onClick={() => setActiveTab("summary")}
                      className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === "summary" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                    >
                      <span className="hidden sm:inline">AI </span>Summary
                      <span className="hidden sm:inline"> &amp; Score</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("extractions")}
                      className={`px-3 sm:px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${activeTab === "extractions" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                    >
                      <span className="hidden sm:inline">Extracted Data</span>
                      <span className="sm:hidden">Extracted</span>
                      <Sparkles className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Call recording — streams via a short-lived signed URL */}
                  {selectedLog.recordingUrl && (
                    <div className="px-5 py-2.5 border-b border-border bg-surface/40 shrink-0 flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary shrink-0">
                        Recording
                      </span>
                      <div className="flex-1 min-w-0">
                        <RecordingPlayer
                          logId={selectedLog.id}
                          fallbackDuration={selectedLog.duration}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tab Content Area */}
                  <div className="flex-1 overflow-y-auto w-full bg-bg-raised">
                    <div className="w-full h-full p-6">
                      <div className="w-full">
                        {/* TRANSCRIPT TAB */}
                        {activeTab === "transcript" && (
                          <div className="w-full h-full">
                            {renderChatBubbles(selectedLog.transcriptJson) ? (
                              renderChatBubbles(selectedLog.transcriptJson)
                            ) : selectedLog.transcript ? (
                              <p className="text-[14px] text-text-primary whitespace-pre-wrap leading-relaxed">
                                {selectedLog.transcript}
                              </p>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center py-20 bg-surface/30 border border-border rounded-xl shadow-sm">
                                <MessageSquare className="h-8 w-8 text-border mb-3" />
                                <p className="text-sm font-semibold text-text-secondary">
                                  No transcript recorded
                                </p>
                              </div>
                            )}

                            {waSessionControls}
                          </div>
                        )}

                        {/* SUMMARY & SCORE TAB */}
                        {activeTab === "summary" && (
                          <div className="space-y-4">
                            <div className="bg-bg-raised border border-border rounded-xl p-5 shadow-sm">
                              <h3 className="text-xs font-bold text-text-primary mb-3 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                Conversation Summary
                              </h3>
                              {selectedLog.extractedFields?.summary ? (
                                <p className="text-sm text-text-secondary leading-relaxed">
                                  {selectedLog.extractedFields.summary}
                                </p>
                              ) : (
                                <p className="text-xs text-text-muted italic text-center py-4">
                                  No summary generated yet. The AI is still processing this call.
                                </p>
                              )}
                            </div>

                            <div className="bg-bg-raised border border-border rounded-xl p-5 shadow-sm">
                              <h3 className="text-xs font-bold text-text-primary mb-3 flex items-center gap-1.5">
                                <Activity className="h-3.5 w-3.5 text-success" />
                                Lead Score
                              </h3>
                              {contactScore !== null && contactScore !== undefined ? (
                                <div className="flex items-center gap-4">
                                  <div className="h-16 w-16 rounded-full bg-success/10 border-4 border-success flex items-center justify-center shrink-0 shadow-inner">
                                    <span className="text-xl font-black text-success">
                                      {contactScore}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-text-primary mb-0.5">
                                      Qualifying Score
                                    </p>
                                    <p className="text-xs text-text-secondary">
                                      Based on caller intent, duration, and AI analysis.
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-text-muted italic text-center py-4">
                                  Score not available yet.
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* EXTRACTIONS TAB */}
                        {activeTab === "extractions" && (
                          <div className="bg-bg-raised border border-border rounded-xl p-5 shadow-sm">
                            <h3 className="text-xs font-bold text-text-primary mb-4 flex items-center gap-1.5">
                              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                              Extracted CRM Fields
                            </h3>
                            {selectedLog.extractedFields &&
                            Object.keys(selectedLog.extractedFields).filter((k) => k !== "summary")
                              .length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(selectedLog.extractedFields)
                                  .filter(([k]) => k !== "summary")
                                  .map(([k, v]) => (
                                    <div
                                      key={k}
                                      className="p-3 bg-surface/50 border border-border/50 rounded-lg hover:border-primary/30 transition-colors"
                                    >
                                      <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1">
                                        {k.replace(/_/g, " ")}
                                      </p>
                                      <p className="text-sm font-semibold text-text-primary break-words">
                                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                      </p>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-center py-10">
                                <ShieldCheck className="h-6 w-6 text-border mx-auto mb-2" />
                                <p className="text-xs font-semibold text-text-secondary">
                                  No data extracted
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CHATS VIEW — WhatsApp inbox for this agent */}
        {viewMode === "chats" && (
          <div className="flex-1 flex min-h-0 bg-bg-raised">
            {/* Conversation list */}
            <div
              className={`${selectedLog?.type === "WHATSAPP" ? "hidden lg:flex" : "flex"} w-full lg:w-[300px] bg-bg-canvas lg:border-r border-border flex-col h-full shrink-0`}
            >
              <div className="px-3 py-2.5 border-b border-border bg-bg-raised flex items-center justify-between shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  Customers ({chatsByContact.length})
                </span>
                <span className="text-[10px] text-text-muted">{waLogs.length} chats</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chatsByContact.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                    <MessageCircle className="h-8 w-8 text-border mb-2" />
                    <div className="text-[12.5px] font-semibold text-text-primary">
                      No chats yet
                    </div>
                    <div className="text-[11px] text-text-muted mt-1">
                      Start one with "New WhatsApp chat" or wait for a customer message.
                    </div>
                  </div>
                ) : (
                  chatsByContact.map((group) => {
                    const name =
                      group.contact?.name ||
                      group.contact?.firstName ||
                      group.contact?.phones?.[0] ||
                      "Unknown";
                    const expanded = expandedContactId === group.contactId;
                    return (
                      <div key={group.contactId} className="border-b border-border/60">
                        {/* Customer row */}
                        <button
                          type="button"
                          onClick={() => setExpandedContactId(expanded ? null : group.contactId)}
                          className="w-full text-left px-3 py-2.5 hover:bg-surface transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="relative shrink-0">
                              <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <User className="h-4 w-4" />
                              </div>
                              {group.hasLive && (
                                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-bg-raised animate-pulse" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-[12.5px] font-semibold text-text-primary truncate">
                                  {name}
                                </span>
                                <span className="text-[10px] text-text-muted shrink-0">
                                  {formatTime(group.lastAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-px">
                                  {group.logs.length} conversation
                                  {group.logs.length === 1 ? "" : "s"}
                                </span>
                                <span className="text-[10.5px] text-text-muted truncate">
                                  {group.contact?.phones?.[0] || ""}
                                </span>
                              </div>
                            </div>
                            <span
                              className={`text-text-muted text-[10px] transition-transform ${expanded ? "rotate-90" : ""}`}
                            >
                              ▶
                            </span>
                          </div>
                        </button>

                        {/* Nested conversations — one per session/ask */}
                        {expanded &&
                          group.logs.map((log: any, i: number) => {
                            const live = log.status === "IN_PROGRESS";
                            return (
                              <button
                                key={log.id}
                                type="button"
                                onClick={() => setSelectedLog(log)}
                                className={`w-full text-left pl-[52px] pr-3 py-2 border-t border-border/40 transition-colors ${
                                  selectedLog?.id === log.id
                                    ? "bg-emerald-50/80"
                                    : "bg-bg-raised hover:bg-surface"
                                }`}
                              >
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className="flex items-center gap-1.5 min-w-0">
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                        live ? "bg-emerald-500 animate-pulse" : "bg-border"
                                      }`}
                                    />
                                    <span className="text-[11px] font-semibold text-text-primary truncate">
                                      {live
                                        ? "Live conversation"
                                        : `Conversation ${group.logs.length - i}`}
                                    </span>
                                  </span>
                                  <span className="text-[9.5px] text-text-muted shrink-0">
                                    {formatDateTime(log.occurredAt)}
                                  </span>
                                </div>
                                <div className="text-[10.5px] text-text-secondary truncate mt-0.5 pl-3">
                                  {log.body || "…"}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Thread */}
            <div
              className={`${selectedLog?.type === "WHATSAPP" ? "flex" : "hidden lg:flex"} flex-1 flex-col min-h-0 bg-[#F7F5F1]`}
            >
              {selectedLog?.type === "WHATSAPP" ? (
                <>
                  <div className="h-12 shrink-0 bg-bg-raised border-b border-border flex items-center px-4 gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12.5px] font-semibold text-text-primary truncate">
                        {selectedLog.contact?.name || selectedLog.contact?.firstName || "Unknown"}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {selectedLog.contact?.phones?.[0] || ""}
                      </div>
                    </div>
                    <span
                      className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wide ${
                        selectedLog.status === "IN_PROGRESS"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-surface text-text-secondary border border-border"
                      }`}
                    >
                      {selectedLog.status === "IN_PROGRESS" ? "Live" : "Ended"}
                    </span>
                    {selectedLog.contactId && (
                      <a
                        href={`/crm/contacts/${selectedLog.contactId}`}
                        className="ml-auto text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        View in CRM →
                      </a>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {renderChatBubbles(selectedLog.transcriptJson) ?? (
                      <div className="text-center text-[12px] text-text-muted py-16">
                        No messages yet
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>
                  {/* Reply bar pinned to the bottom, like a real chat app */}
                  <div className="shrink-0 px-4 pb-3 pt-1 bg-[#F7F5F1]">{waSessionControls}</div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  <MessageCircle className="h-10 w-10 text-border mb-3" />
                  <div className="text-[13px] font-semibold text-text-primary">
                    Select a conversation
                  </div>
                  <div className="text-[11.5px] text-text-muted mt-1">
                    Read the chat, take over from the AI, or reply yourself.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {composeOpen && id && (
        <ComposeWhatsAppModal
          agentId={id}
          onClose={() => setComposeOpen(false)}
          onSent={(logId) => {
            setComposeOpen(false);
            setViewMode("chats");
            setPendingSelectLogId(logId);
            queryClient.invalidateQueries({ queryKey: ["agent-wa-logs", id] });
            queryClient.invalidateQueries({ queryKey: ["agent-logs", id] });
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!logToDelete}
        title="Delete Interaction Log"
        message="Are you sure you want to permanently delete this log? This action cannot be undone."
        confirmText="Delete Log"
        isDestructive={true}
        onConfirm={() => {
          if (logToDelete) deleteMutation.mutate(logToDelete);
        }}
        onClose={() => setLogToDelete(null)}
      />
    </PageWrapper>
  );
}

/* ── Compose: business-initiated WhatsApp message ── */

interface WaTemplate {
  sid: string;
  name: string;
  body: string;
  variables: string[];
  approvalStatus: string;
  rejectionReason: string | null;
  category: string | null;
}

const TEMPLATE_STATUS_UI: Record<string, { label: string; cls: string }> = {
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending review", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  received: { label: "Pending review", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
  unsubmitted: { label: "Not submitted", cls: "bg-surface text-text-secondary border-border" },
};

function ComposeWhatsAppModal({
  agentId,
  onClose,
  onSent,
}: {
  agentId: string;
  onClose: () => void;
  onSent: (logId: string) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [mode, setMode] = React.useState<"freeform" | "template">("freeform");
  const [manage, setManage] = React.useState(false);
  const [to, setTo] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [templateSid, setTemplateSid] = React.useState<string>("");
  const [variables, setVariables] = React.useState<Record<string, string>>({});
  const [newName, setNewName] = React.useState("");
  const [newBody, setNewBody] = React.useState("");
  const [newCategory, setNewCategory] = React.useState("MARKETING");

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["wa-templates"],
    queryFn: async () => (await api.get("/whatsapp/templates")).data.data as WaTemplate[],
    refetchInterval: manage || mode === "template" ? 15_000 : false,
  });
  const approved = templates.filter((t) => t.approvalStatus === "approved");
  const selectedTemplate = templates.find((t) => t.sid === templateSid) ?? null;

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res =
        mode === "freeform"
          ? await api.post("/whatsapp/send", { agentId, to, message })
          : await api.post("/whatsapp/send-template", {
              agentId,
              to,
              contentSid: templateSid,
              variables,
            });
      return res.data.data as { logId: string };
    },
    onSuccess: (data) => {
      toast.success(mode === "template" ? "Template message sent" : "WhatsApp message sent");
      onSent(data.logId);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to send message"),
  });

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/whatsapp/templates", {
        name: newName,
        body: newBody,
        category: newCategory,
      });
      return res.data.data as WaTemplate;
    },
    onSuccess: () => {
      toast.success("Template submitted to Meta for approval");
      setNewName("");
      setNewBody("");
      queryClient.invalidateQueries({ queryKey: ["wa-templates"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to create template"),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (sid: string) => {
      await api.delete(`/whatsapp/templates/${sid}`);
    },
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["wa-templates"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to delete template"),
  });

  const canSend =
    to.trim().length >= 8 &&
    !sendMutation.isPending &&
    (mode === "freeform"
      ? message.trim().length > 0
      : !!selectedTemplate &&
        selectedTemplate.variables.every((v) => (variables[v] ?? "").trim().length > 0));

  const preview = selectedTemplate
    ? selectedTemplate.body.replace(/\{\{(\d+)\}\}/g, (_, n: string) => variables[n] || `{{${n}}}`)
    : "";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-2xl bg-bg-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 text-white flex items-start gap-3 sticky top-0 z-10"
          style={{ background: "linear-gradient(135deg, #059669 0%, #10B981 100%)" }}
        >
          <div className="h-9 w-9 rounded-lg bg-white/25 backdrop-blur flex items-center justify-center shrink-0">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-[15px] font-bold leading-tight">New WhatsApp chat</div>
            <div className="text-[11.5px] opacity-90 mt-0.5">
              Freeform works within 24h of the customer's last message. Templates reach anyone.
            </div>
          </div>
          <button type="button" onClick={onClose} className="opacity-80 hover:opacity-100 p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode tabs */}
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {(["freeform", "template"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`px-3 h-7 rounded-md text-[11.5px] font-bold capitalize transition-colors ${
                    mode === m
                      ? "bg-bg-raised text-text-primary shadow-sm"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {m === "freeform" ? "Freeform" : "Template (cold outreach)"}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setManage((v) => !v)}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
            >
              {manage ? "Hide templates" : "Manage templates"}
            </button>
          </div>

          {/* Template manager */}
          {manage && (
            <div className="rounded-xl border border-border bg-surface/50 p-3.5 space-y-3">
              <div className="text-[12px] font-bold text-text-primary">Your templates</div>
              {templatesLoading ? (
                <div className="text-[11.5px] text-text-muted">Loading…</div>
              ) : templates.length === 0 ? (
                <div className="text-[11.5px] text-text-muted">
                  No templates yet — create your first below.
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((t) => {
                    const st =
                      TEMPLATE_STATUS_UI[t.approvalStatus] ?? TEMPLATE_STATUS_UI.unsubmitted!;
                    return (
                      <div
                        key={t.sid}
                        className="rounded-lg border border-border bg-bg-raised p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[12px] font-bold text-text-primary truncate">
                            {t.name}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${st.cls}`}
                            >
                              {st.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => deleteTemplateMutation.mutate(t.sid)}
                              className="text-text-muted hover:text-negative-500 p-0.5"
                              title="Delete template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-1 leading-snug">
                          {t.body}
                        </p>
                        {t.rejectionReason && (
                          <p className="text-[10.5px] text-red-600 mt-1">
                            Rejected: {t.rejectionReason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-border pt-3 space-y-2">
                <div className="text-[12px] font-bold text-text-primary">Create template</div>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Template name, e.g. call_followup"
                  className="w-full h-8 px-2.5 text-[12px] bg-bg-raised border border-border rounded-lg focus:outline-none focus:border-emerald-500"
                />
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder={
                    "Namaste {{1}}! Aapne humein call kiya tha {{2}} ke liye. Hum aapko details bhejna chahte hain — reply karein to continue."
                  }
                  className="w-full text-[12px] bg-bg-raised border border-border rounded-lg px-2.5 py-2 focus:outline-none focus:border-emerald-500 min-h-[70px]"
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="h-8 px-2 text-[11.5px] bg-bg-raised border border-border rounded-lg focus:outline-none"
                  >
                    <option value="MARKETING">Marketing</option>
                    <option value="UTILITY">Utility (follow-ups, confirmations)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => createTemplateMutation.mutate()}
                    disabled={
                      !newName.trim() || !newBody.trim() || createTemplateMutation.isPending
                    }
                    className="ml-auto h-8 px-3 rounded-lg text-[11.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {createTemplateMutation.isPending ? "Submitting…" : "Submit for approval"}
                  </button>
                </div>
                <p className="text-[10px] text-text-muted leading-snug">
                  Use {"{{1}}"}, {"{{2}}"} for variables (name, date…). Meta reviews every template
                  — Utility templates usually approve within minutes, Marketing can take longer.
                </p>
              </div>
            </div>
          )}

          {/* Recipient */}
          <div>
            <label className="block text-[12px] font-semibold text-text-primary mb-1">
              Customer WhatsApp number
            </label>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+919876543210"
              className="w-full h-9 px-3 text-[13px] bg-bg-raised border border-border rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>

          {mode === "freeform" ? (
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Namaste! Aapne humein call kiya tha — main details share kar raha hoon…"
                className="w-full text-[13px] bg-bg-raised border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[90px]"
              />
              <p className="text-[10.5px] text-text-muted mt-1 leading-snug">
                Only delivers if this customer messaged you in the last 24 hours. For cold outreach,
                switch to Template.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-text-primary mb-1">
                  Approved template
                </label>
                {approved.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11.5px] text-amber-800">
                    No approved templates yet. Click "Manage templates" above to create one — Meta
                    approval usually takes minutes for Utility templates.
                  </div>
                ) : (
                  <select
                    value={templateSid}
                    onChange={(e) => {
                      setTemplateSid(e.target.value);
                      setVariables({});
                    }}
                    className="w-full h-9 px-2.5 text-[12.5px] bg-bg-raised border border-border rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select a template…</option>
                    {approved.map((t) => (
                      <option key={t.sid} value={t.sid}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedTemplate && (
                <>
                  {selectedTemplate.variables.map((v) => (
                    <div key={v}>
                      <label className="block text-[11.5px] font-semibold text-text-primary mb-1">
                        Variable {"{{"}
                        {v}
                        {"}}"}
                      </label>
                      <input
                        value={variables[v] ?? ""}
                        onChange={(e) => setVariables((prev) => ({ ...prev, [v]: e.target.value }))}
                        placeholder={v === "1" ? "e.g. Ramesh ji" : "value"}
                        className="w-full h-8 px-2.5 text-[12.5px] bg-bg-raised border border-border rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ))}
                  <div className="rounded-lg bg-positive-50 border border-emerald-200 px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 mb-1">
                      Preview
                    </div>
                    <p className="text-[12px] text-emerald-900 leading-snug whitespace-pre-wrap">
                      {preview}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-surface/60 border-t border-border flex items-center justify-end gap-2 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3.5 rounded-lg text-[12px] font-semibold text-text-secondary hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => sendMutation.mutate()}
            disabled={!canSend}
            className="h-8 px-4 rounded-lg text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {sendMutation.isPending ? "Sending…" : "Send message"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default AgentLogs;
