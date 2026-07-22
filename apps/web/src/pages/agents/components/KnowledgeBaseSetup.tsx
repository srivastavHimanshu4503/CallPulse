import * as React from "react";
import { Input } from "@antigravity/ui";
import { Info, UploadCloud, Link as LinkIcon, FileText, MessageSquareText } from "lucide-react";

interface KnowledgeBaseSetupProps {
  websiteUrl: string;
  setWebsiteUrl: (val: string) => void;
  businessInfo: string;
  setBusinessInfo: (val: string) => void;
  agentGuidelines: string;
  setAgentGuidelines: (val: string) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

export function KnowledgeBaseSetup({
  websiteUrl,
  setWebsiteUrl,
  businessInfo,
  setBusinessInfo,
  agentGuidelines,
  setAgentGuidelines,
  errors,
  disabled,
}: KnowledgeBaseSetupProps): React.JSX.Element {
  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans">
      {/* WHAT the agent knows — pure business facts. */}
      <SectionCard
        title="Knowledge base"
        description="Your business data — the facts the agent answers from. It never invents anything outside this."
      >
        <Field
          label="Business information (raw data)"
          hint="Paste your raw business data: services, price list, packages, timings, address. Just the facts — no instructions."
        >
          <div className="relative">
             <FileText className="absolute left-3 top-3 h-4 w-4 text-[#999999] pointer-events-none" />
            <textarea
              value={businessInfo}
              onChange={(e) => setBusinessInfo(e.target.value)}
              disabled={disabled}
              placeholder={"E.g.\nPlastic chair ₹12 per chair. Cushion chair ₹25.\nSmall tent ₹2,500 onwards.\nOpen 9am–8pm, closed Tuesday.\nWe serve Jaipur and nearby areas."}
              rows={8}
              className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] pl-9 p-3 focus:outline-none leading-relaxed resize-y"
            />
          </div>
        </Field>

        <Field label="Website URL (optional)" hint="We crawl this page to pull FAQs and services." error={errors.websiteUrl}>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999] pointer-events-none" />
            <Input
              type="text"
              placeholder="https://yourbusiness.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              error={errors.websiteUrl}
              disabled={disabled}
              className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 pl-9 pr-3 w-full shadow-none"
            />
          </div>
        </Field>

        <Field
          label="Upload Files (Coming Soon)"
          hint="Upload PDF, DOCX, or TXT files to expand your agent's knowledge."
        >
          <div className="border-2 border-dashed border-[#E5E5E5] rounded-[8px] p-6 flex flex-col items-center justify-center bg-[#FAFAFA] text-center hover:bg-[#F0F6FF] hover:border-[#2563EB]/40 transition-colors cursor-not-allowed">
            <UploadCloud className="h-8 w-8 text-[#999999] mb-2" />
            <p className="text-sm font-semibold text-[#111111]">Click to upload or drag and drop</p>
            <p className="text-[11px] text-[#666666] mt-1">PDF, DOCX, TXT up to 10MB</p>
          </div>
        </Field>
      </SectionCard>

      {/* HOW the agent behaves — owner's instructions, separate from facts. */}
      <SectionCard
        title="Agent guidelines"
        description="How the agent should treat callers — tone, do's and don'ts, what to always or never say."
      >
        <Field
          label="Instructions for the agent (optional)"
          hint="Write like you're briefing a new receptionist. The agent follows these on every call."
        >
          <div className="relative">
            <MessageSquareText className="absolute left-3 top-3 h-4 w-4 text-[#999999] pointer-events-none" />
            <textarea
              value={agentGuidelines}
              onChange={(e) => setAgentGuidelines(e.target.value)}
              disabled={disabled}
              maxLength={4000}
              placeholder={"E.g.\nAlways ask for the event date before quoting a package.\nNever promise same-day delivery.\nIf someone asks for the owner, take their number politely.\nAddress regular customers by name."}
              rows={7}
              className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] pl-9 p-3 focus:outline-none leading-relaxed resize-y"
            />
          </div>
        </Field>
      </SectionCard>
    </div>
  );
}

interface SectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SectionCard({ title, description, children }: SectionCardProps): React.JSX.Element {
  return (
    <section className="bg-white border border-[#E5E5E5] rounded-[8px] p-5 sm:p-6 space-y-5 shadow-sm">
      <header>
        <h3 className="text-sm font-semibold text-[#111111]">{title}</h3>
        {description && (
          <p className="text-[12px] text-[#666666] mt-1 leading-relaxed">{description}</p>
        )}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, error, children }: FieldProps): React.JSX.Element {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-semibold text-[#111111]">
          {label}
          {required && <span className="text-[#DC2626] ml-0.5">*</span>}
        </label>
      </div>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-[#999999] mt-1.5 leading-relaxed flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}
