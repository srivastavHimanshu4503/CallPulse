import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { api } from "../../lib/axios.js";
import { Users, LayoutDashboard, Sliders } from "lucide-react";
import { ContactsTab } from "./components/ContactsTab.js";
import { PipelineTab } from "./components/PipelineTab.js";
import { CustomFieldsTab } from "./components/CustomFieldsTab.js";

type ActiveTab = "contacts" | "pipeline" | "custom-fields";

export function CRM(): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("contacts");

  // Global queries for contacts and custom fields so children share cached queries
  const { data: contacts = [], isLoading: isContactsLoading, refetch: refetchContacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const res = await api.get("/crm/contacts");
      return res.data.data as any[];
    },
  });

  const { data: customFields = [], refetch: refetchCustomFields } = useQuery({
    queryKey: ["custom-fields-defs"],
    queryFn: async () => {
      const res = await api.get("/crm/custom-fields");
      return res.data.data as any[];
    },
  });

  const tabs = [
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "pipeline", label: "Sales Pipeline", icon: LayoutDashboard },
    { id: "custom-fields", label: "Custom Fields", icon: Sliders },
  ];

  return (
    <PageWrapper noScroll={true}>
      <div className="flex flex-col h-full overflow-hidden select-none">
        
        {/* Main CRM Workspace Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E5E5E5] bg-white pb-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-[#111111] uppercase tracking-wide">CRM Workspace</h1>
            <p className="text-[11px] text-[#666666] mt-0.5 font-medium leading-relaxed">
              isolated customer relationship management, sales pipelines, and custom field aggregates.
            </p>
          </div>

          {/* tab indicators list */}
          <div className="flex items-center gap-1 bg-[#F7F7F7] border border-[#E5E5E5] p-1 rounded-[6px] mt-4 sm:mt-0">
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as ActiveTab)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[4px] text-xs font-semibold tracking-wide transition-all focus:outline-none ${
                    isActive
                      ? "bg-white text-[#2563EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                      : "text-[#666666] hover:text-[#111111]"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#2563EB]" : "text-[#999999]"}`} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab workspace panel */}
        <div className="flex-1 overflow-hidden min-h-0 pt-4 bg-[#FFFFFF]">
          {activeTab === "contacts" && (
            <ContactsTab 
              contacts={contacts} 
              isLoading={isContactsLoading} 
              refetch={refetchContacts}
              customFields={customFields}
            />
          )}

          {activeTab === "pipeline" && (
            <PipelineTab 
              contacts={contacts} 
              refetchContacts={refetchContacts} 
            />
          )}

          {activeTab === "custom-fields" && (
            <CustomFieldsTab 
              customFields={customFields} 
              refetch={refetchCustomFields} 
            />
          )}
        </div>

      </div>
    </PageWrapper>
  );
}

export default CRM;
