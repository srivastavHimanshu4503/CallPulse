import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { ConfirmModal } from "../../components/common/ConfirmModal.js";
import { formatDateTime, formatTime } from "@antigravity/utils";
import { api } from "../../lib/axios.js";
import { ArrowLeft, Search, Filter, Phone, PhoneCall, MessageSquare, Trash2, ShieldCheck, Sparkles, User, FileText, PhoneIncoming, PhoneOutgoing, Activity } from "lucide-react";
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
  const [activeTab, setActiveTab] = React.useState<"transcript" | "summary" | "extractions">("transcript");
  const [logToDelete, setLogToDelete] = React.useState<string | null>(null);

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
      if (extractionStatus && extractionStatus !== "ALL") params.extractionStatus = extractionStatus;
      const res = await api.get(`/agents/${id}/logs`, { params });
      return res.data.data as any[];
    },
    enabled: !!id,
  });

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
    }
  });

  const [selectedLogIds, setSelectedLogIds] = React.useState<Set<string>>(new Set());

  const bulkDeleteMutation = useMutation({
    mutationFn: async (logIds: string[]) => {
      await Promise.all(logIds.map(logId => api.delete(`/agents/${id}/logs/${logId}`)));
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
    return logs.filter(log => {
      if (!searchTerm) return true;
      const name = log.contact?.name || log.contact?.firstName || log.contact?.phones?.[0] || "";
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [logs, searchTerm]);

  React.useEffect(() => {
    if (!selectedLog && filteredLogs.length > 0) {
      setSelectedLog(filteredLogs[0]);
    }
  }, [filteredLogs, selectedLog]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": case "DELIVERED": case "SENT": return "bg-success/10 text-success border-success/20";
      case "FAILED": return "bg-error/10 text-error border-error/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const renderChatBubbles = (transcriptJson: any) => {
    if (!transcriptJson || !Array.isArray(transcriptJson) || transcriptJson.length === 0) return null;
    return (
      <div className="flex flex-col w-full pb-8">
        {transcriptJson.map((msg, idx) => {
          const isAgent = msg.role === "agent" || msg.role === "assistant";
          const text = msg.text || msg.content || "";
          const name = isAgent ? (agent?.name || "AI Agent") : (selectedLog?.contact?.name || selectedLog?.contact?.firstName || "User");
          const time = msg.at ? formatTime(msg.at) : "";
          
          return (
            <div key={idx} className={`flex w-full mb-6 ${isAgent ? "justify-start" : "justify-end"}`}>
              <div className={`flex flex-col w-[50%] ${isAgent ? "items-start" : "items-end"}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-bold text-text-secondary">{name}</span>
                  {time && <span className="text-[10px] font-medium text-text-muted">{time}</span>}
                </div>
                <div className={`px-4 py-3 text-[14px] leading-relaxed shadow-sm ${
                  isAgent 
                    ? "bg-white border border-border text-text-primary rounded-2xl rounded-tl-sm" 
                    : "bg-primary text-white rounded-2xl rounded-tr-sm"
                }`}>
                  {text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <PageWrapper noScroll>
      <div className="flex-1 flex flex-col min-h-0 bg-white border border-border rounded-2xl overflow-hidden shadow-sm font-sans text-text-primary">
        
        {/* Top Header */}
        <div className="flex-none h-14 border-b border-border flex items-center justify-between px-5 bg-surface/50 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/agents")}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 -ml-1.5 rounded-md text-[12.5px] font-semibold text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Agents
            </button>
            <h1 className="text-sm font-bold text-text-primary tracking-tight">
              {agent ? `${agent.name} — Logs` : "Agent Logs"}
            </h1>
          </div>
        </div>

        {/* Split Pane Content */}
        <div className="flex-1 flex min-h-0 bg-white">
          
          {/* LEFT PANE - INBOX STYLE */}
          <div className="w-[340px] bg-bg-canvas border-r border-border flex flex-col h-full shrink-0">
            {/* Search and Filters Header */}
            <div className="p-3 border-b border-border bg-white flex flex-col gap-2 shrink-0 z-10">
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
                  className="flex-1 bg-white border border-border hover:border-primary/50 rounded-md text-xs px-2 py-1.5 outline-none font-medium text-text-primary transition-colors cursor-pointer"
                >
                  <option value="ALL">All Channels</option>
                  <option value="CALL">Call</option>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WhatsApp</option>
                </select>
                <select
                  value={extractionStatus}
                  onChange={(e) => setExtractionStatus(e.target.value)}
                  className="flex-1 bg-white border border-border hover:border-primary/50 rounded-md text-xs px-2 py-1.5 outline-none font-medium text-text-primary transition-colors cursor-pointer"
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
                <span className="text-xs font-semibold text-primary">{selectedLogIds.size} selected</span>
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
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-white shadow-sm animate-pulse rounded-lg border border-border" />)}
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center h-full">
                  <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-border">
                    <Filter className="h-4 w-4 text-text-muted" />
                  </div>
                  <p className="text-xs font-semibold text-text-primary mb-1">No logs found</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {filteredLogs.map(log => {
                    const name = log.contact?.name || log.contact?.firstName || log.contact?.phones?.[0] || "Unknown";
                    const initial = name.charAt(0).toUpperCase();
                    const intent = log.extractedFields?.intent?.primary || log.extractedFields?.intent;
                    const isSelected = selectedLog?.id === log.id;
                    const direction = log.direction || "INBOUND";
                    const isCall = log.type === "CALL";

                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`group cursor-pointer p-3 transition-all relative ${
                          isSelected ? "bg-active-nav-bg border-l-2 border-l-primary" : "hover:bg-white bg-transparent border-l-2 border-l-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox */}
                            <div className="shrink-0 flex items-center h-8" onClick={(e) => e.stopPropagation()}>
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
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm ${
                              isSelected ? "bg-primary text-white" : "bg-white border border-border text-primary"
                            }`}>
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <p className={`text-sm font-bold truncate leading-none ${
                                  isSelected ? "text-primary" : "text-text-primary"
                                }`}>
                                  {name}
                                </p>
                                {/* Direction Badge */}
                                <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                  direction === "INBOUND" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {direction === "INBOUND" ? <PhoneIncoming className="h-2 w-2" /> : <PhoneOutgoing className="h-2 w-2" />}
                                  {direction}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-muted">
                                {isCall ? <PhoneCall className="h-3 w-3 text-text-secondary" /> : <MessageSquare className="h-3 w-3 text-text-secondary" />}
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
          <div className="flex-1 flex flex-col min-w-0 bg-white border-l border-border">
            {!selectedLog ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface/30">
                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-border">
                  <Activity className="h-5 w-5 text-primary/50" />
                </div>
                <h3 className="text-base font-bold text-text-primary mb-1">No Interaction Selected</h3>
                <p className="text-xs font-medium text-text-secondary">Select an interaction from the inbox to view details.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 relative">
                
                {/* Ultra Thin Detail Header */}
                <div className="px-5 py-2 border-b border-border bg-surface/30 shrink-0 flex items-center justify-between z-10 relative">
                  <div className="flex items-center gap-3">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 shrink-0">
                      {(selectedLog.contact?.name || selectedLog.contact?.firstName || selectedLog.contact?.phones?.[0] || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-sm font-bold text-text-primary">
                        {selectedLog.contact?.name || selectedLog.contact?.firstName || selectedLog.contact?.phones?.[0] || "Unknown Call"}
                      </h2>
                      {selectedLog.contact?.phones?.[0] && (
                        <>
                          <span className="text-border text-xs">|</span>
                          <span className="text-xs font-medium text-text-secondary flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedLog.contact.phones[0]}
                          </span>
                        </>
                      )}
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${getStatusColor(selectedLog.extractionStatus)}`}>
                        {selectedLog.extractionStatus}
                      </span>
                      <span className="text-border text-xs">|</span>
                      <span className="text-xs font-medium text-text-secondary">{formatDateTime(selectedLog.occurredAt)}</span>
                      {selectedLog.duration && (
                        <>
                          <span className="text-border text-xs">|</span>
                          <span className="text-xs font-medium text-text-secondary">{selectedLog.duration}s</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {selectedLog.contactId && (
                      <button 
                        onClick={() => navigate(`/crm/contacts/${selectedLog.contactId}`)}
                        className="px-2.5 py-1 bg-white border border-border hover:border-primary/50 hover:text-primary text-[10px] font-bold text-text-primary rounded transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <User className="h-3 w-3" /> View contact in CRM
                      </button>
                    )}
                    {selectedLog.activities?.some((a: any) => a.type === "DEAL_CREATED") && (
                      <button className="px-2.5 py-1 bg-success text-white hover:bg-success/90 text-[10px] font-bold rounded transition-all flex items-center gap-1.5 shadow-sm">
                        <FileText className="h-3 w-3" /> Deal
                      </button>
                    )}
                  </div>
                </div>

                {/* Tabs Navigation */}
                <div className="flex items-center px-5 bg-white border-b border-border shrink-0">
                  <button 
                    onClick={() => setActiveTab("transcript")}
                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === "transcript" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                  >
                    Transcript
                  </button>
                  <button 
                    onClick={() => setActiveTab("summary")}
                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === "summary" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                  >
                    AI Summary & Score
                  </button>
                  <button 
                    onClick={() => setActiveTab("extractions")}
                    className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === "extractions" ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text-primary"}`}
                  >
                    Extracted Data <Sparkles className="h-3 w-3" />
                  </button>
                </div>

                {/* Tab Content Area */}
                <div className="flex-1 overflow-y-auto w-full bg-white">
                  <div className="w-full h-full p-6">
                    <div className="w-full">
                      {/* TRANSCRIPT TAB */}
                      {activeTab === "transcript" && (
                        <div className="w-full h-full">
                          {renderChatBubbles(selectedLog.transcriptJson) ? (
                            renderChatBubbles(selectedLog.transcriptJson)
                          ) : selectedLog.transcript ? (
                            <p className="text-[14px] text-text-primary whitespace-pre-wrap leading-relaxed">{selectedLog.transcript}</p>
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center py-20 bg-surface/30 border border-border rounded-xl shadow-sm">
                              <MessageSquare className="h-8 w-8 text-border mb-3" />
                              <p className="text-sm font-semibold text-text-secondary">No transcript recorded</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* SUMMARY & SCORE TAB */}
                      {activeTab === "summary" && (
                        <div className="space-y-4">
                          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
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

                          <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                            <h3 className="text-xs font-bold text-text-primary mb-3 flex items-center gap-1.5">
                              <Activity className="h-3.5 w-3.5 text-success" /> 
                              Lead Score
                            </h3>
                            {contactScore !== null && contactScore !== undefined ? (
                              <div className="flex items-center gap-4">
                                <div className="h-16 w-16 rounded-full bg-success/10 border-4 border-success flex items-center justify-center shrink-0 shadow-inner">
                                  <span className="text-xl font-black text-success">{contactScore}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-text-primary mb-0.5">Qualifying Score</p>
                                  <p className="text-xs text-text-secondary">
                                    Based on caller intent, duration, and AI analysis.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-text-muted italic text-center py-4">Score not available yet.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* EXTRACTIONS TAB */}
                      {activeTab === "extractions" && (
                        <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                          <h3 className="text-xs font-bold text-text-primary mb-4 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> 
                            Extracted CRM Fields
                          </h3>
                          {selectedLog.extractedFields && Object.keys(selectedLog.extractedFields).filter(k => k !== 'summary').length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(selectedLog.extractedFields).filter(([k]) => k !== 'summary').map(([k, v]) => (
                                <div key={k} className="p-3 bg-surface/50 border border-border/50 rounded-lg hover:border-primary/30 transition-colors">
                                  <p className="text-[10px] text-text-secondary uppercase tracking-wider font-bold mb-1">{k.replace(/_/g, ' ')}</p>
                                  <p className="text-sm font-semibold text-text-primary break-words">
                                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-10">
                              <ShieldCheck className="h-6 w-6 text-border mx-auto mb-2" />
                              <p className="text-xs font-semibold text-text-secondary">No data extracted</p>
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
      </div>

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

export default AgentLogs;
