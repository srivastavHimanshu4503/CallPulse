import * as React from "react";
import { Input } from "@antigravity/ui";
import { Smile, Briefcase, Coffee, ChevronDown, Globe, Info } from "lucide-react";
// Single source of truth with the Voice tab — the same setting is editable
// in both places.
import { AGENT_LANGUAGES } from "./VoiceSelector.js";

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
  modelName: string;
  setModelName: (val: string) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

const LANGUAGES = AGENT_LANGUAGES;
const TONES = [
  { value: "Friendly", icon: Smile, hint: "Warm & approachable" },
  { value: "Professional", icon: Briefcase, hint: "Formal & clear" },
  { value: "Casual", icon: Coffee, hint: "Relaxed & personal" },
] as const;

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o (Fastest)" },
  { value: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet (Best Reasoning)" },
];

const GREETING_MAX = 240;
const FALLBACK_MAX = 240;

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
  modelName,
  setModelName,
  errors,
  disabled,
}: PersonaSetupProps): React.JSX.Element {
  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans">
      {/* IDENTITY CARD */}
      <SectionCard
        title="Identity"
        description="How the agent introduces itself and what job it's built to handle."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Agent name" required error={errors.name}>
            <Input
              type="text"
              placeholder="e.g. Priya, Kabir"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              disabled={disabled}
              className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] h-10 px-3 w-full shadow-none"
            />
          </Field>
          <Field label="Role / purpose" required error={errors.role}>
            <Input
              type="text"
              placeholder="e.g. Real-estate sales, Clinic bookings"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              error={errors.role}
              disabled={disabled}
              className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] h-10 px-3 w-full shadow-none"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Primary language" required>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder pointer-events-none" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={disabled}
                className="w-full h-10 bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary rounded-[6px] pl-9 pr-9 focus:outline-none appearance-none"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder pointer-events-none" />
            </div>
          </Field>

          <Field label="Tone">
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface rounded-[6px] border border-border">
              {TONES.map((t) => {
                const Icon = t.icon;
                const selected = tone === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTone(t.value)}
                    disabled={disabled}
                    title={t.hint}
                    className={`flex items-center justify-center gap-1.5 h-8 rounded-[4px] text-xs font-semibold transition-all ${
                      selected
                        ? "bg-bg-raised text-brand-600 shadow-sm ring-1 ring-brand-500/15"
                        : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.value}
                  </button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="AI Model" required>
            <div className="relative">
              <select
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={disabled}
                className="w-full h-10 bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary rounded-[6px] pl-3 pr-9 focus:outline-none appearance-none"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder pointer-events-none" />
            </div>
          </Field>
        </div>
      </SectionCard>

      {/* SCRIPT CARD */}
      <SectionCard
        title="Conversation script"
        description="Opening line the agent uses, and what it says when it doesn't have an answer."
      >
        <Field
          label="Greeting message"
          required
          hint="First words the caller hears when the call connects."
          counter={{ current: greetingMessage.length, max: GREETING_MAX }}
        >
          <textarea
            value={greetingMessage}
            onChange={(e) => setGreetingMessage(e.target.value.slice(0, GREETING_MAX))}
            disabled={disabled}
            placeholder="Namaste! Main aapki kaise help kar sakti hoon?"
            rows={3}
            className="w-full bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] p-3 focus:outline-none leading-relaxed resize-none"
          />
        </Field>

        <Field
          label="Fallback message"
          required
          hint="Used when the agent can't answer a question or needs to hand off."
          counter={{ current: fallbackMessage.length, max: FALLBACK_MAX }}
        >
          <textarea
            value={fallbackMessage}
            onChange={(e) => setFallbackMessage(e.target.value.slice(0, FALLBACK_MAX))}
            disabled={disabled}
            placeholder="I'll connect you with our team for this. One moment please."
            rows={3}
            className="w-full bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] p-3 focus:outline-none leading-relaxed resize-none"
          />
        </Field>
      </SectionCard>
    </div>
  );
}

/* ---------------- Reusable primitives ---------------- */

interface SectionCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

function SectionCard({ title, description, children }: SectionCardProps): React.JSX.Element {
  return (
    <section className="bg-bg-raised border border-border rounded-[8px] p-5 sm:p-6 space-y-4">
      <header>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {description && (
          <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">{description}</p>
        )}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  counter?: { current: number; max: number };
  children: React.ReactNode;
}

function Field({ label, required, hint, error, counter, children }: FieldProps): React.JSX.Element {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] font-semibold text-text-primary">
          {label}
          {required && <span className="text-negative-500 ml-0.5">*</span>}
        </label>
        {counter && (
          <span
            className={`text-[10px] font-medium tabular-nums ${
              counter.current >= counter.max ? "text-negative-500" : "text-text-placeholder"
            }`}
          >
            {counter.current}/{counter.max}
          </span>
        )}
      </div>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-text-placeholder mt-1.5 leading-relaxed flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}
