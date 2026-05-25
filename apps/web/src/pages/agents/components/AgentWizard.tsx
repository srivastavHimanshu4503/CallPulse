import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { toast } from "sonner";
import { Button, Input } from "@antigravity/ui";
import { PersonaSetup } from "./PersonaSetup.js";
import { VoiceSelector } from "./VoiceSelector.js";
import { TelephonySetup } from "./TelephonySetup.js";
import { WorkflowSetup } from "./WorkflowSetup.js";
import { Bot, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { SerializedAgent } from "@antigravity/types";

interface AgentWizardProps {
  editingAgent: SerializedAgent | null;
  onClose: () => void;
  phoneNumbers: any[];
  refetchPhoneNumbers: () => void;
  workflows: any[];
}

export function AgentWizard({
  editingAgent,
  onClose,
  phoneNumbers,
  refetchPhoneNumbers,
  workflows
}: AgentWizardProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState(1);

  // STEP 1: Basic Profile States
  const [name, setName] = React.useState(editingAgent?.name || "");
  const [role, setRole] = React.useState(editingAgent?.role || "");
  const [language, setLanguage] = React.useState(editingAgent?.language || "Hinglish");
  const [greetingMessage, setGreetingMessage] = React.useState(editingAgent?.greetingMessage || "Namaste! Main aapki kaise help kar sakti hoon?");
  const [tone, setTone] = React.useState<"Friendly" | "Professional" | "Casual">(editingAgent?.tone as any || "Friendly");
  const [fallbackMessage, setFallbackMessage] = React.useState(editingAgent?.fallbackMessage || "I'll connect you with our team for this. One moment please.");
  const [businessInfo, setBusinessInfo] = React.useState(editingAgent?.businessInfo || "");
  const [websiteUrl, setWebsiteUrl] = React.useState(editingAgent?.websiteUrl || "");

  // STEP 2: Audio & Telephony States
  const [voice, setVoice] = React.useState(editingAgent?.voice || "priya");
  const [phoneNumberId, setPhoneNumberId] = React.useState<string | null>(editingAgent?.phoneNumberId || null);
  const [maxDuration, setMaxDuration] = React.useState(editingAgent?.maxDuration || 10);
  const [dndCompliance, setDndCompliance] = React.useState(editingAgent?.dndCompliance ?? true);
  const [recordingConsent, setRecordingConsent] = React.useState(editingAgent?.recordingConsent ?? true);
  const [isActive, setIsActive] = React.useState(editingAgent?.isActive ?? true);

  // STEP 3: Workflow Configuration States
  const [intakeEnabled, setIntakeEnabled] = React.useState(editingAgent?.intakeEnabled ?? false);
  const [intakeWorkflowId, setIntakeWorkflowId] = React.useState<string | null>(editingAgent?.intakeWorkflowId || null);
  const [intakeFields, setIntakeFields] = React.useState<string[]>(editingAgent?.intakeFields || []);
  const [intakePrompt, setIntakePrompt] = React.useState(editingAgent?.intakePrompt || "");

  const [smsEnabled, setSmsEnabled] = React.useState(editingAgent?.smsEnabled ?? false);
  const [smsWorkflowId, setSmsWorkflowId] = React.useState<string | null>(editingAgent?.smsWorkflowId || null);
  const [smsTriggerCondition, setSmsTriggerCondition] = React.useState(editingAgent?.smsTriggerCondition || "");
  const [smsTemplate, setSmsTemplate] = React.useState(editingAgent?.smsTemplate || "");
  const [smsAgentReply, setSmsAgentReply] = React.useState(editingAgent?.smsAgentReply || "");

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // API Mutations
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
    }
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
    }
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
        errs.phoneNumberId = "A dedicated Twilio virtual line is required";
        toast.error("A dedicated Twilio virtual phone line is required. Please assign or purchase a new one.");
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => s - 1);
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

    if (editingAgent) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-none flex flex-col md:flex-row font-sans h-[calc(100vh-176px)] w-full overflow-hidden">
      
      {/* LEFT NAVIGATION / HELP BAR */}
      <div className="w-full md:w-64 bg-[#FAFAFA] border-r border-[#E5E5E5] p-6 flex flex-col justify-between shrink-0 h-full">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-[#EFF6FF] border border-[#2563EB]/10 rounded-[6px] flex items-center justify-center text-[#2563EB]">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">Configure Agent</span>
          </div>

          {/* Stepper Progress */}
          <div className="space-y-4 pt-4">
            {[
              { num: 1, title: "Persona & Info", desc: "Basic identity and greeting details" },
              { num: 2, title: "Telephony & Audio", desc: "Voice selection and phone line setup" },
              { num: 3, title: "Integrations", desc: "Intake and SMS workflow triggers" }
            ].map((s) => (
              <div key={s.num} className="flex gap-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  step === s.num
                    ? "bg-[#2563EB] text-white"
                    : step > s.num
                      ? "bg-[#16A34A] text-white"
                      : "bg-[#E5E5E5] text-[#666666]"
                }`}>
                  {step > s.num ? "✓" : s.num}
                </div>
                <div>
                  <h4 className={`text-xs font-bold transition-colors ${step === s.num ? "text-[#111111]" : "text-[#666666]"}`}>
                    {s.title}
                  </h4>
                  <p className="text-[10px] text-[#999999] leading-tight mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security / isolated badge */}
        <div className="pt-8 md:pt-0 border-t md:border-t-0 border-[#E5E5E5] mt-6 md:mt-0">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] p-3 flex gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-[#16A34A] shrink-0 mt-0.5" />
            <div>
              <h5 className="text-[11px] font-bold text-[#111111] uppercase tracking-wide">Multi-Tenancy</h5>
              <p className="text-[10px] text-[#666666] leading-snug mt-0.5">Isolated workspace database environment.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT ACTION WORKSPACE */}
      <div className="flex-1 flex flex-col justify-between bg-white h-full overflow-hidden">
        
        {/* Main wizard fields workspace */}
        <div className="p-6 md:p-8 space-y-8 flex-1 overflow-y-auto">
          
          {/* STEP 1 FIELDS */}
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

          {/* STEP 2 FIELDS */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <VoiceSelector voice={voice} setVoice={setVoice} disabled={isFormLoading} />
              
              <div className="border-t border-[#E5E5E5] pt-5">
                <TelephonySetup
                  phoneNumberId={phoneNumberId}
                  setPhoneNumberId={setPhoneNumberId}
                  phoneNumbers={phoneNumbers}
                  refetchPhoneNumbers={refetchPhoneNumbers}
                  disabled={isFormLoading}
                />
              </div>

              <div className="border-t border-[#E5E5E5] pt-5 space-y-4">
                <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">
                  LINE BEHAVIOR COMPLIANCE
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#111111] mb-2">
                    Max Call Duration (minutes)
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={maxDuration}
                    onChange={(e) => setMaxDuration(Number(e.target.value))}
                    disabled={isFormLoading}
                    className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] rounded-[6px] h-10 px-3 w-40"
                  />
                </div>

                <div className="space-y-3 pt-1">
                  {[
                    { label: "DND Compliance (Do not call DND numbers)", val: dndCompliance, setVal: setDndCompliance },
                    { label: "Recording Consent (Inform caller of recording)", val: recordingConsent, setVal: setRecordingConsent },
                    { label: "Launch Status (Agent active and taking calls immediately)", val: isActive, setVal: setIsActive }
                  ].map((chk) => (
                    <label key={chk.label} className="flex items-center gap-2.5 text-xs font-semibold text-[#111111] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chk.val}
                        onChange={(e) => chk.setVal(e.target.checked)}
                        disabled={isFormLoading}
                        className="h-4 w-4 rounded border-[#E5E5E5] text-[#2563EB] focus:ring-0"
                      />
                      <span>{chk.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 FIELDS */}
          {step === 3 && (
            <div className="animate-in fade-in duration-150">
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

        {/* Wizard Bottom navigation controls */}
        <div className="h-16 border-t border-[#E5E5E5] px-6 bg-[#FAFAFA] flex items-center justify-between shrink-0">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isFormLoading}
            className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-10 px-4 rounded-[6px] shadow-none"
          >
            Cancel Setup
          </Button>

          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={isFormLoading}
                className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-10 px-3.5 rounded-[6px] flex items-center gap-1.5 shadow-none"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
            )}

            {step < 3 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                className="bg-[#2563EB] text-white font-semibold text-xs h-10 px-4 rounded-[6px] hover:bg-[#1D4ED8] flex items-center gap-1.5 border-none shadow-none"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleFinish}
                disabled={isFormLoading}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-xs h-10 px-5 rounded-[6px] flex items-center gap-2 border-none shadow-none"
              >
                <CheckCircle2 className="h-4.5 w-4.5" /> {isFormLoading ? "Deploying Agent..." : "Launch Agent receptionist"}
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
