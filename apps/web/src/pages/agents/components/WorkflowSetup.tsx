import * as React from "react";
import { Layers, Plus } from "lucide-react";
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
  disabled
}: WorkflowSetupProps): React.JSX.Element {
  // Parse or initialize Intake Scenarios
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
            completionMessage: parsed.completionMessage || "Maine aapki requirements save kar li hain."
          }];
        }
      }
    } catch (e) {}
    return [{
      id: "intake-1",
      triggerName: "Lead Details Gathering",
      questions: ["What is your target budget range?", "Which location or area are you looking in?"],
      completionMessage: "Thank you! Maine aapki requirements save kar li hain. Humari team brochures WhatsApp par share karegi."
    }];
  });

  // Parse or initialize SMS Scenarios
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
        agentReply: smsAgentReply || "Maine aapko SMS ke through listings and pricing details send kar di hain."
      }];
    }

    return [{
      id: "sms-1",
      triggerCondition: "When pricing or brochures requested",
      smsTemplate: "Hi {name}, pricing details Sharma Realty ki details: price list/brochures check karein: http://brochure.Sharma...",
      agentReply: "Maine aapko SMS ke through pricing aur listings details send kar di hain. Please check karein."
    }];
  });

  // Sync state back to parent forms on change
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

  // Dynamic actions: Intake
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
        completionMessage: ""
      }
    ]);
  };

  const handleRemoveIntakeScenario = (idx: number) => {
    if (intakeScenarios.length > 1) {
      setIntakeScenarios(intakeScenarios.filter((_, i) => i !== idx));
    } else {
      toast.error("At least one lead intake scenario is required if enabled");
    }
  };

  // Dynamic actions: SMS
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
        agentReply: ""
      }
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
    <div className="space-y-6 font-sans">
      <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider border-b border-[#E5E5E5] pb-2 flex items-center gap-1.5">
        <Layers className="h-3.5 w-3.5" /> WORKFLOW CONFIGURATION
      </div>

      {/* 1. INTAKE WORKFLOW SECTION */}
      <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              In-Call Lead Intake Workflow
            </h4>
            <p className="text-[11px] text-[#666666] mt-0.5 leading-relaxed font-medium">
              Collect specific caller detail parameters dynamically during the live call.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={intakeEnabled}
              onChange={(e) => setIntakeEnabled(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E5E5] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]"></div>
          </label>
        </div>

        {intakeEnabled && (
          <div className="space-y-4 pt-3 border-t border-[#E5E5E5] animate-in fade-in duration-200">
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
              className="text-[#2563EB] hover:text-[#1D4ED8] text-xs font-bold flex items-center gap-1 mt-2 focus:outline-none bg-[#2563EB]/5 border border-[#2563EB]/10 rounded-[6px] py-2 px-3 hover:bg-[#2563EB]/10 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> + Deploy New Intake Scenario
            </button>
          </div>
        )}
      </div>

      {/* 2. SMS DISPATCH WORKFLOW SECTION */}
      <div className="rounded-[6px] border border-[#E5E5E5] bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              In-Call SMS Dispatch Workflow (Real-Time)
            </h4>
            <p className="text-[11px] text-[#666666] mt-0.5 leading-relaxed font-medium">
              Send an automated SMS containing prices, links, or brochures in real-time *during* the active call.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer select-none">
            <input
              type="checkbox"
              checked={smsEnabled}
              onChange={(e) => setSmsEnabled(e.target.checked)}
              disabled={disabled}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-[#E5E5E5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#E5E5E5] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563EB]"></div>
          </label>
        </div>

        {smsEnabled && (
          <div className="space-y-4 pt-3 border-t border-[#E5E5E5] animate-in fade-in duration-200">
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
              className="text-[#2563EB] hover:text-[#1D4ED8] text-xs font-bold flex items-center gap-1 mt-2 focus:outline-none bg-[#2563EB]/5 border border-[#2563EB]/10 rounded-[6px] py-2 px-3 hover:bg-[#2563EB]/10 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> + Deploy New SMS Scenario
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
