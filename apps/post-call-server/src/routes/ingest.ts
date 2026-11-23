import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { config } from "../config.js";
import { createLogger } from "../logger.js";
import type { Queue } from "../queue/types.js";
import type { PostCallJob } from "../jobs/types.js";

const log = createLogger("route:ingest");

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  at: z.string(),
});

const jobSchema = z.object({
  logId: z.string().min(1),
  callSid: z.string().min(1),
  tenantId: z.string().min(1),
  agentId: z.string().min(1),
  contactId: z.string().min(1),
  callerNumber: z.string(),
  startedAt: z.string(),
  durationSeconds: z.number().int().nonnegative(),
  direction: z.enum(["INBOUND", "OUTBOUND"]),
  callSource: z.enum(["sip", "browser"]),
  transcript: z.array(turnSchema),
  metadata: z.record(z.unknown()).default({}),
});

export const createIngestRouter = (queue: Queue<PostCallJob>): Router => {
  const router = Router();

  router.post("/ingest", async (req: Request, res: Response) => {
    // Shared-secret auth. In dev the secret can be unset, allowing localhost
    // testing without a header; in prod POST_CALL_SERVER_SECRET is required.
    if (config.auth.sharedSecret) {
      const provided = req.header("x-post-call-secret");
      if (provided !== config.auth.sharedSecret) {
        log.warn("rejected — bad or missing shared secret", {
          hasHeader: !!provided,
        });
        res.status(401).json({ error: "unauthorized" });
        return;
      }
    }

    log.info(`incoming payload\n${JSON.stringify(req.body, null, 2)}`);

    const parse = jobSchema.safeParse(req.body);
    if (!parse.success) {
      log.warn("rejected — payload validation failed", {
        issues: parse.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
      res.status(400).json({ error: "invalid_payload", issues: parse.error.issues });
      return;
    }

    const job = parse.data;
    try {
      // jobId = logId → idempotent enqueue. A retried voice-server dispatch
      // will not spawn a second pipeline run for the same call log.
      await queue.add("post-call", job, { jobId: job.logId });
    } catch (err) {
      log.error("enqueue failed", { logId: job.logId, message: (err as Error).message });
      res.status(503).json({ error: "enqueue_failed" });
      return;
    }

    log.info("job accepted", {
      logId: job.logId,
      callSid: job.callSid,
      turnCount: job.transcript.length,
      queue: await queue.metrics(),
    });
    res.status(202).json({ ok: true, logId: job.logId });
  });

  return router;
};
