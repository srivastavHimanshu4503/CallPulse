import * as React from "react";
import { Input } from "@antigravity/ui";
import { Info, UploadCloud, Link as LinkIcon, FileText, RefreshCw } from "lucide-react";
import { api } from "../../../lib/axios.js";

interface StoredKnowledgeBase {
  id: string;
  name: string;
  content: string | null;
  updatedAt: string;
}

interface KnowledgeBaseSetupProps {
  /** When editing an existing agent, its stored knowledge bases are shown. */
  agentId?: string;
  websiteUrl: string;
  setWebsiteUrl: (val: string) => void;
  businessInfo: string;
  setBusinessInfo: (val: string) => void;
  errors: Record<string, string>;
  disabled: boolean;
}

export function KnowledgeBaseSetup({
  agentId,
  websiteUrl,
  setWebsiteUrl,
  businessInfo,
  setBusinessInfo,
  errors,
  disabled,
}: KnowledgeBaseSetupProps): React.JSX.Element {
  return (
    <div className="space-y-5 animate-in fade-in duration-200 font-sans">
      {agentId && <StoredKnowledgeSection agentId={agentId} disabled={disabled} />}
      <SectionCard
        title="Knowledge base sources"
        description="Anchor the agent's answers to your business facts, pricing, FAQs, and documents."
      >
        <Field label="Website URL (Link)" hint="We crawl this page to pull FAQs and services." error={errors.websiteUrl}>
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
          label="Common Questions / Raw Text"
          hint="Paste pricing, service list, hours, or common Q&A. Higher signal = fewer fallbacks."
        >
          <div className="relative">
             <FileText className="absolute left-3 top-3 h-4 w-4 text-[#999999] pointer-events-none" />
            <textarea
              value={businessInfo}
              onChange={(e) => setBusinessInfo(e.target.value)}
              disabled={disabled}
              placeholder="E.g. Pricing starts at ₹50L. Bandra listing. Open on weekends 10am–7pm..."
              rows={5}
              className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] pl-9 p-3 focus:outline-none leading-relaxed resize-none"
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
    </div>
  );
}

function StoredKnowledgeSection({
  agentId,
  disabled,
}: {
  agentId: string;
  disabled: boolean;
}): React.JSX.Element {
  const [kbs, setKbs] = React.useState<StoredKnowledgeBase[] | null>(null);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [savingId, setSavingId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/agents/${agentId}/knowledge`);
      const list: StoredKnowledgeBase[] = res.data?.data ?? [];
      setKbs(list);
      setDrafts(Object.fromEntries(list.map((kb) => [kb.id, kb.content ?? ""])));
    } catch {
      setKbs([]);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async (kbId: string) => {
    setSavingId(kbId);
    try {
      await api.put(`/agents/${agentId}/knowledge/${kbId}`, { content: drafts[kbId] ?? "" });
      setKbs((prev) =>
        prev?.map((kb) => (kb.id === kbId ? { ...kb, content: drafts[kbId] ?? "" } : kb)) ?? null,
      );
    } finally {
      setSavingId(null);
    }
  };

  return (
    <SectionCard
      title="Agent knowledge base"
      description="What your agent already knows. A starter knowledge base is generated automatically from your business details — edit it any time."
    >
      {kbs === null || loading ? (
        <p className="text-[12px] text-[#666666]">Loading knowledge base…</p>
      ) : kbs.length === 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#666666] leading-relaxed">
            Your starter knowledge base is still being generated — this usually takes a few
            seconds after the agent is created.
          </p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      ) : (
        kbs.map((kb) => {
          const dirty = (drafts[kb.id] ?? "") !== (kb.content ?? "");
          return (
            <div key={kb.id}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-[#111111]">{kb.name}</label>
                <button
                  type="button"
                  disabled={disabled || !dirty || savingId === kb.id}
                  onClick={() => void save(kb.id)}
                  className="text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] disabled:text-[#999999]"
                >
                  {savingId === kb.id ? "Saving…" : dirty ? "Save" : "Saved"}
                </button>
              </div>
              <textarea
                value={drafts[kb.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [kb.id]: e.target.value }))}
                disabled={disabled}
                rows={10}
                className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] rounded-[6px] p-3 focus:outline-none leading-relaxed resize-y"
              />
            </div>
          );
        })
      )}
    </SectionCard>
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
