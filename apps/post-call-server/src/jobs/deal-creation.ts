import { db } from "@antigravity/db";
import { getErrorMessage } from "@antigravity/errors";
import { ACTIVITY_TYPES } from "@antigravity/types";
import { createLogger } from "../logger.js";
import { extractStructured, llmEnabled } from "../llm/client.js";
import {
  DealMatchSchema,
  buildDealMatchSystemPrompt,
  buildDealMatchUserPrompt,
  buildTranscriptUserPrompt,
  type OpenDealForMatch,
} from "../prompts/index.js";
import { routeNewDeal, validatePlacement } from "./pipeline-routing.js";
import type { JobHandler, PostCallContext } from "./types.js";

const log = createLogger("job:deal-creation");

/** Prisma client shape usable both directly and inside $transaction. */
type Db = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Intents that represent a sales opportunity. Support/complaint/spam calls
 * never create deals — that would pollute the pipeline.
 */
const DEAL_WORTHY_INTENTS = new Set([
  "BOOKING_REQUEST",
  "SALES_INQUIRY",
  "PRICING_INQUIRY",
  "CALLBACK_REQUEST",
]);

// These intents can never CREATE a deal, but when the contact already has an
// open deal they usually mean something happened to it (cancelled a booking,
// moved the date) — so they still go through the deal-match step.
const UPDATE_ONLY_INTENTS = new Set(["CANCELLATION", "RESCHEDULE"]);

const INTENT_LABELS: Record<string, string> = {
  BOOKING_REQUEST: "Booking request",
  SALES_INQUIRY: "Sales inquiry",
  PRICING_INQUIRY: "Pricing inquiry",
  CALLBACK_REQUEST: "Callback request",
};

/** How many of the contact's open deals the match LLM gets to look at. */
const MAX_OPEN_DEALS = 10;

/** Compact deal snapshot for the append-only deal_events diary. */
const snapshot = (d: {
  title: string;
  stage: string;
  value: number;
  probability: number;
  pipelineId?: string | null;
}) => ({
  title: d.title,
  stage: d.stage,
  value: d.value,
  probability: d.probability,
  pipelineId: d.pipelineId ?? null,
});

/** Best-effort diary write — never fails the pipeline. */
const writeDealEvent = async (
  tx: Db,
  data: {
    tenantId: string;
    dealId: string;
    eventType: "CREATED" | "UPDATED" | "STAGE_CHANGED";
    commLogId: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> => {
  try {
    await tx.dealEvent.create({
      data: {
        tenantId: data.tenantId,
        dealId: data.dealId,
        actor: "ai",
        eventType: data.eventType,
        commLogId: data.commLogId,
        before: (data.before as object) ?? undefined,
        after: (data.after as object) ?? undefined,
      },
    });
  } catch (err) {
    // Unique (commLogId, eventType) trips on replays — that's the guard doing
    // its job, not an error worth failing over.
    log.warn("deal event write skipped", {
      dealId: data.dealId,
      eventType: data.eventType,
      message: getErrorMessage(err),
    });
  }
};

/**
 * Create or update a Deal when the call shows buying intent. A returning
 * caller talking about the SAME requirement updates their existing open deal
 * (value, stage along the pipeline's own ladder, summary, title) instead of
 * spawning a duplicate. New deals are routed to the right pipeline via
 * rules → behavioral LLM shortlist → flagged default.
 *
 * Concurrency: the whole read → LLM → write sequence runs under a per-contact
 * Postgres advisory lock, so two near-simultaneous calls from the same number
 * can't both decide CREATE. Contention is one phone number — effectively zero
 * — so a simple lock is the right tool.
 *
 * Idempotency: the pipeline-level job claim stops duplicate runs; the unique
 * (commLogId, eventType) on deal_events is the write-level backstop.
 */
export const dealCreation: JobHandler = {
  name: "deal-creation",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    const intent = ctx.intent?.primary;
    const dealRelevant =
      !!intent && (DEAL_WORTHY_INTENTS.has(intent) || UPDATE_ONLY_INTENTS.has(intent));
    if (!dealRelevant) {
      log.info("skipping — intent is not deal-relevant", {
        logId: ctx.job.logId,
        intent: intent ?? "none",
      });
      return {};
    }
    if (!ctx.job.contactId) {
      log.info("skipping — no contact on call", { logId: ctx.job.logId });
      return {};
    }

    try {
      return await db.$transaction(
        async (tx) => run(tx as Db, ctx, intent),
        // The LLM decision happens inside the lock window; give it room.
        { timeout: 60_000, maxWait: 10_000 },
      );
    } catch (err) {
      log.error("deal creation failed — continuing pipeline", {
        logId: ctx.job.logId,
        error: getErrorMessage(err),
      });
      return {};
    }
  },
};

const run = async (
  tx: Db,
  ctx: PostCallContext,
  intent: string,
): Promise<Partial<PostCallContext>> => {
  // Serialize per contact: read → decide → write is atomic vs other calls
  // from the same number. Lock releases with the transaction.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${ctx.job.tenantId}:${ctx.job.contactId}`}))`;

  // Legacy idempotency guard (activity rows) kept as a second layer for jobs
  // processed before the claim table existed.
  const existing = await tx.activity.findFirst({
    where: {
      commLogId: ctx.job.logId,
      dealId: { not: null },
      type: {
        in: [
          ACTIVITY_TYPES.DEAL_CREATED,
          ACTIVITY_TYPES.DEAL_STAGE_CHANGED,
          ACTIVITY_TYPES.FIELD_UPDATED,
        ],
      },
    },
    select: { dealId: true },
  });
  if (existing?.dealId) {
    log.info("deal already processed for this call — skipping", {
      logId: ctx.job.logId,
      dealId: existing.dealId,
    });
    return { dealId: existing.dealId };
  }

  // Load the contact's open deals — the dedup core. A deal is "open" until it
  // lands on a won/lost stage (which stamps actualCloseDate). Capped: even a
  // hyperactive contact yields a small, constant-size prompt.
  const openDeals = await tx.deal.findMany({
    where: {
      tenantId: ctx.job.tenantId,
      contactId: ctx.job.contactId,
      deletedAt: null,
      actualCloseDate: null,
    },
    orderBy: { lastActivityAt: "desc" },
    take: MAX_OPEN_DEALS,
    include: {
      pipeline: {
        include: {
          stageConfigs: { where: { archivedAt: null }, orderBy: { position: "asc" } },
        },
      },
    },
  });

  if (openDeals.length > 0 && llmEnabled()) {
    const candidates: OpenDealForMatch[] = openDeals.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      value: d.value,
      summary: d.aiSummary,
      lastActivityAt: d.lastActivityAt?.toISOString() ?? null,
      stages: (d.pipeline?.stageConfigs ?? []).map((s) => ({
        name: s.name,
        probability: s.probability,
        isWon: s.isWon,
        isLost: s.isLost,
      })),
    }));

    const verdict = await extractStructured({
      schema: DealMatchSchema,
      schemaName: "DealMatch",
      system: buildDealMatchSystemPrompt(),
      user: buildDealMatchUserPrompt(
        candidates,
        intent,
        buildTranscriptUserPrompt(ctx.job.transcript),
      ),
    });

    log.info("deal-match verdict", {
      logId: ctx.job.logId,
      decision: verdict.decision,
      dealId: verdict.dealId,
      newStage: verdict.newStage,
      updatedValue: verdict.updatedValue,
      newTitle: verdict.newTitle,
      reasoning: verdict.reasoning,
    });

    if (verdict.decision === "UPDATE_EXISTING") {
      const matched = openDeals.find((d) => d.id === verdict.dealId);
      if (matched) {
        const dealId = await applyDealUpdate(tx, ctx, matched, verdict.newStage, {
          value: verdict.updatedValue,
          summary: verdict.updatedSummary,
          title: verdict.newTitle,
        });
        return { dealId };
      }
      log.warn("deal-match returned unknown dealId — falling through to create", {
        logId: ctx.job.logId,
        dealId: verdict.dealId,
      });
    } else if (verdict.decision === "NO_ACTION") {
      return {};
    }
    // CREATE_NEW falls through to the creation path below.
  }

  // Update-only intents never open a new deal.
  if (UPDATE_ONLY_INTENTS.has(intent)) {
    log.info("skipping create — update-only intent with no matching open deal", {
      logId: ctx.job.logId,
      intent,
    });
    return {};
  }

  // A new deal needs a real amount. Zero-value deals pollute the pipeline
  // and carry no signal — if the LLM couldn't extract or estimate an
  // amount, the lead still exists as a contact + activity, just not as a
  // deal. (Updates above are exempt: confirming a booking mentions no
  // price but still moves its deal.)
  const value = ctx.intent?.dealAmount ?? 0;
  if (value <= 0) {
    log.info("skipping — no deal amount extracted from call", {
      logId: ctx.job.logId,
      intent,
      dealAmount: ctx.intent?.dealAmount ?? null,
    });
    return {};
  }

  // ── Pipeline routing: rules → behavioral shortlist → flagged default ──
  const summaryText =
    typeof ctx.extractedFields?.summary === "string" ? ctx.extractedFields.summary : null;
  const routed = await routeNewDeal({
    tenantId: ctx.job.tenantId,
    contactId: ctx.job.contactId,
    intent,
    summary: summaryText,
    logId: ctx.job.logId,
  });
  let pipeline = routed.pipeline;
  let flagged = routed.flagged;
  // Post-hoc guard: an LLM pick must not violate the pipeline's own rules.
  if (pipeline && routed.method === "llm") {
    const allowed = await validatePlacement(ctx.job.tenantId, ctx.job.contactId, pipeline);
    if (!allowed) {
      log.warn("LLM pipeline pick violates its routing rules — reverting to default", {
        logId: ctx.job.logId,
        pipeline: pipeline.name,
      });
      pipeline = null;
      flagged = true;
    }
  }

  // New AI-sourced deals land in the first open (non-won/lost) stage and
  // inherit its default probability (source AUTO).
  const firstStageCfg = pipeline?.stageConfigs.find((s) => !s.isWon && !s.isLost);
  const firstStage = firstStageCfg?.name ?? pipeline?.stages[0] ?? "New Lead";
  const probability = firstStageCfg?.probability ?? 10;

  const callerName =
    typeof ctx.extractedFields?.name === "string" && ctx.extractedFields.name.trim()
      ? ctx.extractedFields.name.trim()
      : ctx.job.callerNumber;
  const title = `${INTENT_LABELS[intent] ?? "Opportunity"} — ${callerName}`;

  const deal = await tx.deal.create({
    data: {
      tenantId: ctx.job.tenantId,
      contactId: ctx.job.contactId,
      pipelineId: pipeline?.id,
      stageId: firstStageCfg?.id ?? null,
      title,
      value,
      stage: firstStage,
      probability,
      probabilitySource: "AUTO",
      weightedValue: Math.round(value * probability) / 100,
      leadSource: "AI Call",
      lastActivityAt: new Date(),
      // The review tag surfaces uncertain routing to the owner instead of
      // silently guessing — repeated flags nudge them toward routing rules.
      tags: flagged ? ["ai-review-pipeline"] : [],
      aiSummary: summaryText,
    },
  });

  await tx.dealStageHistory.create({
    data: {
      tenantId: ctx.job.tenantId,
      dealId: deal.id,
      fromStage: null,
      toStage: firstStage,
      comment: "Created automatically from call",
    },
  });

  await writeDealEvent(tx, {
    tenantId: ctx.job.tenantId,
    dealId: deal.id,
    eventType: "CREATED",
    commLogId: ctx.job.logId,
    after: snapshot(deal),
  });

  // Activity is best-effort: the deal exists either way, and a retry is
  // acceptable because the idempotency guards key on these rows.
  try {
    await tx.activity.create({
      data: {
        tenantId: ctx.job.tenantId,
        contactId: ctx.job.contactId,
        type: ACTIVITY_TYPES.DEAL_CREATED,
        summary: `Deal created in ${firstStage}${pipeline ? ` · ${pipeline.name}` : ""}${flagged ? " (pipeline needs review)" : ""}: ${title}`,
        commLogId: ctx.job.logId,
        dealId: deal.id,
        occurredAt: new Date(),
      },
    });
  } catch (err) {
    log.error("deal created but activity write failed", {
      logId: ctx.job.logId,
      dealId: deal.id,
      error: getErrorMessage(err),
    });
  }

  log.info("deal created", {
    logId: ctx.job.logId,
    dealId: deal.id,
    pipeline: pipeline?.name ?? "(none)",
    routedBy: routed.method,
    flagged,
    stage: firstStage,
    title,
  });
  return { dealId: deal.id };
};

interface OpenDealRow {
  id: string;
  title: string;
  stage: string;
  value: number;
  probability: number;
  probabilitySource: string;
  aiSummary: string | null;
  lastActivityAt: Date | null;
  pipeline: {
    stageConfigs: {
      id: string;
      name: string;
      probability: number;
      isWon: boolean;
      isLost: boolean;
    }[];
  } | null;
  pipelineId?: string | null;
}

/**
 * Apply the matched update: optional stage move (with history + close-date
 * stamping on won/lost), optional value refresh, summary merge, and a title
 * upgrade when the old title was the phone-number auto-template. Mirrors the
 * API server's stage-move semantics: AUTO probability follows the stage,
 * a MANUAL probability set by a human is never overwritten.
 */
const applyDealUpdate = async (
  tx: Db,
  ctx: PostCallContext,
  deal: OpenDealRow,
  newStageName: string | null,
  patch: { value: number | null; summary: string | null; title: string | null },
): Promise<string> => {
  const stageCfg = newStageName
    ? deal.pipeline?.stageConfigs.find((s) => s.name.toLowerCase() === newStageName.toLowerCase())
    : undefined;
  const stageChanged = !!stageCfg && stageCfg.name !== deal.stage;

  const value = patch.value && patch.value > 0 ? patch.value : deal.value;
  const probability = stageChanged
    ? deal.probabilitySource === "MANUAL"
      ? deal.probability
      : stageCfg!.isWon
        ? 100
        : stageCfg!.isLost
          ? 0
          : stageCfg!.probability
    : deal.probability;

  // Title refresh only makes sense while the title is still our template
  // ("Booking request — +91..."): a human-edited title is never overwritten.
  const titleIsTemplate = deal.title.includes(ctx.job.callerNumber);
  const newTitle =
    patch.title && patch.title.trim() && patch.title.length <= 80 && titleIsTemplate
      ? patch.title.trim()
      : null;

  const before = snapshot(deal);
  const updated = await tx.deal.update({
    where: { id: deal.id },
    data: {
      value,
      probability,
      weightedValue: Math.round(value * probability) / 100,
      ...(newTitle ? { title: newTitle } : {}),
      ...(stageChanged
        ? {
            stageId: stageCfg!.id,
            stage: stageCfg!.name,
            actualCloseDate: stageCfg!.isWon || stageCfg!.isLost ? new Date() : null,
          }
        : {}),
      aiSummary:
        patch.summary ??
        (typeof ctx.extractedFields?.summary === "string"
          ? ctx.extractedFields.summary
          : deal.aiSummary),
      lastActivityAt: new Date(),
    },
  });

  if (stageChanged) {
    await tx.dealStageHistory.create({
      data: {
        tenantId: ctx.job.tenantId,
        dealId: deal.id,
        fromStage: deal.stage,
        toStage: stageCfg!.name,
        comment: "Moved automatically from follow-up call",
      },
    });
  }

  await writeDealEvent(tx, {
    tenantId: ctx.job.tenantId,
    dealId: deal.id,
    eventType: stageChanged ? "STAGE_CHANGED" : "UPDATED",
    commLogId: ctx.job.logId,
    before,
    after: snapshot(updated),
  });

  // Best-effort activity — also the legacy idempotency key for retried runs.
  try {
    await tx.activity.create({
      data: {
        tenantId: ctx.job.tenantId,
        contactId: ctx.job.contactId,
        type: stageChanged ? ACTIVITY_TYPES.DEAL_STAGE_CHANGED : ACTIVITY_TYPES.FIELD_UPDATED,
        summary: stageChanged
          ? `Deal moved ${deal.stage} → ${stageCfg!.name} (follow-up call): ${updated.title}`
          : `Deal updated from follow-up call (stays in ${deal.stage}): ${updated.title}`,
        commLogId: ctx.job.logId,
        dealId: deal.id,
        occurredAt: new Date(),
      },
    });
  } catch (err) {
    log.error("deal updated but activity write failed", {
      logId: ctx.job.logId,
      dealId: deal.id,
      error: getErrorMessage(err),
    });
  }

  log.info("existing deal updated from follow-up call", {
    logId: ctx.job.logId,
    dealId: updated.id,
    stageChanged,
    fromStage: deal.stage,
    toStage: stageChanged ? stageCfg!.name : deal.stage,
    value,
    titleRefreshed: !!newTitle,
  });
  return updated.id;
};
