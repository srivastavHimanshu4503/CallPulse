import * as React from "react";
import { toast } from "sonner";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import {
  Card,
  SectionHead,
  PageHeader,
  AppButton,
  Toggle,
  Field,
  inputClass,
  Segmented,
} from "../../components/common/UI.tsx";
import {
  User,
  Building2,
  Users as UsersIcon,
  CreditCard,
  Shield,
  Trash2,
  Plus,
  Crown,
  Zap,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "../../stores/auth.store.js";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/axios.js";
import { useEntitlements } from "../../hooks/useEntitlements.js";
import { useRazorpayCheckout } from "../../hooks/useRazorpayCheckout.js";
import { PLAN_CREDITS, PLAN_PRICE_INR, CREDIT_PACKS, CREDIT_COSTS } from "@antigravity/types";
import { formatTimeAgo } from "@antigravity/utils";

// ─────────────────────────────────────────────────────────────
// Types & data
// ─────────────────────────────────────────────────────────────
type Section =
  | "account"
  | "organization"
  | "team"
  | "billing"
  | "security";

const NAV: { key: Section; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }[] = [
  { key: "account", label: "Account", icon: User, hint: "Your profile & preferences" },
  { key: "organization", label: "Organization", icon: Building2, hint: "Workspace details" },
  { key: "team", label: "Team", icon: UsersIcon, hint: "Invite & manage members" },
  { key: "billing", label: "Billing", icon: CreditCard, hint: "Plan, invoices, payments" },
  { key: "security", label: "Security", icon: Shield, hint: "Password & 2FA" },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Admin" | "Manager" | "Viewer";
  status: "Active" | "Invited";
  hex: string;
}
const TEAM_INIT: TeamMember[] = [
  { id: "t1", name: "Yogendra Yadav", email: "yogendra@myaifrontdesk.com", role: "Owner", status: "Active", hex: "#2563EB" },
  { id: "t2", name: "Priya Deshmukh", email: "priya@rajesh-distributors.in", role: "Admin", status: "Active", hex: "#8B5CF6" },
  { id: "t3", name: "Kabir Sharma", email: "kabir@rajesh-distributors.in", role: "Manager", status: "Active", hex: "#10B981" },
  { id: "t4", name: "Neha Iyer", email: "neha@rajesh-distributors.in", role: "Viewer", status: "Invited", hex: "#F97316" },
];
const ROLE_STYLES: Record<TeamMember["role"], { bg: string; color: string }> = {
  Owner: { bg: "#EEF2FF", color: "#4F46E5" },
  Admin: { bg: "#F0FDF4", color: "#16A34A" },
  Manager: { bg: "#FFFBEB", color: "#D97706" },
  Viewer: { bg: "#F1F5F9", color: "#64748B" },
};

// ─────────────────────────────────────────────────────────────
// Sub-panels
// ─────────────────────────────────────────────────────────────

function AccountPanel(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = React.useState(user?.name || "Yogendra Yadav");
  const [email, setEmail] = React.useState(user?.email || "yogendra@myaifrontdesk.com");
  const [phone, setPhone] = React.useState("+91 98765 43210");

  const initial = name.trim().charAt(0).toUpperCase() || "Y";

  return (
    <div className="space-y-3">
      <Card>
        <SectionHead title="Profile" hint="How other members and AI logs identify you." />
        <div className="flex items-center gap-4 mb-4">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-[22px]"
            style={{
              background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 55%, #EC4899 100%)",
              boxShadow: "0 8px 24px -8px rgba(139,92,246,0.6)",
            }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-fg-primary leading-tight">{name}</div>
            <div className="text-[11.5px] text-fg-secondary mt-0.5">{email}</div>
            <div className="mt-2 flex items-center gap-2">
              <AppButton size="sm" variant="secondary" onClick={() => toast.info("Photo upload coming soon.")}>
                Change photo
              </AppButton>
              <AppButton size="sm" variant="ghost" onClick={() => toast.info("Photo removed.")}>
                Remove
              </AppButton>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Full name">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Email address">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Mobile number">
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Time zone">
            <select className={`${inputClass} cursor-pointer`}>
              <option>Asia / Kolkata (IST)</option>
              <option>Asia / Dubai (GST)</option>
              <option>Europe / London (BST)</option>
              <option>America / New York (EST)</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHead title="Preferences" />
        <div className="space-y-3">
          <Toggle checked={true} onChange={() => { }}
            label="Play sound on new call"
            hint="Short chime when a live call starts." />
          <Toggle checked={false} onChange={() => { }}
            label="Show Hindi transliteration in transcripts"
            hint="Roman letters below Devanagari for quick scan." />
          <Toggle checked={true} onChange={() => { }}
            label="Weekly performance email"
            hint="Monday morning digest with numbers that matter." />
        </div>
      </Card>
    </div>
  );
}

function OrganizationPanel(): React.JSX.Element {
  const tenant = useAuthStore((s) => s.tenant);
  const [orgName, setOrgName] = React.useState(tenant?.name || "Rajesh Distributors");
  const [website, setWebsite] = React.useState((tenant as any)?.websiteUrl || "https://rajesh-distributors.in");

  return (
    <div className="space-y-3">
      <Card>
        <SectionHead title="Workspace" hint="Public-facing info about your business." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Business name">
            <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Industry">
            <select className={`${inputClass} cursor-pointer`}>
              <option>Salon & Beauty</option>
              <option>Clinic & Healthcare</option>
              <option>Real estate</option>
              <option>Retail</option>
              <option>Restaurant</option>
              <option>Coaching / Tuition</option>
            </select>
          </Field>
          <Field label="Website URL">
            <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Team size">
            <select className={`${inputClass} cursor-pointer`}>
              <option>Solo</option>
              <option>2 – 5</option>
              <option>6 – 20</option>
              <option>20+</option>
            </select>
          </Field>
          <Field label="Primary language">
            <select className={`${inputClass} cursor-pointer`}>
              <option>Hindi (हिन्दी)</option>
              <option>English</option>
              <option>Marathi (मराठी)</option>
              <option>Tamil (தமிழ்)</option>
              <option>Bengali (বাংলা)</option>
            </select>
          </Field>
          <Field label="Country">
            <select className={`${inputClass} cursor-pointer`}>
              <option>India</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <SectionHead title="Business hours" hint="Widget hides & calls forward outside these hours." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Open at">
            <input type="time" defaultValue="09:00" className={inputClass} />
          </Field>
          <Field label="Close at">
            <input type="time" defaultValue="20:00" className={inputClass} />
          </Field>
        </div>
        <div className="mt-3">
          <Toggle checked={true} onChange={() => { }}
            label="24 × 7 always available"
            hint="AI answers every call, even outside business hours." />
        </div>
      </Card>
    </div>
  );
}

function TeamPanel(): React.JSX.Element {
  const [members, setMembers] = React.useState<TeamMember[]>(TEAM_INIT);
  const [newEmail, setNewEmail] = React.useState("");

  const invite = () => {
    if (!newEmail.trim()) {
      toast.error("Enter an email first.");
      return;
    }
    setMembers((p) => [
      ...p,
      {
        id: `t${Date.now()}`,
        name: newEmail.split("@")[0] || "Invited user",
        email: newEmail,
        role: "Viewer",
        status: "Invited",
        hex: "#64748B",
      },
    ]);
    setNewEmail("");
    toast.success("Invite sent");
  };

  return (
    <div className="space-y-3">
      <Card>
        <SectionHead
          title="Invite a member"
          hint="They'll get an email with a magic link to join this workspace."
        />
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
          <div className="flex-1">
            <Field label="Email address">
              <input
                type="email"
                placeholder="colleague@company.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && invite()}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="w-full sm:w-40">
            <Field label="Role">
              <select className={`${inputClass} cursor-pointer`}>
                <option>Viewer</option>
                <option>Manager</option>
                <option>Admin</option>
              </select>
            </Field>
          </div>
          <AppButton variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={invite}>
            Send invite
          </AppButton>
        </div>
      </Card>

      <Card>
        <SectionHead
          title="Members"
          hint={`${members.length} people have access to this workspace`}
        />
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold border-b border-line-subtle">
                <th className="text-left font-semibold px-2 py-2">Member</th>
                <th className="text-left font-semibold px-2 py-2">Role</th>
                <th className="text-left font-semibold px-2 py-2">Status</th>
                <th className="text-right font-semibold px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const role = ROLE_STYLES[m.role];
                return (
                  <tr key={m.id} className="border-b border-line-subtle hover:bg-bg-muted/60 transition-colors">
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-[12px] font-semibold"
                          style={{ backgroundColor: m.hex }}
                        >
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-[12.5px] font-semibold text-fg-primary leading-tight">{m.name}</div>
                          <div className="text-[10.5px] text-fg-muted">{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                        style={{ backgroundColor: role.bg, color: role.color }}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                        style={
                          m.status === "Active"
                            ? { backgroundColor: "#F0FDF4", color: "#16A34A" }
                            : { backgroundColor: "#FFFBEB", color: "#D97706" }
                        }
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: m.status === "Active" ? "#16A34A" : "#D97706" }}
                        />
                        {m.status}
                      </span>
                    </td>
                    <td className="text-right px-2 py-2.5">
                      <button
                        type="button"
                        onClick={() => setMembers((p) => p.filter((x) => x.id !== m.id))}
                        className="text-fg-muted hover:text-negative-500 transition-colors p-1 rounded hover:bg-negative-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


function BillingPanel(): React.JSX.Element {
  const ent = useEntitlements();
  const { checkout, isPaying } = useRazorpayCheckout();
  const isPro = ent.plan !== "FREE";
  const [showPacks, setShowPacks] = React.useState(false);
  const [historyTab, setHistoryTab] = React.useState<"history" | "invoices">("history");

  const { data: ledger = [] } = useQuery({
    queryKey: ["credit-ledger"],
    queryFn: async () => (await api.get("/billing/credits")).data.data as any[],
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["billing-payments"],
    queryFn: async () => (await api.get("/billing/payments")).data.data as any[],
  });

  // Plan allotment drives the usage bar; top-ups can push balance above it.
  const allotment = PLAN_CREDITS[ent.plan] ?? PLAN_CREDITS.FREE;
  const pct = Math.max(0, Math.min(100, Math.round((ent.creditBalance / allotment) * 100)));
  const periodEnd = (ent as any).periodEnd
    ? new Date((ent as any).periodEnd).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    : null;

  const reasonLabel: Record<string, string> = {
    SIGNUP_GRANT: "Welcome credits",
    PLAN_GRANT: "Pro plan credits",
    TOPUP_PURCHASE: "Credit top-up",
    CALL_DEDUCTION: "Call",
    ADJUSTMENT: "Adjustment",
  };

  return (
    <div className="space-y-3">
      {/* Plan card — clean: free users see FREE + credits, nothing else */}
      <Card>
        <div className="flex items-start justify-between gap-4 border-b border-line-subtle pb-4 mb-4">
          <div>
            <div
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2",
                isPro ? "bg-amber-50 text-amber-600 border border-amber-500/30" : "bg-bg-muted text-fg-secondary border border-line-default",
              ].join(" ")}
            >
              {isPro ? <Crown className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
              Current plan
            </div>
            <div className="text-[20px] font-bold tracking-tight text-fg-primary">
              {isPro ? "Pro" : "Free plan"}
            </div>
            <p className="text-[12.5px] text-fg-secondary mt-1">
              {isPro
                ? `${PLAN_CREDITS.PRO} credits per 30 days · all features unlocked`
                : `${PLAN_CREDITS.FREE} welcome credits · upgrade to unlock everything`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[22px] font-bold text-fg-primary tabular-nums">
              {isPro ? `₹${(PLAN_PRICE_INR.PRO ?? 0).toLocaleString("en-IN")}` : "₹0"}
              {isPro && <span className="text-[13px] text-fg-muted font-normal"> / 30 days</span>}
            </div>
            {isPro && periodEnd && (
              <div className="text-[11px] font-semibold text-amber-600">Pro until {periodEnd}</div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 text-[12.5px] font-semibold mb-1.5">
            <span className="text-fg-secondary flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              Remaining credits:
            </span>
            <span className="text-fg-primary tabular-nums text-[13px]">
              {ent.creditBalance}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-line-subtle">
            <div
              className={`h-full rounded-full ${pct <= 15 ? "bg-negative-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex gap-3 text-[11px] text-fg-muted flex-wrap">
            <div className="bg-bg-subtle px-2 py-1 rounded border border-line-subtle">
              <span className="font-semibold text-fg-secondary">Voice call:</span> {CREDIT_COSTS.VOICE_PER_MINUTE} credits / min
            </div>
            <div className="bg-bg-subtle px-2 py-1 rounded border border-line-subtle">
              <span className="font-semibold text-fg-secondary">WhatsApp:</span> {CREDIT_COSTS.WHATSAPP} credits / msg
            </div>
            <div className="bg-bg-subtle px-2 py-1 rounded border border-line-subtle">
              <span className="font-semibold text-fg-secondary">SMS:</span> {CREDIT_COSTS.SMS} credits / msg
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {!isPro ? (
            <AppButton variant="primary" onClick={() => checkout({ product: "pro" }, `Pro — 30 days, ${PLAN_CREDITS.PRO} credits`)}>
              <span className="flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5" />
                {isPaying ? "Opening checkout…" : "Upgrade to Pro"}
              </span>
            </AppButton>
          ) : (
            <AppButton variant="secondary" onClick={() => checkout({ product: "pro" }, `Pro — 30 more days, ${PLAN_CREDITS.PRO} credits`)}>
              Extend Pro by 30 days
            </AppButton>
          )}
          <AppButton variant={isPro ? "primary" : "secondary"} onClick={() => setShowPacks((v) => !v)}>
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Top up credits
            </span>
          </AppButton>
        </div>

        {/* Credit packs — for when plan credits run out mid-cycle */}
        {showPacks && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            {CREDIT_PACKS.map((pack) => (
              <button
                key={pack.id}
                type="button"
                disabled={isPaying}
                onClick={() => checkout({ product: "credits", packId: pack.id }, `${pack.credits} credits top-up`)}
                className="rounded-lg border border-line-default bg-bg-subtle hover:border-brand-500/50 hover:bg-brand-50/40 p-3 text-left transition-colors disabled:opacity-50"
              >
                <div className="text-[16px] font-bold text-fg-primary tabular-nums">
                  {pack.credits} <span className="text-[11px] font-semibold text-fg-muted">credits</span>
                </div>
                <div className="text-[12px] font-semibold text-brand-600 mt-0.5">
                  ₹{pack.priceInr.toLocaleString("en-IN")}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Tabs for Credit History and Payments & Invoices */}
      <Card>
        <div className="mb-4">
          <Segmented
            options={[
              { value: "history", label: "Credit history" },
              { value: "invoices", label: "Payments & invoices" },
            ]}
            value={historyTab}
            onChange={(v) => setHistoryTab(v as "history" | "invoices")}
          />
        </div>

        {historyTab === "history" && (
          <div>
            <SectionHead title="Credit history" hint="Every credit added or used, newest first." />
            {ledger.length === 0 ? (
              <div className="py-6 text-center text-[11.5px] text-fg-muted">No credit activity yet.</div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto pr-1">
                <ul className="divide-y divide-line-subtle -mx-1">
                  {ledger.map((row: any) => (
                    <li key={row.id} className="px-1 py-2 flex items-center justify-between text-[12px]">
                      <div>
                        <span className="font-semibold text-fg-primary">
                          {reasonLabel[row.reason] ?? row.reason}
                        </span>
                        {row.note && <span className="text-fg-muted ml-2">{row.note}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <span
                          className={`font-bold tabular-nums ${row.delta >= 0 ? "text-positive-600" : "text-negative-500"}`}
                        >
                          {row.delta >= 0 ? "+" : ""}
                          {row.delta}
                        </span>
                        <span className="text-[10.5px] text-fg-muted w-20 text-right">
                          {formatTimeAgo(row.createdAt)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {historyTab === "invoices" && (
          <div>
            <SectionHead
              title="Payments & invoices"
              hint="Every payment with its reference ID — use it for support or reconciliation."
            />
            {payments.length === 0 ? (
              <div className="py-6 text-center text-[11.5px] text-fg-muted">No payments yet.</div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto pr-1">
                <ul className="divide-y divide-line-subtle -mx-1">
                  {payments.map((p: any) => (
                    <li key={p.id} className="px-1 py-2.5 flex items-center justify-between gap-3 text-[12px]">
                      <div className="min-w-0">
                        <div className="font-semibold text-fg-primary">{p.description || p.product}</div>
                        <div className="text-[10.5px] text-fg-muted font-mono truncate" title={p.paymentId}>
                          {p.paymentId}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-fg-primary tabular-nums">
                          ₹{(p.amountPaise / 100).toLocaleString("en-IN")}
                        </div>
                        <div className="text-[10.5px] text-fg-muted">
                          {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function SecurityPanel(): React.JSX.Element {
  return (
    <div className="space-y-3">
      <Card>
        <SectionHead title="Password" hint="Rotate every 90 days for best hygiene." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Current password">
            <input type="password" placeholder="••••••••" className={inputClass} />
          </Field>
          <span className="hidden md:block" />
          <Field label="New password">
            <input type="password" placeholder="At least 12 characters" className={inputClass} />
          </Field>
          <Field label="Confirm new password">
            <input type="password" placeholder="Repeat" className={inputClass} />
          </Field>
        </div>
        <div className="mt-3 flex justify-end">
          <AppButton variant="primary" onClick={() => toast.success("Password updated")}>
            Update password
          </AppButton>
        </div>
      </Card>

      <Card>
        <SectionHead title="Two-factor authentication" hint="Require a code from your phone at login." />
        <Toggle checked={false} onChange={(v) => toast.info(v ? "2FA setup coming soon." : "2FA disabled.")}
          label="Enable 2FA (authenticator app)"
          hint="Recommended for owners and admins." />
      </Card>

      <Card>
        <SectionHead title="Danger zone" />
        <div className="rounded-lg border border-negative-500/25 bg-negative-50 p-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[13px] font-semibold text-negative-500">Delete workspace</div>
            <div className="text-[11px] text-fg-secondary mt-0.5">
              Permanently deletes all agents, calls, contacts, deals and templates. Cannot be undone.
            </div>
          </div>
          <button
            type="button"
            onClick={() => toast.error("Deletion needs owner confirmation.")}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-white text-[12px] font-bold transition-all hover:brightness-110"
            style={{ backgroundColor: "#DC2626", boxShadow: "0 2px 6px -2px rgba(220,38,38,0.5)" }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export function Settings(): React.JSX.Element {
  // Deep-linkable: /settings?tab=billing lands directly on that section
  // (upgrade CTAs all over the app point here).
  const [section, setSection] = React.useState<Section>(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return (["account", "organization", "team", "billing", "security"] as Section[]).includes(
      tab as Section,
    )
      ? (tab as Section)
      : "account";
  });

  const active = NAV.find((n) => n.key === section)!;
  const Content = React.useMemo(() => {
    switch (section) {
      case "account": return <AccountPanel />;
      case "organization": return <OrganizationPanel />;
      case "team": return <TeamPanel />;
      case "billing": return <BillingPanel />;
      case "security": return <SecurityPanel />;
    }
  }, [section]);

  return (
    <PageWrapper noScroll={true}>
      <PageHeader
        title="Settings"
        subtitle={<span>Manage your account, workspace, team, integrations, and security.</span>}
        actions={
          <AppButton variant="primary" onClick={() => toast.success("Changes saved")}>
            Save changes
          </AppButton>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)] gap-3 flex-1 min-h-0">
        {/* Left nav */}
        <Card className="flex flex-col min-h-0 p-2">
          <ul className="flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5">
            {NAV.map((n) => {
              const isActive = section === n.key;
              return (
                <li key={n.key}>
                  <button
                    type="button"
                    onClick={() => setSection(n.key)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left"
                    style={
                      isActive
                        ? { backgroundColor: "#2563EB", color: "#FFFFFF", boxShadow: "0 2px 4px rgba(37,99,235,0.35)" }
                        : { backgroundColor: "transparent", color: "rgb(var(--fg-primary))" }
                    }
                  >
                    <n.icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-semibold leading-tight">{n.label}</div>
                      <div
                        className="text-[10px] truncate mt-0.5"
                        style={isActive ? { color: "rgba(255,255,255,0.85)" } : { color: "rgb(var(--slate-500))" }}
                      >
                        {n.hint}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Right content */}
        <div className="min-h-0 overflow-y-auto no-scrollbar -mr-1 pr-1">
          <div className="mb-3">
            <h2 className="text-[16px] font-semibold text-fg-primary tracking-tight">{active.label}</h2>
            <p className="text-[11.5px] text-fg-muted mt-0.5">{active.hint}</p>
          </div>
          {Content}
        </div>
      </div>
    </PageWrapper>
  );
}
export default Settings;
