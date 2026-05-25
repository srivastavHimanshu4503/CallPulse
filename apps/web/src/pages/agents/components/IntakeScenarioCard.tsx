import * as React from "react";
import { X, Plus, HelpCircle } from "lucide-react";
import { Input } from "@antigravity/ui";

export interface IntakeScenario {
  id: string;
  triggerName: string;
  questions: string[];
  completionMessage: string;
}

interface IntakeScenarioCardProps {
  scenario: IntakeScenario;
  index: number;
  onUpdate: (updated: IntakeScenario) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function IntakeScenarioCard({
  scenario,
  index,
  onUpdate,
  onDelete,
  disabled
}: IntakeScenarioCardProps): React.JSX.Element {
  const handleUpdateTrigger = (triggerName: string) => {
    onUpdate({ ...scenario, triggerName });
  };

  const handleUpdateQuestion = (qIdx: number, value: string) => {
    const nextQuestions = [...scenario.questions];
    nextQuestions[qIdx] = value;
    onUpdate({ ...scenario, questions: nextQuestions });
  };

  const handleAddQuestion = () => {
    onUpdate({
      ...scenario,
      questions: [...scenario.questions, ""]
    });
  };

  const handleRemoveQuestion = (qIdx: number) => {
    const nextQuestions = scenario.questions.filter((_, idx) => idx !== qIdx);
    onUpdate({ ...scenario, questions: nextQuestions });
  };

  const handleUpdateCompletion = (completionMessage: string) => {
    onUpdate({ ...scenario, completionMessage });
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-[6px] p-4 space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2.5">
        <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
          Intake Scenario #{index + 1}
        </h4>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="text-[#DC2626] hover:bg-[#DC2626]/5 rounded-[6px] p-1.5 focus:outline-none flex items-center gap-1.5 text-[11px] font-bold transition-colors"
        >
          <X className="h-4 w-4" /> Delete Scenario
        </button>
      </div>

      {/* Trigger Name / Nickname */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#111111] flex items-center gap-1">
          Scenario Nickname / Trigger *
          <span title="Describe when the AI agent should trigger this questionnaire (e.g. 'When pricing is asked')">
            <HelpCircle className="h-3.5 w-3.5 text-[#999999]" />
          </span>
        </label>
        <Input
          type="text"
          placeholder="e.g. When pricing or listings requested by caller"
          value={scenario.triggerName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateTrigger(e.target.value)}
          disabled={disabled}
          required
          className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 w-full"
        />
      </div>

      {/* Voice Questions */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-[#111111]">
          Voice Interview Questionnaire Questions *
        </label>
        <div className="space-y-2">
          {scenario.questions.map((q, qIdx) => (
            <div key={qIdx} className="flex items-center gap-3 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] p-2">
              <span className="text-xs font-bold text-[#666666] shrink-0 w-6 text-center">
                {qIdx + 1}.
              </span>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="e.g. What configuration or BHK size are you looking for?"
                  value={q}
                  onChange={(e) => handleUpdateQuestion(qIdx, e.target.value)}
                  disabled={disabled}
                  required
                  className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                />
              </div>
              {scenario.questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
                  disabled={disabled}
                  className="text-[#DC2626] hover:bg-[#DC2626]/5 rounded-[6px] p-1.5 focus:outline-none shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddQuestion}
          disabled={disabled}
          className="text-[#2563EB] hover:text-[#1D4ED8] text-xs font-bold flex items-center gap-1 mt-1 focus:outline-none"
        >
          <Plus className="h-3.5 w-3.5" /> Add Custom Question
        </button>
      </div>

      {/* After-Prompt Verbal Close */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#111111] flex items-center gap-1">
          After-Prompt Close Message *
          <span title="What does the AI say once it collects all questionnaire answers?">
            <HelpCircle className="h-3.5 w-3.5 text-[#999999]" />
          </span>
        </label>
        <textarea
          value={scenario.completionMessage}
          onChange={(e) => handleUpdateCompletion(e.target.value)}
          disabled={disabled}
          required
          placeholder="E.g. Thank you! Maine aapki requirements save kar li hain. Humari team brochure WhatsApp par share karegi."
          rows={2.5}
          className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] p-3 focus:outline-none leading-relaxed"
        />
      </div>
    </div>
  );
}
