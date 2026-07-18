import { getErrorMessage, toAppError } from "@antigravity/errors";
import { createLogger } from "../logger.js";
import { finalizeExtraction, markExtractionInProgress } from "../persistence/log-status.js";
import { creditDeduction } from "./credit-deduction.js";
import { crmExtraction } from "./crm-extraction.js";
import { recordingFetch } from "./recording-fetch.js";
import { dealCreation } from "./deal-creation.js";
import { chatDealCreation } from "./chat-deal-creation.js";
import { integrations } from "./integrations.js";
import { intentDetection } from "./intent-detection.js";
import { leadScoring } from "./lead-scoring.js";
import { notifications } from "./notifications.js";
import type { JobHandler, PostCallContext, PostCallJob } from "./types.js";

const log = createLogger("job:pipeline");

/**
 * Ordered handler list. Each handler reads what earlier ones produced, and
 * enriches the context. Order is deliberate:
 *
 *   1. intent-detection   → decides what kind of call this is
 *   2. crm-extraction     → structured field values from the transcript
 *   3. deal-creation      → optional; consults intent + extracted fields
 *   4. lead-scoring       → uses everything above
 *   5. notifications      → user-facing; runs only after data is stable
 *   6. integrations       → third-party fan-out; last so it sees final state
 *
 * Failure isolation: a throwing handler is logged and skipped — the rest of
 * the pipeline still runs with whatever context has accumulated, and partial
 * results are always persisted. The run is only re-queued (throw) when every
 * failure was retryable AND we produced nothing useful; otherwise a retry
 * would just repeat the same partial failure.
 */
const HANDLERS: JobHandler[] = [
  creditDeduction, // first — the call happened, it gets charged regardless
  recordingFetch, // attach the Twilio recording while LLM handlers run
  intentDetection,
  crmExtraction,
  dealCreation,
  leadScoring,
  notifications,
  integrations,
];

// Chat sessions reuse the same LLM handlers but: no per-call credit charge,
// no Twilio recording, and a session-aware deal handler that can merge a
// continuation chat into the previous session's deal.
const CHAT_HANDLERS: JobHandler[] = [
  intentDetection,
  crmExtraction,
  chatDealCreation,
  leadScoring,
  notifications,
  integrations,
];

export const runPostCallPipeline = (job: PostCallJob): Promise<void> =>
  runPipeline(job, HANDLERS);

export const runChatSessionPipeline = (job: PostCallJob): Promise<void> =>
  runPipeline(job, CHAT_HANDLERS);

const runPipeline = async (job: PostCallJob, handlers: JobHandler[]): Promise<void> => {
  const started = Date.now();
  log.info("pipeline start", {
    logId: job.logId,
    callSid: job.callSid,
    tenantId: job.tenantId,
    agentId: job.agentId,
    turnCount: job.transcript.length,
  });

  await markExtractionInProgress(job.logId);

  let ctx: PostCallContext = { job };
  const failures: { handler: string; message: string; retryable: boolean }[] = [];

  for (const handler of handlers) {
    const handlerStart = Date.now();
    try {
      const patch = await handler.run(ctx);
      ctx = { ...ctx, ...patch };
      log.info("handler ok", {
        logId: job.logId,
        handler: handler.name,
        ms: Date.now() - handlerStart,
      });
    } catch (err) {
      const appErr = toAppError(err);
      failures.push({
        handler: handler.name,
        message: getErrorMessage(err),
        retryable: appErr.retryable,
      });
      log.error("handler failed — continuing pipeline", {
        logId: job.logId,
        handler: handler.name,
        ...appErr.toJSON(),
      });
    }
  }

  await finalizeExtraction(job.logId, {
    status: failures.length === 0 ? "COMPLETED" : "FAILED",
    extractedFields: ctx.extractedFields,
    leadScore: ctx.leadScore,
    errors: failures.map((f) => `${f.handler}: ${f.message}`),
  });

  log.info("pipeline done", {
    logId: job.logId,
    totalMs: Date.now() - started,
    intent: ctx.intent?.primary,
    leadScore: ctx.leadScore,
    dealCreated: !!ctx.dealId,
    failedHandlers: failures.map((f) => f.handler),
  });

  // Re-queue only when a retry has a real chance of a different outcome:
  // every failure was transient and the run produced no extraction data.
  const producedNothing =
    (!ctx.extractedFields || Object.keys(ctx.extractedFields).length === 0) &&
    ctx.leadScore === undefined;
  if (failures.length > 0 && producedNothing && failures.every((f) => f.retryable)) {
    throw toAppError(
      new Error(
        `pipeline produced no data; retryable failures: ${failures
          .map((f) => f.handler)
          .join(", ")}`
      )
    );
  }
};
