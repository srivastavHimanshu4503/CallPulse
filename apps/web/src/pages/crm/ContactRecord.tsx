import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { api } from "../../lib/axios.js";
import { formatTimeAgo, formatINR, formatActivitySummary } from "@antigravity/utils";
import { ACTIVITY_CHANNEL_BY_TYPE } from "@antigravity/types";
import { toast } from "sonner";
import { CreateCustomFieldModal } from "./components/CreateCustomFieldModal.js";
import { DeleteContactModal } from "./components/DeleteContactModal.js";
import { RecordingPlayer } from "../../components/common/RecordingPlayer.js";
import { Button } from "@antigravity/ui";
import {
  ArrowLeft,
  Mail,
  Phone,
  Plus,
  StickyNote,
  Sparkles,
  Zap,
  MessageSquare,
  MessageCircle,
  PhoneCall,
  ShieldAlert,
  ShieldCheck,
  BadgeCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  Card,
  SectionHead,
  Avatar,
  StatusPill,
  Timeline,
  TimelineItem,
  computeLeadScore,
  BAND_LABEL,
  BAND_TONE,
  readConsent,
  Tabs,
} from "../../components/ui-ext/index.js";

type TabId = "all" | "calls" | "sms" | "whatsapp" | "notes";

// Channel mapping comes from the shared registry so api/post-call/web can
// never disagree about where an activity type belongs.
const ACTIVITY_CHANNEL_MAP: Record<string, string> = ACTIVITY_CHANNEL_BY_TYPE;

export function ContactRecord(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<TabId>("all");
  const [newNote, setNewNote] = React.useState("");
  const [isNoteOpen, setIsNoteOpen] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const {
    data: contact,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["contact-details", id],
    queryFn: async () => {
      const res = await api.get(`/crm/contacts/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const { data: pipelines = [] } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => (await api.get("/crm/pipelines")).data.data,
  });

  const noteMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/crm/contacts/${id}/notes`, { content });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Note saved");
      setNewNote("");
      setIsNoteOpen(false);
      refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to save note"),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ deleteDeals }: { deleteDeals: boolean }) => {
      await api.delete(`/crm/contacts/${id}?deleteDeals=${deleteDeals}`);
    },
    onSuccess: () => {
      toast.success("Contact deleted");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      navigate("/crm");
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to delete"),
  });

  if (isLoading || !contact) {
    return (
      <PageWrapper>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-bg-muted rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="h-80 bg-bg-muted rounded-xl" />
            <div className="h-80 bg-bg-muted rounded-xl" />
            <div className="h-80 bg-bg-muted rounded-xl" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  const score = computeLeadScore(contact);
  const consent = readConsent(contact);
  const openDeals = (contact.deals || []).filter((d: any) => !d.deletedAt);
  const openDealValue = openDeals.reduce((s: number, d: any) => s + (d.value || 0), 0);

  const activities = contact.activities || [];
  const filteredActivities = activities.filter((a: any) => {
    if (activeTab === "all") return true;
    return ACTIVITY_CHANNEL_MAP[a.type] === activeTab;
  });

  const tabDefs = [
    { id: "all" as const, label: "All activity", count: activities.length },
    {
      id: "calls" as const,
      label: "Calls",
      icon: PhoneCall,
      count: activities.filter((a: any) => ACTIVITY_CHANNEL_MAP[a.type] === "calls").length,
    },
    {
      id: "sms" as const,
      label: "SMS",
      icon: MessageSquare,
      count: activities.filter((a: any) => ACTIVITY_CHANNEL_MAP[a.type] === "sms").length,
    },
    {
      id: "whatsapp" as const,
      label: "WhatsApp",
      icon: MessageCircle,
      count: activities.filter((a: any) => ACTIVITY_CHANNEL_MAP[a.type] === "whatsapp").length,
    },
    {
      id: "notes" as const,
      label: "Notes",
      icon: StickyNote,
      count: activities.filter((a: any) => ACTIVITY_CHANNEL_MAP[a.type] === "notes").length,
    },
  ];

  return (
    <PageWrapper>
      {/* ============ HEADER ============ */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/crm")}
            className="h-9 w-9 rounded-md border border-line-default bg-bg-raised hover:bg-bg-muted text-fg-secondary hover:text-fg-primary flex items-center justify-center shrink-0"
            aria-label="Back to CRM"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Avatar name={`${contact.firstName} ${contact.lastName}`} size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] font-semibold text-fg-primary tracking-tight capitalize truncate">
                {contact.firstName} {contact.lastName}
              </h1>
              <StatusPill tone={BAND_TONE[score.band]} dot pulse={score.band === "hot"}>
                {BAND_LABEL[score.band]} · {score.score}
              </StatusPill>
              {consent.dnd && (
                <StatusPill tone="negative" dot>
                  DND
                </StatusPill>
              )}
            </div>
            <div className="text-[11.5px] text-fg-muted mt-0.5 truncate">
              {contact.emails?.[0] && (
                <span className="inline-flex items-center gap-1 mr-3">
                  <Mail className="h-3 w-3" />
                  {contact.emails[0]}
                </span>
              )}
              {contact.phones?.[0] && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {contact.phones[0]}
                </span>
              )}
              <span className="mx-2 text-fg-muted">·</span>
              <span>Added {formatTimeAgo(contact.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-semibold border border-line-default bg-bg-raised text-negative-500 hover:bg-negative-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* ============ 3-COL GRID ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        {/* ── LEFT: profile + custom fields + consent ── */}
        <div className="lg:col-span-3 space-y-3 min-h-0 overflow-y-auto pr-1">
          <ProfileCard contact={contact} onSaved={refetch} />
          <CustomFieldsCard contact={contact} onSaved={refetch} />
          <ConsentCard consent={consent} />
        </div>

        {/* ── CENTER: conversation feed ── */}
        <div className="lg:col-span-6 flex flex-col min-h-0">
          <Card className="flex-1 min-h-0 flex flex-col" padded>
            <SectionHead
              title="Conversations & activity"
              hint="Every touchpoint the AI logs, in one thread"
              action={
                <button
                  type="button"
                  onClick={() => setIsNoteOpen(true)}
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  <Plus className="h-3 w-3" /> Add note
                </button>
              }
            />

            <div className="mb-3 shrink-0">
              <Tabs tabs={tabDefs} active={activeTab} onChange={setActiveTab} variant="underline" />
            </div>

            {isNoteOpen && (
              <div className="border border-line-default rounded-md p-3 mb-3 bg-bg-subtle shrink-0">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Type a note (talked to customer, next steps, blockers…)"
                  rows={2}
                  className="w-full bg-bg-raised border border-line-default focus:border-brand-500 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md p-2 focus:outline-none leading-relaxed resize-none"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNoteOpen(false);
                      setNewNote("");
                    }}
                    className="text-[11.5px] font-semibold text-fg-secondary hover:text-fg-primary"
                  >
                    Cancel
                  </button>
                  <Button
                    variant="primary"
                    onClick={() => newNote.trim() && noteMutation.mutate(newNote.trim())}
                    disabled={!newNote.trim() || noteMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 px-3 text-[11.5px] font-semibold rounded-md border-none shadow-card"
                  >
                    Save note
                  </Button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto -mx-1 px-1">
              {filteredActivities.length === 0 ? (
                <div className="py-16 text-center">
                  <MessageSquare className="h-8 w-8 text-fg-muted mx-auto mb-2" />
                  <div className="text-[13px] font-semibold text-fg-primary">
                    No activity in this channel yet
                  </div>
                  <div className="text-[11.5px] text-fg-muted mt-1">
                    New calls, SMS and notes will appear here automatically.
                  </div>
                </div>
              ) : (
                <Timeline>
                  {filteredActivities.map((a: any) => (
                    <ActivityRow key={a.id} activity={a} />
                  ))}
                </Timeline>
              )}
            </div>
          </Card>
        </div>

        {/* ── RIGHT: AI insights + deals + actions ── */}
        <div className="lg:col-span-3 space-y-3 min-h-0 overflow-y-auto pr-1">
          <AIInsightsCard
            score={score}
            latestSentiment={contact.latestSentiment}
            callCount={contact.callCount}
            lastCallAt={contact.lastCallAt}
            openDealsCount={openDeals.length}
            openDealValue={openDealValue}
          />
          <DealsCard contact={contact} pipelines={pipelines} onCreated={refetch} />
        </div>
      </div>

      {showDeleteConfirm && (
        <DeleteContactModal
          contactCount={1}
          contactName={`${contact.firstName} ${contact.lastName}`}
          dealCount={openDeals.length}
          isDeleting={deleteMutation.isPending}
          onConfirm={(opts) => deleteMutation.mutate(opts)}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </PageWrapper>
  );
}

export default ContactRecord;

/* ---------------- Profile card ---------------- */

function ProfileCard({
  contact,
  onSaved,
}: {
  contact: any;
  onSaved: () => void;
}): React.JSX.Element {
  const [editing, setEditing] = React.useState(false);
  const [firstName, setFirstName] = React.useState(contact.firstName || "");
  const [lastName, setLastName] = React.useState(contact.lastName || "");
  const [email, setEmail] = React.useState(contact.emails?.[0] || "");
  const [phone, setPhone] = React.useState(contact.phones?.[0] || "");

  const saveMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/crm/contacts/${contact.id}`, {
        firstName,
        lastName,
        email,
        phone,
      });
    },
    onSuccess: () => {
      toast.success("Profile updated");
      setEditing(false);
      onSaved();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to update profile"),
  });

  return (
    <Card padded>
      <SectionHead
        title="Profile"
        action={
          editing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-[11px] font-semibold text-fg-secondary hover:text-fg-primary"
              >
                Cancel
              </button>
              <Button
                variant="primary"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="bg-brand-500 hover:bg-brand-600 text-white h-6 px-2.5 text-[10.5px] font-semibold rounded-md border-none"
              >
                Save
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Edit
            </button>
          )
        }
      />
      {editing ? (
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-1">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-1">
              Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
            />
          </div>
        </div>
      ) : (
        <ul className="space-y-2.5 text-[12px]">
          <li>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
              Name
            </div>
            <div className="text-fg-primary font-semibold capitalize">
              {contact.firstName} {contact.lastName}
            </div>
          </li>
          {(contact.emails?.length > 0 || email) && (
            <li>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                Email
              </div>
              {contact.emails?.map((e: string) => (
                <a
                  key={e}
                  href={`mailto:${e}`}
                  className="text-brand-600 hover:text-brand-700 font-medium block truncate"
                >
                  {e}
                </a>
              ))}
              {contact.emails?.length === 0 && email && (
                <a
                  href={`mailto:${email}`}
                  className="text-brand-600 hover:text-brand-700 font-medium block truncate"
                >
                  {email}
                </a>
              )}
            </li>
          )}
          {(contact.phones?.length > 0 || phone) && (
            <li>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                Phone
              </div>
              {contact.phones?.map((p: string) => (
                <a
                  key={p}
                  href={`tel:${p}`}
                  className="text-brand-600 hover:text-brand-700 font-medium block"
                >
                  {p}
                </a>
              ))}
              {contact.phones?.length === 0 && phone && (
                <a
                  href={`tel:${phone}`}
                  className="text-brand-600 hover:text-brand-700 font-medium block"
                >
                  {phone}
                </a>
              )}
            </li>
          )}
          <li>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
              Added
            </div>
            <div className="text-fg-secondary">
              {new Date(contact.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </li>
        </ul>
      )}
    </Card>
  );
}

/* ---------------- Custom fields (with source badges) ---------------- */

function CustomFieldsCard({
  contact,
  onSaved,
}: {
  contact: any;
  onSaved: () => void;
}): React.JSX.Element | null {
  const { data: defs = [] } = useQuery({
    queryKey: ["custom-fields-defs"],
    queryFn: async () => (await api.get("/crm/custom-fields")).data.data,
  });

  const [values, setValues] = React.useState<Record<string, any>>({});
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    const map: Record<string, any> = {};
    (contact.customFields || []).forEach((cf: any) => {
      if (cf.type === "DATE" && cf.value) {
        const t = typeof cf.value === "number" ? cf.value : Number(cf.value);
        if (!Number.isNaN(t)) {
          const d = new Date(t < 10000000000 ? t * 1000 : t);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const h = String(d.getHours()).padStart(2, "0");
          const min = String(d.getMinutes()).padStart(2, "0");
          map[cf.fieldDefinitionId] = `${y}-${m}-${day}T${h}:${min}`;
        }
      } else {
        map[cf.fieldDefinitionId] = cf.value ?? "";
      }
    });
    setValues(map);
  }, [contact]);

  const [isAddOpen, setIsAddOpen] = React.useState(false);

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(values).map(([defId, val]) => {
        const def = defs.find((f: any) => f.id === defId);
        let finalVal: any = val;
        if (def?.type === "DATE" && val) finalVal = Math.floor(new Date(val).getTime() / 1000);
        return { fieldDefinitionId: defId, value: finalVal };
      });
      await api.put(`/crm/contacts/${contact.id}/custom-fields`, { values: payload });
    },
    onSuccess: () => {
      toast.success("Fields updated");
      setEditing(false);
      onSaved();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to save"),
  });

  if (defs.length === 0) return null;

  return (
    <Card padded>
      <SectionHead
        title="Custom fields"
        action={
          editing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="text-[11px] font-semibold text-fg-secondary hover:text-fg-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
              >
                {saveMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Edit
            </button>
          )
        }
      />
      <ul className="space-y-3">
        {defs.map((def: any) => {
          const cf = (contact.customFields || []).find((c: any) => c.fieldDefinitionId === def.id);
          const source = cf?.source;
          const isAuto = source === "CALL" || source === "SMS" || source === "WORKFLOW";
          return (
            <li key={def.id}>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-1">
                <span>{def.name}</span>
                {isAuto && (
                  <span
                    className="inline-flex items-center gap-0.5 bg-accent-100 text-accent-700 rounded px-1 py-0.5 text-[9px] font-bold"
                    title={`Auto-filled from ${source}`}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    AI
                  </span>
                )}
              </div>
              {editing ? (
                <CFEditor
                  def={def}
                  value={values[def.id] ?? ""}
                  onChange={(v) => setValues({ ...values, [def.id]: v })}
                />
              ) : (
                <div className="text-[12px] text-fg-primary">
                  {formatFieldValue(def, cf) || <span className="text-fg-muted italic">—</span>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => setIsAddOpen(true)}
        className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
      >
        <Plus className="h-3.5 w-3.5" />
        Add new field
      </button>

      <CreateCustomFieldModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["custom-fields-defs"] })}
      />
    </Card>
  );
}

function formatFieldValue(def: any, cf: any): string {
  if (!cf) return "";
  if (def.type === "DATE" && cf.value) {
    const t = typeof cf.value === "number" ? cf.value : Number(cf.value);
    if (!Number.isNaN(t)) {
      const d = new Date(t < 10000000000 ? t * 1000 : t);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }
  }
  if (def.type === "BOOLEAN") {
    return cf.value === true || String(cf.value) === "true" ? "Yes" : "No";
  }
  return String(cf.value ?? "");
}

function CFEditor({
  def,
  value,
  onChange,
}: {
  def: any;
  value: any;
  onChange: (v: any) => void;
}): React.JSX.Element {
  return (
    <div className="flex gap-2 items-center w-full">
      {def.type === "DROPDOWN" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
        >
          <option value="">Select…</option>
          {def.options?.map((o: string) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : def.type === "BOOLEAN" ? (
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value === "true")}
          className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
        >
          <option value="">Select…</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      ) : (
        <input
          type={def.type === "NUMBER" ? "number" : def.type === "DATE" ? "datetime-local" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
        />
      )}
      {value !== "" && value !== null && value !== undefined && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-fg-muted hover:text-error shrink-0"
          title="Clear field"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ---------------- Consent card ---------------- */

function ConsentCard({ consent }: { consent: any }): React.JSX.Element {
  const items = [
    { key: "SMS", ok: consent.smsOptIn, hint: "TRAI DLT opt-in" },
    { key: "WhatsApp", ok: consent.whatsappOptIn, hint: "24h session window applies" },
    { key: "Email", ok: consent.emailOptIn, hint: "" },
  ];
  return (
    <Card padded>
      <SectionHead title="Consent & DND" hint="Applied to outbound actions" />
      {consent.dnd ? (
        <div className="rounded-md bg-negative-50 border border-negative-500/20 p-2.5 flex items-start gap-2 mb-3">
          <ShieldAlert className="h-4 w-4 text-negative-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11.5px] font-semibold text-negative-500">On DND registry</div>
            <div className="text-[10.5px] text-fg-secondary mt-0.5 leading-relaxed">
              Outbound calls and promo SMS are blocked to comply with TRAI rules.
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-positive-50 border border-positive-500/20 p-2.5 flex items-start gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-positive-500 shrink-0 mt-0.5" />
          <div>
            <div className="text-[11.5px] font-semibold text-positive-600">DND clear</div>
            <div className="text-[10.5px] text-fg-secondary mt-0.5 leading-relaxed">
              Safe to reach out.
            </div>
          </div>
        </div>
      )}
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.key} className="flex items-center justify-between text-[11.5px]">
            <div>
              <span className="font-semibold text-fg-primary">{it.key}</span>
              {it.hint && <span className="text-fg-muted ml-1.5">· {it.hint}</span>}
            </div>
            {it.ok ? (
              <span className="inline-flex items-center gap-1 text-positive-600 font-semibold text-[10.5px]">
                <BadgeCheck className="h-3 w-3" /> Opt-in
              </span>
            ) : (
              <span className="text-fg-muted font-semibold text-[10.5px]">Opted out</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------------- AI insights (right-column hero) ---------------- */

function AIInsightsCard({
  score,
  latestSentiment,
  callCount,
  lastCallAt,
  openDealsCount,
  openDealValue,
}: {
  score: any;
  latestSentiment: number | null;
  callCount: number;
  lastCallAt: string | null;
  openDealsCount: number;
  openDealValue: number;
}): React.JSX.Element {
  return (
    <Card padded>
      <SectionHead
        title="AI insights"
        action={
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent-700 bg-accent-100 rounded px-1.5 py-0.5">
            <Sparkles className="h-3 w-3" /> Live
          </span>
        }
      />

      {/* Score meter */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            Lead score
          </span>
          <span className="text-[24px] font-semibold text-fg-primary tabular-nums leading-none">
            {score.score}
          </span>
        </div>
        <div className="h-1.5 bg-bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              score.band === "hot"
                ? "bg-emerald-500"
                : score.band === "warm"
                  ? "bg-amber-500"
                  : score.band === "cool"
                    ? "bg-blue-500"
                    : "bg-fg-muted"
            }`}
            style={{ width: `${score.score}%` }}
          />
        </div>
        {score.reasons.length > 0 && (
          <ul className="mt-2 space-y-1">
            {score.reasons.slice(0, 4).map((r: string, i: number) => (
              <li key={i} className="text-[10.5px] text-fg-secondary flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-fg-muted" />
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sentiment */}
      {typeof latestSentiment === "number" && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted mb-1">
            Last call sentiment
          </div>
          <div
            className={`text-[12.5px] font-semibold ${
              latestSentiment > 0.3
                ? "text-positive-600"
                : latestSentiment < -0.3
                  ? "text-negative-500"
                  : "text-fg-secondary"
            }`}
          >
            {latestSentiment > 0.3 ? "Positive" : latestSentiment < -0.3 ? "Negative" : "Neutral"}
            <span className="text-fg-muted ml-1 text-[10.5px] font-medium">
              ({(latestSentiment * 100).toFixed(0)})
            </span>
          </div>
        </div>
      )}

      {/* Quick metrics */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-md bg-bg-subtle border border-line-subtle p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            Calls
          </div>
          <div className="text-[14px] font-semibold text-fg-primary tabular-nums">
            {callCount || 0}
          </div>
          {lastCallAt && (
            <div className="text-[9.5px] text-fg-muted mt-0.5">
              Last {formatTimeAgo(lastCallAt)}
            </div>
          )}
        </div>
        <div className="rounded-md bg-bg-subtle border border-line-subtle p-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            Pipeline
          </div>
          <div className="text-[14px] font-semibold text-fg-primary tabular-nums">
            {openDealsCount > 0 ? formatINR(openDealValue) : "—"}
          </div>
          <div className="text-[9.5px] text-fg-muted mt-0.5">
            {openDealsCount} open deal{openDealsCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Removed AI-extracted fields and rules button as requested */}
    </Card>
  );
}

/* ---------------- Deals + suggested actions ---------------- */

function DealsCard({
  contact,
  pipelines,
  onCreated,
}: {
  contact: any;
  pipelines: any[];
  onCreated: () => void;
}): React.JSX.Element {
  const [creating, setCreating] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [value, setValue] = React.useState("");
  const [pipelineId, setPipelineId] = React.useState<string>("");
  const [stage, setStage] = React.useState<string>("");

  const openDeals = (contact.deals || []).filter((d: any) => !d.deletedAt);

  const createDeal = useMutation({
    mutationFn: async () => {
      const res = await api.post("/crm/deals", {
        contactId: contact.id,
        pipelineId: pipelineId || null,
        title: title.trim(),
        value: Number(value),
        stage,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Deal created");
      setCreating(false);
      setTitle("");
      setValue("");
      onCreated();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to create deal"),
  });

  // Suggest a deal from extracted fields (budget-ish or intent-ish)
  const suggestion = React.useMemo(() => {
    const extracted = contact.extractedSummary || {};
    let suggestedValue: number | null = null;
    let suggestedTitle: string | null = null;
    for (const [k, v] of Object.entries(extracted)) {
      const lk = k.toLowerCase();
      if (
        lk.includes("budget") ||
        lk.includes("value") ||
        lk.includes("price") ||
        lk.includes("amount")
      ) {
        const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.]/g, ""));
        if (!Number.isNaN(n) && n > 0) suggestedValue = n;
      }
      if (lk.includes("interest") || lk.includes("product") || lk.includes("service")) {
        suggestedTitle = String(v);
      }
    }
    if (suggestedValue || suggestedTitle) {
      return { value: suggestedValue, title: suggestedTitle };
    }
    return null;
  }, [contact.extractedSummary]);

  const startCreate = () => {
    setTitle(suggestion?.title || `${contact.firstName} ${contact.lastName} deal`);
    setValue(suggestion?.value ? String(suggestion.value) : "");
    setPipelineId(pipelines[0]?.id || "");
    setStage(pipelines[0]?.stages?.[0] || "");
    setCreating(true);
  };

  return (
    <Card padded>
      <SectionHead
        title="Deals"
        action={
          !creating && (
            <button
              type="button"
              onClick={startCreate}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          )
        }
      />

      {suggestion && !creating && openDeals.length === 0 && (
        <div className="rounded-md bg-accent-100 border border-accent-500/25 p-2.5 mb-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-700">
            <Zap className="h-3 w-3" /> AI suggestion
          </div>
          <div className="text-[11.5px] text-fg-primary mt-1 leading-snug">
            The AI heard <b>{suggestion.title || "an intent signal"}</b>
            {suggestion.value ? ` around ${formatINR(suggestion.value)}` : ""} on a recent call.
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="text-[11px] font-semibold text-accent-700 hover:text-accent-600 mt-1.5"
          >
            Create deal →
          </button>
        </div>
      )}

      {creating ? (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Deal title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
          />
          <input
            type="number"
            placeholder="Value ₹"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
          />
          <select
            value={pipelineId}
            onChange={(e) => {
              setPipelineId(e.target.value);
              const p = pipelines.find((pp: any) => pp.id === e.target.value);
              setStage(p?.stages?.[0] || "");
            }}
            className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
          >
            {pipelines.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {pipelineId && (
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full h-8 bg-bg-raised border border-line-default focus:border-brand-500 text-[12px] text-fg-primary rounded-md px-2 focus:outline-none"
            >
              {pipelines
                .find((p: any) => p.id === pipelineId)
                ?.stages?.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
            </select>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="text-[11px] font-semibold text-fg-secondary hover:text-fg-primary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => createDeal.mutate()}
              disabled={!title || !value || !pipelineId || !stage || createDeal.isPending}
              className="h-7 px-3 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-semibold disabled:opacity-50"
            >
              {createDeal.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      ) : openDeals.length === 0 ? (
        <div className="text-[11.5px] text-fg-muted italic">No open deals.</div>
      ) : (
        <ul className="space-y-2">
          {openDeals.map((d: any) => (
            <li key={d.id} className="rounded-md border border-line-default bg-bg-raised p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold text-fg-primary truncate">
                  {d.title}
                </span>
                <StatusPill tone="brand">{d.stage}</StatusPill>
              </div>
              <div className="text-[11.5px] text-brand-600 font-semibold mt-1">
                {formatINR(d.value)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/* ---------------- Activity row ---------------- */

function ActivityRow({ activity: a }: { activity: any }): React.JSX.Element {
  const [showTranscript, setShowTranscript] = React.useState(false);
  // Key strictly off the activity's own type — the commLog join is shared by
  // several activity rows (call + field-update from the same call), so using
  // commLog.type here would duplicate call details onto every linked entry.
  const isCall = a.type === "CALL_INBOUND" || a.type === "CALL_OUTBOUND";
  const isSms = a.type === "SMS_SENT" || a.type === "SMS_RECEIVED";
  const isWhatsApp = a.type === "WHATSAPP_SENT" || a.type === "WHATSAPP_RECEIVED";

  const extracted = (isCall && a.commLog?.extractedFields) || {};
  const aiSummary = typeof extracted.summary === "string" ? extracted.summary : null;
  const extractedEntries = Object.entries(extracted)
    .filter(([k, v]) => k !== "summary" && v !== null && v !== undefined && v !== "")
    .slice(0, 6);
  // `sentimentScore` stores the post-call lead score (0-100).
  const leadScore =
    isCall && typeof a.commLog?.sentimentScore === "number"
      ? Math.round(a.commLog.sentimentScore)
      : null;

  return (
    <TimelineItem
      type={a.type}
      title={formatActivitySummary(a.summary)}
      timestamp={`${new Date(a.occurredAt).toLocaleString("en-IN")} · ${formatTimeAgo(a.occurredAt)}`}
      extra={
        leadScore !== null && (
          <StatusPill tone={leadScore >= 70 ? "positive" : leadScore >= 40 ? "attention" : "muted"}>
            Call score {leadScore}
          </StatusPill>
        )
      }
    >
      {isCall && a.commLog && (
        <div className="rounded-md border border-line-subtle bg-bg-subtle/70 p-3 space-y-2">
          {aiSummary && (
            <p className="text-[11.5px] text-fg-primary leading-relaxed">
              <Sparkles className="h-3 w-3 inline-block mr-1 text-accent-700" />
              {aiSummary}
            </p>
          )}

          {extractedEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {extractedEntries.map(([k, v]) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 bg-accent-100 border border-accent-500/25 text-accent-700 text-[10.5px] font-semibold rounded-md px-1.5 py-0.5"
                  title={String(v)}
                >
                  <span className="capitalize">{k.replace(/_/g, " ")}:</span>
                  <span className="text-fg-primary font-bold truncate max-w-[140px]">
                    {String(v)}
                  </span>
                </span>
              ))}
            </div>
          )}

          {a.commLog.recordingUrl && a.commLogId && (
            <RecordingPlayer logId={a.commLogId} fallbackDuration={a.commLog.duration} />
          )}

          <div className="flex items-center gap-4">
            {a.commLog.transcript && (
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="text-[10.5px] font-semibold text-brand-600 hover:text-brand-700"
              >
                {showTranscript ? "Hide transcript" : "Show transcript"}
              </button>
            )}
            {a.commLog.agentId && (
              <button
                type="button"
                onClick={() => window.open(`/agents/${a.commLog.agentId}`, "_blank")}
                className="text-[10.5px] font-semibold text-brand-600 hover:text-brand-700"
              >
                View full log →
              </button>
            )}
          </div>

          {showTranscript && a.commLog.transcript && (
            <p className="text-[11.5px] text-fg-secondary leading-relaxed whitespace-pre-line border-l-2 border-brand-500/40 pl-3">
              {a.commLog.transcript}
            </p>
          )}
        </div>
      )}

      {(isSms || isWhatsApp) && a.commLog?.body && (
        <div className="rounded-md border border-line-subtle bg-bg-subtle/70 p-3">
          <p className="text-[12px] text-fg-primary leading-relaxed">{a.commLog.body}</p>
        </div>
      )}

      {a.type === "FIELD_UPDATED" && a.metadata?.fields && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(a.metadata.fields as Record<string, unknown>).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 bg-bg-muted border border-line-default text-fg-secondary text-[10.5px] font-semibold rounded-md px-1.5 py-0.5"
              title={String(v)}
            >
              <span>{k}:</span>
              <span className="text-fg-primary font-bold truncate max-w-[140px]">{String(v)}</span>
            </span>
          ))}
        </div>
      )}
    </TimelineItem>
  );
}
