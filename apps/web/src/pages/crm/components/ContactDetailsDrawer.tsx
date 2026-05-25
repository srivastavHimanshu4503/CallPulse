import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { 
  X, User, Mail, Phone, ClipboardList, 
  MessageSquare, Layers, Sparkles, Plus, PhoneCall
} from "lucide-react";
import { Button } from "@antigravity/ui";
import { toast } from "sonner";

interface ContactDetailsDrawerProps {
  contactId: string;
  onClose: () => void;
  customFieldDefs: any[];
}

export function ContactDetailsDrawer({
  contactId,
  onClose,
  customFieldDefs
}: ContactDetailsDrawerProps): React.JSX.Element {
  // Action state managers
  const [noteContent, setNoteContent] = React.useState("");
  const [isNoteOpen, setIsNoteOpen] = React.useState(false);
  
  const [bookingTitle, setBookingTitle] = React.useState("");
  const [bookingStart, setBookingStart] = React.useState("");
  const [isBookingOpen, setIsBookingOpen] = React.useState(false);

  // Custom fields edited values map: { fieldDefinitionId: value }
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({});

  // 1. Fetch High-Density Contact Details (includes timeline activities, deals, notes, bookings)
  const { data: details, isLoading, refetch } = useQuery({
    queryKey: ["contact-details", contactId],
    queryFn: async () => {
      const res = await api.get(`/crm/contacts/${contactId}`);
      return res.data.data;
    },
  });

  // Sync loaded custom field values into state on load
  React.useEffect(() => {
    if (details?.customFields) {
      const map: Record<string, string> = {};
      details.customFields.forEach((cf: any) => {
        map[cf.fieldDefinitionId] = String(cf.value ?? "");
      });
      setFieldValues(map);
    }
  }, [details]);

  // 2. Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/crm/contacts/${contactId}/notes`, { content });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Timeline note recorded successfully");
      setNoteContent("");
      setIsNoteOpen(false);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save note");
    },
  });

  // 3. Book Appointment Mutation
  const bookAppointmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post(`/crm/contacts/${contactId}/bookings`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Timeline appointment registered!");
      setBookingTitle("");
      setBookingStart("");
      setIsBookingOpen(false);
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to book appointment");
    },
  });

  // 4. Save Custom Fields values Mutation
  const saveFieldsMutation = useMutation({
    mutationFn: async (values: any[]) => {
      await api.put(`/crm/contacts/${contactId}/custom-fields`, { values });
    },
    onSuccess: () => {
      toast.success("Dynamic custom fields updated");
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to save custom fields");
    },
  });

  const handleSaveFields = () => {
    const payload = Object.entries(fieldValues).map(([defId, val]) => ({
      fieldDefinitionId: defId,
      value: val,
    }));
    saveFieldsMutation.mutate(payload);
  };

  if (isLoading || !details) {
    return (
      <div className="fixed inset-y-0 right-0 z-40 w-full md:w-[70vw] bg-white border-l border-[#E5E5E5] flex items-center justify-center font-sans">
        <div className="animate-spin text-[#2563EB] text-2xl">🌀</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 overflow-hidden font-sans select-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#111111]/30 backdrop-blur-[1px]" onClick={onClose} />

      {/* Slide-over Layout Wrapper */}
      <div className="absolute inset-y-0 right-0 w-full md:w-[80vw] bg-white border-l border-[#E5E5E5] flex flex-col h-full overflow-hidden shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Sliding Panel Header */}
        <div className="h-14 border-b border-[#E5E5E5] px-6 bg-[#FAFAFA] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider capitalize">
              {details.firstName} {details.lastName} Details Panel
            </span>
          </div>
          <button type="button" onClick={onClose} className="text-[#666666] hover:text-[#111111] focus:outline-none">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic Three Column Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 min-h-0 divide-x divide-[#E5E5E5]">
          
          {/* COLUMN 1: Profile & Custom Fields (1/4 width) */}
          <div className="p-5 overflow-y-auto space-y-5">
            <div className="text-[10px] font-bold text-[#999999] uppercase tracking-wider border-b border-[#E5E5E5] pb-1.5 flex items-center gap-1">
              <User className="h-3.5 w-3.5" /> Customer Identity
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider block">Customer Name</span>
                <span className="font-bold text-[#111111] mt-0.5 block capitalize">{details.firstName} {details.lastName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider block">Email Address</span>
                <span className="font-medium text-[#666666] mt-0.5 block flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-[#999999]" /> {details.emails?.[0] || "--"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[#999999] uppercase tracking-wider block">Primary Phone</span>
                <span className="font-medium text-[#666666] mt-0.5 block flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-[#999999]" /> {details.phones?.[0] || "--"}</span>
              </div>
            </div>

            <div className="text-[10px] font-bold text-[#999999] uppercase tracking-wider border-b border-[#E5E5E5] pt-4 pb-1.5 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Dynamic Field Variables
            </div>

            {customFieldDefs.length === 0 ? (
              <p className="text-[10px] text-[#999999] italic">Configure field variables under custom fields tab.</p>
            ) : (
              <div className="space-y-4 pt-1">
                {customFieldDefs.map((def: any) => (
                  <div key={def.id} className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#111111] uppercase tracking-wider">{def.name}</label>
                    <input
                      type={def.type === "NUMBER" ? "number" : def.type === "DATE" ? "date" : "text"}
                      placeholder={`Enter custom ${def.name}...`}
                      value={fieldValues[def.id] || ""}
                      onChange={(e) => setFieldValues({ ...fieldValues, [def.id]: e.target.value })}
                      className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-8 px-2.5 focus:outline-none"
                    />
                  </div>
                ))}
                <Button
                  variant="primary"
                  onClick={handleSaveFields}
                  disabled={saveFieldsMutation.isPending}
                  className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[10px] h-8 px-3 rounded-[6px] border-none shadow-none uppercase tracking-wider"
                >
                  {saveFieldsMutation.isPending ? "Saving Fields..." : "Apply Field Values"}
                </Button>
              </div>
            )}
          </div>

          {/* COLUMN 2 & 3: pre-computed Timeline activities (2/4 width) */}
          <div className="col-span-2 p-5 overflow-y-auto space-y-4">
            <div className="text-[10px] font-bold text-[#999999] uppercase tracking-wider border-b border-[#E5E5E5] pb-1.5 flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5" /> Isolated Customer Journey Timeline
            </div>

            {details.activities.length === 0 ? (
              <div className="text-center p-12 text-[#999999]">No timeline log triggers found.</div>
            ) : (
              <div className="space-y-4 pt-1">
                {details.activities.map((a: any) => {
                  const isCall = a.type === "CALL_INBOUND" || a.type === "CALL_OUTBOUND";
                  
                  return (
                    <div key={a.id} className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-[6px] p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center shrink-0 mt-0.5 text-[#666666]">
                            {isCall ? <PhoneCall className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-[#111111] leading-snug">{a.summary}</h5>
                            <span className="text-[9px] font-semibold text-[#999999] uppercase tracking-wider block mt-1">
                              {new Date(a.occurredAt).toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Display call recording player & transcript if Call Completed */}
                      {isCall && a.commLog && (
                        <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] p-3 space-y-3 mt-2 animate-in fade-in duration-200">
                          {a.commLog.recordingUrl && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold text-[#999999] uppercase tracking-wider block">Call Recording logs URL</span>
                              <audio src={a.commLog.recordingUrl} controls className="w-full h-8 select-none focus:outline-none" />
                            </div>
                          )}
                          {a.commLog.transcript && (
                            <div className="space-y-1.5 border-t border-[#E5E5E5] pt-2">
                              <span className="text-[9px] font-bold text-[#999999] uppercase tracking-wider block">Verbal Call Transcript Extraction</span>
                              <p className="text-[11px] text-[#666666] leading-relaxed italic bg-white p-2.5 border border-[#E5E5E5] rounded-[4px] font-medium">
                                "{a.commLog.transcript}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* COLUMN 4: Linked Objects & Action triggers (1/4 width) */}
          <div className="p-5 overflow-y-auto space-y-5 select-none">
            <div className="text-[10px] font-bold text-[#999999] uppercase tracking-wider border-b border-[#E5E5E5] pb-1.5 flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Opportunity objects
            </div>

            {/* Linked Deals list */}
            <div className="space-y-2.5">
              {details.deals.length === 0 ? (
                <p className="text-[10px] text-[#999999] italic">No active opportunities.</p>
              ) : (
                details.deals.map((d: any) => (
                  <div key={d.id} className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-[6px] p-2.5 flex items-center justify-between">
                    <div>
                      <h5 className="text-[11px] font-bold text-[#111111] leading-tight">{d.title}</h5>
                      <span className="text-[10px] text-[#2563EB] font-bold block mt-0.5">Rs. {d.value.toLocaleString("en-IN")}</span>
                    </div>
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#EFF6FF] border border-[#2563EB]/10 text-[#2563EB] uppercase tracking-wider">
                      {d.stage}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Actions triggers button groups */}
            <div className="text-[10px] font-bold text-[#999999] uppercase tracking-wider border-b border-[#E5E5E5] pt-4 pb-1.5 flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Timeline Action CTAs
            </div>

            <div className="space-y-3">
              {/* Note actions Trigger */}
              {!isNoteOpen ? (
                <button
                  onClick={() => setIsNoteOpen(true)}
                  className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#111111] hover:bg-[#F7F7F7] font-semibold text-xs h-9 px-3 rounded-[6px] flex items-center justify-center gap-1.5 focus:outline-none transition-colors"
                >
                  + Add Timeline Note
                </button>
              ) : (
                <div className="space-y-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] p-3">
                  <textarea
                    placeholder="Type call notes/manual updates..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] p-2 focus:outline-none leading-relaxed"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setIsNoteOpen(false)} className="text-[10px] font-bold text-[#666666]">Cancel</button>
                    <Button
                      variant="primary"
                      onClick={() => addNoteMutation.mutate(noteContent)}
                      disabled={addNoteMutation.isPending}
                      className="bg-[#2563EB] text-white font-semibold text-[10px] h-6 px-3 rounded-[4px]"
                    >
                      Save Note
                    </Button>
                  </div>
                </div>
              )}

              {/* Booking actions Trigger */}
              {!isBookingOpen ? (
                <button
                  onClick={() => setIsBookingOpen(true)}
                  className="w-full bg-[#FFFFFF] border border-[#E5E5E5] text-[#111111] hover:bg-[#F7F7F7] font-semibold text-xs h-9 px-3 rounded-[6px] flex items-center justify-center gap-1.5 focus:outline-none transition-colors"
                >
                  + Book Appointment
                </button>
              ) : (
                <div className="space-y-2 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] p-3">
                  <input
                    type="text"
                    placeholder="Appointment title..."
                    value={bookingTitle}
                    onChange={(e) => setBookingTitle(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-8 px-2.5 focus:outline-none"
                  />
                  <input
                    type="datetime-local"
                    value={bookingStart}
                    onChange={(e) => setBookingStart(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] h-8 px-2 focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setIsBookingOpen(false)} className="text-[10px] font-bold text-[#666666]">Cancel</button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        const start = new Date(bookingStart);
                        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration default
                        bookAppointmentMutation.mutate({
                          title: bookingTitle,
                          startTime: start.toISOString(),
                          endTime: end.toISOString()
                        });
                      }}
                      disabled={bookAppointmentMutation.isPending}
                      className="bg-[#2563EB] text-white font-semibold text-[10px] h-6 px-3 rounded-[4px]"
                    >
                      Save Booking
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
