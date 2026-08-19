import * as React from "react";
import { Sliders, Plus } from "lucide-react";
import { Button } from "@antigravity/ui";
import { CreateCustomFieldModal } from "./CreateCustomFieldModal.js";

interface CustomFieldsTabProps {
  customFields: any[];
  refetch: () => void;
}

export function CustomFieldsTab({
  customFields,
  refetch,
}: CustomFieldsTabProps): React.JSX.Element {
  const [isAddOpen, setIsAddOpen] = React.useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      {/* Header action panel */}
      <div className="flex items-center justify-between shrink-0 mb-4 select-none">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-brand-600" />
          <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
            CRM Custom Field Definitions
          </span>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:bg-primary-hover text-white font-semibold text-xs h-9 px-3.5 rounded-[6px] flex items-center gap-1.5 border-none shadow-none"
        >
          <Plus className="h-4 w-4" /> Declare Custom Field
        </Button>
      </div>

      {/* Definitions grid list */}
      <div className="flex-1 overflow-y-auto border border-border rounded-[6px] min-h-0 bg-bg-raised">
        {customFields.length === 0 ? (
          <div className="p-20 text-center space-y-3">
            <Sliders className="h-10 w-10 text-text-placeholder mx-auto" />
            <h4 className="text-sm font-bold text-text-primary">
              No custom field definitions declared
            </h4>
            <p className="text-xs text-text-secondary max-w-xs mx-auto leading-relaxed">
              Define typed metadata columns (e.g. Budget size, preferred location, movement date) to
              map customer records parameters cleanly.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse select-none">
            <thead>
              <tr className="border-b border-border bg-bg-subtle text-[10px] font-bold text-text-secondary uppercase tracking-wider h-10">
                <th className="px-6 w-12 text-center">#</th>
                <th className="px-6">Field Variable Name</th>
                <th className="px-6">Data Field Type</th>
                <th className="px-6">Mapping Target</th>
                <th className="px-6">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs text-text-secondary">
              {customFields.map((def, idx) => (
                <tr key={def.id} className="hover:bg-surface h-11 transition-colors">
                  <td className="px-6 text-center font-bold text-text-placeholder">{idx + 1}</td>
                  <td className="px-6 font-bold text-text-primary">{def.name}</td>
                  <td className="px-6 font-medium">
                    <div className="flex flex-col gap-1">
                      <span className="w-fit inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-600 uppercase tracking-wide border border-brand-500/10">
                        {def.type}
                      </span>
                      {def.type === "DROPDOWN" && def.options && def.options.length > 0 && (
                        <span
                          className="text-[10px] text-text-placeholder leading-tight font-medium max-w-xs truncate"
                          title={def.options.join(", ")}
                        >
                          Values: {def.options.join(", ")}
                        </span>
                      )}
                    </div>
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
      <CreateCustomFieldModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
}
