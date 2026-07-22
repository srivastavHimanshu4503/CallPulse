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
import type { JobHandler, PostCallContext } from "./types.js";

const log = createLogger("job:deal-creation");

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
const MAX_OPEN_DEALS = 5;

/**
 * Create or update a Deal when the call shows buying intent. A returning
 * caller talking about the SAME requirement updates their existing open deal
 * (value, summary, stage — confirmed → booked, cancelled → lost) instead of
 * spawning a duplicate. Idempotent by (commLogId, deal activity) — a retried
 * pipeline run never duplicates a deal or re-applies an update. Every
 * failure degrades gracefully: no deal is better than a broken pipeline.
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
      // Idempotency: one call → at most one deal create/update, across retries.
      const existing = await db.activity.findFirst({
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

      // Load the contact's open deals — the dedup core. A deal is "open"
      // until it lands on a won/lost stage (which stamps actualCloseDate).
      const openDeals = await db.deal.findMany({
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
          reasoning: verdict.reasoning,
        });

        if (verdict.decision === "UPDATE_EXISTING") {
          const matched = openDeals.find((d) => d.id === verdict.dealId);
          if (matched) {
            const dealId = await applyDealUpdate(ctx, matched, verdict.newStage, {
              value: verdict.updatedValue,
              summary: verdict.updatedSummary,
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

      // Prefer a pipeline named like "sales", else the tenant's first one.
      const pipelines = await db.pipeline.findMany({
        where: { tenantId: ctx.job.tenantId },
        orderBy: { createdAt: "asc" },
        include: {
          stageConfigs: { where: { archivedAt: null }, orderBy: { position: "asc" } },
        },
      });
      const pipeline =
        pipelines.find((p) => p.name.toLowerCase().includes("sales")) ?? pipelines[0];
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

      const deal = await db.deal.create({
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
          aiSummary:
            typeof ctx.extractedFields?.summary === "string"
              ? ctx.extractedFields.summary
              : null,
        },
      });

      await db.dealStageHistory.create({
        data: {
          tenantId: ctx.job.tenantId,
          dealId: deal.id,
          fromStage: null,
          toStage: firstStage,
          comment: "Created automatically from call",
        },
      });

      // Activity is best-effort: the deal exists either way, and a retry is
      // acceptable because the idempotency guard above keys on this row.
      try {
        await db.activity.create({
          data: {
            tenantId: ctx.job.tenantId,
            contactId: ctx.job.contactId,
            type: ACTIVITY_TYPES.DEAL_CREATED,
            summary: `Deal created: ${title}`,
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
        stage: firstStage,
        title,
      });
      return { dealId: deal.id };
    } catch (err) {
      log.error("deal creation failed — continuing pipeline", {
        logId: ctx.job.logId,
        error: getErrorMessage(err),
      });
      return {};
    }
  },
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
}

/**
 * Apply the matched update: optional stage move (with history + close-date
 * stamping on won/lost), optional value refresh, summary merge. Mirrors the
 * API server's stage-move semantics: AUTO probability follows the stage,
 * a MANUAL probability set by a human is never overwritten.
 */
const applyDealUpdate = async (
  ctx: PostCallContext,
  deal: OpenDealRow,
  newStageName: string | null,
  patch: { value: number | null; summary: string | null },
): Promise<string> => {
  const stageCfg = newStageName
    ? deal.pipeline?.stageConfigs.find(
        (s) => s.name.toLowerCase() === newStageName.toLowerCase(),
      )
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

  const updated = await db.deal.update({
    where: { id: deal.id },
    data: {
      value,
      probability,
      weightedValue: Math.round(value * probability) / 100,
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
    await db.dealStageHistory.create({
      data: {
        tenantId: ctx.job.tenantId,
        dealId: deal.id,
        fromStage: deal.stage,
        toStage: stageCfg!.name,
        comment: "Moved automatically from follow-up call",
      },
    });
  }

  // Best-effort activity — also the idempotency key for retried runs.
  try {
    await db.activity.create({
      data: {
        tenantId: ctx.job.tenantId,
        contactId: ctx.job.contactId,
        type: stageChanged ? ACTIVITY_TYPES.DEAL_STAGE_CHANGED : ACTIVITY_TYPES.FIELD_UPDATED,
        summary: stageChanged
          ? `Deal moved to ${stageCfg!.name} from follow-up call: ${deal.title}`
          : `Deal updated from follow-up call: ${deal.title}`,
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
  });
  return updated.id;
};
