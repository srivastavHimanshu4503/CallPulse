import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Crown, Search, X, MapPin, Sparkles, Info, AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../lib/axios.js";
import { useEntitlements } from "../../../hooks/useEntitlements.js";
import { useRazorpayCheckout, type CheckoutErrorInfo } from "../../../hooks/useRazorpayCheckout.js";
import { PHONE_NUMBER_PRICE_BY_COUNTRY } from "@antigravity/types";

interface PurchaseNumberModalProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  // Twilio-only
  locality?: string | null;
  region?: string | null;
  // Plivo (India)
  city?: string | null;
  monthlyRentalRate?: string | null;
}

interface ProvidersStatus {
  twilio: boolean;
  plivo: boolean;
}

type Country = "US" | "IN";

const COUNTRY_META: Record<
  Country,
  {
    label: string;
    flag: string;
    tagline: string;
    provider: string;
    searchPlaceholder: string;
    searchLabel: string;
    searchHelp: string;
    maxDigits: number;
    disclaimer: string;
  }
> = {
  US: {
    label: "US number",
    flag: "🇺🇸",
    tagline: "For US-based customers · instant activation",
    provider: "Twilio",
    searchPlaceholder: "Search by US area code, e.g. 415",
    searchLabel: "US area code",
    searchHelp: "3-digit area code (415, 212, 305, …)",
    maxDigits: 3,
    disclaimer:
      "Activates instantly. Best for reaching US customers or testing from an American SIM.",
  },
  IN: {
    label: "Indian number",
    flag: "🇮🇳",
    tagline: "For Indian customers · lower call latency from India",
    provider: "Plivo",
    searchPlaceholder: "Search by city STD code, e.g. 80 for Bangalore",
    searchLabel: "Indian STD code",
    searchHelp: "22 Mumbai · 80 Bangalore · 11 Delhi · 44 Chennai · 40 Hyderabad",
    maxDigits: 4,
    disclaimer:
      "Landline city numbers only — mobile DIDs are reserved for telcos by TRAI. Requires KYC clearance on our Plivo account (usually already done).",
  },
};

/**
 * Pick + buy a dedicated phone number and permanently bind it to the agent.
 * US numbers via Twilio, Indian numbers via Plivo. Pro-only — free users see
 * the upgrade path instead.
 */
export function PurchaseNumberModal({
  agentId,
  agentName,
  onClose,
}: PurchaseNumberModalProps): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ent = useEntitlements();
  const { checkout, isPaying } = useRazorpayCheckout();
  const [country, setCountry] = React.useState<Country>("US");
  const [searchInput, setSearchInput] = React.useState("");
  const [searchApplied, setSearchApplied] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const [purchaseError, setPurchaseError] = React.useState<CheckoutErrorInfo | null>(null);
  const canBuy = ent.can("PHONE_NUMBER_PURCHASE");

  // Reset selection + search when country changes so results don't leak.
  React.useEffect(() => {
    setSearchInput("");
    setSearchApplied("");
    setSelected(null);
    setPurchaseError(null);
  }, [country]);

  const meta = COUNTRY_META[country];
  const price = PHONE_NUMBER_PRICE_BY_COUNTRY[country];

  const { data: providers } = useQuery({
    queryKey: ["telephony-providers-status"],
    queryFn: async () =>
      (await api.get("/telephony/providers-status")).data.data as ProvidersStatus,
    staleTime: 5 * 60_000,
  });

  const isCountryEnabled = country === "US" ? providers?.twilio !== false : providers?.plivo === true;

  const { data: numbers = [], isLoading, isError, error } = useQuery({
    queryKey: ["available-numbers", country, searchApplied],
    queryFn: async () => {
      const q =
        country === "US"
          ? searchApplied
            ? `country=US&areaCode=${encodeURIComponent(searchApplied)}`
            : "country=US"
          : searchApplied
            ? `country=IN&pattern=${encodeURIComponent(searchApplied)}`
            : "country=IN";
      const res = await api.get(`/telephony/available-numbers?${q}`);
      return res.data.data as AvailableNumber[];
    },
    enabled: canBuy && isCountryEnabled,
    staleTime: 30_000,
    retry: false,
  });

  const handleBuy = () => {
    if (!selected) return;
    setPurchaseError(null);
    void checkout(
      { product: "phone-number", agentId, phoneNumber: selected, country },
      `Dedicated ${country === "IN" ? "Indian" : "US"} number for ${agentName}`,
      () => {
        void queryClient.invalidateQueries({ queryKey: ["agents"] });
        void queryClient.invalidateQueries({ queryKey: ["telephony-numbers"] });
        onClose();
      },
      (info) => {
        // Payment already went through — keep the modal open and show a
        // persistent alert so the user has the paymentId for refund/support.
        setPurchaseError(info);
        setSelected(null);
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fg-primary/30 backdrop-blur-[2px]">
      <div className="bg-bg-raised border border-line-default rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-line-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-500/20 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-fg-primary leading-tight truncate">
                Get a dedicated number
              </h3>
              <p className="text-[11px] text-fg-muted truncate">
                for {agentName} · ₹{price} one-time · {meta.label}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-bg-muted text-fg-secondary hover:text-fg-primary flex items-center justify-center shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!canBuy ? (
          /* Free plan — upgrade path */
          <div className="p-6 text-center space-y-3">
            <span className="mx-auto h-12 w-12 rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/25 flex items-center justify-center">
              <Crown className="h-6 w-6" />
            </span>
            <div className="text-[14px] font-semibold text-fg-primary">
              Dedicated numbers need the Pro plan
            </div>
            <p className="text-[12px] text-fg-secondary leading-relaxed max-w-sm mx-auto">
              On Pro, each agent can get its own real phone number that customers call directly —
              your AI answers every time.
            </p>
            <button
              type="button"
              onClick={() => navigate("/settings?tab=billing")}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold shadow-card"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
            </button>
          </div>
        ) : (
          <>
            {/* Country picker — the primary choice, up top */}
            <div className="px-5 pt-4 pb-3 shrink-0">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-fg-muted mb-2">
                Where are your customers?
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["IN", "US"] as Country[]).map((c) => {
                  const m = COUNTRY_META[c];
                  const active = country === c;
                  const available = c === "US" ? providers?.twilio !== false : providers?.plivo === true;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => available && setCountry(c)}
                      disabled={!available}
                      className={[
                        "rounded-lg border p-3 text-left transition-all",
                        active
                          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/15"
                          : available
                            ? "border-line-default bg-bg-raised hover:border-brand-500/40"
                            : "border-line-default bg-bg-subtle opacity-60 cursor-not-allowed",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[18px] leading-none">{m.flag}</span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-fg-primary leading-tight">
                            {m.label}
                          </div>
                          <div className="text-[10px] text-fg-muted mt-0.5 truncate">
                            via {m.provider} · ₹{PHONE_NUMBER_PRICE_BY_COUNTRY[c]}
                          </div>
                        </div>
                      </div>
                      <div className="text-[10.5px] text-fg-secondary mt-1.5 leading-snug">
                        {m.tagline}
                      </div>
                      {!available && (
                        <div className="text-[10px] text-attention-600 font-semibold mt-1">
                          Not configured yet
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Country-specific disclaimer */}
              <div className="mt-2.5 rounded-md bg-bg-subtle border border-line-subtle px-2.5 py-1.5 flex items-start gap-1.5">
                <Info className="h-3 w-3 text-fg-muted shrink-0 mt-0.5" />
                <p className="text-[10.5px] text-fg-secondary leading-snug">{meta.disclaimer}</p>
              </div>

              {/* Persistent alert: payment succeeded but provisioning failed. */}
              {purchaseError?.paid && (
                <div className="mt-2.5 rounded-md bg-negative-50 border border-negative-500/30 px-3 py-2.5 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-negative-500 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold text-negative-500 leading-snug">
                      Payment received but the number couldn't be secured
                    </div>
                    <div className="text-[11px] text-fg-secondary mt-1 leading-snug">
                      {purchaseError.message}
                    </div>
                    <div className="text-[11px] text-fg-secondary mt-1.5 leading-snug">
                      <strong>What to do:</strong>{" "}
                      {country === "IN"
                        ? "Indian inventory shifts fast. Search again and pick a different number — if you keep hitting this, share the payment ref below with support."
                        : "Search for a new number and try again."}
                    </div>
                    {purchaseError.paymentId && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <code className="text-[10.5px] font-mono bg-bg-raised border border-line-default rounded px-1.5 py-0.5 text-fg-primary tabular-nums">
                          {purchaseError.paymentId}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(purchaseError.paymentId!);
                            toast.success("Payment ref copied");
                          }}
                          className="inline-flex items-center gap-1 h-6 px-1.5 rounded text-[10.5px] font-semibold text-fg-secondary hover:bg-bg-muted"
                          title="Copy payment reference"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Search */}
            <div className="px-5 pb-3 shrink-0 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
                  <input
                    type="text"
                    placeholder={meta.searchPlaceholder}
                    value={searchInput}
                    maxLength={meta.maxDigits}
                    onChange={(e) => setSearchInput(e.target.value.replace(/\D/g, ""))}
                    onKeyDown={(e) => e.key === "Enter" && setSearchApplied(searchInput)}
                    className="w-full h-9 bg-bg-raised border border-line-default focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md pl-8 pr-3 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSearchApplied(searchInput)}
                  className="h-9 px-3 rounded-md border border-line-default bg-bg-subtle hover:bg-bg-muted text-[12px] font-semibold text-fg-primary"
                >
                  Search
                </button>
              </div>
              <p className="text-[10px] text-fg-muted pl-8">{meta.searchHelp}</p>
            </div>

            {/* Numbers list */}
            <div className="flex-1 overflow-y-auto p-3 min-h-[220px] border-t border-line-subtle">
              {!isCountryEnabled ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-6 text-[12px] text-fg-secondary gap-1">
                  <span className="text-[24px]">{meta.flag}</span>
                  <div className="font-semibold text-fg-primary">
                    {meta.label} not available yet
                  </div>
                  <p className="text-fg-muted max-w-[280px] leading-snug">
                    {country === "IN"
                      ? "Plivo isn't configured on this account yet. Once KYC is approved and API keys are set, Indian numbers will show up here."
                      : "Twilio isn't configured on this environment."}
                  </p>
                </div>
              ) : isLoading ? (
                <div className="h-full flex items-center justify-center text-[12px] text-fg-muted">
                  Finding available numbers…
                </div>
              ) : isError ? (
                <div className="h-full flex flex-col items-center justify-center text-[12px] text-negative-500 text-center px-4 gap-1">
                  <div className="font-semibold">Couldn't load numbers</div>
                  <p className="text-fg-muted">
                    {(error as any)?.response?.data?.error ||
                      "Try again in a moment or check provider config."}
                  </p>
                </div>
              ) : numbers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[12px] text-fg-muted text-center px-4">
                  No numbers found{searchApplied ? ` for "${searchApplied}"` : ""} — try a different {country === "IN" ? "city code" : "area code"}.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {numbers.map((n) => {
                    const location =
                      [n.locality, n.region].filter(Boolean).join(", ") ||
                      n.city ||
                      (country === "IN" ? "India" : "United States");
                    return (
                      <button
                        key={n.phoneNumber}
                        type="button"
                        onClick={() => setSelected(n.phoneNumber)}
                        className={[
                          "rounded-lg border p-3 text-left transition-colors",
                          selected === n.phoneNumber
                            ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/15"
                            : "border-line-default bg-bg-raised hover:border-brand-500/40",
                        ].join(" ")}
                      >
                        <div className="text-[13.5px] font-bold text-fg-primary tabular-nums">
                          {n.friendlyName || n.phoneNumber}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1 text-[10.5px] text-fg-muted">
                          <MapPin className="h-3 w-3" />
                          {location}
                        </div>
                        {n.monthlyRentalRate && (
                          <div className="mt-1 text-[10px] text-fg-muted">
                            Monthly rent: ${n.monthlyRentalRate}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-bg-subtle border-t border-line-subtle shrink-0 flex items-center justify-between gap-3">
              <p className="text-[10.5px] text-fg-muted leading-snug max-w-[220px]">
                The number is permanently attached to this agent and can't be changed later.
              </p>
              <button
                type="button"
                disabled={!selected || isPaying}
                onClick={handleBuy}
                className="h-10 px-4 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-semibold shadow-card transition-colors disabled:opacity-50 shrink-0"
              >
                {isPaying ? "Opening checkout…" : `Buy for ₹${price}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
