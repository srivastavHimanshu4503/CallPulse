import { db } from "@antigravity/db";
import { getErrorMessage } from "@antigravity/errors";
import { ACTIVITY_TYPES } from "@antigravity/types";
import { createLogger } from "../logger.js";
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

const INTENT_LABELS: Record<string, string> = {
  BOOKING_REQUEST: "Booking request",
  SALES_INQUIRY: "Sales inquiry",
  PRICING_INQUIRY: "Pricing inquiry",
  CALLBACK_REQUEST: "Callback request",
};

/**
 * Create a Deal on the tenant's pipeline when the call shows buying intent.
 * Idempotent by (commLogId, DEAL_CREATED activity) — a retried pipeline run
 * never duplicates a deal. Every failure degrades gracefully: no deal is
 * better than a broken pipeline.
 */
export const dealCreation: JobHandler = {
  name: "deal-creation",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    const intent = ctx.intent?.primary;
    if (!intent || !DEAL_WORTHY_INTENTS.has(intent)) {
      log.info("skipping — intent is not deal-worthy", {
        logId: ctx.job.logId,
        intent: intent ?? "none",
      });
      return {};
    }
    if (!ctx.job.contactId) {
      log.info("skipping — no contact on call", { logId: ctx.job.logId });
      return {};
    }
    // A deal needs a real amount. Zero-value deals pollute the pipeline and
    // carry no signal — if the LLM couldn't extract or estimate an amount,
    // the lead still exists as a contact + activity, just not as a deal.
    const value = ctx.intent?.dealAmount ?? 0;
    if (value <= 0) {
      log.info("skipping — no deal amount extracted from call", {
        logId: ctx.job.logId,
        intent,
        dealAmount: ctx.intent?.dealAmount ?? null,
      });
      return {};
    }

    try {
      // Idempotency: one call → at most one deal, even across queue retries.
      const existing = await db.activity.findFirst({
        where: { commLogId: ctx.job.logId, type: ACTIVITY_TYPES.DEAL_CREATED },
        select: { dealId: true },
      });
      if (existing?.dealId) {
        log.info("deal already exists for this call — skipping", {
          logId: ctx.job.logId,
          dealId: existing.dealId,
        });
        return { dealId: existing.dealId };
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
