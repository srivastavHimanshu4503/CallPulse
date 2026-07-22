import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Phone, Crown, Search, X, MapPin, Sparkles } from "lucide-react";
import { api } from "../../../lib/axios.js";
import { useEntitlements } from "../../../hooks/useEntitlements.js";
import { useRazorpayCheckout } from "../../../hooks/useRazorpayCheckout.js";
import { PHONE_NUMBER_PRICE_INR } from "@antigravity/types";

interface PurchaseNumberModalProps {
  agentId: string;
  agentName: string;
  onClose: () => void;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

/**
 * Pick + buy a dedicated US number (₹299, one-time) and permanently bind it
 * to the agent. Pro-only — free users see the upgrade path instead.
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
  const [areaCode, setAreaCode] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selected, setSelected] = React.useState<string | null>(null);
  const canBuy = ent.can("PHONE_NUMBER_PURCHASE");

  const { data: numbers = [], isLoading, isError } = useQuery({
    queryKey: ["available-numbers", search],
    queryFn: async () =>
      (await api.get(`/telephony/available-numbers${search ? `?areaCode=${search}` : ""}`)).data
        .data as AvailableNumber[],
    enabled: canBuy,
    staleTime: 30_000,
  });

  const handleBuy = () => {
    if (!selected) return;
    void checkout(
      { product: "phone-number", agentId, phoneNumber: selected },
      `Dedicated US number for ${agentName}`,
      () => {
        void queryClient.invalidateQueries({ queryKey: ["agents"] });
        void queryClient.invalidateQueries({ queryKey: ["telephony-numbers"] });
        onClose();
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-fg-primary/30 backdrop-blur-[2px]">
      <div className="bg-bg-raised border border-line-default rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-line-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-500/20 flex items-center justify-center">
              <Phone className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-[14px] font-semibold text-fg-primary leading-tight">
                Get a dedicated number
              </h3>
              <p className="text-[11px] text-fg-muted">
                for {agentName} · ₹{PHONE_NUMBER_PRICE_INR} one-time · US number
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-bg-muted text-fg-secondary hover:text-fg-primary flex items-center justify-center"
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
            {/* Area code search */}
            <div className="px-5 py-3 border-b border-line-subtle shrink-0 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
                <input
                  type="text"
                  placeholder="Search by US area code, e.g. 415"
                  value={areaCode}
                  maxLength={3}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && setSearch(areaCode)}
                  className="w-full h-9 bg-bg-raised border border-line-default focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md pl-8 pr-3 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setSearch(areaCode)}
                className="h-9 px-3 rounded-md border border-line-default bg-bg-subtle hover:bg-bg-muted text-[12px] font-semibold text-fg-primary"
              >
                Search
              </button>
            </div>

            {/* Numbers list */}
            <div className="flex-1 overflow-y-auto p-3 min-h-[220px]">
              {isLoading ? (
                <div className="h-full flex items-center justify-center text-[12px] text-fg-muted">
                  Finding available numbers…
                </div>
              ) : isError ? (
                <div className="h-full flex items-center justify-center text-[12px] text-negative-500">
                  Couldn't load numbers — try again in a moment.
                </div>
              ) : numbers.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[12px] text-fg-muted">
                  No numbers found{search ? ` for area code ${search}` : ""} — try another area code.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {numbers.map((n) => (
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
                        {[n.locality, n.region].filter(Boolean).join(", ") || "United States"}
                      </div>
                    </button>
                  ))}
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
                {isPaying ? "Opening checkout…" : `Buy for ₹${PHONE_NUMBER_PRICE_INR}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
