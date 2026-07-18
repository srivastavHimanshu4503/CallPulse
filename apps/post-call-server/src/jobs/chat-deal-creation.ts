import { z } from "zod";
import { db } from "@antigravity/db";
import { getErrorMessage } from "@antigravity/errors";
import { ACTIVITY_TYPES } from "@antigravity/types";
import { createLogger } from "../logger.js";
import { extractStructured, llmEnabled } from "../llm/client.js";
import { buildTranscriptUserPrompt } from "../prompts/index.js";
import type { JobHandler, PostCallContext } from "./types.js";

const log = createLogger("job:chat-deal-creation");

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

/** How far back a previous session's deal is considered for continuation. */
const CONTINUATION_WINDOW_MS = 24 * 60 * 60 * 1000;

const SameDealSchema = z.object({
  sameDeal: z
    .boolean()
    .describe(
      "true ONLY if this conversation is clearly about the SAME purchase/booking as the existing deal (e.g. changing quantity, date, or details of it). false if it is a different event, product, or requirement.",
    ),
  reasoning: z.string().describe("One sentence citing the evidence"),
});

/**
 * Deal creation for chat sessions. Same quality bar as calls (deal-worthy
 * intent + positive amount), same idempotency pattern (DEAL_CREATED activity
 * keyed on the session's anchor commLog). Difference: a session that is a
 * clear continuation of a recently-processed session UPDATES that session's
 * deal instead of creating a duplicate — a contact can still hold many
 * distinct deals at once.
 */
export const chatDealCreation: JobHandler = {
  name: "chat-deal-creation",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    const intent = ctx.intent?.primary;
    const sessionId =
      typeof ctx.job.metadata?.sessionId === "string" ? ctx.job.metadata.sessionId : null;

    if (!intent || !DEAL_WORTHY_INTENTS.has(intent)) {
      log.info("skipping — intent is not deal-worthy", {
        logId: ctx.job.logId,
        intent: intent ?? "none",
      });
      return {};
    }
    const value = ctx.intent?.dealAmount ?? 0;
    if (value <= 0) {
      log.info("skipping — no deal amount extracted from chat", {
        logId: ctx.job.logId,
        intent,
      });
      return {};
    }

    try {
      // Idempotency: one session → at most one deal-create, across re-runs.
      const existing = await db.activity.findFirst({
        where: { commLogId: ctx.job.logId, type: ACTIVITY_TYPES.DEAL_CREATED },
        select: { dealId: true },
      });
      if (existing?.dealId) {
        log.info("deal already exists for this session — skipping", {
          logId: ctx.job.logId,
          dealId: existing.dealId,
        });
        return { dealId: existing.dealId };
      }

      // Continuation check: did a session for this contact+agent close
      // recently with a deal? If the LLM says this chat is about the same
      // requirement, update that deal instead of opening a duplicate.
      const previous = await db.chatSession.findFirst({
        where: {
          tenantId: ctx.job.tenantId,
          contactId: ctx.job.contactId,
          agentId: ctx.job.agentId,
          status: "PROCESSED",
          dealId: { not: null },
          processedAt: { gte: new Date(Date.now() - CONTINUATION_WINDOW_MS) },
          ...(sessionId ? { id: { not: sessionId } } : {}),
        },
        orderBy: { processedAt: "desc" },
      });

      if (previous?.dealId && llmEnabled()) {
        const deal = await db.deal.findFirst({
          where: { id: previous.dealId, tenantId: ctx.job.tenantId, deletedAt: null },
        });
        if (deal) {
          const verdict = await extractStructured({
            schema: SameDealSchema,
            schemaName: "SameDealCheck",
            system:
              "You decide whether a new chat conversation is about the same deal as an existing CRM deal, or a brand-new requirement. Be conservative: when unsure, answer false — a duplicate deal is cheaper than silently merging two different requirements.",
            user: `EXISTING DEAL:\ntitle: ${deal.title}\nvalue: ₹${deal.value}\nsummary: ${deal.aiSummary ?? "(none)"}\n\nNEW CONVERSATION:\n${buildTranscriptUserPrompt(ctx.job.transcript)}`,
          });
          if (verdict.sameDeal) {
            const updated = await db.deal.update({
              where: { id: deal.id },
              data: {
                value,
                weightedValue: Math.round(value * deal.probability) / 100,
                aiSummary:
                  typeof ctx.extractedFields?.summary === "string"
                    ? ctx.extractedFields.summary
                    : deal.aiSummary,
                lastActivityAt: new Date(),
              },
            });
            log.info("continuation — updated existing deal", {
              logId: ctx.job.logId,
              dealId: updated.id,
              newValue: value,
              reasoning: verdict.reasoning,
            });
            return { dealId: updated.id };
          }
          log.info("not a continuation — creating a separate deal", {
            logId: ctx.job.logId,
            candidateDealId: deal.id,
            reasoning: verdict.reasoning,
          });
        }
      }

      // Fresh deal — mirrors the call path: first open stage of the
      // "sales"-ish pipeline, AUTO probability.
      const pipelines = await db.pipeline.findMany({
        where: { tenantId: ctx.job.tenantId },
        orderBy: { createdAt: "asc" },
        include: {
          stageConfigs: { where: { archivedAt: null }, orderBy: { position: "asc" } },
        },
      });
      const pipeline =
        pipelines.find((p) => p.name.toLowerCase().includes("sales")) ?? pipelines[0];
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
          leadSource: "AI WhatsApp",
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
          comment: "Created automatically from WhatsApp conversation",
        },
      });

      try {
        await db.activity.create({
          data: {
            tenantId: ctx.job.tenantId,
            contactId: ctx.job.contactId,
            type: ACTIVITY_TYPES.DEAL_CREATED,
            summary: `Deal created from WhatsApp: ${title}`,
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

      log.info("deal created from chat session", {
        logId: ctx.job.logId,
        sessionId,
        dealId: deal.id,
        value,
        title,
      });
      return { dealId: deal.id };
    } catch (err) {
      log.error("chat deal creation failed — continuing pipeline", {
        logId: ctx.job.logId,
        error: getErrorMessage(err),
      });
      return {};
    }
  },
};
