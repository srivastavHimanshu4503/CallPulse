import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../../../lib/axios.js";
import {
  Plus,
  ArrowLeft,
  ArrowRight,
  Layers,
  FolderKanban,
  Sparkles,
  Filter,
  Trash2,
  AlertTriangle,
  Search,
  Settings,
} from "lucide-react";
import { Button } from "@antigravity/ui";
import { toast } from "sonner";
import { FilterLogicalOperator, FilterOperator } from "@antigravity/types";
import type { FilterCondition } from "@antigravity/types";
import { PipelineSettingsModal } from "./PipelineSettingsModal.js";

interface PipelineTabProps {
  contacts: any[];
  refetchContacts: () => void;
  customFieldDefs?: any[];
}

export function PipelineTab({
  contacts,
  refetchContacts,
  customFieldDefs = [],
}: PipelineTabProps): React.JSX.Element {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isPipelineModalOpen, setIsPipelineModalOpen] = React.useState(false);

  // Custom pipelines queries
  const {
    data: pipelines = [],
    isLoading: isPipelinesLoading,
    refetch: refetchPipelines,
  } = useQuery({
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
  const [newDealPriority, setNewDealPriority] = React.useState("MEDIUM");
  const [newDealExpectedClose, setNewDealExpectedClose] = React.useState("");

  // Sync default stage when STAGES change
  React.useEffect(() => {
    if (STAGES.length > 0) {
      setStage(STAGES[0]);
    }
  }, [STAGES]);

  // Pipeline create/edit modal open state — the modal owns its own form state
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  // Opportunity Record Edit Modal states
  const [isEditDealOpen, setIsEditDealOpen] = React.useState(false);
  const [editDealId, setEditDealId] = React.useState("");
  const [editDealTitle, setEditDealTitle] = React.useState("");
  const [editDealValue, setEditDealValue] = React.useState("");
  const [editDealStage, setEditDealStage] = React.useState("");
  const [editDealProbability, setEditDealProbability] = React.useState("");
  // What was loaded when the modal opened — probability is only submitted
  // when the user actually edits it, otherwise a stage change would wrongly
  // convert an AUTO probability into a MANUAL override.
  const editDealProbabilityInitial = React.useRef("");
  const [editDealProbabilitySource, setEditDealProbabilitySource] = React.useState("AUTO");
  const [editDealPriority, setEditDealPriority] = React.useState("MEDIUM");
  const [editDealExpectedClose, setEditDealExpectedClose] = React.useState("");
  const [editDealNextFollowUp, setEditDealNextFollowUp] = React.useState("");

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
  const [filterOperator, setFilterOperator] = React.useState<FilterLogicalOperator>(
    FilterLogicalOperator.AND,
  );
  const [isFilterBuilderOpen, setIsFilterBuilderOpen] = React.useState(false);
  const [visibleLimits, setVisibleLimits] = React.useState<Record<string, number>>({});

  // 1. Fetch Deals
  const {
    data: deals = [],
    isLoading: isDealsLoading,
    refetch: refetchDeals,
  } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const res = await api.get("/crm/deals");
      return res.data.data as any[];
    },
  });

  // Server-computed pipeline statistics (spec: single source of truth for
  // forecasting numbers — never recompute weighted revenue client-side).
  const { data: pipelineStats, refetch: refetchStats } = useQuery({
    queryKey: ["pipeline-stats", activePipeline?.id],
    queryFn: async () => {
      const res = await api.get(`/crm/pipelines/${activePipeline!.id}/stats`);
      return res.data.data;
    },
    enabled: !!activePipeline?.id,
  });

  // Structured stage configs (color, probability, won/lost) keyed by name.
  const stageCfgByName = React.useMemo(() => {
    const m: Record<string, any> = {};
    (activePipeline?.stageConfigs || []).forEach((s: any) => {
      m[s.name] = s;
    });
    return m;
  }, [activePipeline]);

  // Filter deals belonging to the active pipeline (including legacy deals for default pipeline)
  // Plus dynamic smart filter application based on the Pipeline's custom field configuration!
  // And live user interactive filters (search, sorting, min value threshold)!
  const filteredDeals = React.useMemo(() => {
    if (!activePipeline) return [];

    // 1. Filter by pipeline ID matching (or legacy deals matching default)
    let result = deals.filter(
      (d: any) =>
        d.pipelineId === activePipeline.id ||
        (d.pipelineId === null && activePipeline.name === "Sales Pipeline"),
    );

    // 2. Apply Custom Smart Filters if set on this pipeline definition
    if (activePipeline.filters && activePipeline.filters.length > 0) {
      result = result.filter((d: any) => {
        const contactObj = contacts.find((c) => c.id === d.contactId);
        if (!contactObj) return false;

        // Verify if contact matches every active filter
        return activePipeline.filters.every((filter: any) => {
          const matchField = contactObj.customFields?.find(
            (cf: any) => cf.fieldDefinitionId === filter.fieldDefinitionId,
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
          String(d.title || "")
            .toLowerCase()
            .includes(q) ||
          String(d.contactName || "")
            .toLowerCase()
            .includes(q),
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
            actualVal =
              d.contactName || (contactObj ? `${contactObj.firstName} ${contactObj.lastName}` : "");
          } else if (cond.fieldId === "contactEmail") {
            actualVal = contactObj?.emails?.[0] || "";
          } else if (cond.fieldId === "contactPhone") {
            actualVal = contactObj?.phones?.[0] || "";
          } else {
            // Retrieve dynamic custom fields from linked contact
            if (!contactObj) return false;
            const valObj = contactObj.customFields?.find(
              (cf: any) => cf.fieldDefinitionId === cond.fieldId,
            );
            if (valObj) {
              actualVal =
                valObj.textValue ??
                valObj.numberValue ??
                valObj.booleanValue ??
                valObj.dateValue ??
                "";
            }
          }

          const condVal = cond.value;

          // Operators
          switch (cond.operator) {
            case FilterOperator.CONTAINS:
              return String(actualVal || "")
                .toLowerCase()
                .includes(String(condVal).toLowerCase());
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
      result.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      );
    }

    return result;
  }, [
    deals,
    activePipeline,
    contacts,
    dealSearchQuery,
    dealSortBy,
    filterConditions,
    filterOperator,
  ]);

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
        if (
          fieldId === "value" ||
          customFieldDefs.find((f) => f.id === fieldId)?.type === "NUMBER"
        ) {
          defaultOp = FilterOperator.GREATER_THAN_OR_EQUAL;
        } else if (
          fieldId === "createdAt" ||
          customFieldDefs.find((f) => f.id === fieldId)?.type === "DATE"
        ) {
          defaultOp = FilterOperator.IS_AFTER;
        } else if (
          customFieldDefs.find((f) => f.id === fieldId)?.type === "BOOLEAN" ||
          customFieldDefs.find((f) => f.id === fieldId)?.type === "DROPDOWN"
        ) {
          defaultOp = FilterOperator.EQUALS;
        }
        return {
          ...c,
          fieldId,
          operator: defaultOp,
          value: "",
        };
      }),
    );
  };

  const handleOperatorChange = (id: string, operator: FilterOperator): void => {
    setFilterConditions((prev) => prev.map((c) => (c.id === id ? { ...c, operator } : c)));
  };

  const handleValueChange = (id: string, value: string): void => {
    setFilterConditions((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)));
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
      refetchStats();
      setIsAddOpen(false);
      setTitle("");
      setValue("");
      setContactId("");
      setNewDealPriority("MEDIUM");
      setNewDealExpectedClose("");
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
      refetchStats();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to shift stage");
    },
  });

  // Reset a manual probability override back to the stage default
  const resetProbabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/crm/deals/${id}/probability/reset`, {});
      return res.data.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Probability reset to stage default (${data.probability}%)`);
      setEditDealProbability(String(data.probability));
      setEditDealProbabilitySource("AUTO");
      refetchDeals();
      refetchStats();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to reset probability");
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
      refetchStats();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to remove pipeline record");
    },
  });

  // Update Deal Mutation
  const updateDealMutation = useMutation({
    mutationFn: async (payload: { id: string } & Record<string, unknown>) => {
      const { id, ...body } = payload;
      const res = await api.put(`/crm/deals/${id}`, body);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully updated opportunity: "${data.title}"`);
      refetchDeals();
      refetchContacts();
      refetchStats();
      setIsEditDealOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update opportunity");
    },
  });

  const handleMoveDeal = (dealId: string, targetStage: string) => {
    moveDealMutation.mutate({ id: dealId, stage: targetStage });
  };

  // Pipeline create/update/delete mutations are now owned by PipelineSettingsModal.

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
      priority: newDealPriority,
      expectedCloseDate: newDealExpectedClose || null,
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

  const isLoading = isPipelinesLoading || isDealsLoading;

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans">
      {/* Toolbar — one compact row so the board gets maximum space */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0 mb-2 select-none">
        {pipelines.length > 0 && (
          <>
            <select
              value={activePipelineId}
              onChange={(e) => setActivePipelineId(e.target.value)}
              className="h-9 bg-bg-raised border border-line-default text-[13px] font-semibold text-fg-primary rounded-md pl-3 pr-8 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 cursor-pointer shadow-card max-w-[220px] truncate"
              title="Switch pipeline"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.filters && p.filters.length > 0 ? "  ·  auto" : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                if (activePipeline) setIsEditOpen(true);
              }}
              className="h-9 w-9 rounded-md border border-line-default bg-bg-raised text-fg-secondary hover:text-fg-primary hover:bg-bg-muted flex items-center justify-center transition-colors"
              title="Pipeline settings — stages, probabilities, colors"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsPipelineModalOpen(true)}
          className="h-9 w-9 rounded-md border border-dashed border-line-default bg-bg-raised text-fg-secondary hover:text-brand-600 hover:border-brand-500/40 flex items-center justify-center transition-colors"
          title="New pipeline"
        >
          <Plus className="h-4 w-4" />
        </button>

        <div className="h-5 w-px bg-line-default mx-1 hidden sm:block" />

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
          <input
            type="text"
            placeholder="Search deals or contacts…"
            value={dealSearchQuery}
            onChange={(e) => setDealSearchQuery(e.target.value)}
            className="w-full bg-bg-raised border border-line-default focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 text-[12px] text-fg-primary placeholder-fg-muted rounded-md h-9 pl-8 pr-3 focus:outline-none"
          />
        </div>

        {/* Filters (drawer) */}
        <button
          type="button"
          onClick={() => setIsFilterBuilderOpen(true)}
          className={`h-9 px-2.5 rounded-md border text-[12px] font-semibold flex items-center gap-1.5 transition-colors focus:outline-none ${
            filterConditions.length > 0
              ? "border-brand-500 text-brand-700 bg-brand-50"
              : "border-line-default bg-bg-raised text-fg-secondary hover:text-fg-primary"
          }`}
          title="Advanced filters"
        >
          <Filter className="h-3.5 w-3.5" />
          {filterConditions.length > 0 && (
            <span className="bg-brand-500 text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
              {filterConditions.length}
            </span>
          )}
        </button>

        {/* Sort */}
        <select
          value={dealSortBy}
          onChange={(e) => setDealSortBy(e.target.value)}
          className="h-9 bg-bg-raised border border-line-default text-[12px] font-semibold text-fg-secondary rounded-md px-2 focus:outline-none focus:border-brand-500 cursor-pointer"
          title="Sort deals"
        >
          <option value="value-desc">Value ↓</option>
          <option value="value-asc">Value ↑</option>
          <option value="title-asc">Title A–Z</option>
          <option value="created-newest">Newest</option>
        </select>

        <div className="flex-1 hidden md:block" />

        <Button
          variant="primary"
          onClick={() => {
            if (STAGES.length > 0) setStage(STAGES[0]);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-card border-none"
        >
          <Plus className="h-3.5 w-3.5" /> Add deal
        </Button>
      </div>

      {/* Pipeline statistics — one quiet line, server-computed */}
      {pipelineStats?.header && (
        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-[11px] font-medium text-fg-secondary bg-bg-raised border border-line-default rounded-md px-3 py-1.5 mb-2 shrink-0 select-none overflow-x-auto whitespace-nowrap">
          <span className="inline-flex items-center gap-1 text-brand-700 font-bold uppercase tracking-wide text-[9.5px]">
            <Sparkles className="h-3 w-3" /> Live forecast
          </span>
          {[
            { label: "Open", value: pipelineStats.header.openDeals },
            { label: "Won", value: pipelineStats.header.wonDeals, tone: "text-positive-600" },
            { label: "Lost", value: pipelineStats.header.lostDeals, tone: "text-negative-500" },
            {
              label: "Value",
              value: `₹${Math.round(pipelineStats.header.pipelineValue).toLocaleString("en-IN")}`,
            },
            {
              label: "Weighted",
              value: `₹${Math.round(pipelineStats.header.weightedRevenue).toLocaleString("en-IN")}`,
            },
            { label: "Win rate", value: `${pipelineStats.header.winRate}%` },
            { label: "Avg cycle", value: `${pipelineStats.header.avgSalesCycleDays}d` },
            { label: "Closing this month", value: pipelineStats.header.closingThisMonth },
          ].map((stat) => (
            <span key={stat.label} className="inline-flex items-baseline gap-1">
              <span className="text-fg-muted">{stat.label}</span>
              <span className={`font-bold text-[12px] ${(stat as any).tone || "text-fg-primary"}`}>
                {stat.value}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* HubSpot-style Advanced Filters Right Slide-Over Drawer */}
      {isFilterBuilderOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans select-none animate-in fade-in duration-150">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#111111]/30 backdrop-blur-[1px]"
            onClick={() => setIsFilterBuilderOpen(false)}
          />

          {/* Drawer Container */}
          <div className="absolute inset-y-0 right-0 w-full md:w-[480px] bg-bg-raised border-l border-border flex flex-col h-full overflow-hidden shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="h-14 border-b border-border px-6 bg-bg-raised flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Filter className="h-4.5 w-4.5 text-brand-600" />
                <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Advanced Filters ({filterConditions.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterBuilderOpen(false)}
                className="text-text-secondary hover:text-text-primary focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* Drawer Body - scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                  Matching Logic
                </label>
                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value as FilterLogicalOperator)}
                  className="w-full h-9 bg-bg-raised border border-border focus:border-brand-500 text-xs font-bold text-text-primary rounded-[6px] px-3 focus:outline-none cursor-pointer"
                >
                  <option value={FilterLogicalOperator.AND}>ALL conditions must match (AND)</option>
                  <option value={FilterLogicalOperator.OR}>ANY condition can match (OR)</option>
                </select>
                <p className="text-[10px] text-text-placeholder mt-1 font-medium leading-normal">
                  Connect multiple logical filters dynamically to refine your CRM pipelines view.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                    Filter Rules
                  </span>
                </div>

                {filterConditions.length === 0 ? (
                  <div className="py-12 border border-dashed border-border rounded-[6px] text-center text-xs text-text-placeholder px-4">
                    No active rules configured. Click "+ Add Rule" below to start filtering your
                    pipeline deals.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filterConditions.map((cond, idx) => {
                      const availableOps = getAvailableOperators(cond.fieldId);
                      const isValHidden =
                        cond.operator === FilterOperator.IS_EMPTY ||
                        cond.operator === FilterOperator.IS_NOT_EMPTY;
                      const customDef = customFieldDefs.find((f) => f.id === cond.fieldId);

                      return (
                        <div
                          key={cond.id}
                          className="border border-border rounded-[6px] p-3 space-y-3 bg-bg-raised hover:border-brand-500/25 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-text-placeholder uppercase">
                              {idx === 0 ? "Where Rule" : `Connector: ${filterOperator}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeCondition(cond.id)}
                              className="text-negative-500 hover:bg-negative-500/5 rounded-[4px] p-1 transition-colors"
                              title="Delete Rule"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="space-y-2.5">
                            {/* Field Selector */}
                            <div>
                              <label className="block text-[9px] font-bold text-text-placeholder uppercase tracking-wider mb-1">
                                Field
                              </label>
                              <select
                                value={cond.fieldId}
                                onChange={(e) => handleFieldChange(cond.id, e.target.value)}
                                className="w-full h-8 bg-bg-raised border border-border text-xs text-text-primary rounded-[6px] px-2.5 focus:outline-none focus:border-brand-500 cursor-pointer"
                              >
                                <option value="title">Deal Title</option>
                                <option value="value">Deal Estimated Value (Rs.)</option>
                                <option value="createdAt">Deal Created Date</option>
                                <option value="stage">Pipeline Stage</option>
                                <option value="contactName">Linked Contact Name</option>
                                <option value="contactEmail">Linked Contact Email</option>
                                <option value="contactPhone">Linked Contact Phone</option>
                                {customFieldDefs.map((cf) => (
                                  <option key={cf.id} value={cf.id}>
                                    {cf.name} (Contact Custom)
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Operator Selector */}
                            <div>
                              <label className="block text-[9px] font-bold text-text-placeholder uppercase tracking-wider mb-1">
                                Condition
                              </label>
                              <select
                                value={cond.operator}
                                onChange={(e) =>
                                  handleOperatorChange(cond.id, e.target.value as FilterOperator)
                                }
                                className="w-full h-8 bg-bg-raised border border-border text-xs text-text-primary rounded-[6px] px-2.5 focus:outline-none focus:border-brand-500 cursor-pointer"
                              >
                                {availableOps.map((op) => (
                                  <option key={op.value} value={op.value}>
                                    {op.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Value Selector/Input */}
                            {!isValHidden && (
                              <div>
                                <label className="block text-[9px] font-bold text-text-placeholder uppercase tracking-wider mb-1">
                                  Value
                                </label>
                                {customDef?.type === "DROPDOWN" ? (
                                  <select
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-bg-raised border border-border text-xs text-text-primary rounded-[6px] px-2.5 focus:outline-none focus:border-brand-500 cursor-pointer"
                                  >
                                    <option value="">Select option...</option>
                                    {customDef.options?.map((opt: string) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : customDef?.type === "BOOLEAN" ? (
                                  <select
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-bg-raised border border-border text-xs text-text-primary rounded-[6px] px-2.5 focus:outline-none focus:border-brand-500 cursor-pointer"
                                  >
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                  </select>
                                ) : cond.fieldId === "createdAt" || customDef?.type === "DATE" ? (
                                  <input
                                    type="date"
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-bg-raised border border-border text-xs text-text-primary rounded-[6px] px-2.5 focus:outline-none focus:border-brand-500"
                                  />
                                ) : cond.fieldId === "value" || customDef?.type === "NUMBER" ? (
                                  <input
                                    type="number"
                                    placeholder="Enter threshold value..."
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-bg-raised border border-border text-xs text-text-primary rounded-[6px] px-2.5 focus:outline-none focus:border-brand-500"
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder="Match text..."
                                    value={cond.value}
                                    onChange={(e) => handleValueChange(cond.id, e.target.value)}
                                    className="w-full h-8 bg-bg-raised border border-border text-xs text-text-primary placeholder-text-placeholder rounded-[6px] px-2.5 focus:outline-none focus:border-brand-500"
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
            <div className="border-t border-border p-6 bg-bg-subtle flex items-center justify-between shrink-0">
              <Button
                variant="secondary"
                onClick={addCondition}
                className="border-border bg-bg-raised hover:bg-surface text-text-primary font-semibold text-xs h-9 px-4 rounded-[6px] flex items-center gap-1.5"
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
                    className="text-xs text-negative-500 font-bold hover:underline"
                  >
                    Clear All
                  </button>
                )}
                <Button
                  variant="primary"
                  onClick={() => setIsFilterBuilderOpen(false)}
                  className="bg-primary text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-primary-hover"
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
              <div
                key={idx}
                className="w-64 bg-bg-subtle border border-border rounded-[6px] shrink-0 p-4 animate-pulse h-48"
              />
            ))}
          </div>
        ) : STAGES.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-[6px] p-20 text-center">
            <FolderKanban className="h-10 w-10 text-text-placeholder mb-3" />
            <h4 className="text-sm font-bold text-text-primary">No Stages Defined for Pipeline</h4>
            <p className="text-xs text-text-secondary mt-1 max-w-sm">
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
                className="w-64 bg-bg-raised border border-border rounded-[6px] shrink-0 flex flex-col justify-between h-full"
              >
                {/* Stage Header */}
                <div
                  className="p-4 border-b border-border bg-bg-raised rounded-t-[6px] shrink-0 flex flex-col gap-0.5"
                  style={{ borderTop: `3px solid ${stageCfgByName[s]?.color || "#E5E5E5"}` }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider leading-none truncate pr-2 flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: stageCfgByName[s]?.color || "#999999" }}
                      />
                      {s}
                    </h4>
                    <div className="flex items-center gap-1">
                      {stageCfgByName[s] && (
                        <span
                          className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-brand-50 border border-brand-500/20 text-brand-600"
                          title="Stage default probability"
                        >
                          {stageCfgByName[s].probability}%
                        </span>
                      )}
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-text-secondary">
                        {list.length}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-text-placeholder font-bold tracking-wide uppercase mt-1">
                    Value:{" "}
                    <span className="text-text-primary font-semibold">
                      Rs. {sum.toLocaleString("en-IN")}
                    </span>
                    <span
                      className="text-text-placeholder font-medium normal-case ml-2"
                      title="Weighted revenue (value × probability)"
                    >
                      wtd. Rs.{" "}
                      {Math.round(
                        list.reduce((acc: number, d: any) => acc + (d.weightedValue || 0), 0),
                      ).toLocaleString("en-IN")}
                    </span>
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
                    <div className="h-full border border-dashed border-border rounded-[6px] flex flex-col items-center justify-center p-6 text-center text-text-placeholder">
                      <Layers className="h-6 w-6 text-text-placeholder/50 mb-2" />
                      <span className="text-[10px] font-medium leading-normal">
                        Shifts deal records here
                      </span>
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
                          setEditDealProbability(String(d.probability ?? ""));
                          editDealProbabilityInitial.current = String(d.probability ?? "");
                          setEditDealProbabilitySource(d.probabilitySource || "AUTO");
                          setEditDealPriority(d.priority || "MEDIUM");
                          setEditDealExpectedClose(
                            d.expectedCloseDate ? d.expectedCloseDate.slice(0, 10) : "",
                          );
                          setEditDealNextFollowUp(
                            d.nextFollowUpAt ? d.nextFollowUpAt.slice(0, 10) : "",
                          );
                          setIsEditDealOpen(true);
                        }}
                        className={`bg-bg-raised border rounded-[6px] p-3.5 space-y-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-brand-500/40 hover:shadow-[0_2px_8px_rgba(37,99,235,0.03)] cursor-pointer active:cursor-grabbing transition-all duration-200 ${
                          d.isOverdue
                            ? "border-negative-500/40 border-l-[3px] border-l-[#DC2626]"
                            : "border-border"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <h5 className="text-xs font-bold text-text-primary capitalize leading-snug">
                              {d.title}
                            </h5>
                            {d.leadSource === "AI Call" && (
                              <span
                                className="shrink-0 inline-flex items-center gap-0.5 text-[8.5px] font-bold uppercase tracking-wider rounded px-1 py-0.5 border text-indigo-600 bg-indigo-600/5 border-indigo-600/25"
                                title="Created automatically by your AI agent from a call"
                              >
                                <Sparkles className="h-2.5 w-2.5" />
                                AI
                              </span>
                            )}
                            {(d.priority === "URGENT" || d.priority === "HIGH") && (
                              <span
                                className={`shrink-0 text-[8.5px] font-bold uppercase tracking-wider rounded px-1 py-0.5 border ${
                                  d.priority === "URGENT"
                                    ? "text-negative-500 bg-negative-500/5 border-negative-500/25"
                                    : "text-orange-600 bg-orange-600/5 border-orange-600/25"
                                }`}
                              >
                                {d.priority}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-text-placeholder capitalize tracking-wide block mt-1">
                            Contact:{" "}
                            <span className="font-semibold text-text-secondary">
                              {d.contactName}
                            </span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold text-text-secondary">
                          <span
                            className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 bg-surface border border-border"
                            title={
                              d.probabilitySource === "MANUAL"
                                ? "Probability manually set"
                                : "Probability from stage default"
                            }
                          >
                            {d.probability ?? 0}%
                            {d.probabilitySource === "MANUAL" && (
                              <span className="text-brand-600">·M</span>
                            )}
                          </span>
                          <span title="Weighted revenue">
                            wtd. Rs. {Math.round(d.weightedValue || 0).toLocaleString("en-IN")}
                          </span>
                          {d.expectedCloseDate && (
                            <span title="Expected close date">
                              ⏱{" "}
                              {new Date(d.expectedCloseDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          )}
                          {d.isOverdue && (
                            <span className="text-negative-500 font-bold">Follow-up overdue</span>
                          )}
                        </div>

                        {(d.aiNextAction || d.aiSummary) && (
                          <div
                            className="flex items-start gap-1 text-[10px] text-text-secondary leading-snug border-t border-line-subtle pt-1.5"
                            title={d.aiSummary || undefined}
                          >
                            <Sparkles className="h-3 w-3 text-brand-600 shrink-0 mt-px" />
                            <span className="line-clamp-2">{d.aiNextAction || d.aiSummary}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between border-t border-line-subtle pt-2">
                          <span className="text-xs font-bold text-brand-600">
                            Rs. {d.value.toLocaleString("en-IN")}
                          </span>

                          {/* Click shifts stage controls and delete deal action */}
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteConfirmType("deal");
                                setDeleteConfirmId(d.id);
                                setDeleteConfirmTitle(d.title);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-negative-500 hover:bg-negative-500/10 border border-transparent rounded-[4px] p-1 transition-colors"
                              title="Remove record from pipeline"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShiftStage(d.id, d.stage, "left")}
                              disabled={STAGES.indexOf(d.stage) === 0}
                              className="text-text-secondary hover:bg-surface hover:text-text-primary border border-border rounded-[4px] p-1 disabled:opacity-30 disabled:hover:bg-transparent"
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleShiftStage(d.id, d.stage, "right")}
                              disabled={STAGES.indexOf(d.stage) === STAGES.length - 1}
                              className="text-text-secondary hover:bg-surface hover:text-text-primary border border-border rounded-[4px] p-1 disabled:opacity-30 disabled:hover:bg-transparent"
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
                      className="w-full py-2 bg-bg-raised hover:bg-bg-subtle border border-dashed border-border rounded-[6px] text-[10px] font-bold text-brand-600 uppercase tracking-wider transition-all select-none mt-2"
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
          <div className="bg-bg-raised border border-border rounded-[6px] shadow-2xl max-w-2xl w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-bg-subtle">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="h-4.5 w-4.5 text-brand-600" /> Register Pipeline Record
              </h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-text-secondary hover:text-text-primary focus:outline-none text-sm"
              >
                ✕
              </button>
            </div>

            {/* Split layout: Form on left, complete learning guides on right */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Form Input fields */}
              <form onSubmit={handleCreateDealSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Link Contact Record *
                  </label>
                  <select
                    value={contactId}
                    onChange={(e) => setContactId(e.target.value)}
                    className="w-full h-9 bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] px-3 focus:outline-none"
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
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Record Opportunity Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Drew Coleman onboarding track"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary placeholder-text-placeholder rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Estimated Value (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="e.g. 589900"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary placeholder-text-placeholder rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Initial Stage *
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full h-9 bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] px-3 focus:outline-none"
                    required
                  >
                    {STAGES.map((s: string) => (
                      <option key={s} value={s}>
                        {s}
                        {stageCfgByName[s] ? ` (${stageCfgByName[s].probability}%)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Priority
                    </label>
                    <select
                      value={newDealPriority}
                      onChange={(e) => setNewDealPriority(e.target.value)}
                      className="w-full h-9 bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] px-3 focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Expected Close
                    </label>
                    <input
                      type="date"
                      value={newDealExpectedClose}
                      onChange={(e) => setNewDealExpectedClose(e.target.value)}
                      className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] h-9 px-3 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setIsAddOpen(false)}
                    type="button"
                    className="border-border bg-bg-raised hover:bg-surface text-text-primary font-semibold text-xs h-9 px-4 rounded-[6px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={createDealMutation.isPending}
                    className="bg-primary text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-primary-hover"
                  >
                    {createDealMutation.isPending ? "Registering..." : "Create Record"}
                  </Button>
                </div>
              </form>

              {/* Complete Onboarding Guide & Tips */}
              <div className="p-6 bg-bg-subtle flex flex-col justify-between select-none">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2">
                    <Sparkles className="h-4 w-4 text-brand-600" /> Onboarding Guide & Tips
                  </h4>

                  <div className="space-y-3.5 text-xs text-text-secondary leading-relaxed">
                    <div>
                      <span className="font-bold text-text-primary text-[11px] block">
                        🔗 Why Link a Customer Profile?
                      </span>
                      <p className="mt-1">
                        Linking a contact profile aggregates this record on their **unified Activity
                        Timeline**. Every call transcript, Twilio receptionist recording, and note
                        merges cleanly into one dashboard.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-text-primary text-[11px] block">
                        💰 Estimated Value tracking
                      </span>
                      <p className="mt-1">
                        Represents the commercial or lifecycle value of this opportunity. Value
                        aggregates in real-time on columns to compute sales pipelines statistics
                        instantly.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-text-primary text-[11px] block">
                        ⚡ Automated AI Workflows
                      </span>
                      <p className="mt-1">
                        Moving records between columns automatically triggers background workflows!
                        AI receptionist agents perform callbacks, SMS engines dispatch alerts, and
                        custom API webhooks sync.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-3 text-[10px] text-text-placeholder leading-snug font-medium">
                  💡 Tip: Create custom pipelines under the "New Pipeline" button to configure smart
                  views matching your operational workflow.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create pipeline */}
      {isPipelineModalOpen && (
        <PipelineSettingsModal
          customFieldDefs={customFieldDefs}
          onClose={() => setIsPipelineModalOpen(false)}
          onSaved={(p) => {
            setIsPipelineModalOpen(false);
            refetchPipelines();
            setActivePipelineId(p.id);
          }}
        />
      )}

      {/* Edit pipeline */}
      {isEditOpen && activePipeline && (
        <PipelineSettingsModal
          pipeline={activePipeline}
          customFieldDefs={customFieldDefs}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => {
            setIsEditOpen(false);
            refetchPipelines();
            refetchContacts();
            refetchDeals();
          }}
          onDeleted={() => {
            setIsEditOpen(false);
            refetchPipelines().then((res) => {
              const list = (res.data as any[]) || [];
              setActivePipelineId(list.length > 0 ? list[0].id : "");
            });
            refetchContacts();
            refetchDeals();
          }}
        />
      )}

      {/* EDIT OPPORTUNITY RECORD POPUP DIALOG */}
      {isEditDealOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-[#111111]/30 backdrop-blur-[2px]">
          <div className="bg-bg-raised border border-border rounded-[6px] shadow-2xl max-w-2xl w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-bg-subtle">
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="h-4.5 w-4.5 text-brand-600" /> Edit Opportunity Record
              </h3>
              <button
                type="button"
                onClick={() => setIsEditDealOpen(false)}
                className="text-text-secondary hover:text-text-primary focus:outline-none text-sm"
              >
                ✕
              </button>
            </div>

            {/* Split layout: Form on left, guidance tips on right */}
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
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
                    probability:
                      editDealProbability !== "" &&
                      editDealProbability !== editDealProbabilityInitial.current
                        ? Number(editDealProbability)
                        : undefined,
                    priority: editDealPriority,
                    expectedCloseDate: editDealExpectedClose || null,
                    nextFollowUpAt: editDealNextFollowUp || null,
                  });
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Opportunity Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Premium Deal onboarding"
                    value={editDealTitle}
                    onChange={(e) => setEditDealTitle(e.target.value)}
                    className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary placeholder-text-placeholder rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Estimated Value (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    placeholder="e.g. 50000"
                    value={editDealValue}
                    onChange={(e) => setEditDealValue(e.target.value)}
                    className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary placeholder-text-placeholder rounded-[6px] h-9 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1.5">
                    Pipeline Stage Mapping *
                  </label>
                  <select
                    value={editDealStage}
                    onChange={(e) => setEditDealStage(e.target.value)}
                    className="w-full h-9 bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] px-3 focus:outline-none"
                    required
                  >
                    {STAGES.map((s: string) => (
                      <option key={s} value={s}>
                        {s}
                        {stageCfgByName[s] ? ` (${stageCfgByName[s].probability}%)` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Probability (%)
                      {editDealProbabilitySource === "MANUAL" && (
                        <span className="ml-1.5 text-[9px] font-bold text-brand-600 uppercase">
                          Manual
                        </span>
                      )}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editDealProbability}
                        onChange={(e) => setEditDealProbability(e.target.value)}
                        className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] h-9 px-3 focus:outline-none"
                      />
                      {editDealProbabilitySource === "MANUAL" && (
                        <button
                          type="button"
                          onClick={() => resetProbabilityMutation.mutate(editDealId)}
                          disabled={resetProbabilityMutation.isPending}
                          className="shrink-0 h-9 px-2 rounded-[6px] border border-border bg-bg-raised text-[10px] font-bold text-text-secondary hover:text-brand-600 hover:border-brand-500/40 transition-colors"
                          title="Reset to stage default probability"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Priority
                    </label>
                    <select
                      value={editDealPriority}
                      onChange={(e) => setEditDealPriority(e.target.value)}
                      className="w-full h-9 bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] px-3 focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Expected Close
                    </label>
                    <input
                      type="date"
                      value={editDealExpectedClose}
                      onChange={(e) => setEditDealExpectedClose(e.target.value)}
                      className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] h-9 px-3 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1.5">
                      Next Follow-up
                    </label>
                    <input
                      type="date"
                      value={editDealNextFollowUp}
                      onChange={(e) => setEditDealNextFollowUp(e.target.value)}
                      className="w-full bg-bg-raised border border-border focus:border-brand-500 text-xs text-text-primary rounded-[6px] h-9 px-3 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditDealOpen(false)}
                    type="button"
                    className="border-border bg-bg-raised hover:bg-surface text-text-primary font-semibold text-xs h-9 px-4 rounded-[6px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={updateDealMutation.isPending}
                    className="bg-primary text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-primary-hover"
                  >
                    {updateDealMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>

              {/* Complete Onboarding Guide & Tips */}
              <div className="p-6 bg-bg-subtle flex flex-col justify-between select-none">
                <div className="space-y-4">
                  <h4 className="text-[11px] font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border pb-2">
                    <Sparkles className="h-4 w-4 text-brand-600" /> Deal Tracking Strategy
                  </h4>

                  <div className="space-y-3.5 text-xs text-text-secondary leading-relaxed">
                    <div>
                      <span className="font-bold text-text-primary text-[11px] block">
                        📈 Real-time Value Updates
                      </span>
                      <p className="mt-1">
                        Editing the estimated value instantly recalculates stage-wide metrics across
                        your current Kanban workspace, giving management live pipeline forecasts.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-text-primary text-[11px] block">
                        ⚡ Action Trigger stage shift
                      </span>
                      <p className="mt-1">
                        Selecting a new stage maps this deal instantly to that stage column. Moving
                        cards might trigger automated voice or text receptionist sequences
                        immediately.
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-text-primary text-[11px] block">
                        🛡️ Audit Feeds Aggregation
                      </span>
                      <p className="mt-1">
                        Every title or stage modification publishes an automated activity item
                        directly inside the contact's unified timeline feed, keeping histories
                        clean.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-3 text-[10px] text-text-placeholder leading-snug font-medium">
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
          <div className="bg-bg-raised border border-border rounded-[6px] shadow-2xl max-w-md w-full overflow-hidden font-sans animate-in zoom-in-95 duration-150">
            <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-bg-subtle select-none">
              <h3 className="text-xs font-bold text-negative-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-negative-500" />
                {deleteConfirmType === "deal"
                  ? "Remove Pipeline Record"
                  : "Delete Pipeline Workspace"}
              </h3>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="text-text-secondary hover:text-text-primary focus:outline-none text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-text-secondary leading-relaxed">
                {deleteConfirmType === "deal" ? (
                  <p>
                    Are you sure you want to permanently delete the pipeline record{" "}
                    <strong className="text-text-primary">"{deleteConfirmTitle}"</strong>? This
                    action will remove it from your Kanban board and contact timeline. This cannot
                    be undone.
                  </p>
                ) : (
                  <p>
                    ⚠️ <strong className="text-negative-500">WARNING:</strong> Are you sure you want
                    to permanently delete the pipeline{" "}
                    <strong className="text-text-primary">"{deleteConfirmTitle}"</strong>? All
                    associated deals will safely revert to default backward-compatible stages. This
                    cannot be undone.
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-end gap-3 select-none">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirmOpen(false)}
                  type="button"
                  className="border-border bg-bg-raised hover:bg-surface text-text-primary font-semibold text-xs h-9 px-4 rounded-[6px]"
                >
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    // Pipeline delete now lives inside PipelineSettingsModal, so this
                    // confirmation only handles deal deletion.
                    if (deleteConfirmType === "deal") {
                      deleteDealMutation.mutate(deleteConfirmId);
                    }
                    setDeleteConfirmOpen(false);
                  }}
                  className="bg-negative-500 text-white font-semibold text-xs h-9 px-4 rounded-[6px] hover:bg-negative-600 transition-colors focus:outline-none flex items-center justify-center animate-in fade-in"
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
