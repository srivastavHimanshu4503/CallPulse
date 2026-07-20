import * as React from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/axios.js";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import {
  Card,
  PageHeader,
  AppButton,
  Toggle,
  Field,
  inputClass,
  textareaClass,
} from "../../components/common/UI.tsx";
import {
  Phone,
  Copy,
  Check,
  Sparkles,
  Monitor,
  Smartphone,
  Code2,
  ArrowUpRight,
  Globe,
  X,
  Search,
  ShoppingCart,
  Scissors,
  Home,
  MicOff,
  PhoneOff,
  Palette,
  Bot,
  Terminal,
} from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Position = "bottom-right" | "bottom-left" | "top-right" | "top-left";
type Shape = "pill" | "circle";
type Device = "desktop" | "mobile";
type Template = "salon" | "clinic" | "realestate" | "ecom";
type Tab = "design" | "behavior" | "install";

const POSITIONS: { label: string; value: Position }[] = [
  { label: "Bottom right", value: "bottom-right" },
  { label: "Bottom left",  value: "bottom-left" },
  { label: "Top right",    value: "top-right" },
  { label: "Top left",     value: "top-left" },
];
const SHAPES: { label: string; value: Shape }[] = [
  { label: "Pill", value: "pill" },
  { label: "Circle", value: "circle" },
];
const DEVICES: { label: string; value: Device }[] = [
  { label: "Desktop", value: "desktop" },
  { label: "Mobile", value: "mobile" },
];
const TEMPLATES: { label: string; value: Template; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "Salon",       value: "salon",      icon: Scissors },
  { label: "Clinic",      value: "clinic",     icon: Sparkles },
  { label: "Real estate", value: "realestate", icon: Home },
  { label: "E-commerce",  value: "ecom",       icon: ShoppingCart },
];



const COLOR_SWATCHES = [
  { name: "Blue",    value: "#2563EB" },
  { name: "Violet",  value: "#7C3AED" },
  { name: "Emerald", value: "#059669" },
  { name: "Amber",   value: "#F59E0B" },
  { name: "Rose",    value: "#E11D48" },
  { name: "Slate",   value: "#0F172A" },
];

const WIDGET_ID = "wgt_rj7hK92xLm";

// ─────────────────────────────────────────────────────────────
// Colour helpers — for contrast against any picked color
// ─────────────────────────────────────────────────────────────
function isLightColor(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // Perceived luminance
  return (0.299 * r + 0.587 * g + 0.114 * b) > 186;
}

// ─────────────────────────────────────────────────────────────
// Sample host-site templates
// ─────────────────────────────────────────────────────────────

const TEMPLATE_META: Record<Template, { title: string; domain: string }> = {
  salon:      { title: "Glow Studio",           domain: "glow-studio.in" },
  clinic:     { title: "Wellness Care Clinic",  domain: "wellnesscare.co" },
  realestate: { title: "Metro Homes Realty",    domain: "metrohomes.in" },
  ecom:       { title: "Kumar Kirana",          domain: "kumarkirana.com" },
};

function SiteChrome({
  device,
  domain,
  children,
}: {
  device: Device;
  domain: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const container =
    device === "mobile"
      ? "max-w-[280px] h-[560px] mx-auto rounded-[22px] p-1.5 bg-slate-900 shadow-pop flex flex-col"
      : "w-full h-full max-w-[900px] rounded-lg bg-slate-100 border border-line-default shadow-pop mx-auto flex flex-col";
  const inner =
    device === "mobile"
      ? "rounded-[16px] bg-white overflow-hidden flex-1 flex flex-col relative"
      : "rounded-md bg-white overflow-hidden flex-1 flex flex-col relative";

  return (
    <div className={container}>
      <div className={inner}>
        <div className="h-7 border-b border-line-subtle bg-bg-subtle flex items-center gap-2 px-2.5">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 mx-2 h-4 rounded-md bg-white border border-line-subtle text-[9.5px] text-fg-muted font-medium flex items-center px-2">
            <Globe className="h-2 w-2 mr-1.5" />
            {domain}
            <Search className="h-2 w-2 ml-auto" />
          </div>
        </div>
        <div className="relative flex-1 bg-white overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function TemplateSalon(): React.JSX.Element {
  return (
    <div className="bg-gradient-to-br from-pink-50 to-white p-3 min-h-[260px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-bold text-slate-900">Glow Studio</div>
        <div className="flex gap-1.5 text-[8.5px] text-slate-500 font-medium">
          <span>Services</span><span>Book</span><span>Contact</span>
        </div>
      </div>
      <div className="h-12 rounded-md bg-gradient-to-r from-pink-200 to-rose-300 flex items-center justify-center text-[10px] font-bold text-rose-900 mb-2">
        Book your salon session today
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {["Haircut", "Facial", "Spa"].map((s) => (
          <div key={s} className="rounded-md bg-white border border-line-subtle p-1.5">
            <div className="h-7 rounded bg-bg-muted mb-1" />
            <div className="text-[9px] font-semibold text-slate-700">{s}</div>
            <div className="text-[8px] text-slate-500">₹499+</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateClinic(): React.JSX.Element {
  return (
    <div className="bg-gradient-to-br from-emerald-50 to-white p-3 min-h-[260px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-bold text-slate-900">Wellness Care Clinic</div>
        <div className="flex gap-1.5 text-[8.5px] text-slate-500 font-medium">
          <span>Doctors</span><span>Book</span><span>Insurance</span>
        </div>
      </div>
      <div className="rounded-md bg-white border border-line-subtle p-2 mb-1.5">
        <div className="text-[9.5px] font-bold text-emerald-700 mb-0.5">✓ Same-day appointments</div>
        <div className="text-[8.5px] text-slate-600">General physician · Dermatology · Pediatrics</div>
      </div>
      <div className="space-y-1.5">
        {["Dr. Kapoor — General Physician", "Dr. Mehta — Dermatologist"].map((d) => (
          <div key={d} className="flex items-center gap-2 rounded-md bg-white border border-line-subtle p-1.5">
            <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-[8.5px] font-bold text-emerald-700">DR</div>
            <div className="flex-1">
              <div className="text-[9px] font-semibold text-slate-700">{d}</div>
              <div className="text-[8px] text-slate-500">Available today</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateRealEstate(): React.JSX.Element {
  return (
    <div className="bg-slate-50 p-3 min-h-[260px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-bold text-slate-900">Metro Homes Realty</div>
        <div className="flex gap-1.5 text-[8.5px] text-slate-500 font-medium">
          <span>Listings</span><span>Rent</span><span>Sell</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { name: "3 BHK · Andheri West", price: "₹1.2 Cr", label: "New" },
          { name: "2 BHK · Powai",         price: "₹85 L",  label: "Hot" },
        ].map((h) => (
          <div key={h.name} className="rounded-md bg-white border border-line-subtle overflow-hidden">
            <div className="h-14 bg-gradient-to-br from-blue-200 to-blue-400 relative">
              <span className="absolute top-1 left-1 text-[8px] font-bold bg-white/90 text-blue-700 px-1 py-0.5 rounded">{h.label}</span>
            </div>
            <div className="p-1.5">
              <div className="text-[9px] font-semibold text-slate-700">{h.name}</div>
              <div className="text-[8.5px] font-bold text-blue-700">{h.price}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateEcom(): React.JSX.Element {
  return (
    <div className="bg-white p-3 min-h-[260px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-bold text-slate-900">Kumar Kirana</div>
        <div className="flex items-center gap-2 text-[8.5px] text-slate-500 font-medium">
          <Search className="h-2.5 w-2.5" />
          <ShoppingCart className="h-2.5 w-2.5" />
        </div>
      </div>
      <div className="h-10 rounded-md bg-gradient-to-r from-amber-100 to-orange-100 flex items-center px-2 mb-1.5">
        <div>
          <div className="text-[9.5px] font-bold text-amber-900">Diwali sale · up to 40% off</div>
          <div className="text-[8px] text-amber-700">Free delivery on ₹499+</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {["Rice", "Oil", "Atta", "Dal", "Sugar", "Tea"].map((p) => (
          <div key={p} className="rounded-md border border-line-subtle p-1.5">
            <div className="h-7 rounded bg-bg-muted mb-1" />
            <div className="text-[9px] font-semibold text-slate-700">{p}</div>
            <div className="text-[8px] text-slate-500">₹99</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TEMPLATE_BODY: Record<Template, React.FC> = {
  salon:      TemplateSalon,
  clinic:     TemplateClinic,
  realestate: TemplateRealEstate,
  ecom:       TemplateEcom,
};

// ─────────────────────────────────────────────────────────────
// Widget bubble + panel — always visible via shadow + border
// ─────────────────────────────────────────────────────────────

const POSITION_STYLES: Record<Position, { bubble: string; panel: string }> = {
  "bottom-right": { bubble: "bottom-3 right-3",  panel: "bottom-14 right-3" },
  "bottom-left":  { bubble: "bottom-3 left-3",   panel: "bottom-14 left-3" },
  "top-right":    { bubble: "top-3 right-3",     panel: "top-14 right-3" },
  "top-left":     { bubble: "top-3 left-3",      panel: "top-14 left-3" },
};

function WidgetBubble({
  color,
  shape,
  label,
  onClick,
}: {
  color: string;
  shape: Shape;
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  const isPill = shape === "pill";
  const light = isLightColor(color);
  const textColor = light ? "#0F172A" : "#FFFFFF";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        backgroundColor: color,
        color: textColor,
        // Fine outline stays visible even if color === background
        border: "1px solid rgba(15,23,42,0.12)",
        boxShadow: "0 12px 32px -8px rgba(15,23,42,0.30), 0 2px 6px rgba(15,23,42,0.12)",
      }}
      className={[
        "inline-flex items-center font-semibold text-[12px] transition-transform hover:-translate-y-0.5",
        isPill ? "px-3.5 h-10 rounded-full gap-2" : "h-11 w-11 rounded-full justify-center",
      ].join(" ")}
    >
      <Phone className={isPill ? "h-3.5 w-3.5" : "h-4 w-4"} />
      {isPill && <span>{label}</span>}
    </button>
  );
}

function WidgetPanel({
  color,
  welcome,
  agentName,
  onClose,
}: {
  color: string;
  welcome: string;
  agentName: string;
  onClose: () => void;
}): React.JSX.Element {
  const light = isLightColor(color);
  const headerText = light ? "#0F172A" : "#FFFFFF";
  return (
    <div
      className="w-72 rounded-[24px] bg-white border border-line-default overflow-hidden flex flex-col"
      style={{ boxShadow: "0 20px 60px -12px rgba(15,23,42,0.30)" }}
    >
      <div className="p-6 flex flex-col items-center justify-center gap-4 bg-bg-subtle relative pt-10 pb-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 opacity-50 hover:opacity-100 p-2 text-fg-muted bg-white rounded-full shadow-sm"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="relative mt-2">
          <div className="absolute inset-0 rounded-full animate-ping opacity-25" style={{ backgroundColor: color }} />
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center text-[28px] font-bold shadow-md relative z-10 text-white"
            style={{ backgroundColor: color, color: headerText }}
          >
            {agentName.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="text-center mt-2">
          <div className="text-[16px] font-bold text-fg-primary">{agentName}</div>
          <div className="text-[12px] text-fg-muted mt-1 animate-pulse font-medium">Speaking...</div>
        </div>
      </div>
      <div className="p-5 bg-white border-t border-line-subtle text-center pb-6">
        <p className="text-[12px] text-slate-600 leading-relaxed italic mb-6 font-medium">"{welcome}"</p>
        <div className="flex justify-center gap-6">
          <button
            type="button"
            className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <MicOff className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 w-12 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 shadow-sm transition-colors"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Little UI atoms (kept local for tight layout)
// ─────────────────────────────────────────────────────────────

const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = ({ active, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-[12px] font-semibold transition-all"
    style={
      active
        ? {
            backgroundColor: "#2563EB",
            color: "#FFFFFF",
            boxShadow: "0 2px 4px rgba(37,99,235,0.35), 0 1px 2px rgba(0,0,0,0.08)",
          }
        : { backgroundColor: "transparent", color: "#475569" }
    }
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
  </button>
);

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1 auto-cols-fr" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="h-8 rounded-md text-[11.5px] font-semibold transition-all border"
            style={
              active
                ? {
                    backgroundColor: "#2563EB",
                    color: "#FFFFFF",
                    borderColor: "#1D4ED8",
                    boxShadow: "0 2px 4px rgba(37,99,235,0.35)",
                  }
                : { backgroundColor: "#FFFFFF", color: "#475569", borderColor: "#E5E7EB" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Widget page
// ─────────────────────────────────────────────────────────────

export function Widget(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const tenant = useAuthStore((s) => s.tenant);

  const [tab, setTab] = React.useState<Tab>("design");
  const [active, setActive] = React.useState(true);
  const [position, setPosition] = React.useState<Position>("bottom-right");
  const [color, setColor] = React.useState("#2563EB");
  const [shape, setShape] = React.useState<Shape>("pill");
  const [label, setLabel] = React.useState("Call us");
  const { data: agents = [] } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await api.get("/agents");
      return res.data.data;
    },
  });

  const [agent, setAgent] = React.useState("");

  React.useEffect(() => {
    if (!agent && agents.length > 0) {
      setAgent(agents[0].id);
    }
  }, [agents, agent]);
  const [welcome, setWelcome] = React.useState(
    "Hi! I'm here to help you 24/7 — in your preferred language."
  );
  const [businessHours, setBusinessHours] = React.useState(true);
  const [device, setDevice] = React.useState<Device>("desktop");
  const [template, setTemplate] = React.useState<Template>("salon");
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const currentAgent = agents.find((a: any) => a.id === agent) || agents[0] || { name: "Agent" };
  const templateMeta = TEMPLATE_META[template];
  const TemplateBody = TEMPLATE_BODY[template];

  const embedJs = `<!-- DeskBuddy widget · ${tenant?.name || "workspace"} -->
<script async src="https://widget.indi.ai/v1/loader.js"
  data-widget-id="${WIDGET_ID}"
  data-agent="${agent}"
  data-position="${position}"
  data-color="${color}"
  data-shape="${shape}"
  data-label="${label}"></script>`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(embedJs);
      setCopied(true);
      toast.success("Embed code copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy — try again");
    }
  };

  return (
    <PageWrapper noScroll={true}>
      <PageHeader
        title="Website widget"
        subtitle={
          <>
            <span>{tenant?.name || "Workspace"}</span>
            <span className="text-fg-muted">·</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-fg-secondary">
              <Code2 className="h-3.5 w-3.5" />
              ID <span className="font-mono text-[10.5px] bg-bg-muted px-1.5 py-0.5 rounded ml-1">{WIDGET_ID}</span>
            </span>
          </>
        }
        actions={
          <>
            <div className="hidden sm:flex items-center gap-2 pr-3 mr-1 border-r border-line-default">
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
                style={
                  active
                    ? {
                        backgroundColor: "#F0FDF4",
                        color: "#16A34A",
                        boxShadow: "inset 0 0 0 1px rgba(22,163,74,0.28)",
                      }
                    : {
                        backgroundColor: "#F1F5F9",
                        color: "#64748B",
                        boxShadow: "inset 0 0 0 1px #E5E7EB",
                      }
                }
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: active ? "#16A34A" : "#94A3B8" }}
                />
                {active ? "Live" : "Paused"}
              </span>
              <Toggle checked={active} onChange={setActive} />
            </div>
            <AppButton
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={() => toast.success("Widget saved.")}
            >
              Save
            </AppButton>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-3 flex-1 min-h-0">
        {/* ═══════════ LEFT: config with tabs, fits in 100vh ═══════════ */}
        <Card className="flex flex-col min-h-0">
          {/* Tab bar */}
          <div
            className="flex items-center gap-1 rounded-lg p-1 mb-4 border"
            style={{ backgroundColor: "#F1F5F9", borderColor: "#E5E7EB" }}
          >
            <TabBtn active={tab === "design"}   onClick={() => setTab("design")}   icon={Palette}  label="Design" />
            <TabBtn active={tab === "behavior"} onClick={() => setTab("behavior")} icon={Bot}      label="Behavior" />
            <TabBtn active={tab === "install"}  onClick={() => setTab("install")}  icon={Terminal} label="Install" />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar -mr-1 pr-1">
            {tab === "design" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-fg-primary mb-2 uppercase tracking-wider">
                    Brand color
                  </label>
                  <div className="grid grid-cols-6 gap-1.5 mb-2">
                    {COLOR_SWATCHES.map((s) => {
                      const isActive = color.toLowerCase() === s.value.toLowerCase();
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setColor(s.value)}
                          title={s.name}
                          className={[
                            "h-8 w-full rounded-md transition-all",
                            isActive
                              ? "ring-2 ring-offset-2 ring-brand-500"
                              : "ring-1 ring-line-default hover:ring-line-strong",
                          ].join(" ")}
                          style={{ backgroundColor: s.value }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-9 w-11 rounded-lg border border-line-default cursor-pointer bg-white p-0.5"
                    />
                    <input
                      type="text"
                      value={color.toUpperCase()}
                      onChange={(e) => setColor(e.target.value)}
                      className={`${inputClass} font-mono uppercase`}
                      maxLength={7}
                    />
                  </div>
                </div>

                <Field label="Position">
                  <ChoiceRow options={POSITIONS} value={position} onChange={setPosition} />
                </Field>

                <Field label="Shape">
                  <ChoiceRow options={SHAPES} value={shape} onChange={setShape} />
                </Field>

                <Field label="Button label" hint="Only shown when shape is Pill.">
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Call us"
                    className={inputClass}
                    maxLength={24}
                  />
                </Field>
              </div>
            )}

            {tab === "behavior" && (
              <div className="space-y-4">
                <Field label="Route to agent">
                  <div className="relative">
                    <select
                      value={agent}
                      onChange={(e) => setAgent(e.target.value)}
                      className={`${inputClass} appearance-none pr-8 cursor-pointer`}
                    >
                      {agents.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name}{a.role ? ` · ${a.role}` : ""}</option>
                      ))}
                    </select>
                    <svg viewBox="0 0 24 24" fill="none" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Field>

                <Field label="Welcome message" hint="Shown when the visitor opens the widget.">
                  <textarea
                    value={welcome}
                    onChange={(e) => setWelcome(e.target.value)}
                    rows={3}
                    maxLength={140}
                    className={textareaClass}
                  />
                </Field>

                <div className="rounded-lg border border-line-default bg-bg-subtle px-3 py-2.5">
                  <Toggle
                    checked={businessHours}
                    onChange={setBusinessHours}
                    label="Only show inside business hours"
                    hint="Outside hours it hides. Missed callers still land in your CRM."
                  />
                </div>
              </div>
            )}

            {tab === "install" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-line-default bg-bg-subtle px-3 py-2.5">
                  <div className="text-[11px] font-semibold text-fg-primary mb-0.5">
                    One tag. Any website.
                  </div>
                  <p className="text-[10.5px] text-fg-secondary leading-snug">
                    Paste this before <code className="font-mono bg-white px-1 rounded">&lt;/body&gt;</code> on your site. The widget shows up instantly.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                      Embed code
                    </span>
                    <button
                      type="button"
                      onClick={copy}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                    >
                      {copied ? (<><Check className="h-3 w-3" /> Copied</>) : (<><Copy className="h-3 w-3" /> Copy</>)}
                    </button>
                  </div>
                  <pre className="text-[10px] leading-relaxed bg-slate-900 text-emerald-200 rounded-md p-2.5 overflow-x-auto no-scrollbar font-mono">
{embedJs}
                  </pre>
                </div>

                <a href="#" className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1">
                  Advanced installation guide <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* ═══════════ RIGHT: live preview ═══════════ */}
        <Card className="flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 shrink-0 gap-3">
            <div>
              <h3 className="text-[13px] font-semibold text-fg-primary tracking-tight">Live preview</h3>
              <p className="text-[10.5px] text-fg-muted mt-0.5">Click the widget to open the chat.</p>
            </div>
            <div className="w-[180px] shrink-0">
              <ChoiceRow options={DEVICES} value={device} onChange={setDevice} />
            </div>
          </div>

          {/* Template picker */}
          <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
            {TEMPLATES.map((t) => {
              const isActive = template === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemplate(t.value)}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 h-7 text-[11px] font-semibold transition-all border"
                  style={
                    isActive
                      ? {
                          backgroundColor: "#2563EB",
                          color: "#FFFFFF",
                          borderColor: "#1D4ED8",
                          boxShadow: "0 2px 4px rgba(37,99,235,0.35)",
                        }
                      : { backgroundColor: "#F1F5F9", color: "#475569", borderColor: "#E5E7EB" }
                  }
                >
                  <t.icon className="h-3 w-3" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Preview surface — tinted so any color, even white, still contrasts */}
          <div className="flex-1 min-h-[500px] overflow-hidden rounded-xl p-3 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #eef2ff 0%, #f8fafc 50%, #eef2ff 100%)",
            }}
          >
            <div className="w-full h-full flex flex-col justify-center">
              <SiteChrome device={device} domain={templateMeta.domain}>
                <TemplateBody />

                {active && (
                  <div className="absolute inset-0 pointer-events-none">
                    {!panelOpen && (
                      <div className={`absolute ${POSITION_STYLES[position].bubble} pointer-events-auto`}>
                        <WidgetBubble color={color} shape={shape} label={label} onClick={() => setPanelOpen(true)} />
                      </div>
                    )}
                    {panelOpen && (
                      <div className={`absolute ${POSITION_STYLES[position].panel} pointer-events-auto`}>
                        <WidgetPanel
                          color={color}
                          welcome={welcome}
                          agentName={currentAgent.name.split(" ")[0] || "Priya"}
                          onClose={() => setPanelOpen(false)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </SiteChrome>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10.5px] text-fg-muted shrink-0">
            <span className="inline-flex items-center gap-1.5">
              {device === "desktop" ? <Monitor className="h-3 w-3" /> : <Smartphone className="h-3 w-3" />}
              {device === "desktop" ? "1200 × 800" : "375 × 812"} · {templateMeta.title}
            </span>
            <span className="font-medium">
              Managed by {user?.name?.split(" ")[0] || "you"} · verified on 2 domains
            </span>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
export default Widget;
