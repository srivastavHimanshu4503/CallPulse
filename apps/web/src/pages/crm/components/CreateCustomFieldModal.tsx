import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { HelpCircle, Tag } from "lucide-react";
import { Button } from "@antigravity/ui";
import { toast } from "sonner";

interface CreateCustomFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCustomFieldModal({ isOpen, onClose, onSuccess }: CreateCustomFieldModalProps): React.JSX.Element | null {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"TEXT" | "NUMBER" | "BOOLEAN" | "DROPDOWN" | "DATE">("TEXT");
  const [dropdownOptionsText, setDropdownOptionsText] = React.useState("");

  const createFieldMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/crm/custom-fields", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully registered custom field definition: "${data.name}"`);
      onSuccess();
      onClose();
      setName("");
      setType("TEXT");
      setDropdownOptionsText("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create custom field definition");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Field name is required");
      return;
    }

    const options = type === "DROPDOWN"
      ? dropdownOptionsText.split(",").map((o) => o.trim()).filter(Boolean)
      : [];

    if (type === "DROPDOWN" && options.length === 0) {
      toast.error("Dropdown fields require at least one option");
      return;
    }

    createFieldMutation.mutate({
      name: name.trim(),
      type,
      parentType: "CONTACT",
      options,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
      <div className="bg-bg-raised border border-border rounded-[6px] shadow-none max-w-sm w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
        <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-bg-subtle">
          <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-4.5 w-4.5 text-brand-600" /> Declare Custom Field
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary focus:outline-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center gap-1">
              Field Variable Label *
              <span title="What is the name of the custom parameter? (e.g. BHK Size, Target Budget, Preferred Location)">
                <HelpCircle className="h-3 w-3 text-text-placeholder" />
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Preferred Location"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary placeholder-text-placeholder rounded-[6px] h-9 px-3 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">Parameter Value Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full h-9 bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] px-3 focus:outline-none"
              required
            >
              <option value="TEXT">TEXT (Standard text values)</option>
              <option value="NUMBER">NUMBER (Float/Integer values)</option>
              <option value="BOOLEAN">BOOLEAN (Yes/No boolean switches)</option>
              <option value="DATE">DATE (Calendar date markers)</option>
              <option value="DROPDOWN">DROPDOWN (Fixed option menus)</option>
            </select>
          </div>

          {type === "DROPDOWN" && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-semibold text-text-primary mb-1.5">Selectable Options (comma-separated) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Hot Lead, Warm Lead, Cold Lead"
                value={dropdownOptionsText}
                onChange={(e) => setDropdownOptionsText(e.target.value)}
                className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary placeholder-text-placeholder rounded-[6px] h-9 px-3 focus:outline-none"
              />
              <p className="text-[9px] text-text-placeholder mt-1 font-medium leading-relaxed">
                Provide exact option labels separated by commas.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              type="button"
              className="border-border bg-bg-raised hover:bg-surface text-text-primary font-semibold text-xs h-9 px-4 rounded-[6px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={createFieldMutation.isPending}
              className="bg-primary text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-primary-hover"
            >
              {createFieldMutation.isPending ? "Declaring..." : "Declare Field"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
