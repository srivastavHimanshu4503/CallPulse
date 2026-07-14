import * as React from "react";
import { Trash2, Plus, GripVertical, X } from "lucide-react";
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
  disabled,
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
    onUpdate({ ...scenario, questions: [...scenario.questions, ""] });
  };

  const handleRemoveQuestion = (qIdx: number) => {
    const nextQuestions = scenario.questions.filter((_, idx) => idx !== qIdx);
    onUpdate({ ...scenario, questions: nextQuestions });
  };

  const handleUpdateCompletion = (completionMessage: string) => {
    onUpdate({ ...scenario, completionMessage });
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[8px] p-4 space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-6 w-6 rounded-full bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] text-[10px] font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-[#111111]">Intake scenario</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="text-[#666666] hover:text-[#DC2626] hover:bg-[#DC2626]/5 rounded-[6px] p-1.5 focus:outline-none transition-colors"
          title="Delete scenario"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Trigger */}
      <div>
        <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
          When does this trigger?
          <span className="text-[#DC2626] ml-0.5">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g. When pricing or listings are requested"
          value={scenario.triggerName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateTrigger(e.target.value)}
          disabled={disabled}
          required
          className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full shadow-none"
        />
      </div>

      {/* Questions */}
      <div>
        <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
          Questions to ask
          <span className="text-[#DC2626] ml-0.5">*</span>
        </label>
        <div className="space-y-2">
          {scenario.questions.map((q, qIdx) => (
            <div
              key={qIdx}
              className="flex items-center gap-2 bg-white border border-[#E5E5E5] rounded-[6px] pl-2 pr-1 py-1 focus-within:border-[#2563EB]"
            >
              <GripVertical className="h-3.5 w-3.5 text-[#999999] shrink-0" />
              <span className="text-[10px] font-bold text-[#999999] tabular-nums w-4 text-center">
                {qIdx + 1}
              </span>
              <input
                type="text"
                placeholder="e.g. What configuration or BHK size are you looking for?"
                value={q}
                onChange={(e) => handleUpdateQuestion(qIdx, e.target.value)}
                disabled={disabled}
                required
                className="flex-1 bg-transparent border-0 text-sm text-[#111111] placeholder-[#999999] h-9 focus:outline-none focus:ring-0"
              />
              {scenario.questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
                  disabled={disabled}
                  className="text-[#999999] hover:text-[#DC2626] hover:bg-[#DC2626]/5 rounded-[4px] p-1 focus:outline-none shrink-0 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddQuestion}
          disabled={disabled}
          className="text-[#2563EB] hover:text-[#1D4ED8] text-xs font-semibold flex items-center gap-1 mt-2 focus:outline-none"
        >
          <Plus className="h-3.5 w-3.5" /> Add question
        </button>
      </div>

      {/* Completion */}
      <div>
        <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
          Closing message
          <span className="text-[#DC2626] ml-0.5">*</span>
        </label>
        <textarea
          value={scenario.completionMessage}
          onChange={(e) => handleUpdateCompletion(e.target.value)}
          disabled={disabled}
          required
          placeholder="Thank you! Maine aapki requirements save kar li hain. Humari team brochure WhatsApp par share karegi."
          rows={2}
          className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] p-3 focus:outline-none leading-relaxed resize-none"
        />
        <p className="text-[11px] text-[#999999] mt-1">
          What the agent says once all questions are answered.
        </p>
      </div>
    </div>
  );
}
