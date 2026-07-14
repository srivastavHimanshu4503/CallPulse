import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { toast } from "sonner";
import { Button, Input, Modal } from "@antigravity/ui";
import { Phone, Search, Sparkles, ShoppingBag, ShieldCheck, Loader2 } from "lucide-react";

export const SIMULATED_NUMBERS = [
  { number: "+91 22 6901 4455", label: "Mumbai — Premium" },
  { number: "+91 80 4402 3311", label: "Bangalore" },
  { number: "+91 11 5566 2200", label: "Delhi — Toll-Free" },
  { number: "+91 44 2288 1199", label: "Chennai" },
];

interface TelephonySetupProps {
  phoneNumberId: string | null;
  setPhoneNumberId: (val: string | null) => void;
  phoneNumbers: any[];
  refetchPhoneNumbers: () => void;
  disabled?: boolean;
}

export function TelephonySetup({
  phoneNumberId,
  setPhoneNumberId,
  phoneNumbers,
  refetchPhoneNumbers,
  disabled,
}: TelephonySetupProps): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedNum, setSelectedNum] = React.useState(SIMULATED_NUMBERS[0]?.number || "");
  const [label, setLabel] = React.useState("");
  const [searchQuery, setSearchQuery] = React.useState("");

  const assignedLine = React.useMemo(() => {
    if (!phoneNumberId || !phoneNumbers) return null;
    return phoneNumbers.find((p) => p.id === phoneNumberId);
  }, [phoneNumberId, phoneNumbers]);

  const filteredNumbers = React.useMemo(() => {
    return SIMULATED_NUMBERS.filter(
      (n) =>
        n.number.includes(searchQuery) || n.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const purchaseMutation = useMutation({
    mutationFn: async (payload: { phoneNumber: string; label?: string }) => {
      const res = await api.post("/agents/telephony/purchase", payload);
      return res.data.data;
    },
    onSuccess: (data: any) => {
      refetchPhoneNumbers();
      setPhoneNumberId(data.id);
      toast.success(`Phone number assigned: ${data.phoneNumber}`);
      setIsOpen(false);
      setLabel("");
      setSearchQuery("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to assign phone number");
    },
  });

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    purchaseMutation.mutate({
      phoneNumber: selectedNum,
      label: label.trim() || "AI Receptionist",
    });
  };

  return (
    <section className="bg-white border border-[#E5E5E5] rounded-[8px] p-5 sm:p-6 space-y-4 font-sans">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#111111]">Phone number</h3>
          <p className="text-[12px] text-[#666666] mt-1 leading-relaxed">
            Every agent needs its own dedicated number — sharing one line across agents causes dispatch conflicts.
          </p>
        </div>
        {assignedLine && (
          <span className="inline-flex items-center gap-1 bg-[#DCFCE7] border border-[#16A34A]/20 text-[#15803D] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full shrink-0">
            <ShieldCheck className="h-3 w-3" /> Assigned
          </span>
        )}
      </header>

      {assignedLine ? (
        <div className="rounded-[8px] border border-[#E5E5E5] bg-[#FAFAFA] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 bg-[#EFF6FF] border border-[#2563EB]/15 rounded-[8px] flex items-center justify-center text-[#2563EB] shrink-0">
              <Phone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-[#111111] tabular-nums truncate">
                {assignedLine.phoneNumber}
              </div>
              <div className="text-[11px] text-[#666666] font-medium mt-0.5 truncate">
                {assignedLine.label || "Dedicated line"}
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            className="border border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-3.5 rounded-[6px] shadow-none self-start sm:self-auto shrink-0"
          >
            Change number
          </Button>
        </div>
      ) : (
        <div className="rounded-[8px] border border-dashed border-[#E5E5E5] bg-[#FAFAFA]/60 p-6 sm:p-8 text-center animate-in fade-in duration-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-[#E5E5E5] text-[#2563EB] mx-auto mb-3">
            <Phone className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-semibold text-[#111111]">No number assigned yet</h4>
          <p className="text-[12px] text-[#666666] mt-1.5 leading-relaxed max-w-sm mx-auto">
            Pick a dedicated phone number so this agent can start receiving calls.
          </p>
          <Button
            variant="primary"
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            className="bg-[#2563EB] text-white font-semibold text-xs h-10 px-5 rounded-[6px] hover:bg-[#1D4ED8] shadow-none border-none mt-4 inline-flex items-center gap-2"
          >
            <ShoppingBag className="h-4 w-4" /> Assign phone number
          </Button>
        </div>
      )}

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="lg"
        title="Assign a phone number"
        backdropBlur={true}
      >
        <form onSubmit={handlePurchase} className="flex flex-col max-h-[80vh]">
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
            <div className="flex items-start gap-2 rounded-[8px] bg-[#EFF6FF] border border-[#2563EB]/15 p-3 text-[11px] text-[#1D4ED8] leading-relaxed">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Numbers are provisioned instantly and support Hinglish + regional accents out of the box.
              </span>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
                Search available numbers
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999999]" />
                <input
                  type="text"
                  placeholder="Search city or prefix (e.g. Mumbai, 022, Delhi)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 pl-9 pr-3 w-full focus:outline-none focus:ring-0"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
                Pick a number
              </label>
              {filteredNumbers.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#666666] bg-[#FAFAFA] border border-dashed border-[#E5E5E5] rounded-[8px] font-medium">
                  No matching numbers.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1 -mr-1">
                  {filteredNumbers.map((n) => {
                    const isSelected = selectedNum === n.number;
                    return (
                      <button
                        key={n.number}
                        type="button"
                        onClick={() => setSelectedNum(n.number)}
                        className={`text-left p-3 rounded-[8px] border transition-all ${
                          isSelected
                            ? "bg-[#EFF6FF]/60 border-[#2563EB] ring-1 ring-[#2563EB]/15"
                            : "bg-white border-[#E5E5E5] hover:border-[#2563EB]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#111111] tabular-nums">
                            {n.number}
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-bold text-[#2563EB]">Selected</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#666666] mt-1 font-medium leading-tight">
                          {n.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#111111] mb-1.5">
                Nickname
              </label>
              <Input
                type="text"
                placeholder="e.g. Primary inbound receptionist"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full shadow-none"
              />
              <p className="text-[11px] text-[#999999] mt-1.5">
                Optional. Helps identify this number in reports later.
              </p>
            </div>
          </div>

          <div className="border-t border-[#E5E5E5] px-5 sm:px-6 py-3 flex items-center justify-end gap-2 bg-[#FAFAFA]">
            <Button
              variant="secondary"
              onClick={() => setIsOpen(false)}
              type="button"
              className="border border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-10 px-4 rounded-[6px] shadow-none"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={purchaseMutation.isPending}
              className="bg-[#2563EB] text-white font-semibold text-xs h-10 px-5 rounded-[6px] hover:bg-[#1D4ED8] flex items-center gap-2 border-none shadow-none disabled:opacity-70"
            >
              {purchaseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Assigning...
                </>
              ) : (
                <>Assign number</>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
