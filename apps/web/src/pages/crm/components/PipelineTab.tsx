import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import { TrendingUp, Plus, ArrowLeft, ArrowRight, Layers, FolderKanban, Sparkles, Filter, Trash2, AlertTriangle, Search } from "lucide-react";
import { Button } from "@antigravity/ui";
import { toast } from "sonner";
import { FilterLogicalOperator, FilterOperator } from "@antigravity/types";
import type { FilterCondition } from "@antigravity/types";


interface PipelineTabProps {
  contacts: any[];
  refetchContacts: () => void;
  customFieldDefs?: any[];
}

export function PipelineTab({ contacts, refetchContacts, customFieldDefs = [] }: PipelineTabProps): React.JSX.Element {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = React.useState(false);

  // Custom pipelines queries
  const { data: pipelines = [], isLoading: isPipelinesLoading, refetch: refetchPipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const res = await api.get("/crm/pipelines");
      return res.data.data as any[];
    },
  });

  const [activePipelineId, setActivePipelineId] = React.useState<string>("");

  const activePipeline = React.useMemo(() => {
    if (pipelines.length === 0) return null;
    return pipelines.find((p) => p.id === activePipelineId) || pipelines[0];
  }, [pipelines, activePipelineId]);

  const STAGES = React.useMemo(() => {
    return activePipeline?.stages || [];
  }, [activePipeline]);

  // Set default active pipeline on load
  React.useEffect(() => {
    if (pipelines.length > 0 && !activePipelineId) {
      setActivePipelineId(pipelines[0].id);
    }
  }, [pipelines, activePipelineId]);

  // New Deal/Record form states
  const [contactId, setContactId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [value, setValue] = React.useState("");
  const [stage, setStage] = React.useState("");

  // Sync default stage when STAGES change
  React.useEffect(() => {
    if (STAGES.length > 0) {
      setStage(STAGES[0]);
    }
  }, [STAGES]);

  // New Custom Pipeline form states
  const [newPipelineName, setNewPipelineName] = React.useState("");
  const [newStages, setNewStages] = React.useState<string[]>(["Contacted Us", "Prospect Contacted", "Negotiation"]);
  
  // Pipeline smart filter configuration states
  const [useFilter, setUseFilter] = React.useState(false);
  const [filterFieldId, setFilterFieldId] = React.useState("");
  const [filterFieldValue, setFilterFieldValue] = React.useState("");

  // Re-ordering stage helper for creation
  const moveNewStage = (index: number, direction: "up" | "down") => {
    const nextIdx = direction === "up" ? index - 1 : index + 1;
    if (nextIdx >= 0 && nextIdx < newStages.length) {
      const updated = [...newStages];
      const temp = updated[index] as string;
      updated[index] = updated[nextIdx] as string;
      updated[nextIdx] = temp;
      setNewStages(updated);
    }
  };

  // Get active dropdown options when a filter custom field is selected
  const activeFilterOptions = React.useMemo(() => {
    if (!filterFieldId) return [];
    const def = customFieldDefs.find((d) => d.id === filterFieldId);
    return def?.options || [];
  }, [filterFieldId, customFieldDefs]);

  // Edit Pipeline states
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editPipelineName, setEditPipelineName] = React.useState("");
  const [editStages, setEditStages] = React.useState<string[]>([]);
  const [editUseFilter, setEditUseFilter] = React.useState(false);
  const [editFilterFieldId, setEditFilterFieldId] = React.useState("");
  const [editFilterFieldValue, setEditFilterFieldValue] = React.useState("");

  // Opportunity Record Edit Modal states
  const [isEditDealOpen, setIsEditDealOpen] = React.useState(false);
  const [editDealId, setEditDealId] = React.useState("");
  const [editDealTitle, setEditDealTitle] = React.useState("");
  const [editDealValue, setEditDealValue] = React.useState("");
  const [editDealStage, setEditDealStage] = React.useState("");

  // Custom Delete Confirmation Modal states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteConfirmType, setDeleteConfirmType] = React.useState<"deal" | "pipeline">("deal");
  const [deleteConfirmId, setDeleteConfirmId] = React.useState("");
  const [deleteConfirmTitle, setDeleteConfirmTitle] = React.useState("");

  // Live Interactive Kanban card filters
  const [dealSearchQuery, setDealSearchQuery] = React.useState("");
  const [dealSortBy, setDealSortBy] = React.useState("value-desc"); // "value-desc", "value-asc", "title-asc", "created-newest"

  // Advanced HubSpot-style Pipeline Filter Builder States
  const [filterConditions, setFilterConditions] = React.useState<FilterCondition[]>([]);
  const [filterOperator, setFilterOperator] = React.useState<FilterLogicalOperator>(FilterLogicalOperator.AND);
  const [isFilterBuilderOpen, setIsFilterBuilderOpen] = React.useState(false);
  const [visibleLimits, setVisibleLimits] = React.useState<Record<string, number>>({});



  // Re-ordering stage helper for editing
  const moveEditStage = (index: number, direction: "up" | "down") => {
    const nextIdx = direction === "up" ? index - 1 : index + 1;
    if (nextIdx >= 0 && nextIdx < editStages.length) {
      const updated = [...editStages];
      const temp = updated[index] as string;
      updated[index] = updated[nextIdx] as string;
      updated[nextIdx] = temp;
      setEditStages(updated);
    }
  };

  // Get active edit dropdown options when an edit filter custom field is selected
  const activeEditFilterOptions = React.useMemo(() => {
    if (!editFilterFieldId) return [];
    const def = customFieldDefs.find((d) => d.id === editFilterFieldId);
    return def?.options || [];
  }, [editFilterFieldId, customFieldDefs]);

  // 1. Fetch Deals
  const { data: deals = [], isLoading: isDealsLoading, refetch: refetchDeals } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const res = await api.get("/crm/deals");
      return res.data.data as any[];
    },
  });

  // Filter deals belonging to the active pipeline (including legacy deals for default pipeline)
  // Plus dynamic smart filter application based on the Pipeline's custom field configuration!
  // And live user interactive filters (search, sorting, min value threshold)!
  const filteredDeals = React.useMemo(() => {
    if (!activePipeline) return [];
    
    // 1. Filter by pipeline ID matching (or legacy deals matching default)
    let result = deals.filter(
      (d: any) =>
        d.pipelineId === activePipeline.id ||
        (d.pipelineId === null && activePipeline.name === "Sales Pipeline")
    );

    // 2. Apply Custom Smart Filters if set on this pipeline definition
    if (activePipeline.filters && activePipeline.filters.length > 0) {
      result = result.filter((d: any) => {
        const contactObj = contacts.find((c) => c.id === d.contactId);
        if (!contactObj) return false;

        // Verify if contact matches every active filter
        return activePipeline.filters.every((filter: any) => {
          const matchField = contactObj.customFields?.find(
            (cf: any) => cf.fieldDefinitionId === filter.fieldDefinitionId
          );
          if (!matchField) return false;
          // Values for dropdowns are saved in textValue property in CRM contactDetails
          const cfVal = matchField.value ?? matchField.textValue ?? "";
          return String(cfVal).toLowerCase() === String(filter.value).toLowerCase();
        });
      });
    }

    // 3. Apply Live Search Filter
    if (dealSearchQuery.trim()) {
      const q = dealSearchQuery.toLowerCase();
      result = result.filter(
        (d: any) =>
          String(d.title || "").toLowerCase().includes(q) ||
          String(d.contactName || "").toLowerCase().includes(q)
      );
    }

    // 4. Apply HubSpot-style Conditional Filter Builder
    if (filterConditions.length > 0) {
      result = result.filter((d: any) => {
        const contactObj = contacts.find((c) => c.id === d.contactId);

        const matchResults = filterConditions.map((cond) => {
          let actualVal: any = "";

          // Resolve field value
          if (cond.fieldId === "title") {
            actualVal = d.title;
          } else if (cond.fieldId === "value") {
            actualVal = d.value;
          } else if (cond.fieldId === "createdAt") {
            actualVal = d.createdAt;
          } else if (cond.fieldId === "stage") {
            actualVal = d.stage;
          } else if (cond.fieldId === "contactName") {
            actualVal = d.contactName || (contactObj ? `${contactObj.firstName} ${contactObj.lastName}` : "");
          } else if (cond.fieldId === "contactEmail") {
            actualVal = contactObj?.emails?.[0] || "";
          } else if (cond.fieldId === "contactPhone") {
            actualVal = contactObj?.phones?.[0] || "";
          } else {
            // Retrieve dynamic custom fields from linked contact
            if (!contactObj) return false;
            const valObj = contactObj.customFields?.find((cf: any) => cf.fieldDefinitionId === cond.fieldId);
            if (valObj) {
              actualVal = valObj.textValue ?? valObj.numberValue ?? valObj.booleanValue ?? valObj.dateValue ?? "";
            }
          }

          const condVal = cond.value;

          // Operators
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

    // 5. Apply Live Sorting
    if (dealSortBy === "value-desc") {
      result.sort((a, b) => b.value - a.value);
    } else if (dealSortBy === "value-asc") {
      result.sort((a, b) => a.value - b.value);
    } else if (dealSortBy === "title-asc") {
      result.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    } else if (dealSortBy === "created-newest") {
      result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    return result;
  }, [deals, activePipeline, contacts, dealSearchQuery, dealSortBy, filterConditions, filterOperator]);

  // State handlers for condition rows in Pipeline tab with explicit return types
  const addCondition = (): void => {
    const newCond: FilterCondition = {
      id: Math.random().toString(36).substring(7),
      fieldId: "title",
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
        if (fieldId === "value" || customFieldDefs.find((f) => f.id === fieldId)?.type === "NUMBER") {
          defaultOp = FilterOperator.GREATER_THAN_OR_EQUAL;
        } else if (fieldId === "createdAt" || customFieldDefs.find((f) => f.id === fieldId)?.type === "DATE") {
          defaultOp = FilterOperator.IS_AFTER;
        } else if (customFieldDefs.find((f) => f.id === fieldId)?.type === "BOOLEAN" || customFieldDefs.find((f) => f.id === fieldId)?.type === "DROPDOWN") {
          defaultOp = FilterOperator.EQUALS;
        }
        return {
          ...c,
          fieldId,
          operator: defaultOp,
          value: "",
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
    if (fieldId === "value") {
      return [
        { value: FilterOperator.EQUALS, label: "equals" },
        { value: FilterOperator.GREATER_THAN_OR_EQUAL, label: "is greater than or equal (>=)" },
        { value: FilterOperator.LESS_THAN_OR_EQUAL, label: "is less than or equal (<=)" },
      ];
    }
    const customDef = customFieldDefs.find((f) => f.id === fieldId);
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


  // 2. Create Deal/Record Mutation
  const createDealMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/crm/deals", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully registered pipeline record: "${data.title}"`);
      refetchDeals();
      refetchContacts();
      setIsAddOpen(false);
      setTitle("");
      setValue("");
      setContactId("");
      if (STAGES.length > 0) setStage(STAGES[0]);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create pipeline record");
    },
  });

  // 3. Move Deal Stage Mutation
  const moveDealMutation = useMutation({
    mutationFn: async (payload: { id: string; stage: string }) => {
      const res = await api.put(`/crm/deals/${payload.id}/stage`, { stage: payload.stage });
      return res.data.data;
    },
    onSuccess: () => {
      refetchDeals();
      refetchContacts();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to shift stage");
    },
  });

  // Delete Deal Mutation
  const deleteDealMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/crm/deals/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Pipeline record removed successfully!");
      refetchDeals();
      refetchContacts();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to remove pipeline record");
    },
  });

  // Update Deal Mutation
  const updateDealMutation = useMutation({
    mutationFn: async (payload: { id: string; title: string; value: number; stage: string }) => {
      const res = await api.put(`/crm/deals/${payload.id}`, {
        title: payload.title,
        value: payload.value,
        stage: payload.stage,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully updated opportunity: "${data.title}"`);
      refetchDeals();
      refetchContacts();
      setIsEditDealOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update opportunity");
    },
  });

  const handleMoveDeal = (dealId: string, targetStage: string) => {
    moveDealMutation.mutate({ id: dealId, stage: targetStage });
  };

  // 4. Create Pipeline Mutation
  const createPipelineMutation = useMutation({
    mutationFn: async (payload: { name: string; stages: string[]; filters?: any[] | null }) => {
      const res = await api.post("/crm/pipelines", payload);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully configured pipeline smart view: "${data.name}"`);
      refetchPipelines();
      setIsPipelineModalOpen(false);
      setNewPipelineName("");
      setNewStages(["Contacted Us", "Prospect Contacted", "Negotiation"]);
      setUseFilter(false);
      setFilterFieldId("");
      setFilterFieldValue("");
      setActivePipelineId(data.id);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create pipeline smart view");
    },
  });

  // 5. Update Pipeline Mutation
  const updatePipelineMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; stages: string[]; filters?: any[] | null }) => {
      const res = await api.put(`/crm/pipelines/${payload.id}`, {
        name: payload.name,
        stages: payload.stages,
        filters: payload.filters,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success("Pipeline settings successfully updated!");
      setIsEditOpen(false);
      refetchPipelines();
      refetchContacts();
      refetchDeals();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update pipeline settings");
    },
  });

  // 6. Delete Pipeline Mutation
  const deletePipelineMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/crm/pipelines/${id}`);
    },
    onSuccess: () => {
      toast.success("Pipeline successfully deleted!");
      setIsEditOpen(false);
      refetchPipelines().then((res) => {
        const list = res.data || [];
        if (list.length > 0) {
          setActivePipelineId(list[0].id);
        } else {
          setActivePipelineId("");
        }
      });
      refetchContacts();
      refetchDeals();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete pipeline");
    },
  });

  const handleCreateDealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId || !title.trim() || !value.trim()) {
      toast.error("Contact, title, and estimated value are required");
      return;
    }

    createDealMutation.mutate({
      contactId,
      pipelineId: activePipeline?.id || null,
      title: title.trim(),
      value: Number(value),
      stage,
    });
  };

  const handleCreatePipelineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStages = newStages.map((s) => s.trim()).filter(Boolean);
    if (!newPipelineName.trim() || cleanStages.length === 0) {
      toast.error("Pipeline name and at least one stage are required");
      return;
    }

    const filters = useFilter && filterFieldId && filterFieldValue
      ? [{ fieldDefinitionId: filterFieldId, value: filterFieldValue }]
      : null;

    createPipelineMutation.mutate({
      name: newPipelineName.trim(),
      stages: cleanStages,
      filters,
    });
  };

  const handleShiftStage = (dealId: string, currStage: string, direction: "left" | "right") => {
    const currIdx = STAGES.indexOf(currStage);
    if (currIdx === -1) return;
    const nextIdx = direction === "right" ? currIdx + 1 : currIdx - 1;
    if (nextIdx >= 0 && nextIdx < STAGES.length) {
      const targetStage = STAGES[nextIdx];
      if (targetStage) {
        moveDealMutation.mutate({ id: dealId, stage: targetStage });
      }
    }
  };

  // Group deals by stage
  const dealsByStage = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    STAGES.forEach((s: string) => {
      groups[s] = [];
    });
    filteredDeals.forEach((d) => {
      const g = groups[d.stage];
      if (g) {
        g.push(d);
      }
    });
    return groups;
  }, [filteredDeals, STAGES]);

  // Compute stage values
  const stageSums = React.useMemo(() => {
    const sums: Record<string, number> = {};
    STAGES.forEach((s: string) => {
      const stageDeals = dealsByStage[s] || [];
      sums[s] = stageDeals.reduce((sum, d) => sum + d.value, 0);
    });
    return sums;
  }, [dealsByStage, STAGES]);

  const handleAddStageInput = () => {
    setNewStages([...newStages, ""]);
  };

  const handleStageInputChange = (index: number, val: string) => {
    const updated = [...newStages];
    updated[index] = val;
    setNewStages(updated);
  };

  const handleRemoveStageInput = (index: number) => {
    if (newStages.length <= 1) return;
    const updated = newStages.filter((_, idx) => idx !== index);
    setNewStages(updated);
  };

  const isLoading = isPipelinesLoading || isDealsLoading;

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      
      {/* Header action panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-3 mb-4 select-none">
        
        {/* Pipeline Selector Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-r border-[#E5E5E5] pr-3 shrink-0">
            <TrendingUp className="h-4 w-4 text-[#2563EB]" />
            <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Workspace Pipelines
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pipelines.length > 0 && (
              <>
                <select
                  value={activePipelineId}
                  onChange={(e) => setActivePipelineId(e.target.value)}
                  className="h-8 bg-white border border-[#E5E5E5] text-xs font-bold text-[#111111] rounded-[6px] px-3 focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.filters && p.filters.length > 0 ? "⚙️ (Smart View)" : ""}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    if (activePipeline) {
                      setEditPipelineName(activePipeline.name);
                      setEditStages([...activePipeline.stages]);
                      const hasFilter = activePipeline.filters && activePipeline.filters.length > 0;
                      setEditUseFilter(hasFilter);
                      if (hasFilter) {
                        setEditFilterFieldId(activePipeline.filters[0].fieldDefinitionId);
                        setEditFilterFieldValue(activePipeline.filters[0].value);
                      } else {
                        setEditFilterFieldId("");
                        setEditFilterFieldValue("");
                      }
                      setIsEditOpen(true);
                    }
                  }}
                  className="h-8 w-8 rounded-[6px] border border-[#E5E5E5] bg-white text-[#666666] hover:text-[#2563EB] hover:border-[#2563EB] flex items-center justify-center focus:outline-none transition-colors"
                  title="Configure dynamic pipeline stages or Smart Filters"
                >
                  ⚙️
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setIsPipelineModalOpen(true)}
              className="h-8 px-2.5 rounded-[6px] border border-[#E5E5E5] bg-white text-[#666666] hover:text-[#111111] text-[11px] font-semibold flex items-center gap-1 focus:outline-none transition-colors"
              title="Create custom pipelines"
            >
              <Plus className="h-3.5 w-3.5" /> New Pipeline
            </button>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            if (STAGES.length > 0) setStage(STAGES[0]);
            setIsAddOpen(true);
          }}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs h-9 px-3.5 rounded-[6px] flex items-center gap-1.5 border-none shadow-none"
        >
          <Plus className="h-4 w-4" /> Create Record
        </Button>
      </div>

      {/* HubSpot Filters Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0 bg-white border border-[#E5E5E5] p-2.5 rounded-[6px] select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#111111] uppercase tracking-wider border-r border-[#E5E5E5] pr-3 mr-1 shrink-0 select-none">
            <Filter className="h-3.5 w-3.5 text-[#2563EB]" /> Advanced Filters
          </div>

          {/* Live Card Title Search */}
          <div className="relative flex-1 max-w-xs shrink-0">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#999999]" />
            <input
              type="text"
              placeholder="Search deals or contacts..."
              value={dealSearchQuery}
              onChange={(e) => setDealSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-[11px] text-[#111111] placeholder-[#999999] rounded-[6px] h-8 pl-8 pr-3 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsFilterBuilderOpen(true)}
            className={`h-8 px-3 rounded-[6px] border text-[11px] font-semibold flex items-center gap-1.5 transition-colors focus:outline-none ${
              filterConditions.length > 0
                ? "border-[#2563EB] text-[#2563EB] bg-[#EFF6FF]"
                : "border-[#E5E5E5] bg-white text-[#666666] hover:text-[#111111]"
            }`}
          >
            Configure Filters
            {filterConditions.length > 0 && (
              <span className="bg-[#2563EB] text-white text-[10px] font-bold h-4.5 min-w-4.5 px-1 rounded-full flex items-center justify-center">
                {filterConditions.length}
              </span>
            )}
          </button>

          {/* Deals Sort selection */}
          <select
            value={dealSortBy}
            onChange={(e) => setDealSortBy(e.target.value)}
            className="h-8 bg-white border border-[#E5E5E5] text-[11px] font-semibold text-[#666666] rounded-[6px] px-2 focus:outline-none focus:border-[#2563EB] cursor-pointer"
          >
            <option value="value-desc">Sort: Value (High → Low)</option>
            <option value="value-asc">Sort: Value (Low → High)</option>
            <option value="title-asc">Sort: Title (A → Z)</option>
            <option value="created-newest">Sort: Newest First</option>
          </select>
        </div>

        {filterConditions.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setFilterConditions([]);
              setFilterOperator(FilterLogicalOperator.AND);
            }}
            className="h-8 px-3 rounded-[6px] border border-[#E5E5E5] bg-white text-[#DC2626] hover:bg-[#DC2626]/5 text-[11px] font-bold transition-colors"
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
                  Connect multiple logical filters dynamically to refine your CRM pipelines view.
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
                    No active rules configured. Click "+ Add Rule" below to start filtering your pipeline deals.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filterConditions.map((cond, idx) => {
                      const availableOps = getAvailableOperators(cond.fieldId);
                      const isValHidden = cond.operator === FilterOperator.IS_EMPTY || cond.operator === FilterOperator.IS_NOT_EMPTY;
                      const customDef = customFieldDefs.find((f) => f.id === cond.fieldId);

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
                                <option value="title">Deal Title</option>
                                <option value="value">Deal Estimated Value (Rs.)</option>
                                <option value="createdAt">Deal Created Date</option>
                                <option value="stage">Pipeline Stage</option>
                                <option value="contactName">Linked Contact Name</option>
                                <option value="contactEmail">Linked Contact Email</option>
                                <option value="contactPhone">Linked Contact Phone</option>
                                {customFieldDefs.map((cf) => (
                                  <option key={cf.id} value={cf.id}>{cf.name} (Contact Custom)</option>
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
                                {customDef?.type === "DROPDOWN" ? (
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
                                ) : cond.fieldId === "value" || customDef?.type === "NUMBER" ? (
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
                {filterConditions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterConditions([]);
                      setFilterOperator(FilterLogicalOperator.AND);
                    }}
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


      {/* Kanban Board Container */}
      <div className="flex-1 flex gap-5 overflow-x-auto pb-4 select-none min-h-0">
        {isLoading ? (
          <div className="flex gap-5 w-full">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="w-64 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[6px] shrink-0 p-4 animate-pulse h-48" />
            ))}
          </div>
        ) : STAGES.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#E5E5E5] rounded-[6px] p-20 text-center">
            <FolderKanban className="h-10 w-10 text-[#999999] mb-3" />
            <h4 className="text-sm font-bold text-[#111111]">No Stages Defined for Pipeline</h4>
            <p className="text-xs text-[#666666] mt-1 max-w-sm">
              Please declare stages in your pipeline configuration to render your Kanban boards.
            </p>
          </div>
        ) : (
          STAGES.map((s: string) => {
            const list = dealsByStage[s] || [];
            const sum = stageSums[s] || 0;
            const limit = visibleLimits[s] || 12;
            const visibleList = list.slice(0, limit);

            return (
              <div
                key={s}
                className="w-64 bg-white border border-[#E5E5E5] rounded-[6px] shrink-0 flex flex-col justify-between h-full"
              >
                {/* Stage Header */}
                <div className="p-4 border-b border-[#E5E5E5] bg-[#FFFFFF] rounded-t-[6px] shrink-0 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-[#111111] uppercase tracking-wider leading-none truncate pr-2">
                      {s}
                    </h4>
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F7F7F7] border border-[#E5E5E5] text-[#666666]">
                      {list.length}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#999999] font-bold tracking-wide uppercase mt-1">
                    Value: <span className="text-[#111111] font-semibold">Rs. {sum.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Cards List container */}
                <div 
                  className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-[150px] transition-colors duration-200 select-none"
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dealId = e.dataTransfer.getData("text/plain");
                    if (dealId) {
                      handleMoveDeal(dealId, s);
                    }
                  }}
                >
                  {list.length === 0 ? (
                    <div className="h-full border border-dashed border-[#E5E5E5] rounded-[6px] flex flex-col items-center justify-center p-6 text-center text-[#999999]">
                      <Layers className="h-6 w-6 text-[#999999]/50 mb-2" />
                      <span className="text-[10px] font-medium leading-normal">Shifts deal records here</span>
                    </div>
                  ) : (
                    visibleList.map((d) => (
                      <div
                        key={d.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", d.id);
                        }}
                        onClick={() => {
                          setEditDealId(d.id);
                          setEditDealTitle(d.title);
                          setEditDealValue(String(d.value));
                          setEditDealStage(d.stage);
                          setIsEditDealOpen(true);
                        }}
                        className="bg-white border border-[#E5E5E5] rounded-[6px] p-3.5 space-y-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-[#2563EB]/40 hover:shadow-[0_2px_8px_rgba(37,99,235,0.03)] cursor-pointer active:cursor-grabbing transition-all duration-200"
                      >
                        <div>
                          <h5 className="text-xs font-bold text-[#111111] capitalize leading-snug">{d.title}</h5>
                          <span className="text-[10px] font-bold text-[#999999] capitalize tracking-wide block mt-1">
                            Contact: <span className="font-semibold text-[#666666]">{d.contactName}</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-[#F7F7F7] pt-2">
                          <span className="text-xs font-bold text-[#2563EB]">Rs. {d.value.toLocaleString("en-IN")}</span>

                          {/* Click shifts stage controls and delete deal action */}
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConfirmType("deal");
                                setDeleteConfirmId(d.id);
                                setDeleteConfirmTitle(d.title);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-[#DC2626] hover:bg-[#DC2626]/10 border border-transparent rounded-[4px] p-1 transition-colors"
                              title="Remove record from pipeline"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShiftStage(d.id, d.stage, "left")}
                              disabled={STAGES.indexOf(d.stage) === 0}
                              className="text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111] border border-[#E5E5E5] rounded-[4px] p-1 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShiftStage(d.id, d.stage, "right")}
                              disabled={STAGES.indexOf(d.stage) === STAGES.length - 1}
                              className="text-[#666666] hover:bg-[#F7F7F7] hover:text-[#111111] border border-[#E5E5E5] rounded-[4px] p-1 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {list.length > limit && (
                    <button
                      type="button"
                      onClick={() => setVisibleLimits((prev) => ({ ...prev, [s]: limit + 12 }))}
                      className="w-full py-2 bg-white hover:bg-[#F9FAFB] border border-dashed border-[#E5E5E5] rounded-[6px] text-[10px] font-bold text-[#2563EB] uppercase tracking-wider transition-all select-none mt-2"
                    >
                      Show +12 More Deals
                    </button>
                  )}
                </div>


              </div>
            );
          })
        )}
      </div>

      {/* PREMIUM SPLIT REGISTER RECORD POPUP DIALOG */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-2xl max-w-2xl w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="h-4.5 w-4.5 text-[#2563EB]" /> Register Pipeline Record
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none text-sm"
              >
                ✕
              </button>
            </div>

            {/* Split layout: Form on left, complete learning guides on right */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5]">
              
              {/* Form Input fields */}
              <form onSubmit={handleCreateDealSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">Link Contact Record *</label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-3 focus:outline-none"
                    required
                  >
                    <option value="">Select contact profile...</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.phones?.[0] || "No Line"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">Record Opportunity Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Drew Coleman onboarding track"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">Estimated Value (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="e.g. 589900"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">Initial Stage *</label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-3 focus:outline-none"
                    required
                  >
                    {STAGES.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
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
                    disabled={createDealMutation.isPending}
                    className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8]"
                  >
                    {createDealMutation.isPending ? "Registering..." : "Create Record"}
                  </Button>
                </div>
              </form>

              {/* Complete Onboarding Guide & Tips */}
              <div className="p-6 bg-[#FAFAFA] flex flex-col justify-between select-none">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E5E5E5] pb-2">
                    <Sparkles className="h-4 w-4 text-[#2563EB]" /> Onboarding Guide & Tips
                  </h4>

                  <div className="space-y-3.5 text-xs text-[#666666] leading-relaxed">
                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">🔗 Why Link a Customer Profile?</span>
                      <p className="mt-1">
                        Linking a contact profile aggregates this record on their **unified Activity Timeline**. Every call transcript, Twilio receptionist recording, and note merges cleanly into one dashboard.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">💰 Estimated Value tracking</span>
                      <p className="mt-1">
                        Represents the commercial or lifecycle value of this opportunity. Value aggregates in real-time on columns to compute sales pipelines statistics instantly.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">⚡ Automated AI Workflows</span>
                      <p className="mt-1">
                        Moving records between columns automatically triggers background workflows! AI receptionist agents perform callbacks, SMS engines dispatch alerts, and custom API webhooks sync.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#E5E5E5] pt-3 text-[10px] text-[#999999] leading-snug font-medium">
                  💡 Tip: Create custom pipelines under the "New Pipeline" button to configure smart views matching your operational workflow.
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* DECLARE CUSTOM PIPELINE STAGES MODAL WITH AUTOMATED SMART FILTERS & SIDEBAR GUIDE */}
      {isPipelineModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-2xl max-w-2xl w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="h-4.5 w-4.5 text-[#2563EB]" /> Declare Pipeline Workflow
              </h3>
              <button
                type="button"
                onClick={() => setIsPipelineModalOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5] min-h-[400px]">
              {/* Column 1: Config Form */}
              <form 
                onSubmit={handleCreatePipelineSubmit} 
                className="p-6 space-y-4 flex flex-col justify-between font-sans"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">Pipeline Label *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Student Visa Admissions"
                      value={newPipelineName}
                      onChange={(e) => setNewPipelineName(e.target.value)}
                      className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5 flex justify-between items-center">
                      <span>Custom Steps (Stages) *</span>
                      <button
                        type="button"
                        onClick={handleAddStageInput}
                        className="text-[#2563EB] hover:text-[#1D4ED8] text-[10px] font-bold uppercase tracking-wider focus:outline-none"
                      >
                        + Add Step
                      </button>
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {newStages.map((stageVal, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#999999] w-4 text-center">{index + 1}</span>
                          <input
                            type="text"
                            required
                            placeholder={`Stage e.g. Step ${index + 1}`}
                            value={stageVal}
                            onChange={(e) => handleStageInputChange(index, e.target.value)}
                            className="flex-1 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-8 px-2 focus:outline-none"
                          />
                          
                          {/* Re-ordering up/down stage buttons */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveNewStage(index, "up")}
                              disabled={index === 0}
                              className="text-[#666666] hover:bg-[#F7F7F7] border border-[#E5E5E5] rounded-[4px] px-1 py-0.5 text-[9px] disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move stage up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveNewStage(index, "down")}
                              disabled={index === newStages.length - 1}
                              className="text-[#666666] hover:bg-[#F7F7F7] border border-[#E5E5E5] rounded-[4px] px-1 py-0.5 text-[9px] disabled:opacity-30 disabled:hover:bg-transparent"
                              title="Move stage down"
                            >
                              ↓
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveStageInput(index)}
                            disabled={newStages.length <= 1}
                            className="text-[#DC2626] hover:bg-[#DC2626]/5 disabled:opacity-30 p-1 rounded-[4px] focus:outline-none text-xs shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Automated Smart Filters Configuration */}
                  <div className="pt-3 border-t border-[#E5E5E5] space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="smart-filter-toggle"
                        checked={useFilter}
                        onChange={(e) => setUseFilter(e.target.checked)}
                        className="rounded text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                      />
                      <label htmlFor="smart-filter-toggle" className="text-[11px] font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none">
                        <Filter className="h-3.5 w-3.5 text-[#2563EB]" /> Automated Smart Filter
                      </label>
                    </div>

                    {useFilter && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div>
                          <label className="block text-[10px] font-bold text-[#666666] mb-1">Filter Custom Parameter Field</label>
                          <select
                            value={filterFieldId}
                            onChange={(e) => {
                              setFilterFieldId(e.target.value);
                              setFilterFieldValue("");
                            }}
                            className="w-full h-8 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-2 focus:outline-none"
                            required={useFilter}
                          >
                            <option value="">Select custom field...</option>
                            {customFieldDefs
                              .filter((d) => d.type === "DROPDOWN")
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        {filterFieldId && activeFilterOptions.length > 0 && (
                          <div>
                            <label className="block text-[10px] font-bold text-[#666666] mb-1">Require Field Option Value</label>
                            <select
                              value={filterFieldValue}
                              onChange={(e) => setFilterFieldValue(e.target.value)}
                              className="w-full h-8 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-2 focus:outline-none"
                              required={useFilter}
                            >
                              <option value="">Select value...</option>
                              {activeFilterOptions.map((opt: string) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setIsPipelineModalOpen(false)}
                    type="button"
                    className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-4 rounded-[6px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={createPipelineMutation.isPending}
                    className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8]"
                  >
                    {createPipelineMutation.isPending ? "Creating..." : "Establish Pipeline"}
                  </Button>
                </div>
              </form>

              {/* Column 2: 💡 Smart CRM Intake Guidelines */}
              <div className="p-6 bg-[#FAFAFA] flex flex-col justify-between select-none">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E5E5E5] pb-2">
                    <Sparkles className="h-4 w-4 text-[#2563EB]" /> Smart Filters & Automation
                  </h4>

                  <div className="space-y-3.5 text-xs text-[#666666] leading-relaxed font-sans">
                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">🔗 What is a Pipeline?</span>
                      <p className="mt-1">
                        A Pipeline acts as a visual Kanban board workflow representational map for custom operational layers (e.g. Sales stages, Visa applications steps, Flat rental coordinates).
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">⚙️ How do Smart Filters work?</span>
                      <p className="mt-1">
                        When enabled, Smart Filters automatically link contact records to this pipeline! Any contact matching the parameter (e.g. Custom Field dropdown *"Course"* is *"MBA"*) is mapped instantly onto this board dynamically.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">⚡ Re-order Stages Flexibility</span>
                      <p className="mt-1">
                        Use the **↑ (Up)** and **↓ (Down)** arrows to custom order stages. Stage orders dictate the left-to-right columns sequence on your workspace board so that operational value flows sequentially!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#E5E5E5] pt-3 text-[10px] text-[#999999] leading-snug font-medium">
                  💡 Tip: AI Voice intake workers dynamically parse voice call transcript outcomes to map customer records cleanly onto matching pipeline stages!
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EDIT DYNAMIC PIPELINE MODAL WITH SOFT-DELETION & STAGES RE-ORDERING */}
      {isEditOpen && activePipeline && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-2xl max-w-2xl w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="h-4.5 w-4.5 text-[#2563EB]" /> Configure Pipeline: {activePipeline.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5] min-h-[400px]">
              {/* Left Column: Edit Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editPipelineName.trim() || editStages.length === 0) {
                    toast.error("Pipeline name and at least one stage are required");
                    return;
                  }
                  const filters = editUseFilter && editFilterFieldId && editFilterFieldValue
                    ? [{ fieldDefinitionId: editFilterFieldId, value: editFilterFieldValue }]
                    : null;
                  updatePipelineMutation.mutate({
                    id: activePipeline.id,
                    name: editPipelineName.trim(),
                    stages: editStages.filter(Boolean),
                    filters,
                  });
                }}
                className="p-6 space-y-4 flex flex-col justify-between font-sans"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5">Pipeline Label *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sales Pipeline"
                      value={editPipelineName}
                      onChange={(e) => setEditPipelineName(e.target.value)}
                      className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#111111] mb-1.5 flex justify-between items-center">
                      <span>Custom Steps (Stages) *</span>
                      <button
                        type="button"
                        onClick={() => setEditStages([...editStages, `Step ${editStages.length + 1}`])}
                        className="text-[#2563EB] hover:text-[#1D4ED8] text-[10px] font-bold uppercase tracking-wider focus:outline-none"
                      >
                        + Add Step
                      </button>
                    </label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {editStages.map((stageVal, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#999999] w-4 text-center">{index + 1}</span>
                          <input
                            type="text"
                            required
                            placeholder={`Stage Name`}
                            value={stageVal}
                            onChange={(e) => {
                              const updated = [...editStages];
                              updated[index] = e.target.value;
                              setEditStages(updated);
                            }}
                            className="flex-1 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-8 px-2.5 focus:outline-none"
                          />
                          
                          {/* Re-ordering arrows */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveEditStage(index, "up")}
                              disabled={index === 0}
                              className="text-[#666666] hover:bg-[#F7F7F7] border border-[#E5E5E5] rounded-[4px] px-1 py-0.5 text-[9px] disabled:opacity-30 disabled:hover:bg-transparent animate-in fade-in-50"
                              title="Move stage up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveEditStage(index, "down")}
                              disabled={index === editStages.length - 1}
                              className="text-[#666666] hover:bg-[#F7F7F7] border border-[#E5E5E5] rounded-[4px] px-1 py-0.5 text-[9px] disabled:opacity-30 disabled:hover:bg-transparent animate-in fade-in-50"
                              title="Move stage down"
                            >
                              ↓
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = editStages.filter((_, idx) => idx !== index);
                              setEditStages(updated);
                            }}
                            disabled={editStages.length <= 1}
                            className="text-[#DC2626] hover:bg-[#DC2626]/5 disabled:opacity-30 p-1 rounded-[4px] focus:outline-none text-xs shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Smart Filters Configuration */}
                  <div className="pt-3 border-t border-[#E5E5E5] space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="edit-smart-filter-toggle"
                        checked={editUseFilter}
                        onChange={(e) => setEditUseFilter(e.target.checked)}
                        className="rounded text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                      />
                      <label htmlFor="edit-smart-filter-toggle" className="text-[11px] font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none">
                        <Filter className="h-3.5 w-3.5 text-[#2563EB]" /> Automated Smart Filter
                      </label>
                    </div>

                    {editUseFilter && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div>
                          <label className="block text-[10px] font-bold text-[#666666] mb-1">Filter Custom Parameter Field</label>
                          <select
                            value={editFilterFieldId}
                            onChange={(e) => {
                              setEditFilterFieldId(e.target.value);
                              setEditFilterFieldValue("");
                            }}
                            className="w-full h-8 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-2 focus:outline-none"
                            required={editUseFilter}
                          >
                            <option value="">Select custom field...</option>
                            {customFieldDefs
                              .filter((d) => d.type === "DROPDOWN")
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                          </select>
                        </div>

                        {editFilterFieldId && activeEditFilterOptions.length > 0 && (
                          <div>
                            <label className="block text-[10px] font-bold text-[#666666] mb-1">Require Field Option Value</label>
                            <select
                              value={editFilterFieldValue}
                              onChange={(e) => setEditFilterFieldValue(e.target.value)}
                              className="w-full h-8 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-2 focus:outline-none"
                              required={editUseFilter}
                            >
                              <option value="">Select value...</option>
                              {activeEditFilterOptions.map((opt: string) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                 {/* Submissions Action Buttons + Delete Pipeline Trigger */}
                <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-between gap-3 font-sans">
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmType("pipeline");
                      setDeleteConfirmId(activePipeline.id);
                      setDeleteConfirmTitle(activePipeline.name);
                      setDeleteConfirmOpen(true);
                      setIsEditOpen(false);
                    }}
                    disabled={deletePipelineMutation.isPending}
                    className="text-xs font-bold text-[#DC2626] hover:bg-[#DC2626]/10 px-3 h-9 rounded-[6px] border border-transparent transition-colors focus:outline-none disabled:opacity-30"
                  >
                    Delete Pipeline
                  </button>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditOpen(false)}
                      type="button"
                      className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-4 rounded-[6px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={updatePipelineMutation.isPending}
                      className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8]"
                    >
                      {updatePipelineMutation.isPending ? "Updating..." : "Save Settings"}
                    </Button>
                  </div>
                </div>
              </form>

              {/* Right Column: Guidance Panel */}
              <div className="p-6 bg-[#FAFAFA] flex flex-col justify-between select-none">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E5E5E5] pb-2">
                    <Sparkles className="h-4 w-4 text-[#2563EB]" /> Smart Pipeline Settings
                  </h4>

                  <div className="space-y-3.5 text-xs text-[#666666] leading-relaxed font-sans">
                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">🔁 Re-order and Re-sequence</span>
                      <p className="mt-1">
                        Click the **↑ (Up)** and **↓ (Down)** arrows to custom re-sequence stages. This dictates the columns structure dynamically without breaking legacy active deal maps.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">💡 Smart Filters Concept</span>
                      <p className="mt-1">
                        Dynamically maps incoming contact records matching custom parameters (e.g. dropdown properties). AI receptionist outcomes push deals dynamically to these stages as classifications occur!
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">🛡️ Safe Deletion Mappings</span>
                      <p className="mt-1">
                        Deleting this pipeline automatically maps legacy deals back to baseline default stages. Zero database orphans or lost revenue opportunities!
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#E5E5E5] pt-3 text-[10px] text-[#999999] leading-snug font-medium">
                  💡 Tip: Maintain structured steps in your stages mapping so voice receptionists classify calls with 100% intent precision.
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EDIT OPPORTUNITY RECORD POPUP DIALOG */}
      {isEditDealOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-2xl max-w-2xl w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="h-4.5 w-4.5 text-[#2563EB]" /> Edit Opportunity Record
              </h3>
              <button
                type="button"
                onClick={() => setIsEditDealOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none text-sm"
              >
                ✕
              </button>
            </div>

            {/* Split layout: Form on left, guidance tips on right */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E5E5E5]">
              
              {/* Form Input fields */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editDealTitle.trim() || !editDealValue.trim() || !editDealStage) {
                    toast.error("Title, estimated value, and stage are required");
                    return;
                  }
                  updateDealMutation.mutate({
                    id: editDealId,
                    title: editDealTitle.trim(),
                    value: Number(editDealValue),
                    stage: editDealStage,
                  });
                }} 
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">Opportunity Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium Deal onboarding"
                    value={editDealTitle}
                    onChange={(e) => setEditDealTitle(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">Estimated Value (Rs.) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="e.g. 50000"
                    value={editDealValue}
                    onChange={(e) => setEditDealValue(e.target.value)}
                    className="w-full bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] placeholder-[#999999] rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1.5">Pipeline Stage Mapping *</label>
                  <select
                    value={editDealStage}
                    onChange={(e) => setEditDealStage(e.target.value)}
                    className="w-full h-9 bg-white border border-[#E5E5E5] focus:border-[#2563EB] text-xs text-[#111111] rounded-[6px] px-3 focus:outline-none"
                    required
                  >
                    {STAGES.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditDealOpen(false)}
                    type="button"
                    className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-4 rounded-[6px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={updateDealMutation.isPending}
                    className="bg-[#2563EB] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#1D4ED8]"
                  >
                    {updateDealMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>

              {/* Complete Onboarding Guide & Tips */}
              <div className="p-6 bg-[#FAFAFA] flex flex-col justify-between select-none">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-[#111111] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#E5E5E5] pb-2">
                    <Sparkles className="h-4 w-4 text-[#2563EB]" /> Deal Tracking Strategy
                  </h4>

                  <div className="space-y-3.5 text-xs text-[#666666] leading-relaxed">
                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">📈 Real-time Value Updates</span>
                      <p className="mt-1">
                        Editing the estimated value instantly recalculates stage-wide metrics across your current Kanban workspace, giving management live pipeline forecasts.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">⚡ Action Trigger stage shift</span>
                      <p className="mt-1">
                        Selecting a new stage maps this deal instantly to that stage column. Moving cards might trigger automated voice or text receptionist sequences immediately.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[#111111] text-[11px] block">🛡️ Audit Feeds Aggregation</span>
                      <p className="mt-1">
                        Every title or stage modification publishes an automated activity item directly inside the contact's unified timeline feed, keeping histories clean.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-[#E5E5E5] pt-3 text-[10px] text-[#999999] leading-snug font-medium">
                  💡 Tip: Stage updates automatically sync across collaborative users in real-time.
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* UNIFIED CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-white border border-[#E5E5E5] rounded-[6px] shadow-2xl max-w-md w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-[#E5E5E5] px-6 flex items-center justify-between bg-[#FAFAFA] select-none">
              <h3 className="text-xs font-bold text-[#DC2626] uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-[#DC2626]" /> 
                {deleteConfirmType === "deal" ? "Remove Pipeline Record" : "Delete Pipeline Workspace"}
              </h3>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="text-[#666666] hover:text-[#111111] focus:outline-none text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-[#666666] leading-relaxed">
                {deleteConfirmType === "deal" ? (
                  <p>
                    Are you sure you want to permanently delete the pipeline record <strong className="text-[#111111]">"{deleteConfirmTitle}"</strong>?
                    This action will remove it from your Kanban board and contact timeline. This cannot be undone.
                  </p>
                ) : (
                  <p>
                    ⚠️ <strong className="text-[#DC2626]">WARNING:</strong> Are you sure you want to permanently delete the pipeline <strong className="text-[#111111]">"{deleteConfirmTitle}"</strong>?
                    All associated deals will safely revert to default backward-compatible stages. This cannot be undone.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-[#E5E5E5] flex items-center justify-end gap-3 select-none">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirmOpen(false)}
                  type="button"
                  className="border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] text-[#111111] font-semibold text-xs h-9 px-4 rounded-[6px]"
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    if (deleteConfirmType === "deal") {
                      deleteDealMutation.mutate(deleteConfirmId);
                    } else {
                      deletePipelineMutation.mutate(deleteConfirmId);
                    }
                    setDeleteConfirmOpen(false);
                  }}
                  className="bg-[#DC2626] text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-[#B91C1C] transition-colors focus:outline-none flex items-center justify-center animate-in fade-in"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
