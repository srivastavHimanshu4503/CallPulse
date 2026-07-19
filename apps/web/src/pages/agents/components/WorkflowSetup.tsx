import * as React from "react";
import { Plus, ClipboardList, MessageSquareText, Webhook, PhoneForwarded, CalendarDays, ChevronDown, Lock } from "lucide-react";
import { toast } from "sonner";
import { useEntitlements } from "../../../hooks/useEntitlements.js";
import type { AgentBookingConfig } from "@antigravity/types";
import { IntakeScenario, IntakeScenarioCard } from "./IntakeScenarioCard.js";
import { SmsScenario, SmsScenarioCard } from "./SmsScenarioCard.js";
import { ApiScenario, ApiScenarioCard } from "./ApiScenarioCard.js";

interface WorkflowSetupProps {
  workflows: any[];
  intakeWorkflowId: string | null;
  setIntakeWorkflowId: (val: string | null) => void;
  smsWorkflowId: string | null;
  setSmsWorkflowId: (val: string | null) => void;
  intakeEnabled: boolean;
  setIntakeEnabled: (val: boolean) => void;
  setIntakeFields: (val: string[]) => void;
  intakePrompt: string;
  setIntakePrompt: (val: string) => void;
  smsEnabled: boolean;
  setSmsEnabled: (val: boolean) => void;
  smsTriggerCondition: string;
  setSmsTriggerCondition: (val: string) => void;
  smsTemplate: string;
  setSmsTemplate: (val: string) => void;
  smsAgentReply: string;
  setSmsAgentReply: (val: string) => void;
  apiEnabled: boolean;
  setApiEnabled: (val: boolean) => void;
  apiWorkflowId: string | null;
  setApiWorkflowId: (val: string | null) => void;
  apiPrompt: string;
  setApiPrompt: (val: string) => void;
  callTransferEnabled: boolean;
  setCallTransferEnabled: (val: boolean) => void;
  callTransferWorkflowId: string | null;
  setCallTransferWorkflowId: (val: string | null) => void;
  callTransferNumber: string;
  setCallTransferNumber: (val: string) => void;
  callTransferCondition: string;
  setCallTransferCondition: (val: string) => void;
  callTransferMessage: string;
  setCallTransferMessage: (val: string) => void;
  callTransferFallbackNumber: string;
  setCallTransferFallbackNumber: (val: string) => void;
  callTransferTimeoutSec: number;
  setCallTransferTimeoutSec: (val: number) => void;
  callTransferNoAnswerAction: "take_message" | "offer_callback" | "end_politely";
  setCallTransferNoAnswerAction: (val: "take_message" | "offer_callback" | "end_politely") => void;
  callTransferStyle: "warm" | "instant";
  setCallTransferStyle: (val: "warm" | "instant") => void;
  bookingEnabled: boolean;
  setBookingEnabled: (val: boolean) => void;
  bookingConfig: AgentBookingConfig | null;
  setBookingConfig: (val: AgentBookingConfig) => void;
  disabled?: boolean;
}

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+65", label: "🇸🇬 +65" },
  { code: "+61", label: "🇦🇺 +61" },
];

/** Split an E.164-ish string into a known country code + local digits. */
const splitPhone = (full: string): { code: string; local: string } => {
  const cleaned = (full || "").replace(/[^\d+]/g, "");
  for (const { code } of [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length)) {
    if (cleaned.startsWith(code)) return { code, local: cleaned.slice(code.length) };
  }
  return { code: "+91", local: cleaned.replace(/^\+/, "") };
};

const DEFAULT_BOOKING: AgentBookingConfig = {
  triggerCondition: "When the caller wants to book an appointment or site visit",
  provider: "google",
  calendarLink: "",
  meetingDurationMin: 30,
  workingHoursNote: "Mon–Sat, 10:00 AM – 7:00 PM IST",
  confirmationMessage: "Aapki booking confirm ho gayi hai! Aapko confirmation message mil jayega.",
  askEmail: false,
};

export function WorkflowSetup({
  intakeEnabled,
  setIntakeEnabled,
  setIntakeFields,
  intakePrompt,
  setIntakePrompt,
  smsEnabled,
  setSmsEnabled,
  smsTriggerCondition,
  setSmsTriggerCondition,
  smsTemplate,
  setSmsTemplate,
  smsAgentReply,
  setSmsAgentReply,
  apiEnabled,
  setApiEnabled,
  apiPrompt,
  setApiPrompt,
  callTransferEnabled,
  setCallTransferEnabled,
  callTransferNumber,
  setCallTransferNumber,
  callTransferCondition,
  setCallTransferCondition,
  callTransferMessage,
  setCallTransferMessage,
  callTransferFallbackNumber,
  setCallTransferFallbackNumber,
  callTransferTimeoutSec,
  setCallTransferTimeoutSec,
  callTransferNoAnswerAction,
  setCallTransferNoAnswerAction,
  callTransferStyle,
  setCallTransferStyle,
  bookingEnabled,
  setBookingEnabled,
  bookingConfig,
  setBookingConfig,
  disabled,
}: WorkflowSetupProps): React.JSX.Element {
  const { plan } = useEntitlements();
  const isFree = plan === "FREE";

  const [intakeScenarios, setIntakeScenarios] = React.useState<IntakeScenario[]>(() => {
    try {
      if (intakePrompt) {
        const parsed = JSON.parse(intakePrompt);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === "object") {
          const qs = Array.isArray(parsed.questions)
            ? parsed.questions.map((q: any) => (typeof q === "string" ? q : q.question || ""))
            : [];
          return [{
            id: parsed.id || "intake-1",
            triggerName: parsed.triggerName || "General Intake Questionnaire",
            questions: qs.length > 0 ? qs : [""],
            completionMessage: parsed.completionMessage || "Maine aapki requirements save kar li hain.",
          }];
        }
      }
    } catch (e) {}
    return [{
      id: "intake-1",
      triggerName: "Lead Details Gathering",
      questions: ["What is your target budget range?", "Which location or area are you looking in?"],
      completionMessage:
        "Thank you! Maine aapki requirements save kar li hain. Humari team brochures WhatsApp par share karegi.",
    }];
  });

  const [smsScenarios, setSmsScenarios] = React.useState<SmsScenario[]>(() => {
    try {
      if (smsTemplate) {
        if (smsTemplate.trim().startsWith("[")) {
          const parsed = JSON.parse(smsTemplate);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch (e) {}

    if (smsTemplate && smsTemplate.trim()) {
      return [{
        id: "sms-1",
        triggerCondition: smsTriggerCondition || "When pricing is requested by caller",
        smsTemplate: smsTemplate,
        agentReply:
          smsAgentReply || "Maine aapko SMS ke through listings and pricing details send kar di hain.",
      }];
    }

    return [{
      id: "sms-1",
      triggerCondition: "When pricing or brochures requested",
      smsTemplate:
        "Hi {name}, pricing details Sharma Realty ki details: price list/brochures check karein: http://brochure.Sharma...",
      agentReply:
        "Maine aapko SMS ke through pricing aur listings details send kar di hain. Please check karein.",
    }];
  });

  const [apiScenarios, setApiScenarios] = React.useState<ApiScenario[]>(() => {
    try {
      if (apiPrompt && apiPrompt.trim().startsWith("[")) {
        const parsed = JSON.parse(apiPrompt);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [{
      id: "api-1",
      triggerCondition: apiPrompt && !apiPrompt.trim().startsWith("[") ? apiPrompt : "",
      method: "POST" as const,
      url: "",
      headers: "",
      bodyTemplate: "",
      agentReply: "",
    }];
  });

  const [booking, setBooking] = React.useState<AgentBookingConfig>(() => ({
    ...DEFAULT_BOOKING,
    ...(bookingConfig ?? {}),
  }));


  React.useEffect(() => {
    setApiPrompt(JSON.stringify(apiScenarios));
  }, [apiScenarios, setApiPrompt]);

  React.useEffect(() => {
    setBookingConfig(booking);
  }, [booking, setBookingConfig]);

  React.useEffect(() => {
    setIntakePrompt(JSON.stringify(intakeScenarios));
    const allFields: string[] = [];
    intakeScenarios.forEach((sc, scIdx) => {
      sc.questions.forEach((_, qIdx) => {
        allFields.push(`sc_${scIdx + 1}_q_${qIdx + 1}`);
      });
    });
    setIntakeFields(allFields);
  }, [intakeScenarios, setIntakePrompt, setIntakeFields]);

  React.useEffect(() => {
    setSmsTemplate(JSON.stringify(smsScenarios));
    const firstSms = smsScenarios[0];
    if (firstSms) {
      setSmsTriggerCondition(firstSms.triggerCondition);
      setSmsAgentReply(firstSms.agentReply);
    } else {
      setSmsTriggerCondition("");
      setSmsAgentReply("");
    }
  }, [smsScenarios, setSmsTemplate, setSmsTriggerCondition, setSmsAgentReply]);

  const handleUpdateIntakeScenario = (idx: number, updated: IntakeScenario) => {
    const nextList = [...intakeScenarios];
    nextList[idx] = updated;
    setIntakeScenarios(nextList);
  };

  const handleAddIntakeScenario = () => {
    setIntakeScenarios([
      ...intakeScenarios,
      {
        id: `intake-${Math.random().toString()}`,
        triggerName: "",
        questions: [""],
        completionMessage: "",
      },
    ]);
  };

  const handleRemoveIntakeScenario = (idx: number) => {
    if (intakeScenarios.length > 1) {
      setIntakeScenarios(intakeScenarios.filter((_, i) => i !== idx));
    } else {
      toast.error("At least one lead intake scenario is required if enabled");
    }
  };

  const handleUpdateSmsScenario = (idx: number, updated: SmsScenario) => {
    const nextList = [...smsScenarios];
    nextList[idx] = updated;
    setSmsScenarios(nextList);
  };

  const handleAddSmsScenario = () => {
    setSmsScenarios([
      ...smsScenarios,
      {
        id: `sms-${Math.random().toString()}`,
        triggerCondition: "",
        smsTemplate: "",
        agentReply: "",
      },
    ]);
  };

  const handleRemoveSmsScenario = (idx: number) => {
    if (smsScenarios.length > 1) {
      setSmsScenarios(smsScenarios.filter((_, i) => i !== idx));
    } else {
      toast.error("At least one SMS scenario is required if enabled");
    }
  };

  const handleUpdateApiScenario = (idx: number, updated: ApiScenario) => {
    const nextList = [...apiScenarios];
    nextList[idx] = updated;
    setApiScenarios(nextList);
  };

  const handleAddApiScenario = () => {
    setApiScenarios([
      ...apiScenarios,
      {
        id: `api-${Math.random().toString()}`,
        triggerCondition: "",
        method: "POST",
        url: "",
        headers: "",
        bodyTemplate: "",
        agentReply: "",
      },
    ]);
  };

  const handleRemoveApiScenario = (idx: number) => {
    if (apiScenarios.length > 1) {
      setApiScenarios(apiScenarios.filter((_, i) => i !== idx));
    } else {
      toast.error("At least one API scenario is required if enabled");
    }
  };

  const setBookingField = <K extends keyof AgentBookingConfig>(field: K, value: AgentBookingConfig[K]) => {
    setBooking((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-5 font-sans">
      {/* INTAKE */}
      <FeatureBlock
        icon={ClipboardList}
        title="In-call lead intake"
        description="Ask callers specific questions in real-time and capture the answers as structured leads."
        enabled={intakeEnabled}
        setEnabled={setIntakeEnabled}
        countBadge={intakeEnabled ? `${intakeScenarios.length} scenario${intakeScenarios.length > 1 ? "s" : ""}` : undefined}
        disabled={disabled}
      >
        <div className="space-y-3">
          {intakeScenarios.map((sc, idx) => (
            <IntakeScenarioCard
              key={sc.id}
              scenario={sc}
              index={idx}
              onUpdate={(upd) => handleUpdateIntakeScenario(idx, upd)}
              onDelete={() => handleRemoveIntakeScenario(idx)}
              disabled={disabled}
            />
          ))}
          <button
            type="button"
            onClick={handleAddIntakeScenario}
            disabled={disabled}
            className="w-full text-[#2563EB] hover:text-[#1D4ED8] text-xs font-semibold flex items-center justify-center gap-1.5 focus:outline-none bg-[#EFF6FF]/60 border border-dashed border-[#2563EB]/30 rounded-[8px] py-2.5 hover:bg-[#EFF6FF] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add intake scenario
          </button>
        </div>
      </FeatureBlock>

      {/* SMS */}
      <FeatureBlock
        icon={MessageSquareText}
        title="In-call SMS dispatch"
        description="Send a pricing sheet, brochure link, or map SMS during the live call — automatically."
        enabled={smsEnabled}
        setEnabled={setSmsEnabled}
        countBadge={smsEnabled ? `${smsScenarios.length} scenario${smsScenarios.length > 1 ? "s" : ""}` : undefined}
        disabled={disabled}
      >
        <div className="space-y-3">
          {smsScenarios.map((sc, idx) => (
            <SmsScenarioCard
              key={sc.id}
              scenario={sc}
              index={idx}
              onUpdate={(upd) => handleUpdateSmsScenario(idx, upd)}
              onDelete={() => handleRemoveSmsScenario(idx)}
              disabled={disabled}
            />
          ))}
          <button
            type="button"
            onClick={handleAddSmsScenario}
            disabled={disabled}
            className="w-full text-[#2563EB] hover:text-[#1D4ED8] text-xs font-semibold flex items-center justify-center gap-1.5 focus:outline-none bg-[#EFF6FF]/60 border border-dashed border-[#2563EB]/30 rounded-[8px] py-2.5 hover:bg-[#EFF6FF] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add SMS scenario
          </button>
        </div>
      </FeatureBlock>

      {/* API WEBHOOKS */}
      <FeatureBlock
        icon={Webhook}
        title="API & webhooks"
        description="Call your own APIs during the conversation — check order status, create tickets, push leads to your CRM."
        enabled={apiEnabled}
        setEnabled={setApiEnabled}
        countBadge={apiEnabled ? `${apiScenarios.length} scenario${apiScenarios.length > 1 ? "s" : ""}` : undefined}
        disabled={disabled}
        gated={isFree}
      >
        <div className="space-y-3">
          {apiScenarios.map((sc, idx) => (
            <ApiScenarioCard
              key={sc.id}
              scenario={sc}
              index={idx}
              onUpdate={(upd) => handleUpdateApiScenario(idx, upd)}
              onDelete={() => handleRemoveApiScenario(idx)}
              disabled={disabled}
            />
          ))}
          <button
            type="button"
            onClick={handleAddApiScenario}
            disabled={disabled}
            className="w-full text-[#2563EB] hover:text-[#1D4ED8] text-xs font-semibold flex items-center justify-center gap-1.5 focus:outline-none bg-[#EFF6FF]/60 border border-dashed border-[#2563EB]/30 rounded-[8px] py-2.5 hover:bg-[#EFF6FF] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add API scenario
          </button>
        </div>
      </FeatureBlock>

      {/* CALL TRANSFER */}
      <FeatureBlock
        icon={PhoneForwarded}
        title="Call transfer"
        description="Hand the live call to a human team member when the caller needs one."
        enabled={callTransferEnabled}
        setEnabled={setCallTransferEnabled}
        disabled={disabled}
        gated={isFree}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
              When to transfer?
              <span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={callTransferCondition}
              onChange={(e) => setCallTransferCondition(e.target.value)}
              placeholder="e.g. When the caller asks for a human, or is upset"
              disabled={disabled}
              className="w-full h-10 px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999999] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">Transfer style</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {([
                { value: "warm", title: "Warm transfer", desc: "Agent announces the caller, stays on until your team picks up." },
                { value: "instant", title: "Instant transfer", desc: "Connects the caller immediately without any announcement." },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCallTransferStyle(opt.value)}
                  disabled={disabled}
                  className={`text-left p-3 rounded-[8px] border transition-colors ${
                    callTransferStyle === opt.value
                      ? "border-[#2563EB] bg-[#EFF6FF]/50 ring-1 ring-[#2563EB]/20"
                      : "border-[#E5E5E5] bg-white hover:border-[#2563EB]/40"
                  }`}
                >
                  <div className="text-[12px] font-semibold text-[#111111]">{opt.title}</div>
                  <div className="text-[11px] text-[#666666] mt-0.5 leading-snug">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PhoneInput
              label="Transfer to phone number"
              required
              value={callTransferNumber}
              onChange={setCallTransferNumber}
              disabled={disabled}
            />
            <PhoneInput
              label="Fallback number (optional)"
              value={callTransferFallbackNumber}
              onChange={setCallTransferFallbackNumber}
              disabled={disabled}
              hint="Tried if the first number doesn't answer."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">Ring for</label>
              <select
                value={callTransferTimeoutSec}
                onChange={(e) => setCallTransferTimeoutSec(Number(e.target.value))}
                disabled={disabled}
                className="w-full h-10 px-3 text-[13px] text-[#111111] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors"
              >
                <option value={15}>15 seconds</option>
                <option value={25}>25 seconds</option>
                <option value={40}>40 seconds</option>
                <option value={60}>60 seconds</option>
              </select>
              <p className="text-[11px] text-[#999999] mt-1">Per number — fallback rings after this.</p>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">If no one answers</label>
              <select
                value={callTransferNoAnswerAction}
                onChange={(e) => setCallTransferNoAnswerAction(e.target.value as "take_message" | "offer_callback" | "end_politely")}
                disabled={disabled}
                className="w-full h-10 px-3 text-[13px] text-[#111111] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors"
              >
                <option value="take_message">AI takes a message &amp; saves it as a lead</option>
                <option value="offer_callback">AI apologises &amp; promises a callback</option>
                <option value="end_politely">AI ends the call politely</option>
              </select>
              <p className="text-[11px] text-[#999999] mt-1">The caller is never left hanging.</p>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
              What should the agent say before transferring?
            </label>
            <input
              type="text"
              value={callTransferMessage}
              onChange={(e) => setCallTransferMessage(e.target.value)}
              placeholder="Main aapko humari team se connect kar rahi hoon, ek moment..."
              disabled={disabled}
              className="w-full h-10 px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999999] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>
        </div>
      </FeatureBlock>

      {/* CALENDAR BOOKING */}
      <FeatureBlock
        icon={CalendarDays}
        title="Calendar bookings"
        description="Let AI book appointments directly into your calendar during the call."
        enabled={bookingEnabled}
        setEnabled={setBookingEnabled}
        disabled={disabled}
        gated={isFree}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
              When to offer a booking?
              <span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={booking.triggerCondition}
              onChange={(e) => setBookingField("triggerCondition", e.target.value)}
              placeholder="e.g. When the caller wants to book an appointment or site visit"
              disabled={disabled}
              className="w-full h-10 px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999999] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">Calendar provider</label>
              <select
                value={booking.provider}
                onChange={(e) => setBookingField("provider", e.target.value as AgentBookingConfig["provider"])}
                disabled={disabled}
                className="w-full h-10 px-3 text-[13px] text-[#111111] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors"
              >
                <option value="google">Google Calendar</option>
                <option value="calcom">Cal.com</option>
                <option value="link">Booking link (any)</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">Meeting duration</label>
              <select
                value={booking.meetingDurationMin}
                onChange={(e) => setBookingField("meetingDurationMin", Number(e.target.value))}
                disabled={disabled}
                className="w-full h-10 px-3 text-[13px] text-[#111111] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
              {booking.provider === "google" ? "Calendar ID or booking-page link" : booking.provider === "calcom" ? "Cal.com event link" : "Booking link"}
              <span className="text-[#DC2626] ml-0.5">*</span>
            </label>
            <input
              type="text"
              value={booking.calendarLink}
              onChange={(e) => setBookingField("calendarLink", e.target.value)}
              placeholder={booking.provider === "calcom" ? "https://cal.com/yourname/30min" : booking.provider === "google" ? "yourbusiness@gmail.com or booking-page link" : "https://..."}
              disabled={disabled}
              className="w-full h-10 px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999999] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors font-mono text-[12px]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">Booking hours</label>
            <input
              type="text"
              value={booking.workingHoursNote}
              onChange={(e) => setBookingField("workingHoursNote", e.target.value)}
              placeholder="Mon–Sat, 10:00 AM – 7:00 PM IST"
              disabled={disabled}
              className="w-full h-10 px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999999] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
            <p className="text-[11px] text-[#999999] mt-1">The agent will only offer slots inside these hours.</p>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
              Confirmation message
            </label>
            <input
              type="text"
              value={booking.confirmationMessage}
              onChange={(e) => setBookingField("confirmationMessage", e.target.value)}
              placeholder="Aapki booking confirm ho gayi hai! Confirmation message mil jayega."
              disabled={disabled}
              className="w-full h-10 px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999999] bg-white border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB] transition-colors"
            />
          </div>

          <label className="flex items-start gap-2.5 rounded-[8px] border border-[#E5E5E5] bg-white p-3 cursor-pointer hover:border-[#2563EB]/40 transition-colors">
            <input
              type="checkbox"
              checked={booking.askEmail}
              onChange={(e) => setBookingField("askEmail", e.target.checked)}
              disabled={disabled}
              className="mt-0.5 h-4 w-4 rounded border-[#E5E5E5] accent-[#2563EB]"
            />
            <span className="min-w-0">
              <span className="block text-[12px] font-semibold text-[#111111]">
                Ask the caller for their email
              </span>
              <span className="block text-[11px] text-[#666666] mt-0.5 leading-snug">
                The agent will ask for an email so the calendar invite lands in their inbox.
                Either way, the caller always gets an SMS confirmation on their phone number.
              </span>
            </span>
          </label>
        </div>
      </FeatureBlock>
    </div>
  );
}

/* ---------------- Phone input with country code ---------------- */

interface PhoneInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}

function PhoneInput({ label, value, onChange, required, disabled, hint }: PhoneInputProps): React.JSX.Element {
  const [{ code, local }, setParts] = React.useState(() => splitPhone(value));
  const isValid = /^\d{6,12}$/.test(local);

  const update = (nextCode: string, nextLocal: string) => {
    setParts({ code: nextCode, local: nextLocal });
    onChange(nextLocal ? `${nextCode}${nextLocal}` : "");
  };

  return (
    <div>
      <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
        {label}
        {required && <span className="text-[#DC2626] ml-0.5">*</span>}
      </label>
      <div className="flex gap-2">
        <select
          value={code}
          onChange={(e) => update(e.target.value, local)}
          disabled={disabled}
          className="h-10 w-[96px] shrink-0 px-2 text-[13px] text-[#111111] bg-[#F7F7F7] border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input
          type="tel"
          inputMode="numeric"
          value={local}
          onChange={(e) => update(code, e.target.value.replace(/\D/g, "").slice(0, 12))}
          placeholder="9876543210"
          disabled={disabled}
          className={`w-full h-10 px-3 py-2 text-[13px] text-[#111111] placeholder:text-[#999999] bg-white border rounded-[6px] focus:outline-none transition-colors tabular-nums ${
            local && !isValid ? "border-[#DC2626] focus:border-[#DC2626]" : "border-[#E5E5E5] focus:border-[#2563EB]"
          }`}
        />
      </div>
      {local && !isValid ? (
        <p className="text-[11px] text-[#DC2626] mt-1 font-medium">Enter 6–12 digits (numbers only).</p>
      ) : (
        <p className="text-[11px] text-[#999999] mt-1">{hint ?? "Digits only — country code is added automatically."}</p>
      )}
    </div>
  );
}

/* ---------------- Feature Block (toggleable card) ---------------- */

interface FeatureBlockProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  countBadge?: string;
  disabled?: boolean;
  gated?: boolean;
  children: React.ReactNode;
}

function FeatureBlock({
  icon: Icon,
  title,
  description,
  enabled,
  setEnabled,
  countBadge,
  disabled,
  gated,
  children,
}: FeatureBlockProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <section
      className={`bg-white border rounded-[8px] transition-colors ${
        enabled ? "border-[#2563EB]/25" : "border-[#E5E5E5]"
      }`}
    >
      <header 
        className={`p-5 flex items-start gap-3 select-none ${enabled ? "cursor-pointer hover:bg-[#FAFAFA]/50" : ""}`}
        onClick={() => {
          if (enabled && !disabled) {
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div
          className={`h-10 w-10 rounded-[8px] flex items-center justify-center shrink-0 transition-colors ${
            enabled
              ? "bg-[#2563EB] text-white"
              : "bg-[#F7F7F7] text-[#666666] border border-[#E5E5E5]"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#111111]">{title}</h3>
            {gated && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                <Lock className="h-2.5 w-2.5" />
                Pro
              </span>
            )}
            {!gated && countBadge && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] px-2 py-0.5 rounded-full">
                {countBadge}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#666666] mt-1 leading-relaxed pr-2">{description}</p>
        </div>
        
        <div className="flex items-center gap-4 shrink-0 mt-0.5">
          <label 
            className={`relative inline-flex items-center select-none ${gated ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            onClick={(e) => {
              e.stopPropagation();
              if (gated) {
                e.preventDefault();
                toast.error(`Upgrade to Pro to unlock ${title.toLowerCase()}.`);
              }
            }}
          >
            <input
              type="checkbox"
              checked={gated ? false : enabled}
              onChange={(e) => {
                if (gated) return;
                setEnabled(e.target.checked);
                if (e.target.checked) setIsExpanded(true);
              }}
              disabled={disabled || gated}
              className="sr-only peer"
            />
            <span className="w-[36px] h-[20px] bg-[#E5E5E5] rounded-full peer-checked:bg-[#2563EB] transition-colors" />
            <span
              className={`absolute top-[2px] left-[2px] h-4 w-4 bg-white border border-[#E5E5E5] rounded-full shadow-sm transition-transform ${
                !gated && enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </label>
          
          {enabled && (
            <ChevronDown 
              className={`h-5 w-5 text-[#999999] transition-transform ${isExpanded ? "rotate-180" : ""}`} 
            />
          )}
        </div>
      </header>

      {enabled && isExpanded && (
        <div className="border-t border-[#E5E5E5] p-5 bg-[#FAFAFA]/40 rounded-b-[8px] animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </section>
  );
}
