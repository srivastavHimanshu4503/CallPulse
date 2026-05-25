import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { toast } from "sonner";
import { Button, Input } from "@antigravity/ui";
import { Phone, ShoppingBag, X } from "lucide-react";

export const SIMULATED_NUMBERS = [
  { number: "+91 22 6901 4455", label: "Mumbai Virtual Twilio Line (Premium)" },
  { number: "+91 80 4402 3311", label: "Bangalore Virtual Twilio Line" },
  { number: "+91 11 5566 2200", label: "Delhi National Toll-Free Virtual Line" },
  { number: "+91 44 2288 1199", label: "Chennai Virtual Twilio Line" }
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
  disabled
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
    return SIMULATED_NUMBERS.filter((n) =>
      n.number.includes(searchQuery) ||
      n.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const purchaseMutation = useMutation({
    mutationFn: async (payload: { phoneNumber: string; label?: string }) => {
      const res = await api.post("/agents/telephony/purchase", payload);
      return res.data.data;
    },
    onSuccess: (data: any) => {
      refetchPhoneNumbers();
      setPhoneNumberId(data.id); // Auto-assign the purchased number
      toast.success(`Successfully purchased and assigned Twilio line: ${data.phoneNumber}`);
      setIsOpen(false);
      setLabel("");
      setSearchQuery("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to purchase virtual Twilio line");
    }
  });

  const handlePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    purchaseMutation.mutate({
      phoneNumber: selectedNum,
      label: label.trim() || "Virtual AI Receptionist Line",
    });
  };

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between">
        <label className="block text-[13px] font-semibold text-[#111111]">
          Assigned Twilio Number *
        </label>
        {!assignedLine && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            className="text-[#2563EB] hover:text-[#1D4ED8] text-xs font-bold flex items-center gap-1 focus:outline-none"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Purchase Twilio Line (+)
          </button>
        )}
      </div>

      {assignedLine ? (
        <div className="rounded-[6px] border border-[#E5E5E5] bg-[#FAFAFA]/50 p-4 flex items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#EFF6FF] border border-[#2563EB]/10 rounded-[6px] flex items-center justify-center text-[#2563EB]">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#111111]">{assignedLine.phoneNumber}</div>
              <div className="text-[10px] text-[#666666] font-medium mt-0.5 uppercase tracking-wider">
                {assignedLine.label || "Dedicated Twilio Regional Line"}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            className="text-[#2563EB] hover:text-[#1D4ED8] text-xs font-semibold focus:outline-none"
          >
            Change Number
          </button>
        </div>
      ) : (
        <div className="rounded-[6px] border border-dashed border-[#E5E5E5] bg-[#FAFAFA]/20 p-6 text-center space-y-4 animate-in fade-in duration-200">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF]/40 text-[#2563EB] mx-auto">
            <Phone className="h-6 w-6 text-[#2563EB]" />
          </div>
          <div className="max-w-xs mx-auto">
            <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wide">No Dedicated Line Allocated</h4>
            <p className="text-[11px] text-[#666666] mt-1 leading-relaxed font-medium">
              Every AI Agent receptionist requires a dedicated virtual Twilio regional line to prevent call dispatch conflicts. The primary business hotline cannot be shared.
            </p>
          </div>
          <Button
            variant="primary"
            type="button"
            onClick={() => setIsOpen(true)}
            disabled={disabled}
            className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-5 rounded-[6px] hover:bg-[#1D4ED8] shadow-none border-none"
          >
            + Purchase & Allocate Twilio Regional Line
          </Button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-none max-w-lg w-full overflow-hidden">
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="h-4.5 w-4.5 text-[#2563EB]" /> Purchase Twilio Line (India)
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePurchase} className="p-6 space-y-4">
              <p className="text-xs text-[#666666] leading-relaxed">
                Virtual regional numbers are active immediately and support Hinglish voice parsing out-of-the-box.
              </p>

              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-[#111111]">
                  Search Available Virtual Lines
                </label>
                <input
                  type="text"
                  placeholder="Search city or prefix (e.g. Mumbai, 022, Delhi)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 w-full focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-[#111111]">
                  Select Twilio Regional Number (India)
                </label>
                <div className="border border-[#E5E5E5] rounded-[6px] bg-[#FAFAFA]/30 max-h-[220px] overflow-y-auto p-3 pr-1.5">
                  {filteredNumbers.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#666666] bg-white border border-dashed border-[#E5E5E5] rounded-[6px] font-medium">
                      No matching virtual numbers available
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredNumbers.map((n) => {
                        const isSelected = selectedNum === n.number;
                        return (
                          <div
                            key={n.number}
                            onClick={() => setSelectedNum(n.number)}
                            className={`p-3 cursor-pointer rounded-[6px] border transition-all flex items-start justify-between ${
                              isSelected
                                ? "bg-[#EFF6FF]/40 border-[#2563EB] text-[#2563EB]"
                                : "bg-white border-[#E5E5E5] hover:border-[#2563EB]/40 hover:bg-[#F7F7F7]"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[#111111]">{n.number}</div>
                              <div className="text-[9px] text-[#666666] mt-1 font-medium leading-tight truncate" title={n.label}>
                                {n.label}
                              </div>
                            </div>
                            {isSelected && <span className="text-[10px] font-bold text-[#2563EB] shrink-0 ml-1 mt-0.5">Selected</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-[#111111]">
                  Line Nickname / Label
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Primary Inbound Receptionist"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="bg-white border-[#E5E5E5] focus:border-[#2563EB] text-sm text-[#111111] placeholder-[#999999] rounded-[6px] h-10 px-3 w-full"
                />
              </div>

              <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setIsOpen(false)}
                  type="button"
                  className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-10 px-4 rounded-[6px] shadow-none"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={purchaseMutation.isPending}
                  className="bg-[#2563EB] text-white font-semibold text-xs h-10 px-5 rounded-[6px] hover:bg-[#1D4ED8] flex items-center gap-2 border-none shadow-none"
                >
                  {purchaseMutation.isPending ? "Purchasing..." : "Purchase Twilio Line"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
