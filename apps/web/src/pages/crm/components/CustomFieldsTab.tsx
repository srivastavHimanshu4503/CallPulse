import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { Sliders, Plus, HelpCircle, Tag } from "lucide-react";
import { Button } from "@antigravity/ui";
import { toast } from "sonner";

interface CustomFieldsTabProps {
  customFields: any[];
  refetch: () => void;
}

export function CustomFieldsTab({ customFields, refetch }: CustomFieldsTabProps): React.JSX.Element {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"TEXT" | "NUMBER" | "BOOLEAN" | "DROPDOWN" | "DATE">("TEXT");

  const createFieldMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/crm/custom-fields", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully registered custom field definition: "${data.name}"`);
      refetch();
      setIsAddOpen(false);
      setName("");
      setType("TEXT");
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

    createFieldMutation.mutate({
      name: name.trim(),
      type,
      parentType: "CONTACT",
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      
      {/* Header action panel */}
      <div className="flex items-center justify-between shrink-0 mb-4 select-none">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-[#2563EB]" />
          <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            CRM Custom Field Definitions
          </span>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs h-9 px-3.5 rounded-[6px] flex items-center gap-1.5 border-none shadow-none"
        >
          <Plus className="h-4 w-4" /> Declare Custom Field
        </Button>
      </div>

      {/* Definitions grid list */}
      <div className="flex-1 overflow-y-auto border border-[#E5E5E5] rounded-[6px] min-h-0 bg-[#FFFFFF]">
        {customFields.length === 0 ? (
          <div className="p-20 text-center space-y-3">
            <Sliders className="h-10 w-10 text-[#999999] mx-auto" />
            <h4 className="text-sm font-bold text-[#111111]">No custom field definitions declared</h4>
            <p className="text-xs text-[#666666] max-w-xs mx-auto leading-relaxed">
              Define typed metadata columns (e.g. Budget size, preferred location, movement date) to map customer records parameters cleanly.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b border-[#E5E5E5] bg-[#FAFAFA] text-[10px] font-bold text-[#666666] uppercase tracking-wider h-10">
                <th className="px-6 w-12 text-center">#</th>
                <th className="px-6">Field Variable Name</th>
                <th className="px-6">Data Field Type</th>
                <th className="px-6">Mapping Target</th>
                <th className="px-6">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5] text-xs text-[#666666]">
              {customFields.map((def, idx) => (
                <tr key={def.id} className="hover:bg-[#F7F7F7] h-11 transition-colors">
                  <td className="px-6 text-center font-bold text-[#999999]">{idx + 1}</td>
                  <td className="px-6 font-bold text-[#111111]">{def.name}</td>
                  <td className="px-6 font-medium">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] uppercase tracking-wide border border-[#2563EB]/10">
                      {def.type}
                    </span>
                  </td>
                  <td className="px-6 font-medium capitalize">{def.parentType.toLowerCase()}</td>
                  <td className="px-6 font-medium">
                    {new Date(def.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* QUICK DECLARE DYNAMIC FIELD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-none max-w-sm w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-4.5 w-4.5 text-[#2563EB]" /> Declare Custom Field
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                  disabled={createFieldMutation.isPending}
                  className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8]"
                >
                  {createFieldMutation.isPending ? "Declaring..." : "Declare Field"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
