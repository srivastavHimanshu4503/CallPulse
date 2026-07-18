import { applyCreditDelta } from "@antigravity/db";
import { creditsForCall } from "@antigravity/types";
import { getErrorMessage } from "@antigravity/errors";
import { createLogger } from "../logger.js";
import type { JobHandler, PostCallContext } from "./types.js";

const log = createLogger("job:credit-deduction");

/**
 * Charge the call: 5 credits per started minute (CREDIT_COSTS in
 * @antigravity/types). Idempotent by logId — a retried pipeline run can
 * never double-charge. Calls the voice-server blocked for zero balance
 * carry metadata.outOfCredits and are not charged.
 */
export const creditDeduction: JobHandler = {
  name: "credit-deduction",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    const { tenantId, logId, durationSeconds, metadata, callerNumber } = ctx.job;

    if (metadata?.outOfCredits) {
      log.info("skipping — call was blocked for zero balance", { logId });
      return {};
    }
    if (durationSeconds <= 0) {
      log.info("skipping — zero-duration call", { logId });
      return {};
    }

    try {
      const cost = creditsForCall(durationSeconds);
      const result = await applyCreditDelta({
        tenantId,
        delta: -cost,
        reason: "CALL_DEDUCTION",
        refId: logId,
        note: `Call with ${callerNumber} · ${Math.max(1, Math.ceil(durationSeconds / 60))} min`,
      });

      log.info(result.duplicate ? "already charged (retry)" : "credits deducted", {
        logId,
        cost,
        applied: result.applied,
        balance: result.balance,
      });

      if (result.balance <= 0 && !result.duplicate) {
        log.warn("tenant is OUT OF CREDITS — further calls will be blocked", { tenantId });
      }
    } catch (err) {
      // Never break the pipeline over billing — the ledger can be
      // reconciled later from CommunicationLog durations.
      log.error("credit deduction failed — continuing pipeline", {
        logId,
        error: getErrorMessage(err),
      });
    }
    return {};
  },
};
