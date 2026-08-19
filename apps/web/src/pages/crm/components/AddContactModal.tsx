import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Modal } from "@antigravity/ui";
import { toast } from "sonner";
import { api } from "../../../lib/axios.js";

interface AddContactModalProps {
  customFields: any[];
  onClose: () => void;
  onCreated: () => void;
}

export function AddContactModal({
  customFields,
  onClose,
  onCreated,
}: AddContactModalProps): React.JSX.Element {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({});

  const createContact = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/crm/contacts", payload);
      return res.data.data;
    },
    onSuccess: async (data) => {
      const cfArr = Object.entries(fieldValues)
        .map(([defId, val]) => {
          const def = customFields.find((f: any) => f.id === defId);
          let finalVal: any = val;
          if (def?.type === "DATE" && val) {
            finalVal = Math.floor(new Date(val).getTime() / 1000);
          }
          return { fieldDefinitionId: defId, value: finalVal };
        })
        .filter((item) => item.value !== "");

      if (cfArr.length > 0) {
        try {
          await api.put(`/crm/contacts/${data.id}/custom-fields`, { values: cfArr });
        } catch {
          // non-fatal
        }
      }
      toast.success(`Added ${data.firstName} ${data.lastName}`);
      onCreated();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to add contact");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("First and last name required");
      return;
    }
    createContact.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      emails: email.trim() ? [email.trim()] : [],
      phones: phone.trim() ? [phone.trim()] : [],
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add contact" size="md">
      <form onSubmit={handleSubmit} className="p-5 space-y-4 font-sans">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11.5px] font-semibold text-fg-primary mb-1.5">
              First name *
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Priya"
              className="w-full bg-bg-raised border border-line-default focus:border-brand-500 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md h-9 px-2.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-fg-primary mb-1.5">
              Last name *
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Sharma"
              className="w-full bg-bg-raised border border-line-default focus:border-brand-500 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md h-9 px-2.5 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11.5px] font-semibold text-fg-primary mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="priya@example.com"
            className="w-full bg-bg-raised border border-line-default focus:border-brand-500 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md h-9 px-2.5 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11.5px] font-semibold text-fg-primary mb-1.5">Phone</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full bg-bg-raised border border-line-default focus:border-brand-500 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md h-9 px-2.5 focus:outline-none"
          />
        </div>

        {customFields.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-line-subtle max-h-52 overflow-y-auto pr-1">
            <h4 className="text-[10px] font-bold text-fg-muted uppercase tracking-wider">
              Custom fields
            </h4>
            {customFields.map((def: any) => (
              <div key={def.id}>
                <label className="block text-[11.5px] font-semibold text-fg-primary mb-1.5">
                  {def.name}
                </label>
                {def.type === "DROPDOWN" ? (
                  <select
                    value={fieldValues[def.id] || ""}
                    onChange={(e) => setFieldValues({ ...fieldValues, [def.id]: e.target.value })}
                    className="w-full h-9 bg-bg-raised border border-line-default focus:border-brand-500 text-[12.5px] text-fg-primary rounded-md px-2 focus:outline-none"
                  >
                    <option value="">Select…</option>
                    {def.options?.map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : def.type === "BOOLEAN" ? (
                  <select
                    value={fieldValues[def.id] || ""}
                    onChange={(e) => setFieldValues({ ...fieldValues, [def.id]: e.target.value })}
                    className="w-full h-9 bg-bg-raised border border-line-default focus:border-brand-500 text-[12.5px] text-fg-primary rounded-md px-2 focus:outline-none"
                  >
                    <option value="">Select…</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type={
                      def.type === "NUMBER"
                        ? "number"
                        : def.type === "DATE"
                          ? "datetime-local"
                          : "text"
                    }
                    placeholder={`Enter ${def.name.toLowerCase()}`}
                    value={fieldValues[def.id] || ""}
                    onChange={(e) => setFieldValues({ ...fieldValues, [def.id]: e.target.value })}
                    className="w-full bg-bg-raised border border-line-default focus:border-brand-500 text-[12.5px] text-fg-primary placeholder-fg-muted rounded-md h-9 px-2.5 focus:outline-none"
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-line-subtle flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            className="border border-line-default bg-bg-raised hover:bg-bg-muted text-fg-primary font-semibold text-[12px] h-9 px-3.5 rounded-md shadow-none"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={createContact.isPending}
            className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-[12px] h-9 px-3.5 rounded-md shadow-card border-none"
          >
            {createContact.isPending ? "Adding…" : "Add contact"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
