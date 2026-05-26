import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { Search, Plus, User, ArrowRight, UserPlus, Filter, Trash2 } from "lucide-react";
import { Button } from "@antigravity/ui";
import { toast } from "sonner";
import { ContactDetailsDrawer } from "./ContactDetailsDrawer.js";
import { FilterLogicalOperator, FilterOperator } from "@antigravity/types";
import type { FilterCondition } from "@antigravity/types";

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

  // Advanced HubSpot-style CRM Filter Builder States
  const [filterConditions, setFilterConditions] = React.useState<FilterCondition[]>([]);
  const [filterOperator, setFilterOperator] = React.useState<FilterLogicalOperator>(FilterLogicalOperator.AND);
  const [sortBy, setSortBy] = React.useState<string>("created-newest"); // "created-newest", "created-oldest", "name-asc", "name-desc"
  const [isFilterBuilderOpen, setIsFilterBuilderOpen] = React.useState(false);

  // Table Pagination states
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(20);

  // New Contact form states
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  
  // Custom field values state in creation form
  const [formFieldValues, setFormFieldValues] = React.useState<Record<string, string>>({});

  const createContactMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/crm/contacts", payload);
      return res.data.data;
    },
    onSuccess: async (data) => {
      // Check and save dynamic custom fields values immediately
      const customFieldValuesArray = Object.entries(formFieldValues)
        .map(([defId, val]) => {
          const def = customFields.find((f: any) => f.id === defId);
          let finalVal: any = val;
          if (def?.type === "DATE" && val) {
            finalVal = Math.floor(new Date(val).getTime() / 1000);
          }
          return {
            fieldDefinitionId: defId,
            value: finalVal,
          };
        })
        .filter((item) => item.value !== "");

      if (customFieldValuesArray.length > 0) {
        try {
          await api.put(`/crm/contacts/${data.id}/custom-fields`, { values: customFieldValuesArray });
        } catch (err) {
          console.error("Failed to map dynamic custom fields on manual contact creation", err);
        }
      }

      toast.success(`Successfully onboarded lead: ${data.firstName} ${data.lastName}`);
      refetch();
      setIsAddOpen(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setFormFieldValues({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create contact");
    },
  });

  const handleAddSubmit = (e: React.FormEvent): void => {
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

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterConditions, filterOperator, sortBy]);

  // State handlers for condition rows with explicit return types
  const addCondition = (): void => {
    const newCond: FilterCondition = {
      id: Math.random().toString(36).substring(7),
      fieldId: "name",
      operator: FilterOperator.CONTAINS,
      value: "",
    };
    setFilterConditions((prev) => [...prev, newCond]);
  };

  const removeCondition = (id: string): void => {
    setFilterConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleFieldChange = (id: string, fieldId: string): void => {
    setFilterConditions((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        let defaultOp = FilterOperator.CONTAINS;
        if (fieldId === "createdAt" || customFields.find((f) => f.id === fieldId)?.type === "DATE") {
          defaultOp = FilterOperator.IS_AFTER;
        } else if (fieldId === "hasOpenDeals" || customFields.find((f) => f.id === fieldId)?.type === "BOOLEAN" || customFields.find((f) => f.id === fieldId)?.type === "DROPDOWN") {
          defaultOp = FilterOperator.EQUALS;
        }
        return {
          ...c,
          fieldId,
          operator: defaultOp,
          value: fieldId === "hasOpenDeals" ? "yes" : "",
        };
      })
    );
  };

  const handleOperatorChange = (id: string, operator: FilterOperator): void => {
    setFilterConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, operator } : c))
    );
  };

  const handleValueChange = (id: string, value: string): void => {
    setFilterConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value } : c))
    );
  };

  const getAvailableOperators = (fieldId: string): { value: FilterOperator; label: string }[] => {
    if (fieldId === "createdAt") {
      return [
        { value: FilterOperator.IS_AFTER, label: "is after" },
        { value: FilterOperator.IS_BEFORE, label: "is before" },
        { value: FilterOperator.IS_EMPTY, label: "is empty" },
        { value: FilterOperator.IS_NOT_EMPTY, label: "is not empty" },
      ];
    }
    if (fieldId === "hasOpenDeals") {
      return [
        { value: FilterOperator.EQUALS, label: "equals" },
      ];
    }
    const customDef = customFields.find((f) => f.id === fieldId);
    if (customDef) {
      if (customDef.type === "NUMBER") {
        return [
          { value: FilterOperator.EQUALS, label: "equals" },
          { value: FilterOperator.GREATER_THAN_OR_EQUAL, label: "is greater than or equal (>=)" },
          { value: FilterOperator.LESS_THAN_OR_EQUAL, label: "is less than or equal (<=)" },
          { value: FilterOperator.IS_EMPTY, label: "is empty" },
          { value: FilterOperator.IS_NOT_EMPTY, label: "is not empty" },
        ];
      }
      if (customDef.type === "DATE") {
        return [
          { value: FilterOperator.IS_AFTER, label: "is after" },
          { value: FilterOperator.IS_BEFORE, label: "is before" },
          { value: FilterOperator.IS_EMPTY, label: "is empty" },
          { value: FilterOperator.IS_NOT_EMPTY, label: "is not empty" },
        ];
      }
      if (customDef.type === "BOOLEAN" || customDef.type === "DROPDOWN") {
        return [
          { value: FilterOperator.EQUALS, label: "equals" },
          { value: FilterOperator.IS_EMPTY, label: "is empty" },
          { value: FilterOperator.IS_NOT_EMPTY, label: "is not empty" },
        ];
      }
    }
    return [
      { value: FilterOperator.CONTAINS, label: "contains" },
      { value: FilterOperator.EQUALS, label: "equals" },
      { value: FilterOperator.IS_EMPTY, label: "is empty" },
      { value: FilterOperator.IS_NOT_EMPTY, label: "is not empty" },
    ];
  };

  // Premium HubSpot-style combined dynamic filter and sorting logic
  const filteredAndSortedContacts = React.useMemo(() => {
    let result = [...contacts];

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(query) ||
          (c.emails && c.emails.some((e: string) => e.toLowerCase().includes(query))) ||
          (c.phones && c.phones.some((p: string) => p.includes(query)))
      );
    }

    // Apply HubSpot-style Conditional Filter Builder
    if (filterConditions.length > 0) {
      result = result.filter((c) => {
        const matchResults = filterConditions.map((cond) => {
          let actualVal: any = "";

          // Resolve field value
          if (cond.fieldId === "name") {
            actualVal = `${c.firstName} ${c.lastName}`;
          } else if (cond.fieldId === "email") {
            actualVal = c.emails?.[0] || "";
          } else if (cond.fieldId === "phone") {
            actualVal = c.phones?.[0] || "";
          } else if (cond.fieldId === "createdAt") {
            actualVal = c.createdAt;
          } else if (cond.fieldId === "hasOpenDeals") {
            const hasDeals = c.deals && c.deals.length > 0;
            actualVal = hasDeals ? "yes" : "no";
          } else {
            // Retrieve dynamic custom fields
            const valObj = c.customFields?.find((cf: any) => cf.fieldDefinitionId === cond.fieldId);
            if (valObj) {
              actualVal = valObj.textValue ?? valObj.numberValue ?? valObj.booleanValue ?? valObj.dateValue ?? "";
            }
          }

          const condVal = cond.value;

          // Process HubSpot logic operators
          switch (cond.operator) {
            case FilterOperator.CONTAINS:
              return String(actualVal || "").toLowerCase().includes(String(condVal).toLowerCase());
            case FilterOperator.EQUALS:
              return String(actualVal || "").toLowerCase() === String(condVal).toLowerCase();
            case FilterOperator.GREATER_THAN_OR_EQUAL:
              return Number(actualVal || 0) >= Number(condVal || 0);
            case FilterOperator.LESS_THAN_OR_EQUAL:
              return Number(actualVal || 0) <= Number(condVal || 0);
            case FilterOperator.IS_EMPTY:
              return !actualVal || String(actualVal).trim() === "";
            case FilterOperator.IS_NOT_EMPTY:
              return !!actualVal && String(actualVal).trim() !== "";
            case FilterOperator.IS_AFTER:
              if (!actualVal) return false;
              return new Date(actualVal).getTime() >= new Date(condVal).getTime();
            case FilterOperator.IS_BEFORE:
              if (!actualVal) return false;
              return new Date(actualVal).getTime() <= new Date(condVal).getTime();
            default:
              return true;
          }
        });

        if (filterOperator === FilterLogicalOperator.OR) {
          return matchResults.some(Boolean);
        } else {
          return matchResults.every(Boolean);
        }
      });
    }

    // Sort contacts list
    if (sortBy === "name-asc") {
      result.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    } else if (sortBy === "name-desc") {
      result.sort((a, b) => `${b.firstName} ${a.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`));
    } else if (sortBy === "created-oldest") {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else {
      // default: created-newest
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [contacts, searchQuery, filterConditions, filterOperator, sortBy]);

  // Derived Paginated Contacts List
  const paginatedContacts = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredAndSortedContacts.slice(start, end);
  }, [filteredAndSortedContacts, currentPage, itemsPerPage]);

  const totalPages = React.useMemo(() => {
    return Math.max(1, Math.ceil(filteredAndSortedContacts.length / itemsPerPage));
  }, [filteredAndSortedContacts, itemsPerPage]);

  const hasActiveFilters = React.useMemo(() => {
    return filterConditions.length > 0;
  }, [filterConditions]);

  const handleClearFilters = (): void => {
    setFilterConditions([]);
    setFilterOperator(FilterLogicalOperator.AND);
    setSortBy("created-newest");
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      
      {/* Search and Action Header */}
      <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
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

      {/* HubSpot Filters Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0 bg-white border border-[#E5E5E5] p-2.5 rounded-[6px]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#111111] uppercase tracking-wider border-r border-[#E5E5E5] pr-3 mr-1 shrink-0 select-none">
            <Filter className="h-3.5 w-3.5 text-[#2563EB]" /> Advanced Filters
          </div>

          <button
            type="button"
            onClick={() => setIsFilterBuilderOpen(true)}
            className={`h-8 px-3 rounded-[6px] border text-xs font-semibold flex items-center gap-1.5 transition-colors focus:outline-none ${
              hasActiveFilters
                ? "border-[#2563EB] text-[#2563EB] bg-[#EFF6FF]"
                : "border-[#E5E5E5] bg-white text-[#666666] hover:text-[#111111]"
            }`}
          >
            Configure Filters
            {hasActiveFilters && (
              <span className="bg-[#2563EB] text-white text-[10px] font-bold h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center">
                {filterConditions.length}
              </span>
            )}
          </button>

          {/* Sort selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="h-8 bg-white border border-[#E5E5E5] text-[11px] font-semibold text-[#666666] rounded-[6px] px-2 focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value="created-newest">Sort: Newest First</option>
            <option value="created-oldest">Sort: Oldest First</option>
            <option value="name-asc">Sort: Name (A-Z)</option>
            <option value="name-desc">Sort: Name (Z-A)</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="h-8 px-3 rounded-[6px] border border-[#E5E5E5] bg-white text-[#DC2626] hover:bg-[#DC2626]/5 text-xs font-bold transition-colors"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* HubSpot-style Advanced Filters Right Slide-Over Drawer */}
      {isFilterBuilderOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans select-none animate-in fade-in duration-150">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#111111]/30 backdrop-blur-[1px]" onClick={() => setIsFilterBuilderOpen(false)} />

          {/* Drawer Container */}
          <div className="absolute inset-y-0 right-0 w-full md:w-[480px] bg-white border-l border-[#E5E5E5] flex flex-col h-full overflow-hidden shadow-2xl animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="h-14 border-b border-[#E5E5E5] px-6 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Filter className="h-4.5 w-4.5 text-[#2563EB]" />
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                  Advanced Filters ({filterConditions.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterBuilderOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body - scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-[#666666] uppercase tracking-wider mb-2">
                  Matching Logic
                </label>
                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value as FilterLogicalOperator)}
                  className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs font-bold text-[#111111] rounded-[6px] px-3 focus:outline-none cursor-pointer"
                >
                  <option value={FilterLogicalOperator.AND}>ALL conditions must match (AND)</option>
                  <option value={FilterLogicalOperator.OR}>ANY condition can match (OR)</option>
                </select>
                <p className="text-[10px] text-[#999999] mt-1 font-medium leading-normal">
                  Connect multiple logical filters dynamically to refine your CRM contacts view.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                  <span className="text-[10px] font-bold text-[#666666] uppercase tracking-wider">
                    Filter Rules
                  </span>
                </div>

                {filterConditions.length === 0 ? (
                  <div className="py-12 border border-dashed border-[#E5E5E5] rounded-[6px] text-center text-xs text-[#999999] px-4">
                    No active rules configured. Click "+ Add Rule" below to start filtering your leads.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filterConditions.map((cond, idx) => {
                      const availableOps = getAvailableOperators(cond.fieldId);
                      const isValHidden = cond.operator === FilterOperator.IS_EMPTY || cond.operator === FilterOperator.IS_NOT_EMPTY;
                      const customDef = customFields.find((f) => f.id === cond.fieldId);

                      return (
                        <div key={cond.id} className="border border-[#E5E5E5] rounded-[6px] p-3 space-y-3 bg-white hover:border-[#2563EB]/25 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#999999] uppercase">
                              {idx === 0 ? "Where Rule" : `Connector: ${filterOperator}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCondition(cond.id)}
                              className="text-[#DC2626] hover:bg-[#DC2626]/5 rounded-[4px] p-1 transition-colors"
                              title="Delete Rule"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {/* Field Selector */}
                            <div>
                              <label className="block text-[9px] font-bold text-[#999999] uppercase tracking-wider mb-1">Field</label>
                              <select
                                value={cond.fieldId}
                                onChange={(e) => handleFieldChange(cond.id, e.target.value)}
                                className="w-full h-8 bg-white border border-[#E5E5E5] text-xs text-[#111111] rounded-[6px] px-2.5 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                              >
                                <option value="name">Customer Name</option>
                                <option value="email">Primary Email</option>
                                <option value="phone">Phone Line</option>
                                <option value="createdAt">Onboarded Date</option>
                                <option value="hasOpenDeals">Open Deals Status</option>
                                {customFields.map((cf) => (
                                  <option key={cf.id} value={cf.id}>{cf.name} (Custom)</option>
                                ))}
                              </select>
                            </div>

                            {/* Operator Selector */}
                            <div>
                              <label className="block text-[9px] font-bold text-[#999999] uppercase tracking-wider mb-1">Condition</label>
                              <select
                                value={cond.operator}
                                onChange={(e) => handleOperatorChange(cond.id, e.target.value as FilterOperator)}
                                className="w-full h-8 bg-white border border-[#E5E5E5] text-xs text-[#111111] rounded-[6px] px-2.5 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                              >
                                {availableOps.map((op) => (
                                  <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Value Selector/Input */}
                            {!isValHidden && (
                              <div>
                                <label className="block text-[9px] font-bold text-[#999999] uppercase tracking-wider mb-1">Value</label>
                                {cond.fieldId === "hasOpenDeals" ? (
                                  <select
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-white border border-[#E5E5E5] text-xs text-[#111111] rounded-[6px] px-2.5 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                                  >
                                    <option value="yes">With Open Deals</option>
                                    <option value="no">Without Deals</option>
                                  </select>
                                ) : customDef?.type === "DROPDOWN" ? (
                                  <select
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-white border border-[#E5E5E5] text-xs text-[#111111] rounded-[6px] px-2.5 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                                  >
                                    <option value="">Select option...</option>
                                    {customDef.options?.map((opt: string) => (
                                      <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                  </select>
                                ) : customDef?.type === "BOOLEAN" ? (
                                  <select
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-white border border-[#E5E5E5] text-xs text-[#111111] rounded-[6px] px-2.5 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                                  >
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                ) : cond.fieldId === "createdAt" || customDef?.type === "DATE" ? (
                                  <input
                                    type="date"
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-white border border-[#E5E5E5] text-xs text-[#111111] rounded-[6px] px-2.5 focus:outline-none focus:border-[#2563EB]"
                                  />
                                ) : customDef?.type === "NUMBER" ? (
                                  <input
                                    type="number"
                                    placeholder="Enter threshold value..."
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-white border border-[#E5E5E5] text-xs text-[#111111] rounded-[6px] px-2.5 focus:outline-none focus:border-[#2563EB]"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Match text..."
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-white border border-[#E5E5E5] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] px-2.5 focus:outline-none focus:border-[#2563EB]"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer - sticky */}
            <div className="border-t border-[#E5E5E5] p-6 bg-[#FAFAFA] flex items-center justify-between shrink-0">
              <Button
                variant="secondary"
                onClick={addCondition}
                className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-4 rounded-[6px] flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add Rule
              </Button>

              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-xs text-[#DC2626] font-bold hover:underline"
                  >
                    Clear All
                  </button>
                )}
                <Button
                  variant="primary"
                  onClick={() => setIsFilterBuilderOpen(false)}
                  className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8]"
                >
                  Apply & Close
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main Grid/List Container */}
      <div className="flex-1 overflow-y-auto border border-[#E5E5E5] rounded-[6px] min-h-0 bg-white flex flex-col justify-between">
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-[#F7F7F7] border border-[#E5E5E5] rounded-[6px]" />
              ))}
            </div>
          ) : paginatedContacts.length === 0 ? (
            <div className="p-20 text-center space-y-3">
              <User className="h-10 w-10 text-[#999999] mx-auto" />
              <h4 className="text-sm font-bold text-[#111111]">No records matched criteria</h4>
              <p className="text-xs text-[#666666] max-w-xs mx-auto leading-relaxed">
                No contacts match the currently applied filter criteria or search query. Click 'Configure Filters' to reset.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-white text-[10px] font-bold text-[#666666] uppercase tracking-wider select-none h-10">
                  <th className="px-6 w-12 text-center">#</th>
                  <th className="px-6">Customer Name</th>
                  <th className="px-6">Primary Email</th>
                  <th className="px-6">Phone Lines</th>
                  {customFields.map((def: any) => (
                    <th key={def.id} className="px-6">{def.name}</th>
                  ))}
                  <th className="px-6">Onboarded</th>
                  <th className="px-6 text-right w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] text-xs text-[#666666]">
                {paginatedContacts.map((c, idx) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedContactId(c.id)}
                    className="hover:bg-[#F7F7F7] hover:text-[#111111] cursor-pointer transition-colors h-11"
                  >
                    <td className="px-6 text-center font-bold text-[#999999]">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="px-6 font-bold text-[#111111] capitalize">
                      {c.firstName} {c.lastName}
                    </td>
                    <td className="px-6 font-medium">
                      {c.emails?.[0] || <span className="text-[#999999] font-normal">--</span>}
                    </td>
                    <td className="px-6 font-medium">
                      {c.phones?.[0] || <span className="text-[#999999] font-normal">--</span>}
                    </td>
                    {customFields.map((def: any) => {
                      const valObj = c.customFields?.find((cf: any) => cf.fieldDefinitionId === def.id);
                      let displayVal = "--";
                      if (valObj) {
                        if (def.type === "DATE" && valObj.dateValue) {
                          try {
                            const d = typeof valObj.dateValue === "number"
                              ? new Date(valObj.dateValue < 10000000000 ? valObj.dateValue * 1000 : valObj.dateValue)
                              : new Date(valObj.dateValue);
                            const pad = (num: number) => String(num).padStart(2, "0");
                            displayVal = `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                          } catch {
                            displayVal = String(valObj.dateValue);
                          }
                        } else if (def.type === "BOOLEAN") {
                          displayVal = valObj.booleanValue === true || String(valObj.booleanValue) === "true" ? "Yes" : valObj.booleanValue === false || String(valObj.booleanValue) === "false" ? "No" : "--";
                        } else {
                          displayVal = valObj.textValue ?? (valObj.numberValue !== null ? String(valObj.numberValue) : null) ?? valObj.booleanValue ?? "--";
                        }
                      }
                      return (
                        <td key={def.id} className="px-6 font-medium text-[11px] text-[#666666] max-w-[120px] truncate select-all">
                          {displayVal}
                        </td>
                      );
                    })}
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

        {/* Modern Pagination Footer */}
        {!isLoading && filteredAndSortedContacts.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#E5E5E5] px-6 py-3 bg-white shrink-0 select-none text-xs text-[#666666]">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 bg-white border border-[#E5E5E5] text-[11px] font-semibold text-[#111111] rounded-[6px] px-2 focus:outline-none focus:border-[#2563EB] cursor-pointer"
              >
                <option value={10}>10 items</option>
                <option value={20}>20 items</option>
                <option value={50}>50 items</option>
                <option value={100}>100 items</option>
              </select>
              <span>per page</span>
            </div>

            <div className="font-semibold text-[#111111]">
              Showing {filteredAndSortedContacts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredAndSortedContacts.length)} of{" "}
              {filteredAndSortedContacts.length} records
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 px-3 rounded-[6px] border border-[#E5E5E5] text-xs font-semibold disabled:opacity-40"
              >
                Previous
              </Button>
              
              <span className="px-2 font-bold text-[#111111]">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-3 rounded-[6px] border border-[#E5E5E5] text-xs font-semibold disabled:opacity-40"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ONBOARD LEAD MODAL WITH DYNAMIC CUSTOM FIELDS */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className={`bg-white border border-[#E5E5E5] rounded-[6px] shadow-none w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150 ${customFields.length > 0 ? "max-w-md" : "max-w-sm"}`}>
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-white">
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

              {/* Dynamic custom field inputs */}
              {customFields.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-[#E5E5E5] mt-2 max-h-48 overflow-y-auto pr-1 select-none">
                  <h4 className="text-[10px] font-bold text-[#999999] uppercase tracking-wider">Custom Profile Mapping</h4>
                  {customFields.map((def: any) => (
                    <div key={def.id} className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#111111]">{def.name}</label>
                      {def.type === "DROPDOWN" ? (
                        <select
                          value={formFieldValues[def.id] || ""}
                          onChange={(e) => setFormFieldValues({ ...formFieldValues, [def.id]: e.target.value })}
                          className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-3 focus:outline-none"
                        >
                          <option value="">Select option...</option>
                          {def.options?.map((opt: string) => (
                              <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : def.type === "BOOLEAN" ? (
                        <select
                          value={formFieldValues[def.id] || ""}
                          onChange={(e) => setFormFieldValues({ ...formFieldValues, [def.id]: e.target.value })}
                          className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-3 focus:outline-none"
                        >
                          <option value="">Select option...</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <input
                          type={def.type === "NUMBER" ? "number" : def.type === "DATE" ? "datetime-local" : "text"}
                          placeholder={`Enter ${def.name.toLowerCase()}...`}
                          value={formFieldValues[def.id] || ""}
                          onChange={(e) => setFormFieldValues({ ...formFieldValues, [def.id]: e.target.value })}
                          className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

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
