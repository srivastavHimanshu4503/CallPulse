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
    <div className="bg-bg-raised border border-border rounded-[8px] p-4 space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-6 w-6 rounded-full bg-brand-50 border border-brand-500/15 text-brand-600 text-[10px] font-bold flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <span className="text-xs font-semibold text-text-primary">API scenario</span>
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
          When to call this API?
          <span className="text-negative-500 ml-0.5">*</span>
        </label>
        <Input
          type="text"
          placeholder="e.g. When the caller asks about their order status"
          value={scenario.triggerCondition}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("triggerCondition", e.target.value)}
          disabled={disabled}
          required
          className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] h-10 px-3 w-full shadow-none"
        />
      </div>

      {/* Method + URL */}
      <div>
        <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
          Webhook endpoint
          <span className="text-negative-500 ml-0.5">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={scenario.method}
            onChange={(e) => set("method", e.target.value as ApiScenario["method"])}
            disabled={disabled}
            className="h-10 w-[92px] shrink-0 px-2 text-[12px] font-semibold text-text-primary bg-surface border border-border rounded-[6px] focus:outline-none focus:border-brand-500"
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
            className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] h-10 px-3 w-full shadow-none font-mono text-[12px]"
          />
        </div>
      </div>

      {/* Advanced: headers + body */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
        Headers &amp; request body {showAdvanced ? "" : "(optional)"}
      </button>

      {showAdvanced && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div>
            <label className="block text-[12px] font-semibold text-text-primary mb-1.5">Headers</label>
            <textarea
              value={scenario.headers}
              onChange={(e) => set("headers", e.target.value)}
              disabled={disabled}
              placeholder={"Authorization: Bearer YOUR_TOKEN\nX-Api-Key: abc123"}
              rows={2}
              className="w-full bg-bg-raised border border-border focus:border-brand-500 text-[12px] font-mono text-text-primary placeholder-text-placeholder rounded-[6px] p-3 focus:outline-none leading-relaxed resize-none"
            />
            <p className="text-[11px] text-text-placeholder mt-1">One header per line as <code className="bg-surface px-1 rounded text-[10px] font-mono">Name: value</code>.</p>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
              Request body {scenario.method === "GET" ? "(ignored for GET)" : ""}
            </label>
            <textarea
              value={scenario.bodyTemplate}
              onChange={(e) => set("bodyTemplate", e.target.value)}
              disabled={disabled}
              placeholder={'{\n  "phone": "{caller_number}",\n  "name": "{caller_name}"\n}'}
              rows={4}
              className="w-full bg-bg-raised border border-border focus:border-brand-500 text-[12px] font-mono text-text-primary placeholder-text-placeholder rounded-[6px] p-3 focus:outline-none leading-relaxed resize-none"
            />
            <p className="text-[11px] text-text-placeholder mt-1">
              Variables: <code className="bg-surface px-1 rounded text-[10px] font-mono">{"{caller_name}"}</code>{" "}
              <code className="bg-surface px-1 rounded text-[10px] font-mono">{"{caller_number}"}</code>{" "}
              <code className="bg-surface px-1 rounded text-[10px] font-mono">{"{conversation_summary}"}</code>
            </p>
          </div>
        </div>
      )}

      {/* Agent reply */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-semibold text-text-primary">
            What should the agent say meanwhile?
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
          placeholder="Ek second, main aapke order ka status check kar rahi hoon..."
          value={scenario.agentReply}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            set("agentReply", e.target.value.slice(0, AGENT_REPLY_MAX))
          }
          disabled={disabled}
          required
          className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] h-10 px-3 w-full shadow-none"
        />
      </div>
    </div>
  );
}
