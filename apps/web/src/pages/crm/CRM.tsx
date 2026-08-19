import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "../../components/layout/PageWrapper.js";
import { api } from "../../lib/axios.js";
import { Users, FolderKanban, Sliders } from "lucide-react";
import { Tabs } from "../../components/ui-ext/index.js";
import { PageHeader } from "../../components/common/UI.js";
import { ContactsTab } from "./components/ContactsTab.js";
import { PipelineTab } from "./components/PipelineTab.js";
import { CustomFieldsTab } from "./components/CustomFieldsTab.js";

type ActiveTab = "contacts" | "pipeline" | "custom-fields";

export function CRM(): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("contacts");

  const {
    data: contacts = [],
    isLoading: isContactsLoading,
    refetch: refetchContacts,
  } = useQuery({
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
    { id: "contacts" as const, label: "Contacts", icon: Users, count: contacts.length },
    { id: "pipeline" as const, label: "Pipelines", icon: FolderKanban },
    {
      id: "custom-fields" as const,
      label: "Custom fields",
      icon: Sliders,
      count: customFields.length,
    },
  ];

  return (
    <PageWrapper noScroll={true}>
      <div className="flex flex-col h-full overflow-hidden font-sans">
        <PageHeader
          title="Smart CRM"
          subtitle={
            <span>
              Every call auto-updates contacts, scores leads and creates deals — no manual data
              entry.
            </span>
          }
          actions={
            <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} variant="segmented" />
          }
        />

        {/* Tab body — occupies all remaining height */}
        <div className="flex-1 overflow-hidden min-h-0">
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
              customFieldDefs={customFields}
            />
          )}

          {activeTab === "custom-fields" && (
            <CustomFieldsTab customFields={customFields} refetch={refetchCustomFields} />
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

export default CRM;
