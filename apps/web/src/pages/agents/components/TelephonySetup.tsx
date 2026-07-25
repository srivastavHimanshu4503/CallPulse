import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { Button } from "@antigravity/ui";
import { Phone, ShieldCheck } from "lucide-react";
import { PurchaseNumberModal } from "./PurchaseNumberModal.js";

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
  agentName?: string;
}

/**
 * Real number assignment for the AgentWizard. Attach one of the tenant's
 * unassigned numbers for free, or open the country-aware PurchaseNumberModal
 * to buy a new dedicated number (US via Twilio, India via Plivo).
 */
export function TelephonySetup({
  agentId,
  onEnsureAgent,
  phoneNumberId,
  setPhoneNumberId,
  phoneNumbers,
  refetchPhoneNumbers,
  disabled,
  agentName,
}: TelephonySetupProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const [buyOpen, setBuyOpen] = React.useState(false);

  const assignedLine = React.useMemo(() => {
    if (!phoneNumberId || !phoneNumbers) return null;
    return phoneNumbers.find((p) => p.id === phoneNumberId);
  }, [phoneNumberId, phoneNumbers]);

  const unassigned = React.useMemo(
    () => (phoneNumbers || []).filter((p) => p.id !== phoneNumberId),
    [phoneNumbers, phoneNumberId],
  );

  // A purchase needs an agentId — if we're mid-wizard, save the draft first.
  const openBuyModal = async () => {
    if (agentId) {
      setBuyOpen(true);
      return;
    }
    if (onEnsureAgent) {
      const id = await onEnsureAgent();
      if (id) setBuyOpen(true);
    }
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
        <div className="space-y-3">
          {/* Existing unassigned numbers — free to attach */}
          {unassigned.length > 0 && (
            <div>
              <label className="block text-[12px] font-semibold text-text-primary mb-1.5">
                Your unassigned numbers
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {unassigned.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => setPhoneNumberId(p.id)}
                    className="text-left p-3 rounded-[8px] border bg-bg-raised border-border hover:border-brand-500/40 transition-all disabled:opacity-60"
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

          <div className="rounded-[8px] border border-dashed border-border bg-bg-subtle/60 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-raised border border-border text-brand-600 mx-auto mb-3">
              <Phone className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-semibold text-text-primary">Buy a dedicated number</h4>
            <p className="text-[12px] text-text-secondary mt-1.5 leading-relaxed max-w-sm mx-auto">
              Choose US (Twilio) or India (Plivo) in the next step.
            </p>
            <Button
              variant="primary"
              type="button"
              onClick={() => void openBuyModal()}
              disabled={disabled}
              className="bg-primary text-white font-semibold text-xs h-10 px-5 rounded-[6px] hover:bg-primary-hover shadow-none border-none mt-4 inline-flex items-center gap-2"
            >
              <Phone className="h-4 w-4" /> Get a number
            </Button>
          </div>
        </div>
      )}

      {buyOpen && agentId && (
        <PurchaseNumberModal
          agentId={agentId}
          agentName={agentName || "this agent"}
          onClose={async () => {
            setBuyOpen(false);
            refetchPhoneNumbers();
            await queryClient.invalidateQueries({ queryKey: ["agents"] });
            // The purchase binds server-side; reflect the new id in the form.
            try {
              const agent = (await api.get(`/agents/${agentId}`)).data.data;
              if (agent?.phoneNumberId) setPhoneNumberId(agent.phoneNumberId);
            } catch {
              /* list refetch will still show it */
            }
          }}
        />
      )}
    </section>
  );
}
