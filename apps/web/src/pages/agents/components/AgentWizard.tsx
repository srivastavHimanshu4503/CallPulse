import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { toast } from "sonner";
import { Button } from "@antigravity/ui";
import { PersonaSetup } from "./PersonaSetup.js";
import { VoiceSelector, VoiceSpeedControl, VoiceTuningControl, PronunciationControl } from "./VoiceSelector.js";
import { TelephonySetup } from "./TelephonySetup.js";
import { WorkflowSetup } from "./WorkflowSetup.js";
import { KnowledgeBaseSetup } from "./KnowledgeBaseSetup.js";
import { SetupGuide } from "./SetupGuide.js";
import {
  UserRound,
  Waves,
  Workflow,
  BookOpen,
  PhoneCall,
  Rocket,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import type { SerializedAgent, AgentBookingConfig, AgentVoiceSettings } from "@antigravity/types";

interface AgentWizardProps {
  editingAgent: SerializedAgent | null;
  onClose: () => void;
  phoneNumbers: any[];
  refetchPhoneNumbers: () => void;
  workflows: any[];
}

const TABS = [
  {
    id: "general",
    title: "General",
    icon: UserRound,
  },
  {
    id: "knowledge",
    title: "Knowledge Base",
    icon: BookOpen,
  },
  {
    id: "voice",
    title: "Voice Library",
    icon: Waves,
  },
  {
    id: "phone",
    title: "Phone & Limits",
    icon: PhoneCall,
  },
  {
    id: "workflows",
    title: "Workflows",
    icon: Workflow,
  },
] as const;

type TabId = typeof TABS[number]["id"];

export function AgentWizard({
  editingAgent,
  onClose,
  phoneNumbers,
  refetchPhoneNumbers,
  workflows,
}: AgentWizardProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<TabId>("general");

  // STEP 1: Basic Profile States
  const [name, setName] = React.useState(editingAgent?.name || "");
  const [role, setRole] = React.useState(editingAgent?.role || "");
  const [language, setLanguage] = React.useState(editingAgent?.language || "Hinglish");
  // Male-voice default: our default voice for Hinglish/Hindi is now Shubh
  // (male), so the seeded greeting must use masculine first-person forms
  // ("kar sakta hoon", not "kar sakti hoon") — a female greeting on a male
  // voice is the most-noticed "sounds broken" bug on Indian calls.
  const [greetingMessage, setGreetingMessage] = React.useState(
    editingAgent?.greetingMessage || "Namaste! Main aapki kaise help kar sakta hoon?"
  );
  const [tone, setTone] = React.useState<"Friendly" | "Professional" | "Casual">(
    (editingAgent?.tone as any) || "Friendly"
  );
  const [fallbackMessage, setFallbackMessage] = React.useState(
    editingAgent?.fallbackMessage || "I'll connect you with our team for this. One moment please."
  );
  const [modelName, setModelName] = React.useState(
    (editingAgent as any)?.modelName || "gpt-4o"
  );
  
  // STEP 1.5: Knowledge Base States
  const [businessInfo, setBusinessInfo] = React.useState(editingAgent?.businessInfo || "");
  const [websiteUrl, setWebsiteUrl] = React.useState(editingAgent?.websiteUrl || "");
  const [agentGuidelines, setAgentGuidelines] = React.useState(editingAgent?.agentGuidelines || "");

  // STEP 2: Audio & Telephony States
  const [voice, setVoice] = React.useState(editingAgent?.voice || "sarvam:shubh");
  // null = provider default speed
  const [voiceSpeed, setVoiceSpeed] = React.useState<number | null>(
    editingAgent?.voiceSpeed ?? null
  );
  // null = provider defaults for every tunable
  const [voiceSettings, setVoiceSettings] = React.useState<AgentVoiceSettings | null>(
    editingAgent?.voiceSettings ?? null
  );
  // Word → spoken-form overrides (synced to a Sarvam pronunciation dictionary)
  const [pronunciations, setPronunciations] = React.useState<Record<string, string> | null>(
    editingAgent?.pronunciations ?? null
  );
  const [phoneNumberId, setPhoneNumberId] = React.useState<string | null>(
    editingAgent?.phoneNumberId || null
  );
  const [maxDuration, setMaxDuration] = React.useState(editingAgent?.maxDuration || 10);
  const [dndCompliance, setDndCompliance] = React.useState(editingAgent?.dndCompliance ?? true);
  const [recordingConsent, setRecordingConsent] = React.useState(
    editingAgent?.recordingConsent ?? true
  );
  const [isActive, setIsActive] = React.useState(editingAgent?.isActive ?? true);
  
  // Availability states
  const [timeZone, setTimeZone] = React.useState(editingAgent?.timeZone || "Asia/Kolkata");
  const [is24x7, setIs24x7] = React.useState(
    editingAgent?.businessHours ? editingAgent.businessHours.is24x7 ?? true : true
  );
  const [startTime, setStartTime] = React.useState(
    editingAgent?.businessHours?.startTime || "09:00"
  );
  const [endTime, setEndTime] = React.useState(
    editingAgent?.businessHours?.endTime || "18:00"
  );


  // STEP 3: Workflow Configuration States
  const [intakeEnabled, setIntakeEnabled] = React.useState(editingAgent?.intakeEnabled ?? false);
  const [intakeWorkflowId, setIntakeWorkflowId] = React.useState<string | null>(
    editingAgent?.intakeWorkflowId || null
  );
  const [intakeFields, setIntakeFields] = React.useState<string[]>(editingAgent?.intakeFields || []);
  const [intakePrompt, setIntakePrompt] = React.useState(editingAgent?.intakePrompt || "");

  const [smsEnabled, setSmsEnabled] = React.useState(editingAgent?.smsEnabled ?? false);
  const [smsWorkflowId, setSmsWorkflowId] = React.useState<string | null>(
    editingAgent?.smsWorkflowId || null
  );
  const [smsTriggerCondition, setSmsTriggerCondition] = React.useState(
    editingAgent?.smsTriggerCondition || ""
  );
  const [smsTemplate, setSmsTemplate] = React.useState(editingAgent?.smsTemplate || "");
  const [smsAgentReply, setSmsAgentReply] = React.useState(editingAgent?.smsAgentReply || "");

  const [apiEnabled, setApiEnabled] = React.useState(editingAgent?.apiEnabled ?? false);
  const [apiWorkflowId, setApiWorkflowId] = React.useState<string | null>(editingAgent?.apiWorkflowId || null);
  const [apiPrompt, setApiPrompt] = React.useState(editingAgent?.apiPrompt || "");

  const [callTransferEnabled, setCallTransferEnabled] = React.useState(editingAgent?.callTransferEnabled ?? false);
  const [callTransferWorkflowId, setCallTransferWorkflowId] = React.useState<string | null>(editingAgent?.callTransferWorkflowId || null);
  const [callTransferNumber, setCallTransferNumber] = React.useState(editingAgent?.callTransferNumber || "");
  const [callTransferCondition, setCallTransferCondition] = React.useState(editingAgent?.callTransferCondition || "");
  const [callTransferMessage, setCallTransferMessage] = React.useState(editingAgent?.callTransferMessage || "");
  const [callTransferFallbackNumber, setCallTransferFallbackNumber] = React.useState(editingAgent?.callTransferFallbackNumber || "");
  const [callTransferTimeoutSec, setCallTransferTimeoutSec] = React.useState(editingAgent?.callTransferTimeoutSec ?? 25);
  const [callTransferNoAnswerAction, setCallTransferNoAnswerAction] = React.useState<"take_message" | "offer_callback" | "end_politely">(editingAgent?.callTransferNoAnswerAction ?? "take_message");
  const [callTransferStyle, setCallTransferStyle] = React.useState<"warm" | "instant">(editingAgent?.callTransferStyle ?? "warm");

  const [bookingEnabled, setBookingEnabled] = React.useState(editingAgent?.bookingEnabled ?? false);
  const [bookingConfig, setBookingConfig] = React.useState<AgentBookingConfig | null>(editingAgent?.bookingConfig ?? null);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Buying a number requires the agent to EXIST (numbers bind permanently).
  // If the user buys mid-creation, we save the agent quietly first and
  // remember its id — the final button then becomes an update, not a dupe.
  const [draftAgentId, setDraftAgentId] = React.useState<string | null>(null);
  const effectiveAgentId = editingAgent?.id ?? draftAgentId;

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/agents", payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("AI Agent configured and launched successfully!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to configure agent");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put(`/agents/${effectiveAgentId}`, payload);
      return res.data.data;
    },
    onSuccess: (updated: SerializedAgent) => {
      // Refresh the list in the background but stay in the editor — closing
      // the modal on save loses the user's context (which tab they were on,
      // what they were about to change next). The success toast is enough
      // acknowledgement; the user closes when they're done editing.
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.setQueryData(["agent", updated.id], updated);
      toast.success("AI Agent settings updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update agent");
    },
  });

  const isFormLoading = createMutation.isPending || updateMutation.isPending;

  const validateAll = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Agent name is required";
    if (!role.trim()) errs.role = "Role is required";
    if (!greetingMessage.trim()) errs.greetingMessage = "Greeting prompt is required";
    if (!fallbackMessage.trim()) errs.fallbackMessage = "Fallback prompt is required";
    if (websiteUrl && !websiteUrl.startsWith("http://") && !websiteUrl.startsWith("https://")) {
      errs.websiteUrl = "Valid website starting with http/https is required";
    }

    const workflowError = validateWorkflows();
    if (workflowError) errs.workflows = workflowError;

    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      if (errs.name || errs.role || errs.greetingMessage || errs.fallbackMessage) {
        setActiveTab("general");
      } else if (errs.websiteUrl) {
        setActiveTab("knowledge");
      } else if (errs.workflows) {
        setActiveTab("workflows");
        toast.error(errs.workflows);
      }
      return false;
    }

    return true;
  };

  /** Returns the first problem in any ENABLED workflow, or null when all valid. */
  const validateWorkflows = (): string | null => {
    const parseList = (s: string): any[] => {
      try {
        const p = JSON.parse(s);
        return Array.isArray(p) ? p : [];
      } catch {
        return [];
      }
    };

    if (intakeEnabled) {
      const list = parseList(intakePrompt);
      if (list.length === 0) return "Lead intake: add at least one scenario";
      for (let i = 0; i < list.length; i++) {
        if (!list[i]?.triggerName?.trim()) return `Intake scenario ${i + 1}: scenario name is required`;
        if (!(list[i]?.questions || []).some((q: string) => q?.trim()))
          return `Intake scenario ${i + 1}: add at least one question`;
      }
    }

    if (smsEnabled) {
      const list = parseList(smsTemplate);
      if (list.length === 0) return "SMS: add at least one scenario";
      for (let i = 0; i < list.length; i++) {
        if (!list[i]?.triggerCondition?.trim()) return `SMS scenario ${i + 1}: trigger condition is required`;
        if (!list[i]?.smsTemplate?.trim()) return `SMS scenario ${i + 1}: SMS message is required`;
        if (!list[i]?.agentReply?.trim()) return `SMS scenario ${i + 1}: agent's verbal confirmation is required`;
      }
    }

    if (apiEnabled) {
      const list = parseList(apiPrompt);
      if (list.length === 0) return "API & webhooks: add at least one scenario";
      for (let i = 0; i < list.length; i++) {
        if (!list[i]?.triggerCondition?.trim()) return `API scenario ${i + 1}: trigger condition is required`;
        if (!/^https?:\/\/\S+$/.test((list[i]?.url || "").trim()))
          return `API scenario ${i + 1}: enter a valid webhook URL starting with https://`;
        if (!list[i]?.agentReply?.trim()) return `API scenario ${i + 1}: agent reply is required`;
      }
    }

    if (callTransferEnabled) {
      if (!callTransferCondition.trim()) return "Call transfer: transfer condition is required";
      const primary = callTransferNumber.replace(/[\s-]/g, "");
      if (!/^\+\d{8,15}$/.test(primary))
        return "Call transfer: enter a valid phone number (country code + 6–12 digits)";
      const fallback = callTransferFallbackNumber.replace(/[\s-]/g, "");
      if (fallback && !/^\+\d{8,15}$/.test(fallback))
        return "Call transfer: fallback number is invalid";
      if (fallback && fallback === primary)
        return "Call transfer: fallback number must be different from the primary number";
    }

    if (bookingEnabled) {
      if (!bookingConfig?.triggerCondition?.trim()) return "Calendar booking: trigger condition is required";
      const link = (bookingConfig?.calendarLink || "").trim();
      if (!link) return "Calendar booking: calendar link / ID is required";
      if (bookingConfig?.provider !== "google" && !/^https?:\/\/\S+$/.test(link))
        return "Calendar booking: booking link must start with https://";
      if (bookingConfig?.provider === "google" && !/^https?:\/\/\S+$/.test(link) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link))
        return "Calendar booking: enter a calendar email ID or a booking-page link";
    }

    return null;
  };


  const buildPayload = () => ({
      name,
      role,
      language,
      greetingMessage,
      tone,
      fallbackMessage,
      businessInfo: businessInfo.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      agentGuidelines: agentGuidelines.trim() || null,
      maxDuration: Number(maxDuration),
      dndCompliance,
      recordingConsent,
      isActive,
      voice,
      voiceSpeed,
      // {} (not null) so "Reset to defaults" actually clears the stored value
      voiceSettings: voiceSettings ?? {},
      // {} clears the remote Sarvam dictionary when the user removes all words
      pronunciations: pronunciations ?? {},
      intakeWorkflowId: intakeEnabled ? intakeWorkflowId : null,
      smsWorkflowId: smsEnabled ? smsWorkflowId : null,
      phoneNumberId,
      intakeEnabled,
      intakeFields,
      intakePrompt: intakeEnabled ? intakePrompt : null,
      smsEnabled,
      smsTriggerCondition: smsEnabled ? smsTriggerCondition : null,
      smsTemplate: smsEnabled ? smsTemplate : null,
      smsAgentReply: smsEnabled ? smsAgentReply : null,
      apiEnabled,
      apiWorkflowId: apiEnabled ? apiWorkflowId : null,
      apiPrompt: apiEnabled ? apiPrompt : null,
      callTransferEnabled,
      callTransferWorkflowId: callTransferEnabled ? callTransferWorkflowId : null,
      callTransferNumber: callTransferEnabled ? callTransferNumber : null,
      callTransferCondition: callTransferEnabled ? callTransferCondition : null,
      callTransferMessage: callTransferEnabled ? callTransferMessage : null,
      callTransferFallbackNumber: callTransferEnabled ? (callTransferFallbackNumber || null) : null,
      callTransferTimeoutSec,
      callTransferNoAnswerAction,
      callTransferStyle,
      bookingEnabled,
      bookingConfig: bookingEnabled ? bookingConfig : null,
      timeZone,
      businessHours: { is24x7, startTime, endTime },
      modelName,
  });

  const handleFinish = () => {
    if (!validateAll()) return;
    const payload = buildPayload();
    if (effectiveAgentId) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  /** Create the agent now (used by number purchase); returns its id. */
  const ensureAgentExists = async (): Promise<string | null> => {
    if (effectiveAgentId) return effectiveAgentId;
    if (!validateAll()) {
      toast.error("Complete the required fields first");
      return null;
    }
    try {
      const res = await api.post("/agents", buildPayload());
      const created = res.data.data;
      setDraftAgentId(created.id);
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent saved — continuing to number purchase");
      return created.id as string;
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Couldn't save the agent yet");
      return null;
    }
  };

  return (
    <div className="bg-bg-raised border border-border rounded-[8px] shadow-none flex flex-col font-sans min-h-full lg:h-full w-full lg:overflow-hidden">
      {/* TOP HEADER: Back + Title + Tabs */}
      <div className="shrink-0 border-b border-border bg-bg-raised flex flex-col px-4 sm:px-5">
        <div className="h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isFormLoading}
            className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary hover:bg-surface rounded-[6px] px-2 py-1.5 text-xs font-semibold transition-colors focus:outline-none disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <span className="h-5 w-[1px] bg-border shrink-0" />

          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-text-primary tracking-tight truncate">
              {editingAgent ? (
                <>
                  <span className="text-text-secondary font-medium">Configure</span>
                  <span className="text-text-secondary mx-1.5">·</span>
                  <span>{editingAgent.name}</span>
                </>
              ) : (
                "New agent"
              )}
            </h2>
          </div>
        </div>
        
        {/* TAB NAVIGATION — horizontal scroll on narrow viewports */}
        <div className="flex items-center gap-4 sm:gap-6 mt-1 overflow-x-auto no-scrollbar -mx-4 sm:-mx-5 px-4 sm:px-5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex flex-col lg:overflow-hidden min-h-0 bg-bg-subtle/40">
        <div className="flex-1 lg:overflow-y-auto">
          {/* Two-column body: form (~60%) + bilingual per-tab setup guide.
              The guide is the non-tech user's manual — it swaps content with
              the active tab and collapses away below lg. */}
          <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-5 sm:py-6 flex items-start gap-6">
            <div className="flex-1 min-w-0 space-y-5">
              {activeTab === "general" && (
                <PersonaSetup
                  name={name}
                  setName={setName}
                  role={role}
                  setRole={setRole}
                  language={language}
                  setLanguage={setLanguage}
                  greetingMessage={greetingMessage}
                  setGreetingMessage={setGreetingMessage}
                  tone={tone}
                  setTone={setTone}
                  fallbackMessage={fallbackMessage}
                  setFallbackMessage={setFallbackMessage}
                  modelName={modelName}
                  setModelName={setModelName}
                  errors={errors}
                  disabled={isFormLoading}
                />
              )}

              {activeTab === "knowledge" && (
                <KnowledgeBaseSetup
                  websiteUrl={websiteUrl}
                  setWebsiteUrl={setWebsiteUrl}
                  businessInfo={businessInfo}
                  setBusinessInfo={setBusinessInfo}
                  agentGuidelines={agentGuidelines}
                  setAgentGuidelines={setAgentGuidelines}
                  errors={errors}
                  disabled={isFormLoading}
                />
              )}

              {activeTab === "voice" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <VoiceSelector
                    voice={voice}
                    setVoice={setVoice}
                    language={language}
                    setLanguage={setLanguage}
                    voiceSettings={voiceSettings}
                    disabled={isFormLoading}
                  />
                  <VoiceSpeedControl
                    value={voiceSpeed}
                    onChange={setVoiceSpeed}
                    disabled={isFormLoading}
                  />
                  <VoiceTuningControl
                    voice={voice}
                    value={voiceSettings}
                    onChange={setVoiceSettings}
                    disabled={isFormLoading}
                  />
                  <PronunciationControl
                    voice={voice}
                    value={pronunciations}
                    onChange={setPronunciations}
                    disabled={isFormLoading}
                  />
                </div>
              )}

              {activeTab === "phone" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <TelephonySetup
                    agentId={effectiveAgentId}
                    onEnsureAgent={ensureAgentExists}
                    phoneNumberId={phoneNumberId}
                    setPhoneNumberId={setPhoneNumberId}
                    phoneNumbers={phoneNumbers}
                    refetchPhoneNumbers={refetchPhoneNumbers}
                    disabled={isFormLoading}
                    agentName={name}
                  />
                  <CompliancePanel
                    maxDuration={maxDuration}
                    setMaxDuration={setMaxDuration}
                    dndCompliance={dndCompliance}
                    setDndCompliance={setDndCompliance}
                    recordingConsent={recordingConsent}
                    setRecordingConsent={setRecordingConsent}
                    isActive={isActive}
                    setIsActive={setIsActive}
                    timeZone={timeZone}
                    setTimeZone={setTimeZone}
                    is24x7={is24x7}
                    setIs24x7={setIs24x7}
                    startTime={startTime}
                    setStartTime={setStartTime}
                    endTime={endTime}
                    setEndTime={setEndTime}
                    disabled={isFormLoading}
                  />
                </div>
              )}

              {activeTab === "workflows" && (
                <div className="animate-in fade-in duration-200">
                  <WorkflowSetup
                    workflows={workflows}
                    intakeWorkflowId={intakeWorkflowId}
                    setIntakeWorkflowId={setIntakeWorkflowId}
                    smsWorkflowId={smsWorkflowId}
                    setSmsWorkflowId={setSmsWorkflowId}
                    intakeEnabled={intakeEnabled}
                    setIntakeEnabled={setIntakeEnabled}
                    setIntakeFields={setIntakeFields}
                    intakePrompt={intakePrompt}
                    setIntakePrompt={setIntakePrompt}
                    smsEnabled={smsEnabled}
                    setSmsEnabled={setSmsEnabled}
                    smsTriggerCondition={smsTriggerCondition}
                    setSmsTriggerCondition={setSmsTriggerCondition}
                    smsTemplate={smsTemplate}
                    setSmsTemplate={setSmsTemplate}
                    smsAgentReply={smsAgentReply}
                    setSmsAgentReply={setSmsAgentReply}
                    apiEnabled={apiEnabled}
                    setApiEnabled={setApiEnabled}
                    apiWorkflowId={apiWorkflowId}
                    setApiWorkflowId={setApiWorkflowId}
                    apiPrompt={apiPrompt}
                    setApiPrompt={setApiPrompt}
                    callTransferEnabled={callTransferEnabled}
                    setCallTransferEnabled={setCallTransferEnabled}
                    callTransferWorkflowId={callTransferWorkflowId}
                    setCallTransferWorkflowId={setCallTransferWorkflowId}
                    callTransferNumber={callTransferNumber}
                    setCallTransferNumber={setCallTransferNumber}
                    callTransferCondition={callTransferCondition}
                    setCallTransferCondition={setCallTransferCondition}
                    callTransferMessage={callTransferMessage}
                    setCallTransferMessage={setCallTransferMessage}
                    callTransferFallbackNumber={callTransferFallbackNumber}
                    setCallTransferFallbackNumber={setCallTransferFallbackNumber}
                    callTransferTimeoutSec={callTransferTimeoutSec}
                    setCallTransferTimeoutSec={setCallTransferTimeoutSec}
                    callTransferNoAnswerAction={callTransferNoAnswerAction}
                    setCallTransferNoAnswerAction={setCallTransferNoAnswerAction}
                    callTransferStyle={callTransferStyle}
                    setCallTransferStyle={setCallTransferStyle}
                    bookingEnabled={bookingEnabled}
                    setBookingEnabled={setBookingEnabled}
                    bookingConfig={bookingConfig}
                    setBookingConfig={setBookingConfig}
                    disabled={isFormLoading}
                  />
                </div>
              )}
            </div>

            <aside className="hidden lg:block w-[360px] shrink-0 sticky top-1">
              <SetupGuide tab={activeTab} />
            </aside>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="shrink-0 border-t border-border bg-bg-raised">
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isFormLoading}
              className="border border-border bg-bg-raised hover:bg-surface text-text-primary font-semibold text-xs h-9 px-4 rounded-[6px] shadow-none"
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={handleFinish}
              disabled={isFormLoading}
              className="bg-positive-500 hover:bg-positive-600 text-white font-semibold text-xs h-9 px-5 rounded-[6px] flex items-center gap-2 border-none shadow-none disabled:opacity-70"
            >
              {isFormLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {editingAgent ? "Saving..." : "Launching..."}
                </>
              ) : (
                <>
                  <Rocket className="h-3.5 w-3.5" />
                  {editingAgent ? "Save changes" : "Launch agent"}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}



interface CompliancePanelProps {
  maxDuration: number;
  setMaxDuration: (val: number) => void;
  dndCompliance: boolean;
  setDndCompliance: (val: boolean) => void;
  recordingConsent: boolean;
  setRecordingConsent: (val: boolean) => void;
  isActive: boolean;
  setIsActive: (val: boolean) => void;
  timeZone: string;
  setTimeZone: (val: string) => void;
  is24x7: boolean;
  setIs24x7: (val: boolean) => void;
  startTime: string;
  setStartTime: (val: string) => void;
  endTime: string;
  setEndTime: (val: string) => void;
  disabled: boolean;
}

function CompliancePanel({
  maxDuration,
  setMaxDuration,
  dndCompliance,
  setDndCompliance,
  recordingConsent,
  setRecordingConsent,
  isActive,
  setIsActive,
  timeZone,
  setTimeZone,
  is24x7,
  setIs24x7,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  disabled,
}: CompliancePanelProps): React.JSX.Element {
  const switches = [
    {
      title: "DND Compliance",
      description: "Skip numbers on the Do Not Call registry to stay TRAI-compliant.",
      val: dndCompliance,
      setVal: setDndCompliance,
    },
    {
      title: "Recording Consent",
      description: "Announce that the call is being recorded before conversation begins.",
      val: recordingConsent,
      setVal: setRecordingConsent,
    },
    {
      title: "Launch Immediately",
      description: "Agent goes live and starts taking calls right after setup.",
      val: isActive,
      setVal: setIsActive,
    },
  ];

  return (
    <section className="bg-bg-raised border border-border rounded-[8px] p-5 sm:p-6 space-y-4">
      <header>
        <h3 className="text-sm font-semibold text-text-primary">Call limits & compliance</h3>
        <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
          Set safety guardrails for how this agent behaves on every call.
        </p>
      </header>

      <div>
        <label className="block text-[12px] font-semibold text-text-primary mb-2">
          Max call duration
        </label>
        <div className="flex items-center gap-2 max-w-[220px]">
          <input
            type="number"
            min={1}
            max={120}
            value={maxDuration}
            onChange={(e) => setMaxDuration(Number(e.target.value))}
            disabled={disabled}
            className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary rounded-[6px] h-10 px-3 w-full focus:outline-none focus:ring-0"
          />
          <span className="text-xs text-text-secondary font-medium shrink-0">minutes</span>
        </div>
        <p className="text-[11px] text-text-placeholder mt-1.5">
          Calls beyond this length auto-terminate to prevent runaway costs.
        </p>
      </div>

      <div className="space-y-2 pt-1">
        {switches.map((s) => (
          <SwitchRow
            key={s.title}
            title={s.title}
            description={s.description}
            checked={s.val}
            onChange={s.setVal}
            disabled={disabled}
          />
        ))}
      </div>

      <div className="pt-4 border-t border-border space-y-4 mt-2">
        <header>
          <h3 className="text-[13px] font-semibold text-text-primary">Availability & Time Zone</h3>
          <p className="text-[11px] text-text-secondary mt-0.5">
            When should this agent be active to receive calls?
          </p>
        </header>

        <div className="space-y-4">
          <SwitchRow
            title="Available 24x7"
            description="Agent is always online and ready to take calls."
            checked={is24x7}
            onChange={setIs24x7}
            disabled={disabled}
          />

          {!is24x7 && (
            <div className="flex items-center gap-3 bg-bg-subtle p-3 rounded-[8px] border border-border animate-in fade-in zoom-in-95 duration-200">
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-text-primary mb-1">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={disabled}
                  className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary rounded-[6px] h-9 px-3 w-full focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-text-primary mb-1">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={disabled}
                  className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary rounded-[6px] h-9 px-3 w-full focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[12px] font-semibold text-text-primary mb-1">
              Time Zone
            </label>
            <select
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              disabled={disabled}
              className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary rounded-[6px] h-10 px-3 w-full focus:outline-none focus:ring-0"
            >
              <option value="Asia/Kolkata">India Standard Time (IST)</option>
              <option value="America/New_York">Eastern Time (US & Canada)</option>
              <option value="America/Chicago">Central Time (US & Canada)</option>
              <option value="America/Denver">Mountain Time (US & Canada)</option>
              <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
              <option value="Europe/London">Greenwich Mean Time (London)</option>
              <option value="Europe/Paris">Central European Time (Paris)</option>
              <option value="Asia/Dubai">Gulf Standard Time (Dubai)</option>
              <option value="Asia/Singapore">Singapore Standard Time</option>
              <option value="Australia/Sydney">Australian Eastern Time (Sydney)</option>
            </select>
            <p className="text-[11px] text-text-placeholder mt-1.5">
              The time zone used for availability hours and bookings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

interface SwitchRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

function SwitchRow({ title, description, checked, onChange, disabled }: SwitchRowProps): React.JSX.Element {
  return (
    <label className="flex items-start justify-between gap-4 rounded-[8px] border border-border p-3.5 hover:border-brand-500/30 transition-colors cursor-pointer bg-bg-raised">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-text-primary">{title}</div>
        <div className="text-[11px] text-text-secondary leading-relaxed mt-0.5">{description}</div>
      </div>
      <span className="relative inline-flex items-center shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <span className="w-[36px] h-[20px] bg-border rounded-full peer-checked:bg-primary transition-colors" />
        <span
          className={`absolute top-[2px] left-[2px] h-4 w-4 bg-white border border-border rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}
