import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Modal } from "@antigravity/ui";
import { toast } from "sonner";
import { Upload, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { api } from "../../../lib/axios.js";

interface ImportContactsModalProps {
  onClose: () => void;
  onImported: () => void;
}

interface ParsedRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  _row: number;
  _errors: string[];
}

const REQUIRED = ["firstName", "lastName"] as const;

/** Bare-bones CSV parser (RFC-4180-ish) — handles quoted fields with commas
 *  and escaped double-quotes. No streaming; caps at 5000 rows client-side. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const push = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    push();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") push();
      else if (ch === "\n") endRow();
      else if (ch === "\r") {
        /* skip */
      } else field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) endRow();
  return rows.filter((r) => r.some((c) => c && c.trim().length > 0));
}

const TEMPLATE = "firstName,lastName,email,phone\nPriya,Sharma,priya@example.com,+91 98765 43210\n";

export function ImportContactsModal({
  onClose,
  onImported,
}: ImportContactsModalProps): React.JSX.Element {
  const [rawText, setRawText] = React.useState("");
  const [rows, setRows] = React.useState<ParsedRow[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Record<string, string>>({});
  const [step, setStep] = React.useState<"upload" | "review">("upload");

  const importMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/crm/contacts/import", payload);
      return res.data.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Imported ${data.imported} new, merged ${data.merged}, skipped ${data.skipped}`);
      onImported();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Import failed");
    },
  });

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setRawText(text);
      parseAndAutomap(text);
    };
    reader.readAsText(file);
  };

  const parseAndAutomap = (text: string) => {
    const parsed = parseCSV(text);
    if (parsed.length === 0) {
      toast.error("CSV appears empty");
      return;
    }
    const [head, ...body] = parsed;
    const heads = (head || []).map((h) => h.trim());
    setHeaders(heads);

    // Auto-map header names to fields.
    const autoMap: Record<string, string> = {};
    for (const h of heads) {
      const l = h.toLowerCase();
      if (l.includes("first") || l === "fname") autoMap[h] = "firstName";
      else if (l.includes("last") || l === "lname") autoMap[h] = "lastName";
      else if (l === "name" || l === "fullname") autoMap[h] = "firstName";
      else if (l.includes("email") || l === "e-mail") autoMap[h] = "email";
      else if (l.includes("phone") || l.includes("mobile") || l === "tel") autoMap[h] = "phone";
    }
    setMapping(autoMap);

    const parsedRows: ParsedRow[] = body.map((cols, i) => {
      const record: Record<string, string> = {};
      heads.forEach((h, j) => {
        const target = autoMap[h];
        if (target) record[target] = (cols[j] || "").trim();
      });
      const errs: string[] = [];
      for (const req of REQUIRED) {
        if (!record[req]) errs.push(`Missing ${req}`);
      }
      return {
        firstName: record.firstName || "",
        lastName: record.lastName || "",
        email: record.email || "",
        phone: record.phone || "",
        _row: i + 2,
        _errors: errs,
      };
    });
    setRows(parsedRows);
    setStep("review");
  };

  const reMap = React.useCallback(
    (newMapping: Record<string, string>) => {
      setMapping(newMapping);
      if (!rawText) return;
      const parsed = parseCSV(rawText);
      if (parsed.length === 0) return;
      const [head, ...body] = parsed;
      const heads = (head || []).map((h) => h.trim());
      const parsedRows: ParsedRow[] = body.map((cols, i) => {
        const record: Record<string, string> = {};
        heads.forEach((h, j) => {
          const target = newMapping[h];
          if (target) record[target] = (cols[j] || "").trim();
        });
        const errs: string[] = [];
        for (const req of REQUIRED) {
          if (!record[req]) errs.push(`Missing ${req}`);
        }
        return {
          firstName: record.firstName || "",
          lastName: record.lastName || "",
          email: record.email || "",
          phone: record.phone || "",
          _row: i + 2,
          _errors: errs,
        };
      });
      setRows(parsedRows);
    },
    [rawText],
  );

  const validCount = rows.filter((r) => r._errors.length === 0).length;
  const errorCount = rows.length - validCount;

  const submit = () => {
    const clean = rows
      .filter((r) => r._errors.length === 0)
      .map(({ firstName, lastName, email, phone }) => ({ firstName, lastName, email, phone }));
    if (clean.length === 0) {
      toast.error("No valid rows to import");
      return;
    }
    importMutation.mutate({ rows: clean });
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contacts-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Import contacts from CSV" size="xl">
      <div className="flex flex-col max-h-[80vh] font-sans">
        {step === "upload" ? (
          <div className="p-6 space-y-4">
            <div className="rounded-lg border-2 border-dashed border-line-default hover:border-brand-500 transition-colors p-8 text-center bg-bg-subtle">
              <Upload className="h-8 w-8 text-brand-500 mx-auto mb-3" />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0]!)}
                  className="hidden"
                />
                <span className="text-[13px] font-semibold text-brand-600 hover:text-brand-700">
                  Click to choose a CSV file
                </span>
              </label>
              <p className="text-[11.5px] text-fg-muted mt-2">
                Max 5,000 rows · UTF-8 · comma-separated
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-[11.5px] font-semibold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                <FileText className="h-3.5 w-3.5" /> Download template
              </button>
              <div className="text-[11px] text-fg-muted">
                Required columns: <b className="text-fg-primary">firstName</b>, <b className="text-fg-primary">lastName</b>. Optional: email, phone.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-line-default space-y-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-positive-600">
                  <CheckCircle2 className="h-4 w-4" />
                  {validCount} ready
                </div>
                {errorCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-attention-600">
                    <AlertTriangle className="h-4 w-4" />
                    {errorCount} will be skipped
                  </div>
                )}
              </div>

              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-2">
                  Column mapping
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {headers.map((h) => (
                    <div key={h} className="flex items-center gap-2">
                      <span className="text-[12px] text-fg-secondary min-w-[100px] truncate" title={h}>
                        {h}
                      </span>
                      <span className="text-fg-muted">→</span>
                      <select
                        value={mapping[h] || ""}
                        onChange={(e) => reMap({ ...mapping, [h]: e.target.value })}
                        className="flex-1 h-8 bg-bg-raised border border-line-default text-[12px] text-fg-primary rounded-md px-2 focus:outline-none focus:border-brand-500"
                      >
                        <option value="">— Ignore —</option>
                        <option value="firstName">First name</option>
                        <option value="lastName">Last name</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-2">
                Preview (first 50 rows)
              </div>
              <div className="border border-line-default rounded-md overflow-hidden">
                <table className="w-full text-[11.5px]">
                  <thead className="bg-bg-subtle">
                    <tr>
                      <th className="px-3 py-2 text-left text-fg-muted font-semibold w-10">Row</th>
                      <th className="px-3 py-2 text-left text-fg-muted font-semibold">Name</th>
                      <th className="px-3 py-2 text-left text-fg-muted font-semibold">Email</th>
                      <th className="px-3 py-2 text-left text-fg-muted font-semibold">Phone</th>
                      <th className="px-3 py-2 text-left text-fg-muted font-semibold w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r) => (
                      <tr key={r._row} className="border-t border-line-subtle">
                        <td className="px-3 py-1.5 text-fg-muted tabular-nums">{r._row}</td>
                        <td className="px-3 py-1.5 text-fg-primary">
                          {r.firstName} {r.lastName}
                        </td>
                        <td className="px-3 py-1.5 text-fg-secondary">{r.email || "—"}</td>
                        <td className="px-3 py-1.5 text-fg-secondary">{r.phone || "—"}</td>
                        <td className="px-3 py-1.5">
                          {r._errors.length > 0 ? (
                            <span className="text-attention-600 text-[10.5px]">{r._errors[0]}</span>
                          ) : (
                            <span className="text-positive-600 text-[10.5px]">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {rows.length > 50 && (
                <p className="text-[11px] text-fg-muted mt-2">
                  Showing 50 of {rows.length}. All valid rows will be imported.
                </p>
              )}
            </div>
          </>
        )}

        <div className="border-t border-line-default p-4 bg-bg-subtle flex items-center justify-end gap-2 shrink-0">
          <Button
            variant="secondary"
            type="button"
            onClick={onClose}
            className="border border-line-default bg-bg-raised text-fg-primary h-9 px-3.5 text-[12px] font-semibold rounded-md shadow-none"
          >
            Cancel
          </Button>
          {step === "review" && (
            <Button
              variant="primary"
              type="button"
              onClick={submit}
              disabled={importMutation.isPending || validCount === 0}
              className="bg-brand-500 hover:bg-brand-600 text-white h-9 px-3.5 text-[12px] font-semibold rounded-md border-none shadow-card"
            >
              {importMutation.isPending ? "Importing…" : `Import ${validCount} contacts`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
