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
      <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-none max-w-sm w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
        <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA]">
          <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="h-4.5 w-4.5 text-[#2563EB]" /> Declare Custom Field
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[#666666] hover:text-[#111111] focus:outline-none"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5 flex items-center gap-1">
              Field Variable Label *
              <span title="What is the name of the custom parameter? (e.g. BHK Size, Target Budget, Preferred Location)">
                <HelpCircle className="h-3 w-3 text-[#999999]" />
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Preferred Location"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111111] mb-1.5">Parameter Value Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-3 focus:outline-none"
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
              <label className="block text-xs font-semibold text-[#111111] mb-1.5">Selectable Options (comma-separated) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Hot Lead, Warm Lead, Cold Lead"
                value={dropdownOptionsText}
                onChange={(e) => setDropdownOptionsText(e.target.value)}
                className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
              />
              <p className="text-[9px] text-[#999999] mt-1 font-medium leading-relaxed">
                Provide exact option labels separated by commas.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              type="button"
              className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-4 rounded-[6px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={createFieldMutation.isPending}
              className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8]"
            >
              {createFieldMutation.isPending ? "Declaring..." : "Declare Field"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
