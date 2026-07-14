import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/axios.js";
import {
  Plus,
  Filter,
  Trash2,
  Download,
  Upload,
  Users,
  Star,
  X,
  ChevronDown,
  ChevronUp,
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
  buildSmartSegments,
} from "../../../components/ui-ext/index.js";
import type { Column, FilterFieldDef } from "../../../components/ui-ext/index.js";
import { AddContactModal } from "./AddContactModal.js";
import { ImportContactsModal } from "./ImportContactsModal.js";
import { DuplicatesModal } from "./DuplicatesModal.js";

interface ContactsTabProps {
  contacts: any[];
  isLoading: boolean;
  refetch: () => void;
  customFields: any[];
}

const SEGMENTS = buildSmartSegments();

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
  const [activeSegment, setActiveSegment] = React.useState<string | null>(null);
  const [showSegments, setShowSegments] = React.useState(true);

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isDupesOpen, setIsDupesOpen] = React.useState(false);

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
    if (activeSegment) {
      const seg = SEGMENTS.find((s) => s.id === activeSegment);
      if (seg) {
        if (seg.clientMatcher) {
          result = result.filter((c) => seg.clientMatcher!(c));
        } else {
          result = result.filter((c) => {
            const matches = seg.conditions.map((cond) =>
              evaluateCondition(cond, resolveValue(c, cond.fieldId)),
            );
            return seg.logical === FilterLogicalOperator.OR
              ? matches.some(Boolean)
              : matches.every(Boolean);
          });
        }
      }
    }
    if (conditions.length > 0) {
      result = result.filter((c) => {
        const matches = conditions.map((cond) =>
          evaluateCondition(cond, resolveValue(c, cond.fieldId)),
        );
        return logical === FilterLogicalOperator.OR ? matches.some(Boolean) : matches.every(Boolean);
      });
    }
    return result;
  }, [enrichedContacts, searchQuery, conditions, logical, activeSegment]);

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchQuery, conditions, logical, activeSegment]);

  const paginated = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Inline stat strip counts (recomputed cheaply from enrichedContacts)
  const stats = React.useMemo(() => {
    const hot = enrichedContacts.filter((c) => c._computedScore?.band === "hot").length;
    const newWeek = enrichedContacts.filter(
      (c) => new Date(c.createdAt).getTime() > Date.now() - 7 * 86_400_000,
    ).length;
    const withDeals = enrichedContacts.filter((c) => c.deals && c.deals.length > 0).length;
    return { hot, newWeek, withDeals };
  }, [enrichedContacts]);

  // Per-segment counts (for segment chips)
  const segmentCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const seg of SEGMENTS) {
      counts[seg.id] = enrichedContacts.filter((c) => {
        if (seg.clientMatcher) return seg.clientMatcher(c);
        const matches = seg.conditions.map((cond) => evaluateCondition(cond, resolveValue(c, cond.fieldId)));
        return seg.logical === FilterLogicalOperator.OR ? matches.some(Boolean) : matches.every(Boolean);
      }).length;
    }
    return counts;
  }, [enrichedContacts]);

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post("/crm/contacts/bulk-delete", { ids });
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
    if (!window.confirm(`Delete ${selectedIds.length} contact${selectedIds.length === 1 ? "" : "s"}?`)) return;
    bulkDeleteMutation.mutate(selectedIds);
  };

  const handleExportCsv = () => {
    const rows = filtered.map((c) => ({
      "First name": c.firstName,
      "Last name": c.lastName,
      Email: c.emails?.[0] || "",
      Phone: c.phones?.[0] || "",
      Score: c.score ?? c._computedScore?.score ?? "",
      Band: c._computedScore?.band ?? "",
      "Open deals": c.deals?.length || 0,
      "Created at": c.createdAt,
    }));
    const header = Object.keys(rows[0] || { "First name": "" });
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header
          .map((h) => {
            const v = (r as any)[h] ?? "";
            const s = String(v).replace(/"/g, '""');
            return /[,\n"]/.test(s) ? `"${s}"` : s;
          })
          .join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} contacts`);
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
            <div className="text-[10.5px] text-fg-muted truncate">
              {c.emails?.[0] || c.phones?.[0] || "—"}
            </div>
          </div>
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
            <span className="text-[11px] font-semibold text-fg-secondary tabular-nums">{score}</span>
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
          {c.lastCallAt ? formatTimeAgo(c.lastCallAt) : <span className="text-fg-muted">Never</span>}
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
      header: "Added",
      sortValue: (r) => new Date(r.createdAt),
      width: "100px",
      cell: (c) => <span className="text-[11.5px] text-fg-secondary">{formatTimeAgo(c.createdAt)}</span>,
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
        if (cf.type === "BOOLEAN") return <span className="text-[11.5px]">{val.booleanValue ? "Yes" : "No"}</span>;
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
      {/* ============ Slim inline stat strip ============ */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11.5px] shrink-0 px-0.5">
        <span className="inline-flex items-center gap-1.5 text-fg-secondary">
          <Users className="h-3 w-3 text-fg-muted" />
          <b className="text-fg-primary tabular-nums">{contacts.length.toLocaleString("en-IN")}</b>
          <span className="text-fg-muted">contacts</span>
        </span>
        <span className="text-line-strong">·</span>
        <span className="text-fg-secondary">
          <b className="text-positive-600 tabular-nums">{stats.hot}</b>
          <span className="text-fg-muted"> hot</span>
        </span>
        <span className="text-line-strong">·</span>
        <span className="text-fg-secondary">
          <b className="text-fg-primary tabular-nums">{stats.newWeek}</b>
          <span className="text-fg-muted"> new this week</span>
        </span>
        <span className="text-line-strong">·</span>
        <span className="text-fg-secondary">
          <b className="text-brand-600 tabular-nums">{stats.withDeals}</b>
          <span className="text-fg-muted"> with open deals</span>
        </span>
        <button
          type="button"
          onClick={() => setIsDupesOpen(true)}
          className="ml-auto text-[11px] font-semibold text-brand-600 hover:text-brand-700"
        >
          Find duplicates
        </button>
      </div>

      {/* ============ Toolbar ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, email, or phone…"
          className="flex-1 max-w-sm"
        />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowSegments((v) => !v)}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[12px] font-semibold border border-line-default bg-bg-subtle text-fg-secondary hover:text-fg-primary hover:bg-bg-muted transition-colors"
            title={showSegments ? "Hide quick views" : "Show quick views"}
          >
            {showSegments ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Views
          </button>

          <button
            type="button"
            onClick={() => setIsFilterOpen(true)}
            className={`inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[12px] font-semibold border transition-colors ${
              conditions.length > 0
                ? "border-brand-500 text-brand-700 bg-brand-50"
                : "border-line-default bg-bg-subtle text-fg-secondary hover:text-fg-primary hover:bg-bg-muted"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {conditions.length > 0 && (
              <span className="bg-brand-500 text-white text-[10px] font-bold h-4 min-w-4 px-1 rounded-full inline-flex items-center justify-center ml-0.5">
                {conditions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-[12px] font-semibold border border-line-default bg-bg-subtle text-fg-secondary hover:text-fg-primary hover:bg-bg-muted disabled:opacity-40 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export
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
      </div>

      {/* ============ Inline segments chip row (no card wrapper) ============ */}
      {showSegments && (
        <div className="flex items-center flex-wrap gap-1.5 shrink-0 pb-1">
          <SegmentChip
            active={activeSegment === null}
            onClick={() => setActiveSegment(null)}
            label="All"
            count={contacts.length}
          />
          {SEGMENTS.map((seg) => {
            const Icon = seg.icon;
            const active = activeSegment === seg.id;
            const count = segmentCounts[seg.id] ?? 0;
            return (
              <SegmentChip
                key={seg.id}
                active={active}
                onClick={() => setActiveSegment(active ? null : seg.id)}
                label={seg.name}
                count={count}
                Icon={Icon}
              />
            );
          })}
        </div>
      )}

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
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold bg-white border border-negative-500 text-negative-500 hover:bg-negative-50"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-semibold text-fg-secondary hover:text-fg-primary hover:bg-white"
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
              title={searchQuery || conditions.length > 0 || activeSegment ? "No matching contacts" : "No contacts yet"}
              description={
                searchQuery || conditions.length > 0 || activeSegment
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
        <AddContactModal customFields={customFields} onClose={() => setIsAddOpen(false)} onCreated={refetch} />
      )}
      {isImportOpen && (
        <ImportContactsModal onClose={() => setIsImportOpen(false)} onImported={refetch} />
      )}
      {isDupesOpen && (
        <DuplicatesModal onClose={() => setIsDupesOpen(false)} onMerged={refetch} />
      )}
    </div>
  );
}

/* ---------------- Segment chip (tinted so it's visible on white) ---------------- */

interface SegmentChipProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  Icon?: React.ComponentType<{ className?: string }>;
}

function SegmentChip({ active, onClick, label, count, Icon }: SegmentChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full text-[11.5px] font-semibold transition-colors ${
        active
          ? "bg-blue-600 text-white shadow-card"
          : "bg-bg-subtle border border-line-default text-fg-secondary hover:text-fg-primary hover:bg-bg-muted hover:border-line-strong"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      <span
        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center tabular-nums ${
          active ? "bg-white/20 text-white" : "bg-white text-fg-muted border border-line-default"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
