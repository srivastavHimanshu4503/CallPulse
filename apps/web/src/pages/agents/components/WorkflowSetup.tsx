import * as React from "react";
import { Plus, ClipboardList, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { IntakeScenario, IntakeScenarioCard } from "./IntakeScenarioCard.js";
import { SmsScenario, SmsScenarioCard } from "./SmsScenarioCard.js";

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
  disabled?: boolean;
}

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
  disabled,
}: WorkflowSetupProps): React.JSX.Element {
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
  children,
}: FeatureBlockProps): React.JSX.Element {
  return (
    <section
      className={`bg-white border rounded-[8px] transition-colors ${
        enabled ? "border-[#2563EB]/25" : "border-[#E5E5E5]"
      }`}
    >
      <header className="p-5 flex items-start gap-3">
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
            {countBadge && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] px-2 py-0.5 rounded-full">
                {countBadge}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#666666] mt-1 leading-relaxed">{description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <span className="w-[36px] h-[20px] bg-[#E5E5E5] rounded-full peer-checked:bg-[#2563EB] transition-colors" />
          <span
            className={`absolute top-[2px] left-[2px] h-4 w-4 bg-white border border-[#E5E5E5] rounded-full shadow-sm transition-transform ${
              enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </label>
      </header>

      {enabled && (
        <div className="border-t border-[#E5E5E5] p-5 bg-[#FAFAFA]/40 rounded-b-[8px] animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </section>
  );
}
