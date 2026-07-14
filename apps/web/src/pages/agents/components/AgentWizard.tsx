import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { toast } from "sonner";
import { Button } from "@antigravity/ui";
import { PersonaSetup } from "./PersonaSetup.js";
import { VoiceSelector } from "./VoiceSelector.js";
import { TelephonySetup } from "./TelephonySetup.js";
import { WorkflowSetup } from "./WorkflowSetup.js";
import {
  UserRound,
  Waves,
  Workflow,
  ArrowLeft,
  ArrowRight,
  Check,
  Rocket,
  Loader2,
  ChevronLeft,
} from "lucide-react";
import type { SerializedAgent } from "@antigravity/types";

interface AgentWizardProps {
  editingAgent: SerializedAgent | null;
  onClose: () => void;
  phoneNumbers: any[];
  refetchPhoneNumbers: () => void;
  workflows: any[];
}

const STEPS = [
  {
    num: 1,
    title: "Persona",
    subtitle: "Identity, tone & knowledge",
    icon: UserRound,
  },
  {
    num: 2,
    title: "Voice & Number",
    subtitle: "Pick a voice and phone number",
    icon: Waves,
  },
  {
    num: 3,
    title: "Workflows",
    subtitle: "Intake & SMS automations",
    icon: Workflow,
  },
] as const;

export function AgentWizard({
  editingAgent,
  onClose,
  phoneNumbers,
  refetchPhoneNumbers,
  workflows,
}: AgentWizardProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState(1);

  // STEP 1: Basic Profile States
  const [name, setName] = React.useState(editingAgent?.name || "");
  const [role, setRole] = React.useState(editingAgent?.role || "");
  const [language, setLanguage] = React.useState(editingAgent?.language || "Hinglish");
  const [greetingMessage, setGreetingMessage] = React.useState(
    editingAgent?.greetingMessage || "Namaste! Main aapki kaise help kar sakti hoon?"
  );
  const [tone, setTone] = React.useState<"Friendly" | "Professional" | "Casual">(
    (editingAgent?.tone as any) || "Friendly"
  );
  const [fallbackMessage, setFallbackMessage] = React.useState(
    editingAgent?.fallbackMessage || "I'll connect you with our team for this. One moment please."
  );
  const [businessInfo, setBusinessInfo] = React.useState(editingAgent?.businessInfo || "");
  const [websiteUrl, setWebsiteUrl] = React.useState(editingAgent?.websiteUrl || "");

  // STEP 2: Audio & Telephony States
  const [voice, setVoice] = React.useState(editingAgent?.voice || "priya");
  const [phoneNumberId, setPhoneNumberId] = React.useState<string | null>(
    editingAgent?.phoneNumberId || null
  );
  const [maxDuration, setMaxDuration] = React.useState(editingAgent?.maxDuration || 10);
  const [dndCompliance, setDndCompliance] = React.useState(editingAgent?.dndCompliance ?? true);
  const [recordingConsent, setRecordingConsent] = React.useState(
    editingAgent?.recordingConsent ?? true
  );
  const [isActive, setIsActive] = React.useState(editingAgent?.isActive ?? true);

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

  const [errors, setErrors] = React.useState<Record<string, string>>({});

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
      const res = await api.put(`/agents/${editingAgent?.id}`, payload);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("AI Agent settings updated successfully!");
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update agent");
    },
  });

  const isFormLoading = createMutation.isPending || updateMutation.isPending;

  const validateStep = (currStep: number): boolean => {
    const errs: Record<string, string> = {};
    if (currStep === 1) {
      if (!name.trim()) errs.name = "Agent name is required";
      if (!role.trim()) errs.role = "Role is required";
      if (!greetingMessage.trim()) errs.greetingMessage = "Greeting prompt is required";
      if (!fallbackMessage.trim()) errs.fallbackMessage = "Fallback prompt is required";
      if (websiteUrl && !websiteUrl.startsWith("http://") && !websiteUrl.startsWith("https://")) {
        errs.websiteUrl = "Valid website starting with http/https is required";
      }
    }
    if (currStep === 2) {
      if (!phoneNumberId) {
        errs.phoneNumberId = "A phone number is required";
        toast.error("Please assign a phone number for this agent before continuing.");
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => s + 1);
  };
  const handleBack = () => setStep((s) => s - 1);
  const handleGoToStep = (target: number) => {
    if (target === step) return;
    if (target < step) {
      setStep(target);
      return;
    }
    // Only allow forward jump if all in-between steps validate
    for (let s = step; s < target; s++) {
      if (!validateStep(s)) return;
    }
    setStep(target);
  };

  const handleFinish = () => {
    if (!validateStep(step)) return;
    const payload = {
      name,
      role,
      language,
      greetingMessage,
      tone,
      fallbackMessage,
      businessInfo: businessInfo.trim() || null,
      websiteUrl: websiteUrl.trim() || null,
      maxDuration: Number(maxDuration),
      dndCompliance,
      recordingConsent,
      isActive,
      voice,
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
    };
    if (editingAgent) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const activeStep = STEPS[step - 1]!;

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[8px] shadow-none flex flex-col font-sans h-full w-full overflow-hidden">
      {/* TOP HEADER: Back + Title + Compact progress */}
      <div className="shrink-0 h-14 border-b border-[#E5E5E5] bg-white flex items-center px-4 sm:px-5 gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isFormLoading}
          className="flex items-center gap-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] rounded-[6px] px-2 py-1.5 text-xs font-semibold transition-colors focus:outline-none disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>

        <span className="h-5 w-[1px] bg-[#E5E5E5] shrink-0" />

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-[#111111] tracking-tight truncate">
            {editingAgent ? (
              <>
                <span className="text-[#666666] font-medium">Configure</span>
                <span className="text-[#666666] mx-1.5">·</span>
                <span>{editingAgent.name}</span>
              </>
            ) : (
              "New agent"
            )}
          </h2>
        </div>

        <MiniStepper currentStep={step} onSelect={handleGoToStep} />
      </div>

      {/* BODY: Left rail + Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* LEFT RAIL — steps */}
        <aside className="hidden md:flex md:w-[228px] lg:w-[248px] shrink-0 border-r border-[#E5E5E5] bg-[#FAFAFA] flex-col p-3 overflow-y-auto">
          <nav className="space-y-1">
            {STEPS.map((s) => {
              const isCompleted = step > s.num;
              const isActive = step === s.num;
              const isClickable = s.num < step;
              const Icon = s.icon;

              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => isClickable && handleGoToStep(s.num)}
                  disabled={!isClickable && !isActive}
                  className={`w-full text-left flex items-start gap-2.5 rounded-[6px] px-2.5 py-2.5 transition-colors ${
                    isActive
                      ? "bg-white border border-[#2563EB]/20 shadow-[0_1px_2px_rgba(37,99,235,0.06)]"
                      : isClickable
                        ? "hover:bg-white/70 border border-transparent cursor-pointer"
                        : "border border-transparent cursor-default"
                  }`}
                >
                  <span
                    className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isActive
                        ? "bg-[#2563EB] text-white"
                        : isCompleted
                          ? "bg-[#16A34A] text-white"
                          : "bg-white border border-[#E5E5E5] text-[#999999]"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-[11px] font-bold uppercase tracking-wider ${
                        isActive
                          ? "text-[#2563EB]"
                          : isCompleted
                            ? "text-[#16A34A]"
                            : "text-[#666666]"
                      }`}
                    >
                      Step {s.num}
                    </span>
                    <span
                      className={`block text-[13px] font-semibold mt-0.5 leading-tight ${
                        isActive ? "text-[#111111]" : "text-[#111111]"
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="block text-[11px] text-[#666666] mt-0.5 leading-tight">
                      {s.subtitle}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile step selector — visible < md */}
          <div className="md:hidden shrink-0 border-b border-[#E5E5E5] bg-white px-4 py-2.5">
            <label className="block text-[10px] font-bold text-[#666666] uppercase tracking-wider mb-1">
              Step {step} of {STEPS.length}
            </label>
            <select
              value={step}
              onChange={(e) => handleGoToStep(Number(e.target.value))}
              className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] rounded-[6px] px-2 focus:outline-none"
            >
              {STEPS.map((s) => (
                <option key={s.num} value={s.num} disabled={s.num > step}>
                  {s.num}. {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Scrollable form area */}
          <div className="flex-1 overflow-y-auto bg-[#FAFAFA]/40">
            <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-5 sm:py-6">
              <div className="space-y-5">
                {step === 1 && (
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
                    websiteUrl={websiteUrl}
                    setWebsiteUrl={setWebsiteUrl}
                    businessInfo={businessInfo}
                    setBusinessInfo={setBusinessInfo}
                    errors={errors}
                    disabled={isFormLoading}
                  />
                )}

                {step === 2 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <VoiceSelector
                      voice={voice}
                      setVoice={setVoice}
                      language={language}
                      disabled={isFormLoading}
                    />
                    <TelephonySetup
                      phoneNumberId={phoneNumberId}
                      setPhoneNumberId={setPhoneNumberId}
                      phoneNumbers={phoneNumbers}
                      refetchPhoneNumbers={refetchPhoneNumbers}
                      disabled={isFormLoading}
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
                      disabled={isFormLoading}
                    />
                  </div>
                )}

                {step === 3 && (
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
                      disabled={isFormLoading}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STICKY FOOTER */}
          <div className="shrink-0 border-t border-[#E5E5E5] bg-white">
            <div className="px-4 sm:px-6 py-2.5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 sm:justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={onClose}
                  disabled={isFormLoading}
                  className="border border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-3.5 rounded-[6px] shadow-none"
                >
                  Cancel
                </Button>
                <span className="hidden sm:inline text-[11px] text-[#999999] font-medium">
                  Step {step} of {STEPS.length} · {activeStep.title}
                </span>
              </div>

              <div className="flex items-center gap-2 justify-end">
                {step > 1 && (
                  <Button
                    variant="secondary"
                    onClick={handleBack}
                    disabled={isFormLoading}
                    className="border border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-3 rounded-[6px] flex items-center gap-1.5 shadow-none"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </Button>
                )}

                {step < STEPS.length ? (
                  <Button
                    variant="primary"
                    onClick={handleNext}
                    className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8] flex items-center gap-1.5 border-none shadow-none"
                  >
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={handleFinish}
                    disabled={isFormLoading}
                    className="bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs h-9 px-4 rounded-[6px] flex items-center gap-2 border-none shadow-none disabled:opacity-70"
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Mini Stepper (top-right of header) ---------------- */

interface MiniStepperProps {
  currentStep: number;
  onSelect: (n: number) => void;
}

function MiniStepper({ currentStep, onSelect }: MiniStepperProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="hidden sm:inline text-[10px] font-bold text-[#666666] uppercase tracking-wider mr-1 tabular-nums">
        {currentStep}/{STEPS.length}
      </span>
      <ol className="flex items-center">
        {STEPS.map((s, idx) => {
          const isCompleted = currentStep > s.num;
          const isActive = currentStep === s.num;
          const isClickable = s.num < currentStep;
          return (
            <React.Fragment key={s.num}>
              <li>
                <button
                  type="button"
                  onClick={() => isClickable && onSelect(s.num)}
                  disabled={!isClickable}
                  title={s.title}
                  aria-label={`Step ${s.num}: ${s.title}`}
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                    isActive
                      ? "bg-[#2563EB] text-white ring-2 ring-[#2563EB]/20"
                      : isCompleted
                        ? "bg-[#16A34A] text-white cursor-pointer hover:bg-[#15803D]"
                        : "bg-white border border-[#E5E5E5] text-[#999999]"
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" strokeWidth={3} /> : s.num}
                </button>
              </li>
              {idx < STEPS.length - 1 && (
                <li
                  className={`w-4 sm:w-6 h-[2px] transition-colors ${
                    currentStep > s.num ? "bg-[#16A34A]" : "bg-[#E5E5E5]"
                  }`}
                  aria-hidden
                />
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
}

/* ---------------- Compliance Panel ---------------- */

interface CompliancePanelProps {
  maxDuration: number;
  setMaxDuration: (val: number) => void;
  dndCompliance: boolean;
  setDndCompliance: (val: boolean) => void;
  recordingConsent: boolean;
  setRecordingConsent: (val: boolean) => void;
  isActive: boolean;
  setIsActive: (val: boolean) => void;
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
    <section className="bg-white border border-[#E5E5E5] rounded-[8px] p-5 sm:p-6 space-y-4">
      <header>
        <h3 className="text-sm font-semibold text-[#111111]">Call limits & compliance</h3>
        <p className="text-[12px] text-[#666666] mt-1 leading-relaxed">
          Set safety guardrails for how this agent behaves on every call.
        </p>
      </header>

      <div>
        <label className="block text-[12px] font-semibold text-[#111111] mb-2">
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
            className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] rounded-[6px] h-10 px-3 w-full focus:outline-none focus:ring-0"
          />
          <span className="text-xs text-[#666666] font-medium shrink-0">minutes</span>
        </div>
        <p className="text-[11px] text-[#999999] mt-1.5">
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
    <label className="flex items-start justify-between gap-4 rounded-[8px] border border-[#E5E5E5] p-3.5 hover:border-[#2563EB]/30 transition-colors cursor-pointer bg-white">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-[#111111]">{title}</div>
        <div className="text-[11px] text-[#666666] leading-relaxed mt-0.5">{description}</div>
      </div>
      <span className="relative inline-flex items-center shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <span className="w-[36px] h-[20px] bg-[#E5E5E5] rounded-full peer-checked:bg-[#2563EB] transition-colors" />
        <span
          className={`absolute top-[2px] left-[2px] h-4 w-4 bg-white border border-[#E5E5E5] rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </label>
  );
}
