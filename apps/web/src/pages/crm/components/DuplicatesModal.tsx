import * as React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button, Modal } from "@antigravity/ui";
import { toast } from "sonner";
import { Merge, Users } from "lucide-react";
import { api } from "../../../lib/axios.js";
import { Avatar } from "../../../components/ui-ext/index.js";

interface DuplicatesModalProps {
  onClose: () => void;
  onMerged: () => void;
}

interface DuplicatePair {
  a: {
    id: string;
    firstName: string;
    lastName: string;
    emails: string[];
    phones: string[];
    createdAt: string;
  };
  b: {
    id: string;
    firstName: string;
    lastName: string;
    emails: string[];
    phones: string[];
    createdAt: string;
  };
  via: string;
  matchValue: string;
}

export function DuplicatesModal({ onClose, onMerged }: DuplicatesModalProps): React.JSX.Element {
  const {
    data: pairs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["crm-duplicates"],
    queryFn: async () => {
      const res = await api.get("/crm/contacts/duplicates/list");
      return res.data.data as DuplicatePair[];
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({ targetId, sourceId }: { targetId: string; sourceId: string }) => {
      await api.post("/crm/contacts/merge", { targetId, sourceId });
    },
    onSuccess: () => {
      toast.success("Merged");
      onMerged();
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Merge failed");
    },
  });

  return (
    <Modal isOpen={true} onClose={onClose} title="Duplicate contacts" size="xl">
      <div className="flex flex-col max-h-[75vh] font-sans">
        <div className="p-5 border-b border-line-default text-[12px] text-fg-secondary">
          We look for contacts that share a phone number or email address. Pick which record to keep
          — the other one will be merged into it (activities, deals, notes and calls move over).
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : pairs.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-10 w-10 text-fg-muted mx-auto mb-2" />
              <div className="text-[13px] font-semibold text-fg-primary">No duplicates found</div>
              <div className="text-[12px] text-fg-muted mt-1">
                Every contact has a unique phone / email combination.
              </div>
            </div>
          ) : (
            pairs.map((p, i) => (
              <DuplicateRow
                key={`${p.a.id}-${p.b.id}-${i}`}
                pair={p}
                onMerge={(targetId, sourceId) => mergeMutation.mutate({ targetId, sourceId })}
                disabled={mergeMutation.isPending}
              />
            ))
          )}
        </div>

        <div className="border-t border-line-default p-4 bg-bg-subtle flex items-center justify-end shrink-0">
          <Button
            variant="secondary"
            onClick={onClose}
            className="border border-line-default bg-bg-raised text-fg-primary h-9 px-3.5 text-[12px] font-semibold rounded-md shadow-none"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DuplicateRow({
  pair,
  onMerge,
  disabled,
}: {
  pair: DuplicatePair;
  onMerge: (targetId: string, sourceId: string) => void;
  disabled: boolean;
}): React.JSX.Element {
  // Default: keep the older record (created first) as target.
  const olderId =
    new Date(pair.a.createdAt).getTime() < new Date(pair.b.createdAt).getTime()
      ? pair.a.id
      : pair.b.id;
  const [targetId, setTargetId] = React.useState<string>(olderId);
  const sourceId = pair.a.id === targetId ? pair.b.id : pair.a.id;

  return (
    <div className="border border-line-default rounded-lg p-3 bg-bg-raised">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-fg-muted">
          Matched via {pair.via} · <span className="text-fg-primary">{pair.matchValue}</span>
        </div>
        <button
          type="button"
          onClick={() => onMerge(targetId, sourceId)}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-semibold bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50"
        >
          <Merge className="h-3 w-3" /> Merge
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[pair.a, pair.b].map((c) => {
          const isTarget = targetId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setTargetId(c.id)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                isTarget
                  ? "bg-brand-50 border-brand-500 ring-1 ring-brand-500/25"
                  : "bg-bg-raised border-line-default hover:border-line-strong"
              }`}
            >
              <div className="flex items-center gap-2">
                <Avatar name={`${c.firstName} ${c.lastName}`} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] font-semibold text-fg-primary truncate capitalize">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-[10.5px] text-fg-muted truncate">
                    {c.emails?.[0] || "no email"} · {c.phones?.[0] || "no phone"}
                  </div>
                  <div className="text-[10.5px] text-fg-muted mt-0.5">
                    Added {new Date(c.createdAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
                {isTarget && (
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-brand-600 bg-bg-raised border border-brand-500/25 rounded px-1.5 py-0.5">
                    Keep
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
