import * as React from "react";
import { Trash2 } from "lucide-react";
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

const SMS_TEMPLATE_MAX = 320;
const AGENT_REPLY_MAX = 200;

export function SmsScenarioCard({
  scenario,
  index,
  onUpdate,
  onDelete,
  disabled,
}: SmsScenarioCardProps): React.JSX.Element {
  const handleUpdateField = (field: keyof SmsScenario, value: string) => {
    onUpdate({ ...scenario, [field]: value });
  };

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[8px] p-4 space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-6 w-6 rounded-full bg-[#EFF6FF] border border-[#2563EB]/15 text-[#2563EB] text-[10px] font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-[#111111]">SMS scenario</span>
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
          When to send SMS?
          <span className="text-[#DC2626] ml-0.5">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g. When pricing or listings requested by caller"
          value={scenario.triggerCondition}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleUpdateField("triggerCondition", e.target.value)
          }
          disabled={disabled}
          required
          className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full shadow-none"
        />
      </div>

      {/* SMS template */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-semibold text-[#111111]">
            SMS message
            <span className="text-[#DC2626] ml-0.5">*</span>
          </label>
          <span
            className={`text-[10px] font-medium tabular-nums ${
              scenario.smsTemplate.length >= SMS_TEMPLATE_MAX ? "text-[#DC2626]" : "text-[#999999]"
            }`}
          >
            {scenario.smsTemplate.length}/{SMS_TEMPLATE_MAX}
          </span>
        </div>
        <textarea
          value={scenario.smsTemplate}
          onChange={(e) => handleUpdateField("smsTemplate", e.target.value.slice(0, SMS_TEMPLATE_MAX))}
          disabled={disabled}
          required
          placeholder="Hi {name}, pricing details: check karein http://brochure.example.com/..."
          rows={3}
          className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] p-3 focus:outline-none leading-relaxed resize-none"
        />
        <p className="text-[11px] text-[#999999] mt-1">
          Use <code className="bg-[#F7F7F7] px-1 rounded text-[10px] font-mono">{"{name}"}</code> to insert the caller's name automatically.
        </p>
      </div>

      {/* Agent reply */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-semibold text-[#111111]">
            Agent's verbal confirmation
            <span className="text-[#DC2626] ml-0.5">*</span>
          </label>
          <span
            className={`text-[10px] font-medium tabular-nums ${
              scenario.agentReply.length >= AGENT_REPLY_MAX ? "text-[#DC2626]" : "text-[#999999]"
            }`}
          >
            {scenario.agentReply.length}/{AGENT_REPLY_MAX}
          </span>
        </div>
        <Input
          type="text"
          placeholder="Maine aapko SMS bhej diya hai. Please check karein."
          value={scenario.agentReply}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleUpdateField("agentReply", e.target.value.slice(0, AGENT_REPLY_MAX))
          }
          disabled={disabled}
          required
          className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full shadow-none"
        />
      </div>
    </div>
  );
}
