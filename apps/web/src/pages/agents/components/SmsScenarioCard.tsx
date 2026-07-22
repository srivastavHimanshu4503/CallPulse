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
    <div className="bg-bg-raised border border-border rounded-[8px] p-4 space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-6 w-6 rounded-full bg-brand-50 border border-brand-500/15 text-brand-600 text-[10px] font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-text-primary">SMS scenario</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="text-text-secondary hover:text-negative-500 hover:bg-negative-500/5 rounded-[6px] p-1.5 focus:outline-none transition-colors"
          title="Delete scenario"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Trigger */}
      <div>
        <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
          When to send SMS?
          <span className="text-negative-500 ml-0.5">*</span>
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
          className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] h-10 px-3 w-full shadow-none"
        />
      </div>

      {/* SMS template */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-semibold text-text-primary">
            SMS message
            <span className="text-negative-500 ml-0.5">*</span>
          </label>
          <span
            className={`text-[10px] font-medium tabular-nums ${
              scenario.smsTemplate.length >= SMS_TEMPLATE_MAX ? "text-negative-500" : "text-text-placeholder"
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
          className="w-full bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] p-3 focus:outline-none leading-relaxed resize-none"
        />
        <p className="text-[11px] text-text-placeholder mt-1">
          Use <code className="bg-surface px-1 rounded text-[10px] font-mono">{"{name}"}</code> to insert the caller's name automatically.
        </p>
      </div>

      {/* Agent reply */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-semibold text-text-primary">
            Agent's verbal confirmation
            <span className="text-negative-500 ml-0.5">*</span>
          </label>
          <span
            className={`text-[10px] font-medium tabular-nums ${
              scenario.agentReply.length >= AGENT_REPLY_MAX ? "text-negative-500" : "text-text-placeholder"
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
          className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] h-10 px-3 w-full shadow-none"
        />
      </div>
    </div>
  );
}
