import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/axios.js";
import {
  Plus,
  Filter,
  Trash2,
  Upload,
  Users,
  Star,
  X,
  Sparkles,
  Flame,
  PhoneCall,
  TrendingUp,
} from "lucide-react";
import { Button } from "@antigravity/ui";
import { toast } from "sonner";
import { FilterLogicalOperator } from "@antigravity/types";
import type { FilterCondition } from "@antigravity/types";
import { formatTimeAgo } from "@antigravity/utils";
import {
  DataTable,
  Pagination,
  SearchInput,
  StatusPill,
  EmptyState,
  Avatar,
  FilterBuilder,
  evaluateCondition,
  computeLeadScore,
  BAND_LABEL,
  BAND_TONE,
} from "../../../components/ui-ext/index.js";
import type { Column, FilterFieldDef } from "../../../components/ui-ext/index.js";
import { AddContactModal } from "./AddContactModal.js";
import { DeleteContactModal } from "./DeleteContactModal.js";
import { ImportContactsModal } from "./ImportContactsModal.js";

interface ContactsTabProps {
  contacts: any[];
  isLoading: boolean;
  refetch: () => void;
  customFields: any[];
}

export function ContactsTab({
  contacts,
  isLoading,
  refetch,
  customFields,
}: ContactsTabProps): React.JSX.Element {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [conditions, setConditions] = React.useState<FilterCondition[]>([]);
  const [logical, setLogical] = React.useState<FilterLogicalOperator>(FilterLogicalOperator.AND);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = React.useState(false);

  // One-click focus filters driven by the AI strip chips.
  const [quickBand, setQuickBand] = React.useState("all"); // all | hot | warm | cold
  const [quickSource, setQuickSource] = React.useState("all"); // all | ai | manual

  // Sort by any custom field: pick the field, then a type-aware direction
  // (Low→High for numbers, A→Z for text). Picklist/boolean fields are
  // excluded — simple ordering only makes sense for text and numbers.
  const [sortFieldId, setSortFieldId] = React.useState("");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const sortableFields = React.useMemo(
    () => customFields.filter((cf: any) => cf.type === "TEXT" || cf.type === "NUMBER"),
    [customFields],
  );
  const sortField = sortableFields.find((cf: any) => cf.id === sortFieldId);

  const quickActive = quickBand !== "all" || quickSource !== "all" || !!sortFieldId;
  const clearQuickFilters = () => {
    setQuickBand("all");
    setQuickSource("all");
    setSortFieldId("");
    setSortDir("asc");
  };

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);

  const enrichedContacts = React.useMemo(() => {
    return contacts.map((c) => ({
      ...c,
      _computedScore: computeLeadScore(c),
      _latestSentiment: c.latestSentiment,
    }));
  }, [contacts]);

  const filterFields: FilterFieldDef[] = React.useMemo(() => {
    const base: FilterFieldDef[] = [
      { id: "name", label: "Name", type: "text" },
      { id: "email", label: "Email", type: "text" },
      { id: "phone", label: "Phone", type: "text" },
      { id: "createdAt", label: "Created date", type: "date" },
      { id: "hasOpenDeals", label: "Has open deals", type: "select", options: ["yes", "no"] },
      { id: "score", label: "Lead score", type: "number" },
    ];
    for (const cf of customFields) {
      let t: FilterFieldDef["type"] = "text";
      if (cf.type === "NUMBER") t = "number";
      else if (cf.type === "DATE") t = "date";
      else if (cf.type === "BOOLEAN") t = "boolean";
      else if (cf.type === "DROPDOWN") t = "select";
      base.push({ id: cf.id, label: cf.name, type: t, options: cf.options });
    }
    return base;
  }, [customFields]);

  const resolveValue = (c: any, fieldId: string): any => {
    switch (fieldId) {
      case "name":
        return `${c.firstName} ${c.lastName}`;
      case "email":
        return c.emails?.[0] || "";
      case "phone":
        return c.phones?.[0] || "";
      case "createdAt":
        return c.createdAt;
      case "hasOpenDeals":
        return c.deals && c.deals.length > 0 ? "yes" : "no";
      case "score":
        return c.score ?? c._computedScore?.score;
      default: {
        const cf = c.customFields?.find((cf: any) => cf.fieldDefinitionId === fieldId);
        if (!cf) return "";
        return cf.textValue ?? cf.numberValue ?? cf.booleanValue ?? cf.dateValue ?? "";
      }
    }
  };

  const filtered = React.useMemo(() => {
    let result = enrichedContacts;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          (c.emails && c.emails.some((e: string) => e.toLowerCase().includes(q))) ||
          (c.phones && c.phones.some((p: string) => p.includes(q))),
      );
    }
    if (conditions.length > 0) {
      result = result.filter((c) => {
        const matches = conditions.map((cond) =>
          evaluateCondition(cond, resolveValue(c, cond.fieldId)),
        );
        return logical === FilterLogicalOperator.OR
          ? matches.some(Boolean)
          : matches.every(Boolean);
      });
    }

    // Quick focus filters (AI strip chips)
    if (quickBand !== "all") {
      result = result.filter((c) => (c._computedScore?.band ?? "cold") === quickBand);
    }
    if (quickSource !== "all") {
      result = result.filter((c) =>
        quickSource === "ai" ? (c.callCount || 0) > 0 : (c.callCount || 0) === 0,
      );
    }

    // Custom-field ordering — contacts without a value sink to the bottom.
    if (sortField) {
      const dir = sortDir === "asc" ? 1 : -1;
      result = [...result].sort((a, b) => {
        const av = a.customFields?.find((v: any) => v.fieldDefinitionId === sortField.id);
        const bv = b.customFields?.find((v: any) => v.fieldDefinitionId === sortField.id);
        if (sortField.type === "NUMBER") {
          const an = av?.numberValue;
          const bn = bv?.numberValue;
          if (an == null && bn == null) return 0;
          if (an == null) return 1;
          if (bn == null) return -1;
          return (an - bn) * dir;
        }
        const as = (av?.textValue ?? "").trim();
        const bs = (bv?.textValue ?? "").trim();
        if (!as && !bs) return 0;
        if (!as) return 1;
        if (!bs) return -1;
        return as.localeCompare(bs) * dir;
      });
    }
    return result;
  }, [
    enrichedContacts,
    searchQuery,
    conditions,
    logical,
    quickBand,
    quickSource,
    sortField,
    sortDir,
  ]);

  // AI insight aggregates — real numbers surfaced from the data, and each
  // one doubles as a one-click filter.
  const aiInsights = React.useMemo(() => {
    const hot = enrichedContacts.filter((c) => c._computedScore?.band === "hot").length;
    const aiCaptured = enrichedContacts.filter((c) => (c.callCount || 0) > 0).length;
    const weekAgo = Date.now() - 7 * 86_400_000;
    const newThisWeek = enrichedContacts.filter(
      (c) => new Date(c.createdAt).getTime() >= weekAgo,
    ).length;
    const withDeals = enrichedContacts.filter((c) => (c.deals?.length || 0) > 0).length;
    return { hot, aiCaptured, newThisWeek, withDeals };
  }, [enrichedContacts]);

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, conditions, logical, quickBand, quickSource, sortFieldId, sortDir]);

  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, deleteDeals }: { ids: string[]; deleteDeals: boolean }) => {
      const res = await api.post("/crm/contacts/bulk-delete", { ids, deleteDeals });
      return res.data.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Deleted ${data.deleted} contact${data.deleted === 1 ? "" : "s"}`);
      setSelectedIds([]);
      refetch();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || "Failed to delete contacts"),
  });

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const columns: Column<any>[] = [
    {
      id: "name",
      header: "Name",
      sortValue: (r) => `${r.firstName} ${r.lastName}`.toLowerCase(),
      cell: (c) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={`${c.firstName} ${c.lastName}`} size={26} />
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-fg-primary truncate capitalize leading-tight">
              {c.firstName} {c.lastName}
            </div>
            <div className="text-[10.5px] text-fg-muted truncate">{c.phones?.[0] || "—"}</div>
          </div>
        </div>
      ),
    },
    {
      id: "email",
      header: "Email",
      sortValue: (r) => r.emails?.[0] || "",
      cell: (c) => (
        <div className="text-[11.5px] text-fg-secondary" title={c.emails?.[0] || ""}>
          {c.emails?.[0] || <span className="text-fg-muted">—</span>}
        </div>
      ),
    },
    {
      id: "score",
      header: "Score",
      sortValue: (r) => r.score ?? r._computedScore?.score ?? 0,
      width: "104px",
      cell: (c) => {
        const band = c._computedScore?.band ?? "cold";
        const score = c.score ?? c._computedScore?.score ?? 0;
        return (
          <div className="flex items-center gap-1.5">
            <StatusPill tone={BAND_TONE[band as keyof typeof BAND_TONE]} dot pulse={band === "hot"}>
              {BAND_LABEL[band as keyof typeof BAND_LABEL]}
            </StatusPill>
            <span className="text-[11px] font-semibold text-fg-secondary tabular-nums">
              {score}
            </span>
          </div>
        );
      },
    },
    {
      id: "channels",
      header: "Channels",
      width: "128px",
      cell: (c) => {
        const chs = c.channelsUsed || [];
        if (chs.length === 0) return <span className="text-fg-muted">—</span>;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {chs.slice(0, 3).map((ch: string) => (
              <StatusPill key={ch} tone="muted">
                {ch}
              </StatusPill>
            ))}
          </div>
        );
      },
    },
    {
      id: "lastCall",
      header: "Last call",
      sortValue: (r) => (r.lastCallAt ? new Date(r.lastCallAt) : null),
      width: "120px",
      cell: (c) => (
        <span className="text-[11.5px] text-fg-secondary">
          {c.lastCallAt ? (
            formatTimeAgo(c.lastCallAt)
          ) : (
            <span className="text-fg-muted">Never</span>
          )}
        </span>
      ),
    },
    {
      id: "openDeals",
      header: "Deals",
      sortValue: (r) => r.deals?.length || 0,
      width: "72px",
      cell: (c) => {
        const n = c.deals?.length || 0;
        return n > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-brand-600">
            <Star className="h-3 w-3 fill-brand-500 text-brand-500" />
            {n}
          </span>
        ) : (
          <span className="text-fg-muted text-[11px]">—</span>
        );
      },
    },
    {
      id: "createdAt",
      header: "Created at",
      sortValue: (r) => new Date(r.createdAt),
      width: "100px",
      cell: (c) => (
        <span className="text-[11.5px] text-fg-secondary">{formatTimeAgo(c.createdAt)}</span>
      ),
    },
    {
      id: "updatedAt",
      header: "Last updated",
      sortValue: (r) => new Date(r.updatedAt),
      width: "110px",
      cell: (c) => (
        <span className="text-[11.5px] text-fg-secondary">{formatTimeAgo(c.updatedAt)}</span>
      ),
    },
  ];

  for (const cf of customFields.slice(0, 2)) {
    columns.splice(columns.length - 1, 0, {
      id: `cf-${cf.id}`,
      header: cf.name,
      width: "116px",
      cell: (c) => {
        const val = c.customFields?.find((v: any) => v.fieldDefinitionId === cf.id);
        if (!val) return <span className="text-fg-muted">—</span>;
        if (cf.type === "BOOLEAN")
          return <span className="text-[11.5px]">{val.booleanValue ? "Yes" : "No"}</span>;
        if (cf.type === "DATE" && val.dateValue) {
          const t = typeof val.dateValue === "number" ? val.dateValue : Number(val.dateValue);
          const d = new Date(t < 10000000000 ? t * 1000 : t);
          return <span className="text-[11.5px]">{d.toLocaleDateString("en-IN")}</span>;
        }
        return (
          <span className="text-[11.5px] text-fg-secondary truncate max-w-[110px] inline-block">
            {val.textValue ?? val.numberValue ?? "—"}
          </span>
        );
      },
    });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden font-sans gap-2">
      {/* ============ AI insights banner — live numbers, each chip filters ============ */}
      {contacts.length > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-line-default bg-bg-subtle px-3.5 py-2.5 shrink-0 select-none">
          <span className="h-8 w-8 rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold text-fg-primary leading-tight">
              {aiInsights.aiCaptured > 0
                ? `Your AI captured ${aiInsights.aiCaptured} contact${aiInsights.aiCaptured === 1 ? "" : "s"} from calls`
                : "Your AI keeps this CRM updated from every call"}
              {aiInsights.hot > 0 && (
                <span className="text-negative-500">
                  {" "}
                  · {aiInsights.hot} hot lead{aiInsights.hot === 1 ? "" : "s"} need attention
                </span>
              )}
            </div>
            <div className="text-[10.5px] text-fg-muted leading-tight mt-0.5">
              Names, budgets, dates and deals are extracted automatically — click a stat to focus on
              it.
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setQuickBand(quickBand === "hot" ? "all" : "hot")}
              className={`inline-flex items-center gap-1 h-7 px-2 rounded-md border text-[11px] font-bold transition-colors ${
                quickBand === "hot"
                  ? "border-negative-500 bg-negative-50 text-negative-500"
                  : "border-line-default bg-bg-raised text-fg-secondary hover:text-negative-500 hover:border-negative-500/40"
              }`}
              title="Show hot leads only"
            >
              <Flame className="h-3 w-3" /> {aiInsights.hot} hot
            </button>
            <button
              type="button"
              onClick={() => setQuickSource(quickSource === "ai" ? "all" : "ai")}
              className={`inline-flex items-center gap-1 h-7 px-2 rounded-md border text-[11px] font-bold transition-colors ${
                quickSource === "ai"
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-line-default bg-bg-raised text-fg-secondary hover:text-brand-700 hover:border-brand-500/40"
              }`}
              title="Show contacts captured by AI calls"
            >
              <PhoneCall className="h-3 w-3" /> {aiInsights.aiCaptured} from calls
            </button>
            <span className="hidden lg:inline-flex items-center gap-1 h-7 px-2 rounded-md border border-line-default bg-bg-raised text-[11px] font-bold text-fg-secondary">
              <TrendingUp className="h-3 w-3" /> {aiInsights.newThisWeek} new this week
            </span>
            <span className="hidden xl:inline-flex items-center gap-1 h-7 px-2 rounded-md border border-line-default bg-bg-raised text-[11px] font-bold text-fg-secondary">
              <Star className="h-3 w-3" /> {aiInsights.withDeals} with deals
            </span>
          </div>
        </div>
      )}

      {/* ============ Toolbar — search + quick filters + actions ============ */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, email, or phone…"
          className="flex-1 min-w-[180px] max-w-sm"
        />

        {/* Sort by any custom field — direction adapts to the field type */}
        {sortableFields.length > 0 && (
          <>
            <select
              value={sortFieldId}
              onChange={(e) => {
                setSortFieldId(e.target.value);
                setSortDir("asc");
              }}
              className={`h-9 border text-[12px] font-semibold rounded-md px-2 focus:outline-none focus:border-brand-500 cursor-pointer max-w-[180px] truncate ${
                sortFieldId
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-line-default bg-bg-raised text-fg-secondary"
              }`}
              title="Order contacts by a custom field"
            >
              <option value="">Sort by field…</option>
              {sortableFields.map((cf: any) => (
                <option key={cf.id} value={cf.id}>
                  {cf.name}
                </option>
              ))}
            </select>

            {sortField && (
              <select
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
                className="h-9 border border-brand-500 bg-brand-50 text-brand-700 text-[12px] font-semibold rounded-md px-2 focus:outline-none cursor-pointer"
                title="Sort direction"
              >
                {sortField.type === "NUMBER" ? (
                  <>
                    <option value="asc">Low → High</option>
                    <option value="desc">High → Low</option>
                  </>
                ) : (
                  <>
                    <option value="asc">A → Z</option>
                    <option value="desc">Z → A</option>
                  </>
                )}
              </select>
            )}
          </>
        )}

        {quickActive && (
          <button
            type="button"
            onClick={clearQuickFilters}
            className="h-9 px-2 rounded-md text-[11.5px] font-bold text-negative-500 hover:bg-negative-50 transition-colors"
            title="Clear quick filters"
          >
            Reset
          </button>
        )}

        <div className="flex-1 hidden md:block" />

        <button
          type="button"
          onClick={() => setIsFilterOpen(true)}
          className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[12px] font-semibold border transition-colors ${
            conditions.length > 0
              ? "border-brand-500 text-brand-700 bg-brand-50"
              : "border-line-default bg-bg-subtle text-fg-secondary hover:text-fg-primary hover:bg-bg-muted"
          }`}
          title="Advanced multi-condition filters"
        >
          <Filter className="h-3.5 w-3.5" />
          {conditions.length > 0 && (
            <span className="bg-brand-500 text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full inline-flex items-center justify-center">
              {conditions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsImportOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[12px] font-semibold border border-line-default bg-bg-subtle text-fg-secondary hover:text-fg-primary hover:bg-bg-muted transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          Import
        </button>

        <Button
          variant="primary"
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-[12px] font-semibold bg-brand-500 hover:bg-brand-600 text-white shadow-card border-none"
        >
          <Plus className="h-3.5 w-3.5" />
          Add contact
        </Button>
      </div>

      {/* ============ Bulk action bar ============ */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-brand-50 border border-brand-500/30 rounded-md px-2.5 py-1.5 shrink-0 animate-in fade-in duration-150">
          <div className="text-[11.5px] font-semibold text-brand-700">
            {selectedIds.length} selected
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold bg-bg-raised border border-negative-500 text-negative-500 hover:bg-negative-50"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-semibold text-fg-secondary hover:text-fg-primary hover:bg-bg-raised"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ============ Table (takes ALL remaining space) ============ */}
      <div className="flex-1 min-h-0 flex flex-col">
        <DataTable
          rows={paginated}
          columns={columns}
          getRowId={(r) => r.id}
          onRowClick={(r) => navigate(`/crm/contacts/${r.id}`)}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          isLoading={isLoading}
          stickyHeader
          scrollClassName="flex-1"
          className="flex-1"
          emptyState={
            <EmptyState
              icon={Users}
              title={
                searchQuery || conditions.length > 0 ? "No matching contacts" : "No contacts yet"
              }
              description={
                searchQuery || conditions.length > 0
                  ? "Try clearing filters, or add a contact manually."
                  : "Contacts flow in automatically from your AI agent's calls, or you can add them here."
              }
              action={
                <Button
                  variant="primary"
                  onClick={() => setIsAddOpen(true)}
                  className="bg-brand-500 hover:bg-brand-600 text-white h-9 px-3.5 text-[12px] font-semibold rounded-md border-none shadow-card"
                >
                  Add first contact
                </Button>
              }
              size="sm"
            />
          }
        />
        {filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            itemsPerPage={pageSize}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(v) => {
              setPageSize(v);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* Filter drawer (portalled) */}
      <FilterBuilder
        fields={filterFields}
        conditions={conditions}
        onConditionsChange={setConditions}
        logical={logical}
        onLogicalChange={setLogical}
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />

      {isAddOpen && (
        <AddContactModal
          customFields={customFields}
          onClose={() => setIsAddOpen(false)}
          onCreated={refetch}
        />
      )}
      {isImportOpen && (
        <ImportContactsModal onClose={() => setIsImportOpen(false)} onImported={refetch} />
      )}

      {showBulkDeleteConfirm && (
        <DeleteContactModal
          contactCount={selectedIds.length}
          dealCount={enrichedContacts
            .filter((c) => selectedIds.includes(c.id))
            .reduce((sum, c) => sum + (c.deals?.length || 0), 0)}
          isDeleting={bulkDeleteMutation.isPending}
          onConfirm={({ deleteDeals }) => {
            bulkDeleteMutation.mutate({ ids: selectedIds, deleteDeals });
            setShowBulkDeleteConfirm(false);
          }}
          onClose={() => setShowBulkDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
