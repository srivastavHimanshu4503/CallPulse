import * as React from "react";
import { X, HelpCircle } from "lucide-react";
import { Input } from "@antigravity/ui";

export interface SmsScenario {
  id: string;
  triggerCondition: string;
  smsTemplate: string;
  agentReply: string;
}

interface SmsScenarioCardProps {
  scenario: SmsScenario;
  index: number;
  onUpdate: (updated: SmsScenario) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function SmsScenarioCard({
  scenario,
  index,
  onUpdate,
  onDelete,
  disabled
}: SmsScenarioCardProps): React.JSX.Element {
  const handleUpdateField = (field: keyof SmsScenario, value: string) => {
    onUpdate({ ...scenario, [field]: value });
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E5E5] rounded-[6px] p-4 space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2.5">
        <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
          SMS Scenario #{index + 1}
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

      {/* Trigger Condition */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#111111] flex items-center gap-1">
          Scenario Nickname / Trigger Condition *
          <span title="When does this SMS get sent during the call? (e.g. 'When pricing is asked')">
            <HelpCircle className="h-3 w-3 text-[#999999]" />
          </span>
        </label>
        <Input
          type="text"
          placeholder="e.g. When pricing or listings requested by caller"
          value={scenario.triggerCondition}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateField("triggerCondition", e.target.value)}
          disabled={disabled}
          required
          className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 w-full"
        />
      </div>

      {/* SMS Template */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#111111]">
          SMS Content Template / Message Body *
        </label>
        <textarea
          value={scenario.smsTemplate}
          onChange={(e) => handleUpdateField("smsTemplate", e.target.value)}
          disabled={disabled}
          required
          placeholder="Hi {name}, pricing Sharma Realty ki details: price list/brochures check karein: http://brochure.Sharma..."
          rows={2.5}
          className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] p-2.5 focus:outline-none leading-relaxed"
        />
      </div>

      {/* Agent verbal confirmation reply */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-[#111111]">
          Agent Verbal Confirmation Reply *
        </label>
        <Input
          type="text"
          placeholder="e.g. Maine aapko SMS ke through pricing aur listings details send kar di hain. Please check karein."
          value={scenario.agentReply}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUpdateField("agentReply", e.target.value)}
          disabled={disabled}
          required
          className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 w-full"
        />
      </div>
    </div>
  );
}
