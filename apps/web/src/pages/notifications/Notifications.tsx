import * as React from "react";
import { toast } from "sonner";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import {
  Card,
  PageHeader,
  AppButton,
  Toggle,
  inputClass,
  textareaClass,
} from "../../components/common/UI.tsx";
import {
  Mail,
  MessageSquare,
  Plus,
  Send,
  Check,
  X,
  Slack,
  PhoneCall,
  Copy,
  Signal,
  Wifi,
  Battery,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ChannelKey = "email" | "sms" | "slack";
type EventKey = "call_ended";

interface Recipient {
  id: string;
  type: ChannelKey;
  value: string;
  label?: string;
}
interface EventDef {
  key: EventKey;
  title: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "brand" | "positive" | "attention" | "negative" | "accent";
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const EVENTS: EventDef[] = [
  { key: "call_ended", title: "Call ended", hint: "Summary after every AI call", icon: PhoneCall, tone: "brand" },
];

const CHANNEL_META: Record<ChannelKey, {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: string;
  tint: string;      // full-color chip background
  tintText: string;
  soft: string;      // soft tinted background
  softText: string;
  softRing: string;
}> = {
  email: {
    name: "Email",
    icon: Mail,
    hint: "Sent from notify@indi.ai (SPF verified)",
    tint: "bg-brand-500",
    tintText: "text-white",
    soft: "bg-brand-50",
    softText: "text-brand-600",
    softRing: "ring-brand-500/25",
  },
  sms: {
    name: "SMS",
    icon: MessageSquare,
    hint: "Sent via your Twilio DLT sender",
    tint: "bg-emerald-500",
    tintText: "text-white",
    soft: "bg-emerald-50",
    softText: "text-emerald-600",
    softRing: "ring-emerald-500/25",
  },
  slack: {
    name: "Slack",
    icon: Slack,
    hint: "Posts to your team channel",
    tint: "bg-violet-500",
    tintText: "text-white",
    soft: "bg-violet-50",
    softText: "text-violet-600",
    softRing: "ring-violet-500/25",
  },
};

const TONE_STYLES: Record<EventDef["tone"], string> = {
  brand:     "bg-brand-50 text-brand-600 ring-brand-500/20",
  positive:  "bg-positive-50 text-positive-500 ring-positive-500/20",
  attention: "bg-attention-50 text-attention-600 ring-attention-500/20",
  negative:  "bg-negative-50 text-negative-500 ring-negative-500/20",
  accent:    "bg-accent-100 text-accent-700 ring-accent-500/25",
};

// Default templates per event × channel
const DEFAULT_TEMPLATES: Record<EventKey, {
  emailSubject: string;
  email: string;
  sms: string;
  slack: string;
}> = {
  call_ended: {
    emailSubject: "[Indi AI] Call ended — {{contact_name}}",
    email:
      "Hi {{owner_name}},\n\n{{contact_name}} just spoke with {{agent_name}} for {{duration}}.\n\nSummary: {{summary}}\n\nOutcome: {{outcome}}\nView the full transcript: {{transcript_url}}",
    sms:
      "Indi AI: {{contact_name}} · {{duration}} · {{outcome}}. Details: {{short_url}}",
    slack:
      ":telephone_receiver: *Call ended* — {{contact_name}} spoke with {{agent_name}} for {{duration}}.\n> {{summary}}\n<{{transcript_url}}|View transcript>",
  },
};

// Sample values used to preview {{variables}}
const SAMPLE_VARS: Record<string, string> = {
  owner_name: "Yogendra",
  contact_name: "Amit Sharma",
  contact_phone: "+91 98765 43210",
  agent_name: "Priya",
  duration: "3m 42s",
  outcome: "Booked",
  summary: "Wants to book a facial + haircut for tomorrow at 4 PM.",
  transcript_url: "https://indi.ai/t/x8y2",
  short_url: "indi.ai/t/x8y2",
  intent_summary: "asked about pricing for 3 services",
  deal_url: "https://indi.ai/crm/d/912",
  callback_url: "https://indi.ai/cb/8712",
  service: "Facial",
  booking_date: "Sat, 25 Nov",
  booking_time: "4:00 PM",
  contact_url: "https://indi.ai/crm/c/324",
  credit_amount: "1,000",
  balance: "1,847",
  balance_pct: "12",
  billing_url: "https://indi.ai/billing",
  invoice_url: "https://indi.ai/i/inv-2401",
  calls_handled: "843",
  leads_captured: "214",
  bookings: "68",
  dashboard_url: "https://indi.ai/dashboard",
};

function render(template: string): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => SAMPLE_VARS[k] || `{{${k}}}`);
}

const VARIABLES = [
  "contact_name", "contact_phone", "agent_name", "duration",
  "outcome", "summary", "transcript_url", "owner_name",
  "booking_date", "booking_time", "callback_url",
];

// ─────────────────────────────────────────────────────────────
// Preview components
// ─────────────────────────────────────────────────────────────

function EmailPreview({ subject, body }: { subject: string; body: string }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-line-default bg-white overflow-hidden h-full flex flex-col shadow-card">
      {/* Client chrome */}
      <div className="border-b border-line-subtle bg-bg-subtle px-3 py-1.5 flex items-center gap-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[10px] font-semibold text-fg-muted ml-1">Inbox</span>
      </div>
      {/* Envelope */}
      <div className="px-4 py-3 border-b border-line-subtle bg-white">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="h-8 w-8 rounded-full text-white flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ backgroundColor: "#2563EB" }}
          >
            IA
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-fg-primary truncate">
              Indi AI <span className="text-fg-muted font-normal">&lt;notify@indi.ai&gt;</span>
            </div>
            <div className="text-[10px] text-fg-muted truncate">
              to yogendra@myaifrontdesk.com
            </div>
          </div>
        </div>
        <div className="text-[13px] font-semibold text-fg-primary leading-snug">
          {render(subject)}
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 py-3 bg-white">
        <p className="text-[12px] text-fg-primary leading-relaxed whitespace-pre-wrap">
          {render(body)}
        </p>
      </div>
      <div className="border-t border-line-subtle px-4 py-2 bg-bg-subtle flex items-center gap-2 text-[10px] text-fg-muted">
        <Mail className="h-3 w-3 text-brand-500" />
        Delivered to inbox · not spam
      </div>
    </div>
  );
}

function SmsPreview({ body }: { body: string }): React.JSX.Element {
  const rendered = render(body);
  return (
    <div className="flex items-start justify-center h-full">
      <div className="w-[240px] rounded-[28px] p-2 bg-slate-900 shadow-pop">
        <div className="rounded-[22px] bg-white overflow-hidden">
          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1.5 text-[9.5px] font-semibold text-slate-900 bg-white">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <Signal className="h-2.5 w-2.5" />
              <Wifi className="h-2.5 w-2.5" />
              <Battery className="h-3 w-3" />
            </div>
          </div>
          {/* Nav bar */}
          <div className="border-y border-line-subtle bg-bg-subtle px-3 py-2 flex items-center gap-2">
            <span className="text-[9.5px] text-brand-500">‹ Messages</span>
            <div className="flex-1 text-center">
              <div className="text-[10.5px] font-semibold text-fg-primary">Indi AI</div>
              <div className="text-[8.5px] text-fg-muted">+91 8000 123 456</div>
            </div>
            <span className="w-4" />
          </div>
          {/* Bubbles */}
          <div className="p-3 space-y-2 bg-slate-50 min-h-[260px]">
            <div className="text-center text-[9px] text-fg-muted font-medium mb-1">Today · 9:41 AM</div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-emerald-500 text-white px-3 py-2 shadow-sm">
              <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{rendered}</p>
            </div>
            <div className="text-[8.5px] text-fg-muted pl-1">Delivered</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SlackPreview({ body }: { body: string }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-line-default bg-white overflow-hidden h-full flex flex-col shadow-card">
      {/* Slack chrome */}
      <div className="bg-[#3F0E40] text-white px-3 py-2 flex items-center gap-2">
        <div className="h-5 w-5 rounded bg-white/20 flex items-center justify-center">
          <Slack className="h-3 w-3" />
        </div>
        <div className="min-w-0">
          <div className="text-[10.5px] font-semibold leading-tight"># calls-team</div>
          <div className="text-[9px] opacity-70">Rajesh Distributors</div>
        </div>
      </div>
      {/* Message */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 py-3 bg-white">
        <div className="flex gap-2.5">
          <div
            className="h-8 w-8 rounded text-white flex items-center justify-center text-[11px] font-bold shrink-0"
            style={{ backgroundColor: "#7C3AED" }}
          >
            IA
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[11.5px] font-bold text-fg-primary">Indi AI</span>
              <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">APP</span>
              <span className="text-[9.5px] text-fg-muted">9:41 AM</span>
            </div>
            <div className="text-[12px] text-fg-primary leading-relaxed whitespace-pre-wrap">
              {render(body).split("\n").map((line, i) => {
                // Naive Slack markdown: *bold*, > blockquote, <url|text>
                let node: React.ReactNode = line;
                node = String(node).replace(/<([^|]+)\|([^>]+)>/g, (_m, _url, text) => `[${text}]`);
                if (line.startsWith("> ")) {
                  return (
                    <div key={i} className="border-l-4 border-slate-300 pl-2 my-1 text-fg-secondary italic">
                      {String(node).slice(2)}
                    </div>
                  );
                }
                return (
                  <div key={i}>
                    {String(node).split(/(\*[^*]+\*)/g).map((chunk, j) =>
                      chunk.startsWith("*") && chunk.endsWith("*") ? (
                        <strong key={j} className="font-bold">{chunk.slice(1, -1)}</strong>
                      ) : (
                        <React.Fragment key={j}>{chunk}</React.Fragment>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-line-subtle px-3 py-2 bg-bg-subtle text-[10px] text-fg-muted flex items-center gap-1">
        <Slack className="h-3 w-3 text-violet-500" />
        Posted to workspace
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Small atoms
// ─────────────────────────────────────────────────────────────

const CHANNEL_HEX: Record<ChannelKey, { active: string; hover: string; shadow: string }> = {
  email: { active: "#2563EB", hover: "#1D4ED8", shadow: "rgba(37,99,235,0.35)" },
  sms:   { active: "#059669", hover: "#047857", shadow: "rgba(5,150,105,0.35)" },
  slack: { active: "#7C3AED", hover: "#6D28D9", shadow: "rgba(124,58,237,0.35)" },
};

const ChannelTab: React.FC<{
  channel: ChannelKey;
  active: boolean;
  onClick: () => void;
  enabled: boolean;
  recipientCount: number;
}> = ({ channel, active, onClick, enabled, recipientCount }) => {
  const meta = CHANNEL_META[channel];
  const hex = CHANNEL_HEX[channel];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center gap-2 px-3 h-11 rounded-lg border transition-all text-left"
      style={
        active
          ? {
              backgroundColor: hex.active,
              color: "#FFFFFF",
              borderColor: hex.active,
              boxShadow: `0 2px 6px ${hex.shadow}, 0 1px 2px rgba(0,0,0,0.08)`,
            }
          : { backgroundColor: "#F8FAFC", color: "#475569", borderColor: "#E5E7EB" }
      }
    >
      <span
        className="h-6 w-6 rounded-md flex items-center justify-center shrink-0"
        style={{
          backgroundColor: active ? "rgba(255,255,255,0.25)" : "transparent",
          color: active ? "#FFFFFF" : hex.active,
        }}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold leading-tight">{meta.name}</div>
        <div className={`text-[10px] ${active ? "opacity-80" : "text-fg-muted"}`}>
          {enabled ? `${recipientCount} recipient${recipientCount === 1 ? "" : "s"}` : "Disabled"}
        </div>
      </div>
      {enabled && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={active ? { backgroundColor: "#FFFFFF" } : { backgroundColor: "#16A34A" }}
        />
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export function Notifications(): React.JSX.Element {
  const [selectedEvent, setSelectedEvent] = React.useState<EventKey>("call_ended");
  const [selectedChannel, setSelectedChannel] = React.useState<ChannelKey>("email");

  // Rules: which events fire on which channels
  const [rules, setRules] = React.useState<Record<EventKey, Record<ChannelKey, boolean>>>(() => {
    const init: any = {};
    EVENTS.forEach((e) => {
      init[e.key] = {
        email: true,
        sms: true,
        slack: true,
      };
    });
    return init;
  });

  // Recipients per channel
  const [recipients, setRecipients] = React.useState<Recipient[]>([
    { id: "r1", type: "email", value: "yogendra@myaifrontdesk.com", label: "Owner" },
    { id: "r2", type: "email", value: "priya@rajesh-distributors.in", label: "Manager" },
    { id: "r3", type: "sms",   value: "+91 98765 43210", label: "Owner mobile" },
    { id: "r4", type: "slack", value: "#calls-team",     label: "Team channel" },
  ]);

  // Templates
  const [templates, setTemplates] = React.useState(DEFAULT_TEMPLATES);

  // New recipient input
  const [newRecipient, setNewRecipient] = React.useState("");

  const eventDef = EVENTS.find((e) => e.key === selectedEvent)!;
  const channelMeta = CHANNEL_META[selectedChannel];
  const currentEnabled = rules[selectedEvent][selectedChannel];
  const channelRecipients = recipients.filter((r) => r.type === selectedChannel);
  const tpl = templates[selectedEvent];

  const toggleChannelForEvent = (v: boolean) => {
    setRules((prev) => ({
      ...prev,
      [selectedEvent]: { ...prev[selectedEvent], [selectedChannel]: v },
    }));
  };

  const addRecipient = () => {
    const v = newRecipient.trim();
    if (!v) {
      toast.error(`Enter an ${selectedChannel === "sms" ? "phone number" : selectedChannel === "email" ? "email" : "channel"} first.`);
      return;
    }
    setRecipients((prev) => [
      ...prev,
      { id: `r${Date.now()}`, type: selectedChannel, value: v },
    ]);
    setNewRecipient("");
    toast.success("Recipient added.");
  };

  const removeRecipient = (id: string) => {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
  };

  const updateTemplate = (field: "emailSubject" | "email" | "sms" | "slack", value: string) => {
    setTemplates((prev) => ({
      ...prev,
      [selectedEvent]: { ...prev[selectedEvent], [field]: value },
    }));
  };

  const bodyField = selectedChannel === "email" ? "email" : selectedChannel;
  const currentBody = tpl[bodyField];
  const currentPlaceholder =
    selectedChannel === "sms"
      ? "+91 98765 43210"
      : selectedChannel === "email"
      ? "name@company.com"
      : "#channel-name";
  const currentInputLabel = selectedChannel === "sms" ? "Phone number" : selectedChannel === "email" ? "Email address" : "Slack channel";

  return (
    <PageWrapper noScroll={true}>
      <PageHeader
        title="Notifications"
        subtitle={<span>Pick an event on the left. Set who gets notified and how — right there.</span>}
        actions={
          <>
            <AppButton
              variant="secondary"
              icon={<Send className="h-3.5 w-3.5" />}
              onClick={() => toast.success(`Test ${channelMeta.name} sent for “${eventDef.title}”.`)}
            >
              Send test
            </AppButton>
            <AppButton
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={() => toast.success("Notification settings saved.")}
            >
              Save
            </AppButton>
          </>
        }
      />

      {/* ═══════════ 3-column layout · fills all vertical space ═══════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_360px] gap-3 flex-1 min-h-0">
        {/* ── LEFT: Events list ── */}
        <Card className="flex flex-col min-h-0 p-2">
          <div className="px-2 pt-1 pb-2 shrink-0">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted">
              Events
            </div>
            <div className="text-[10.5px] text-fg-muted mt-0.5">
              {EVENTS.length} triggers configured
            </div>
          </div>
          <ul className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5">
            {EVENTS.map((e) => {
              const isActive = selectedEvent === e.key;
              const channelCount = (Object.values(rules[e.key]) as boolean[]).filter(Boolean).length;
              return (
                <li key={e.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedEvent(e.key)}
                    className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all text-left"
                    style={
                      isActive
                        ? {
                            backgroundColor: "#2563EB",
                            color: "#FFFFFF",
                            boxShadow: "0 2px 4px rgba(37,99,235,0.35)",
                          }
                        : { backgroundColor: "transparent", color: "#0F172A" }
                    }
                  >
                    <span
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={isActive ? { backgroundColor: "rgba(255,255,255,0.2)", color: "#FFFFFF" } : {}}
                    >
                      {isActive ? (
                        <e.icon className="h-3.5 w-3.5" />
                      ) : (
                        <span className={`${TONE_STYLES[e.tone]} ring-1 rounded-lg h-7 w-7 -m-0 flex items-center justify-center`}>
                          <e.icon className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold leading-tight truncate">
                        {e.title}
                      </div>
                      <div
                        className="text-[10px] truncate"
                        style={isActive ? { color: "rgba(255,255,255,0.85)" } : { color: "#64748B" }}
                      >
                        {e.hint}
                      </div>
                    </div>
                    <span
                      className="shrink-0 inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[9.5px] font-bold"
                      style={
                        isActive
                          ? { backgroundColor: "rgba(255,255,255,0.22)", color: "#FFFFFF" }
                          : channelCount > 0
                          ? { backgroundColor: "#F0FDF4", color: "#16A34A", boxShadow: "inset 0 0 0 1px rgba(22,163,74,0.25)" }
                          : { backgroundColor: "#F1F5F9", color: "#94A3B8" }
                      }
                    >
                      {channelCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* ── MIDDLE: config for selected event × channel ── */}
        <Card className="flex flex-col min-h-0">
          {/* Event header */}
          <div className="flex items-start gap-3 pb-3 border-b border-line-subtle shrink-0">
            <span className={`h-10 w-10 rounded-lg flex items-center justify-center ring-1 ${TONE_STYLES[eventDef.tone]}`}>
              <eventDef.icon className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-fg-primary tracking-tight">
                {eventDef.title}
              </h2>
              <p className="text-[11.5px] text-fg-secondary mt-0.5">{eventDef.hint}</p>
            </div>
          </div>

          {/* Channel picker */}
          <div className="pt-3 shrink-0">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted mb-2">
              1. Pick how they hear about it
            </div>
            <div className="flex gap-2">
              {(Object.keys(CHANNEL_META) as ChannelKey[]).map((ch) => (
                <ChannelTab
                  key={ch}
                  channel={ch}
                  active={selectedChannel === ch}
                  onClick={() => setSelectedChannel(ch)}
                  enabled={rules[selectedEvent][ch]}
                  recipientCount={recipients.filter((r) => r.type === ch).length}
                />
              ))}
            </div>
          </div>

          {/* Channel body — scrolls internally, no visible bar */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pt-4 pr-1 -mr-1 space-y-4">
            {/* Enable toggle for this channel × event */}
            <div className={`rounded-lg border ${currentEnabled ? "border-line-default bg-bg-raised" : "border-dashed border-line-strong bg-bg-subtle"} px-3 py-2.5 flex items-center justify-between gap-3`}>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-fg-primary leading-tight">
                  Send {channelMeta.name} when {eventDef.title.toLowerCase()}
                </div>
                <div className="text-[10.5px] text-fg-muted mt-0.5">{channelMeta.hint}</div>
              </div>
              <Toggle checked={currentEnabled} onChange={toggleChannelForEvent} />
            </div>

            {/* Recipients */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted">
                  2. Who receives it
                </div>
                <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold ${channelMeta.softText}`}>
                  <channelMeta.icon className="h-3 w-3" />
                  {channelMeta.name}
                </span>
              </div>

              {channelRecipients.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {channelRecipients.map((r) => (
                    <span
                      key={r.id}
                      className={`inline-flex items-center gap-1.5 rounded-full ${channelMeta.soft} ring-1 ${channelMeta.softRing} pl-2 pr-1 py-1`}
                    >
                      <channelMeta.icon className={`h-3 w-3 ${channelMeta.softText}`} />
                      <span className={`text-[11.5px] font-semibold ${channelMeta.softText}`}>
                        {r.value}
                      </span>
                      {r.label && (
                        <span className="text-[9.5px] text-fg-muted px-1.5 py-0.5 bg-white rounded-full font-semibold">
                          {r.label}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeRecipient(r.id)}
                        className="p-0.5 rounded-full hover:bg-white transition-colors text-fg-muted hover:text-negative-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-line-strong bg-bg-subtle px-3 py-2.5 text-[11px] text-fg-secondary mb-2">
                  No {channelMeta.name} recipients yet. Add one below.
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2">
                    <channelMeta.icon className={`h-3.5 w-3.5 ${channelMeta.softText}`} />
                  </span>
                  <input
                    type="text"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                    placeholder={`${currentInputLabel} — e.g. ${currentPlaceholder}`}
                    className={`${inputClass} pl-8`}
                  />
                </div>
                <AppButton
                  variant="primary"
                  size="sm"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={addRecipient}
                >
                  Add
                </AppButton>
              </div>
            </div>

            {/* Template */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted">
                  3. What it says
                </div>
                <span className="text-[10.5px] text-fg-muted font-medium">
                  Preview updates on the right →
                </span>
              </div>

              {selectedChannel === "email" && (
                <div className="mb-2">
                  <label className="block text-[11px] font-semibold text-fg-primary mb-1">
                    Subject line
                  </label>
                  <input
                    type="text"
                    value={tpl.emailSubject}
                    onChange={(e) => updateTemplate("emailSubject", e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <label className="block text-[11px] font-semibold text-fg-primary mb-1.5">
                {selectedChannel === "email" ? "Body" : "Message"}
              </label>
              <textarea
                value={currentBody}
                onChange={(e) => updateTemplate(bodyField, e.target.value)}
                rows={selectedChannel === "sms" ? 4 : selectedChannel === "slack" ? 7 : 9}
                className={`${textareaClass} font-mono text-[12px] leading-relaxed`}
              />

              {selectedChannel === "sms" && (
                <div className="mt-1 flex items-center justify-between text-[10.5px] text-fg-muted">
                  <span>
                    {currentBody.length} chars ·{" "}
                    <span className="font-semibold text-fg-primary tabular-nums">
                      {Math.max(1, Math.ceil(currentBody.length / 160))}
                    </span>{" "}
                    SMS segment{Math.ceil(currentBody.length / 160) === 1 ? "" : "s"}
                  </span>
                  <span>Twilio DLT</span>
                </div>
              )}
            </div>

            {/* Variables — visually separated panel */}
            <div
              className="mt-4 rounded-lg border p-3"
              style={{ backgroundColor: "#F8FAFC", borderColor: "#E5E7EB" }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted">
                  Available variables
                </div>
                <span className="text-[10px] text-fg-muted">Click to copy</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(`{{${v}}}`).then(
                        () => toast.success(`{{${v}}} copied`),
                        () => {}
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-md text-[10.5px] font-mono font-semibold px-2 py-1 transition-all border"
                    style={{
                      backgroundColor: "#FFFFFF",
                      color: "#475569",
                      borderColor: "#E5E7EB",
                    }}
                  >
                    <Copy className="h-2.5 w-2.5" />
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ── RIGHT: Live preview ── */}
        <div className="flex flex-col min-h-0 gap-2">
          <div className="flex items-center justify-between shrink-0 px-1">
            <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted">
              Live preview
            </div>
            <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${channelMeta.soft} ${channelMeta.softText}`}>
              <channelMeta.icon className="h-3 w-3" />
              {channelMeta.name}
            </span>
          </div>

          <div className="flex-1 min-h-0">
            {selectedChannel === "email" && (
              <EmailPreview subject={tpl.emailSubject} body={tpl.email} />
            )}
            {selectedChannel === "sms" && <SmsPreview body={tpl.sms} />}
            {selectedChannel === "slack" && <SlackPreview body={tpl.slack} />}
          </div>

          <div className="text-[10px] text-fg-muted text-center shrink-0">
            Preview uses sample data for {SAMPLE_VARS.contact_name}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default Notifications;
