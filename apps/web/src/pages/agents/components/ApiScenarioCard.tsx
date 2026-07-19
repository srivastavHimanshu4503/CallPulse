import * as React from "react";
import { Trash2, ChevronDown } from "lucide-react";
import { Input } from "@antigravity/ui";

export interface ApiScenario {
  id: string;
  triggerCondition: string;
  method: "GET" | "POST" | "PUT" | "PATCH";
  url: string;
  /** One header per line, e.g. `Authorization: Bearer xyz` */
  headers: string;
  /** JSON body template — supports {caller_name}, {caller_number}, {conversation_summary} */
  bodyTemplate: string;
  agentReply: string;
}

const AGENT_REPLY_MAX = 200;
const METHODS: ApiScenario["method"][] = ["GET", "POST", "PUT", "PATCH"];

interface ApiScenarioCardProps {
  scenario: ApiScenario;
  index: number;
  onUpdate: (updated: ApiScenario) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function ApiScenarioCard({
  scenario,
  index,
  onUpdate,
  onDelete,
  disabled,
}: ApiScenarioCardProps): React.JSX.Element {
  const [showAdvanced, setShowAdvanced] = React.useState(
    Boolean(scenario.headers?.trim() || scenario.bodyTemplate?.trim()),
  );

  const set = <K extends keyof ApiScenario>(field: K, value: ApiScenario[K]) => {
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
          <span className="text-xs font-semibold text-[#111111]">API scenario</span>
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
          When to call this API?
          <span className="text-[#DC2626] ml-0.5">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g. When the caller asks about their order status"
          value={scenario.triggerCondition}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("triggerCondition", e.target.value)}
          disabled={disabled}
          required
          className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full shadow-none"
        />
      </div>

      {/* Method + URL */}
      <div>
        <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
          Webhook endpoint
          <span className="text-[#DC2626] ml-0.5">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={scenario.method}
            onChange={(e) => set("method", e.target.value as ApiScenario["method"])}
            disabled={disabled}
            className="h-10 w-[92px] shrink-0 px-2 text-[12px] font-semibold text-[#111111] bg-[#F7F7F7] border border-[#E5E5E5] rounded-[6px] focus:outline-none focus:border-[#2563EB]"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <Input
            type="url"
            placeholder="https://api.yourcompany.com/orders/status"
            value={scenario.url}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("url", e.target.value)}
            disabled={disabled}
            required
            className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full shadow-none font-mono text-[12px]"
          />
        </div>
      </div>

      {/* Advanced: headers + body */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-[11px] font-semibold text-[#666666] hover:text-[#111111] transition-colors"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        Headers &amp; request body {showAdvanced ? "" : "(optional)"}
      </button>

      {showAdvanced && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">Headers</label>
            <textarea
              value={scenario.headers}
              onChange={(e) => set("headers", e.target.value)}
              disabled={disabled}
              placeholder={"Authorization: Bearer YOUR_TOKEN\nX-Api-Key: abc123"}
              rows={2}
              className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-[12px] font-mono text-[#111111] placeholder-[#999999] rounded-[6px] p-3 focus:outline-none leading-relaxed resize-none"
            />
            <p className="text-[11px] text-[#999999] mt-1">One header per line as <code className="bg-[#F7F7F7] px-1 rounded text-[10px] font-mono">Name: value</code>.</p>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
              Request body {scenario.method === "GET" ? "(ignored for GET)" : ""}
            </label>
            <textarea
              value={scenario.bodyTemplate}
              onChange={(e) => set("bodyTemplate", e.target.value)}
              disabled={disabled}
              placeholder={'{\n  "phone": "{caller_number}",\n  "name": "{caller_name}"\n}'}
              rows={4}
              className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-[12px] font-mono text-[#111111] placeholder-[#999999] rounded-[6px] p-3 focus:outline-none leading-relaxed resize-none"
            />
            <p className="text-[11px] text-[#999999] mt-1">
              Variables: <code className="bg-[#F7F7F7] px-1 rounded text-[10px] font-mono">{"{caller_name}"}</code>{" "}
              <code className="bg-[#F7F7F7] px-1 rounded text-[10px] font-mono">{"{caller_number}"}</code>{" "}
              <code className="bg-[#F7F7F7] px-1 rounded text-[10px] font-mono">{"{conversation_summary}"}</code>
            </p>
          </div>
        </div>
      )}

      {/* Agent reply */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-semibold text-[#111111]">
            What should the agent say meanwhile?
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
          placeholder="Ek second, main aapke order ka status check kar rahi hoon..."
          value={scenario.agentReply}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set("agentReply", e.target.value.slice(0, AGENT_REPLY_MAX))
          }
          disabled={disabled}
          required
          className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full shadow-none"
        />
      </div>
    </div>
  );
}
