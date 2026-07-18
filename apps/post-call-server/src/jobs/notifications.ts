import { createLogger } from "../logger.js";
import type { JobHandler, PostCallContext } from "./types.js";

const log = createLogger("job:notifications");

/**
 * Fan out user-visible notifications: SMS follow-ups, WhatsApp messages,
 * email digests, in-app inbox items. Real impl will consult the agent's
 * `smsEnabled` / `smsTriggerCondition` and the tenant's notification
 * preferences. Each channel is its own async task so a slow SMS provider
 * doesn't back up the queue.
 *
 * Idempotency: dedupe by (logId, channel). We NEVER send the same
 * follow-up twice on a retry.
 */
export const notifications: JobHandler = {
  name: "notifications",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    log.info("stub — sending notifications", {
      logId: ctx.job.logId,
      leadScore: ctx.leadScore,
      dealId: ctx.dealId,
    });
    return {};
  },
};
