import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { Search, Plus, User, ArrowRight, UserPlus } from "lucide-react";
import { Button } from "@antigravity/ui";
import { toast } from "sonner";
import { ContactDetailsDrawer } from "./ContactDetailsDrawer.js";

interface ContactsTabProps {
  contacts: any[];
  isLoading: boolean;
  refetch: () => void;
  customFields: any[];
}

export function ContactsTab({ contacts, isLoading, refetch, customFields }: ContactsTabProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  // New Contact form states
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const createContactMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/crm/contacts", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully onboarded lead: ${data.firstName} ${data.lastName}`);
      refetch();
      setIsAddOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create contact");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First name and Last name are required");
      return;
    }

    createContactMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emails: email.trim() ? [email.trim()] : [],
      phones: phone.trim() ? [phone.trim()] : [],
    });
  };

  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
        (c.emails && c.emails.some((e: string) => e.toLowerCase().includes(query))) ||
        (c.phones && c.phones.some((p: string) => p.includes(query)))
    );
  }, [contacts, searchQuery]);

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      
      {/* Search and Action Header */}
      <div className="flex items-center justify-between gap-4 mb-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#999999]" />
          <input
            type="text"
            placeholder="Search contacts by name, email, or phone line..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 pl-9 pr-4 focus:outline-none"
          />
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs h-9 px-3.5 rounded-[6px] flex items-center gap-1.5 border-none shadow-none"
        >
          <Plus className="h-4 w-4" /> Add Contact
        </Button>
      </div>

      {/* Main Grid/List Container */}
      <div className="flex-1 overflow-y-auto border border-[#E5E5E5] rounded-[6px] min-h-0 bg-[#FFFFFF]">
        {isLoading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-[#F7F7F7] border border-[#E5E5E5] rounded-[6px]" />
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="p-20 text-center space-y-3">
            <User className="h-10 w-10 text-[#999999] mx-auto" />
            <h4 className="text-sm font-bold text-[#111111]">No records matched</h4>
            <p className="text-xs text-[#666666] max-w-xs mx-auto leading-relaxed">
              Onboard a new lead manually or wait for incoming Twilio receptionist call extractions to auto-register them in your CRM.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[10px] font-bold text-[#666666] uppercase tracking-wider select-none h-10">
                <th className="px-6 w-12 text-center">#</th>
                <th className="px-6">Customer Name</th>
                <th className="px-6">Primary Email</th>
                <th className="px-6">Phone Lines</th>
                <th className="px-6">Onboarded</th>
                <th className="px-6 text-right w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] text-xs text-[#666666]">
              {filteredContacts.map((c, idx) => (
                <tr
                  key={c.id}
                  onClick={() => setSelectedContactId(c.id)}
                  className="hover:bg-[#F7F7F7] hover:text-[#111111] cursor-pointer transition-colors h-11"
                >
                  <td className="px-6 text-center font-bold text-[#999999]">{idx + 1}</td>
                  <td className="px-6 font-bold text-[#111111] capitalize">
                    {c.firstName} {c.lastName}
                  </td>
                  <td className="px-6 font-medium">
                    {c.emails?.[0] || <span className="text-[#999999] font-normal">--</span>}
                  </td>
                  <td className="px-6 font-medium">
                    {c.phones?.[0] || <span className="text-[#999999] font-normal">--</span>}
                  </td>
                  <td className="px-6 font-medium">
                    {new Date(c.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-6 text-right">
                    <ArrowRight className="h-4 w-4 text-[#999999] opacity-0 group-hover:opacity-100 shrink-0 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* QUICK ONBOARD LEAD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-none max-w-sm w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="h-4.5 w-4.5 text-[#2563EB]" /> Add New CRM Record
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Drew"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Coleman"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. drew.coleman@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1.5">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +15033513739"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setIsAddOpen(false)}
                  type="button"
                  className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-4 rounded-[6px]"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  disabled={createContactMutation.isPending}
                  className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8]"
                >
                  {createContactMutation.isPending ? "Creating..." : "Add Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE CRM DETAIL SLIDE-OVER TIMELINE */}
      {selectedContactId && (
        <ContactDetailsDrawer
          contactId={selectedContactId}
          onClose={() => {
            setSelectedContactId(null);
            refetch();
          }}
          customFieldDefs={customFields}
        />
      )}
    </div>
  );
}
