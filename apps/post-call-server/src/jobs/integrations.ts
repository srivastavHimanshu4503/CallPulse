import { createLogger } from "../logger.js";
import type { JobHandler, PostCallContext } from "./types.js";

const log = createLogger("job:integrations");

/**
 * Push the call outcome to configured third-party systems (external CRMs
 * like HubSpot / Salesforce, calendars, Zapier webhooks, sheets). Real
 * impl will iterate the tenant's integration configs and dispatch one
 * async task per active integration.
 *
 * Idempotency: dedupe by (logId, integration). External systems get one
 * write per call regardless of retries.
 */
export const integrations: JobHandler = {
  name: "integrations",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    log.info("stub — fanning out to integrations", {
      logId: ctx.job.logId,
      dealId: ctx.dealId,
    });
    return {};
  },
};
