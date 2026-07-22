import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { Button, Modal } from "@antigravity/ui";
import { Phone, Search, Crown, ShieldCheck, Sparkles, MapPin, Info } from "lucide-react";
import { useEntitlements } from "../../../hooks/useEntitlements.js";
import { useRazorpayCheckout } from "../../../hooks/useRazorpayCheckout.js";
import { PHONE_NUMBER_PRICE_INR } from "@antigravity/types";

interface TelephonySetupProps {
  /** null while CREATING an agent — buying triggers onEnsureAgent first. */
  agentId: string | null;
  /** Creates the agent on demand so a purchase can bind to it. */
  onEnsureAgent?: () => Promise<string | null>;
  phoneNumberId: string | null;
  setPhoneNumberId: (val: string | null) => void;
  phoneNumbers: any[];
  refetchPhoneNumbers: () => void;
  disabled?: boolean;
}

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

/**
 * Real number assignment: attach one of the tenant's unassigned numbers for
 * free, or buy a new dedicated US number (₹{PHONE_NUMBER_PRICE_INR},
 * one-time, Pro plan). A number, once attached, is permanent for the agent.
 */
export function TelephonySetup({
  agentId,
  onEnsureAgent,
  phoneNumberId,
  setPhoneNumberId,
  phoneNumbers,
  refetchPhoneNumbers,
  disabled,
}: TelephonySetupProps): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ent = useEntitlements();
  const { checkout, isPaying } = useRazorpayCheckout();
  const [isOpen, setIsOpen] = React.useState(false);
  const [areaCode, setAreaCode] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [selectedBuy, setSelectedBuy] = React.useState<string | null>(null);
  const canBuy = ent.can("PHONE_NUMBER_PURCHASE");

  const assignedLine = React.useMemo(() => {
    if (!phoneNumberId || !phoneNumbers) return null;
    return phoneNumbers.find((p) => p.id === phoneNumberId);
  }, [phoneNumberId, phoneNumbers]);

  const { data: available = [], isLoading: isLoadingAvailable } = useQuery({
    queryKey: ["available-numbers", search],
    queryFn: async () =>
      (await api.get(`/telephony/available-numbers${search ? `?areaCode=${search}` : ""}`)).data
        .data as AvailableNumber[],
    enabled: isOpen && canBuy,
    staleTime: 30_000,
  });

  const handleBuy = async () => {
    if (!selectedBuy) return;
    // Numbers bind permanently to an agent — make sure it exists first
    // (creating mid-wizard saves the agent quietly).
    let targetId = agentId;
    if (!targetId && onEnsureAgent) targetId = await onEnsureAgent();
    if (!targetId) return;

    void checkout(
      { product: "phone-number", agentId: targetId, phoneNumber: selectedBuy },
      "Dedicated US number",
      async () => {
        refetchPhoneNumbers();
        await queryClient.invalidateQueries({ queryKey: ["agents"] });
        // The purchase binds server-side; reflect the new id in the form.
        try {
          const agent = (await api.get(`/agents/${targetId}`)).data.data;
          if (agent?.phoneNumberId) setPhoneNumberId(agent.phoneNumberId);
        } catch {
          /* list refetch will still show it */
        }
        setIsOpen(false);
      },
    );
  };

  return (
    <section className="bg-bg-raised border border-border rounded-[8px] p-5 sm:p-6 space-y-4 font-sans">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Phone number</h3>
          <p className="text-[12px] text-text-secondary mt-1 leading-relaxed">
            A dedicated line customers can call directly — your AI answers every time.
          </p>
        </div>
        {assignedLine && (
          <span className="inline-flex items-center gap-1 bg-positive-100 border border-positive-500/20 text-positive-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0">
            <ShieldCheck className="h-3 w-3" /> Assigned
          </span>
        )}
      </header>

      {assignedLine ? (
        <div className="rounded-[8px] border border-border bg-bg-subtle p-4 flex items-center gap-3">
          <div className="h-11 w-11 bg-brand-50 border border-brand-500/15 rounded-[8px] flex items-center justify-center text-brand-600 shrink-0">
            <Phone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-text-primary tabular-nums truncate">
              {assignedLine.phoneNumber}
            </div>
            <div className="text-[11px] text-text-secondary font-medium mt-0.5 truncate">
              {assignedLine.label || "Dedicated line"} · permanently attached to this agent
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-border bg-bg-subtle/60 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-raised border border-border text-brand-600 mx-auto mb-3">
            <Phone className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-text-primary">No number yet</h4>
          <p className="text-[12px] text-text-secondary mt-1.5 leading-relaxed max-w-sm mx-auto">
            Attach one of your numbers, or buy a new dedicated US number for ₹
            {PHONE_NUMBER_PRICE_INR} (one-time).
          </p>
          <Button
            variant="primary"
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            className="bg-primary text-white font-semibold text-xs h-10 px-5 rounded-[6px] hover:bg-primary-hover shadow-none border-none mt-4 inline-flex items-center gap-2"
          >
            <Phone className="h-4 w-4" /> Get a number
          </Button>
        </div>
      )}

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="lg" title="Get a phone number" backdropBlur>
        <div className="flex flex-col max-h-[80vh]">
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            {/* Existing unassigned numbers — free to attach */}
            {phoneNumbers.filter((p) => p.id !== phoneNumberId).length > 0 && (
              <div>
                <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
                  Your unassigned numbers
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {phoneNumbers
                    .filter((p) => p.id !== phoneNumberId)
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPhoneNumberId(p.id);
                          setIsOpen(false);
                        }}
                        className="text-left p-3 rounded-[8px] border bg-bg-raised border-border hover:border-brand-500/40 transition-all"
                      >
                        <span className="text-sm font-semibold text-text-primary tabular-nums">
                          {p.phoneNumber}
                        </span>
                        <div className="text-[11px] text-text-secondary mt-1 font-medium">
                          {p.label || "Available"} · free to attach
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Buy a new number */}
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
                Buy a new US number · ₹{PHONE_NUMBER_PRICE_INR} one-time
              </label>

              {!agentId && !onEnsureAgent ? (
                <div className="flex items-start gap-2 rounded-[8px] bg-brand-50 border border-brand-500/15 p-3 text-[11.5px] text-brand-600 leading-relaxed">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>
                    Finish creating this agent first — then buy its dedicated number right from
                    the agent card.
                  </span>
                </div>
              ) : !canBuy ? (
                <div className="rounded-[8px] border border-amber-500/25 bg-amber-50/60 p-4 text-center space-y-2">
                  <Crown className="h-5 w-5 text-amber-600 mx-auto" />
                  <p className="text-[12px] text-text-secondary leading-relaxed">
                    Buying dedicated numbers needs the <strong>Pro plan</strong>.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/settings?tab=billing")}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[6px] bg-primary hover:bg-primary-hover text-white text-[12px] font-semibold"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Upgrade to Pro
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-placeholder" />
                      <input
                        type="text"
                        placeholder="Search by US area code, e.g. 415"
                        value={areaCode}
                        maxLength={3}
                        onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), setSearch(areaCode))}
                        className="bg-bg-raised border border-border focus:border-brand-500 text-sm text-text-primary placeholder-text-placeholder rounded-[6px] h-10 pl-9 pr-3 w-full focus:outline-none"
                      />
                    </div>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => setSearch(areaCode)}
                      className="border border-border bg-bg-raised hover:bg-surface text-text-primary font-semibold text-xs h-10 px-4 rounded-[6px] shadow-none"
                    >
                      Search
                    </Button>
                  </div>

                  {isLoadingAvailable ? (
                    <div className="py-8 text-center text-xs text-text-secondary font-medium">
                      Finding available numbers…
                    </div>
                  ) : available.length === 0 ? (
                    <div className="py-8 text-center text-xs text-text-secondary bg-bg-subtle border border-dashed border-border rounded-[8px] font-medium">
                      No numbers found{search ? ` for area code ${search}` : ""}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[240px] overflow-y-auto pr-1 -mr-1">
                      {available.map((n) => {
                        const isSelected = selectedBuy === n.phoneNumber;
                        return (
                          <button
                            key={n.phoneNumber}
                            type="button"
                            onClick={() => setSelectedBuy(n.phoneNumber)}
                            className={`text-left p-3 rounded-[8px] border transition-all ${
                              isSelected
                                ? "bg-brand-50/60 border-brand-500 ring-1 ring-brand-500/15"
                                : "bg-bg-raised border-border hover:border-brand-500/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-text-primary tabular-nums">
                                {n.friendlyName || n.phoneNumber}
                              </span>
                              {isSelected && (
                                <span className="text-[10px] font-bold text-brand-600">Selected</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-[11px] text-text-secondary mt-1 font-medium">
                              <MapPin className="h-3 w-3" />
                              {[n.locality, n.region].filter(Boolean).join(", ") || "United States"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="border-t border-border px-5 sm:px-6 py-3 flex items-center justify-between gap-3 bg-bg-subtle">
            <p className="text-[10.5px] text-text-placeholder leading-snug">
              Purchased numbers are permanently attached to this agent.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => setIsOpen(false)}
                type="button"
                className="border border-border bg-bg-raised hover:bg-surface text-text-primary font-semibold text-xs h-10 px-4 rounded-[6px] shadow-none"
              >
                Cancel
              </Button>
              {(agentId || onEnsureAgent) && canBuy && (
                <Button
                  variant="primary"
                  type="button"
                  disabled={!selectedBuy || isPaying}
                  onClick={() => void handleBuy()}
                  className="bg-primary text-white font-semibold text-xs h-10 px-5 rounded-[6px] hover:bg-primary-hover border-none shadow-none disabled:opacity-60"
                >
                  {isPaying ? "Opening checkout…" : `Buy for ₹${PHONE_NUMBER_PRICE_INR}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </section>
  );
}
