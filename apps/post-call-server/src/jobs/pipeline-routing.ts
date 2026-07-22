import { z } from "zod";
import { db } from "@antigravity/db";
import { createLogger } from "../logger.js";
import { extractStructured, llmEnabled } from "../llm/client.js";

const log = createLogger("pipeline-routing");

/**
 * Which pipeline does a NEW ai-sourced deal belong in? Layered, cheapest
 * first:
 *   1. Deterministic routing rules (Pipeline.filters vs the contact's custom
 *      field values) — no LLM, instant. Enforces the same rules the CRM UI
 *      promises ("contacts whose field matches flow into this pipeline").
 *   2. Ambiguous → LLM picks from a shortlist of "routing cards" built from
 *      behavioral evidence (recent deal titles), not just names. Live
 *      pipelines only — an org with 200 pipelines really uses ~10.
 *   3. Unsure/abstain → tenant default ("sales"-named or first) + review
 *      tag, and the pick is validated post-hoc against routing rules.
 *
 * A wrong pipeline placement is worse than a conservative default — the LLM
 * has an explicit abstain path and we honor it.
 */

export interface StageCfg {
  id: string;
  name: string;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  position: number;
}

export interface RoutedPipeline {
  id: string;
  name: string;
  stages: string[];
  stageConfigs: StageCfg[];
}

export interface RoutingResult {
  pipeline: RoutedPipeline | null;
  method: "only" | "rule" | "llm" | "default";
  /** True when the pick was uncertain — the deal gets a review tag. */
  flagged: boolean;
}

interface CatalogEntry {
  pipelines: (RoutedPipeline & {
    filters: { fieldDefinitionId: string; value: string }[];
    recentTitles: string[];
    recentDeals: number;
  })[];
  fetchedAt: number;
}

// Per-tenant pipeline catalog cache. Post-call volume is per-call, pipeline
// edits are rare — 60s of staleness is invisible, and it keeps a 200-pipeline
// org from re-reading its whole catalog on every single call.
const CATALOG_TTL_MS = 60_000;
const catalogCache = new Map<string, CatalogEntry>();

const loadCatalog = async (tenantId: string): Promise<CatalogEntry> => {
  const cached = catalogCache.get(tenantId);
  if (cached && Date.now() - cached.fetchedAt < CATALOG_TTL_MS) return cached;

  const pipelines = await db.pipeline.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    include: {
      stageConfigs: { where: { archivedAt: null }, orderBy: { position: "asc" } },
    },
  });

  // Behavioral evidence: recent deal titles per pipeline (one query for all).
  const recent = await db.deal.findMany({
    where: { tenantId, deletedAt: null, pipelineId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: Math.min(300, pipelines.length * 5 + 30),
    select: { pipelineId: true, title: true },
  });
  const titlesByPipeline = new Map<string, string[]>();
  for (const d of recent) {
    const list = titlesByPipeline.get(d.pipelineId!) ?? [];
    if (list.length < 4) list.push(d.title);
    titlesByPipeline.set(d.pipelineId!, list);
  }

  const entry: CatalogEntry = {
    pipelines: pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      stages: p.stages,
      stageConfigs: p.stageConfigs,
      filters: Array.isArray(p.filters)
        ? (p.filters as { fieldDefinitionId: string; value: string }[]).filter(
            (f) => f && f.fieldDefinitionId
          )
        : [],
      recentTitles: titlesByPipeline.get(p.id) ?? [],
      recentDeals: recent.filter((d) => d.pipelineId === p.id).length,
    })),
    fetchedAt: Date.now(),
  };
  catalogCache.set(tenantId, entry);
  return entry;
};

/** Contact custom-field values, stringified+lowercased for rule comparison. */
const loadContactFieldValues = async (
  tenantId: string,
  contactId: string
): Promise<Map<string, string>> => {
  const values = await db.customFieldValue.findMany({ where: { tenantId, contactId } });
  const map = new Map<string, string>();
  for (const v of values) {
    const raw =
      v.textValue ??
      (v.numberValue !== null ? String(v.numberValue) : null) ??
      (v.booleanValue !== null ? String(v.booleanValue) : null) ??
      (v.dateValue ? v.dateValue.toISOString() : null);
    if (raw !== null) map.set(v.fieldDefinitionId, String(raw).toLowerCase().trim());
  }
  return map;
};

const RoutePickSchema = z.object({
  pipelineId: z
    .string()
    .nullable()
    .describe(
      "The id of the best-matching pipeline, copied EXACTLY from the list. Null when you are genuinely unsure which pipeline this deal belongs in."
    ),
  reasoning: z.string().describe("One sentence"),
});

const fallbackPipeline = (catalog: CatalogEntry): RoutedPipeline | null =>
  catalog.pipelines.find((p) => p.name.toLowerCase().includes("sales")) ??
  catalog.pipelines[0] ??
  null;

export const routeNewDeal = async (input: {
  tenantId: string;
  contactId: string;
  intent: string;
  summary: string | null;
  logId: string;
}): Promise<RoutingResult> => {
  const catalog = await loadCatalog(input.tenantId);
  if (catalog.pipelines.length === 0) return { pipeline: null, method: "default", flagged: false };
  if (catalog.pipelines.length === 1)
    return { pipeline: catalog.pipelines[0]!, method: "only", flagged: false };

  // ── Layer 1: deterministic routing rules ──
  const ruled = catalog.pipelines.filter((p) => p.filters.length > 0);
  if (ruled.length > 0) {
    const fieldValues = await loadContactFieldValues(input.tenantId, input.contactId);
    const matches = ruled.filter((p) =>
      p.filters.every(
        (f) => fieldValues.get(f.fieldDefinitionId) === String(f.value ?? "").toLowerCase().trim()
      )
    );
    if (matches.length === 1) return { pipeline: matches[0]!, method: "rule", flagged: false };
    if (matches.length > 1) {
      // Multiple rule matches — let the LLM choose among ONLY those.
      const pick = await llmPick(matches, input);
      return pick ?? { pipeline: matches[0]!, method: "default", flagged: true };
    }
  }

  // ── Layer 2: behavioral shortlist among live pipelines ──
  if (llmEnabled()) {
    const live = catalog.pipelines
      .filter((p) => p.recentDeals > 0)
      .sort((a, b) => b.recentDeals - a.recentDeals);
    const shortlist = (live.length > 0 ? live : catalog.pipelines).slice(0, 10);
    if (shortlist.length === 1) return { pipeline: shortlist[0]!, method: "llm", flagged: false };
    const pick = await llmPick(shortlist, input);
    if (pick) return pick;
  }

  // ── Layer 3: conservative default, flagged for the owner ──
  return { pipeline: fallbackPipeline(catalog), method: "default", flagged: true };
};

const llmPick = async (
  candidates: CatalogEntry["pipelines"],
  input: { intent: string; summary: string | null; logId: string }
): Promise<RoutingResult | null> => {
  if (!llmEnabled()) return null;
  try {
    const cards = candidates
      .map((p) => {
        const stages = p.stageConfigs.map((s) => s.name).join(" → ");
        const evidence = p.recentTitles.length > 0 ? ` | recent deals: ${p.recentTitles.join("; ")}` : "";
        return `- id: ${p.id} | name: ${p.name} | stages: ${stages}${evidence}`;
      })
      .join("\n");

    const verdict = await extractStructured({
      schema: RoutePickSchema,
      schemaName: "PipelineRoute",
      system:
        "You route a new CRM deal (created from a phone call) into the right pipeline. Judge by what each pipeline is FOR — its name, its stage names, and especially the recent deals living in it. Be conservative: if none clearly fits, return null rather than guessing.",
      user: `NEW DEAL:\nintent: ${input.intent}\nsummary: ${input.summary ?? "(none)"}\n\nPIPELINES:\n${cards}`,
    });

    const chosen = candidates.find((p) => p.id === verdict.pipelineId);
    if (!chosen) {
      log.info("routing LLM abstained or returned unknown id — using default", {
        logId: input.logId,
        returned: verdict.pipelineId,
        reasoning: verdict.reasoning,
      });
      return null;
    }
    // Post-hoc validation: never place a deal in a pipeline whose own rules
    // the contact fails — rules constrain the LLM in both directions.
    log.info("routing LLM picked pipeline", {
      logId: input.logId,
      pipeline: chosen.name,
      reasoning: verdict.reasoning,
    });
    return { pipeline: chosen, method: "llm", flagged: false };
  } catch (err) {
    log.warn("routing LLM failed — using default", {
      logId: input.logId,
      message: (err as Error).message,
    });
    return null;
  }
};

/**
 * Post-hoc guard used by the caller: a rule-bearing pipeline must actually
 * match the contact. Returns true when placement is allowed.
 */
export const validatePlacement = async (
  tenantId: string,
  contactId: string,
  pipeline: RoutedPipeline
): Promise<boolean> => {
  const catalog = await loadCatalog(tenantId);
  const full = catalog.pipelines.find((p) => p.id === pipeline.id);
  if (!full || full.filters.length === 0) return true;
  const fieldValues = await loadContactFieldValues(tenantId, contactId);
  return full.filters.every(
    (f) => fieldValues.get(f.fieldDefinitionId) === String(f.value ?? "").toLowerCase().trim()
  );
};
