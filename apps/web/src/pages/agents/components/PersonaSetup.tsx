import * as React from "react";
import { Input } from "@antigravity/ui";

interface PersonaSetupProps {
  name: string;
  setName: (val: string) => void;
  role: string;
  setRole: (val: string) => void;
  language: string;
  setLanguage: (val: string) => void;
  greetingMessage: string;
  setGreetingMessage: (val: string) => void;
  tone: "Friendly" | "Professional" | "Casual";
  setTone: (val: "Friendly" | "Professional" | "Casual") => void;
  fallbackMessage: string;
  setFallbackMessage: (val: string) => void;
  websiteUrl: string;
  setWebsiteUrl: (val: string) => void;
  businessInfo: string;
  setBusinessInfo: (val: string) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

export function PersonaSetup({
  name,
  setName,
  role,
  setRole,
  language,
  setLanguage,
  greetingMessage,
  setGreetingMessage,
  tone,
  setTone,
  fallbackMessage,
  setFallbackMessage,
  websiteUrl,
  setWebsiteUrl,
  businessInfo,
  setBusinessInfo,
  errors,
  disabled
}: PersonaSetupProps): React.JSX.Element {
  return (
    <div className="space-y-6 animate-in fade-in duration-150 font-sans">
      <div className="text-[10px] font-bold text-[#666666] uppercase tracking-wider border-b border-[#E5E5E5] pb-2">
        BASIC PERSONA DETAILS
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-[13px] font-semibold text-[#111111] mb-2">Agent Name *</label>
          <Input
            type="text"
            placeholder="e.g. Priya, Kabir"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
            disabled={disabled}
            className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
          />
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-[#111111] mb-2">Role / Purpose *</label>
          <Input
            type="text"
            placeholder="e.g. Real Estate Sales, Support"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            error={errors.role}
            disabled={disabled}
            className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-[13px] font-semibold text-[#111111] mb-2">Primary Language *</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={disabled}
            className="w-full h-10 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] rounded-[6px] px-3 focus:outline-none"
          >
            {["English", "Hindi", "Hinglish", "Marathi", "Tamil", "Telugu"].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[13px] font-semibold text-[#111111] mb-2">Tone</label>
          <div className="flex gap-4 pt-2.5">
            {(["Friendly", "Professional", "Casual"] as const).map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-xs font-semibold text-[#111111] cursor-pointer">
                <input
                  type="radio"
                  name="tone"
                  value={t}
                  checked={tone === t}
                  onChange={() => setTone(t)}
                  disabled={disabled}
                  className="h-4 w-4 border-[#E5E5E5] text-[#2563EB] focus:ring-0"
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-[#111111] mb-2">Greeting Message Prompt *</label>
        <textarea
          value={greetingMessage}
          onChange={(e) => setGreetingMessage(e.target.value)}
          disabled={disabled}
          placeholder="What is the first thing the agent says when they connect?"
          rows={3}
          className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] p-3 focus:outline-none leading-relaxed"
        />
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-[#111111] mb-2">Fallback Confirmation Prompt *</label>
        <textarea
          value={fallbackMessage}
          onChange={(e) => setFallbackMessage(e.target.value)}
          disabled={disabled}
          placeholder="Said when agent doesn't know the answer or encounters complex questions."
          rows={3}
          className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] p-3 focus:outline-none leading-relaxed"
        />
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-[#111111] mb-2">Knowledge Base Context URL</label>
        <Input
          type="text"
          placeholder="https://yourbusiness.com"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          error={errors.websiteUrl}
          disabled={disabled}
          className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
        />
      </div>

      <div>
        <label className="block text-[13px] font-semibold text-[#111111] mb-2">Business FAQ Text</label>
        <textarea
          value={businessInfo}
          onChange={(e) => setBusinessInfo(e.target.value)}
          disabled={disabled}
          placeholder="E.g. Pricing starts at 50 Lakhs. Listing is near Bandra. Open on weekends..."
          rows={4}
          className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] p-3 focus:outline-none leading-relaxed"
        />
      </div>
    </div>
  );
}
