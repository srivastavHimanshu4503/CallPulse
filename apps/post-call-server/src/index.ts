import { initSentry, captureError } from "@antigravity/observability";
import { db } from "@antigravity/db";
import express from "express";

import { config } from "./config.js";
import { createLogger } from "./logger.js";
import { runPostCallPipeline } from "./jobs/pipeline.js";
import { startChatSessionSweeper } from "./jobs/chat-session-sweeper.js";
import { startTransferReconciliation } from "./jobs/transfer-reconciliation.js";
import type { PostCallJob } from "./jobs/types.js";
import { createQueue } from "./queue/factory.js";
import { createIngestRouter } from "./routes/ingest.js";

const log = createLogger("server");

// Error monitoring — active only when SENTRY_DSN is set (deployed envs).
initSentry({ service: "post-call-server", environment: config.env });

const queue = createQueue<PostCallJob>("post-call");
queue.process(async (job) => {
  await runPostCallPipeline(job.data);
});
queue.on("failed", (job, err) => {
  log.error("job DLQ", { id: job.id, name: job.name, message: err.message });
  // A dead-lettered job means a call was never billed/analyzed — page-worthy.
  captureError(err, { where: "queue.dlq", jobId: String(job.id), jobName: job.name });
});

const app = express();
// Transcripts can be large; the default 100kb body limit truncates real
// calls. Ship a comfortable ceiling but keep it bounded to reject abuse.
app.use(express.json({ limit: "2mb" }));

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.path === "/health") return next();
  const start = Date.now();
  res.on("finish", () => {
    const meta = { status: res.statusCode, ms: Date.now() - start };
    const msg = `${req.method} ${req.originalUrl}`;
    if (res.statusCode >= 400) log.warn(msg, meta);
    else log.info(msg, meta);
  });
  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    env: config.env,
    timestamp: new Date().toISOString(),
    queue: queue.metrics(),
  });
});

app.use(createIngestRouter(queue));

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error("unhandled request error", { message: err.message, stack: err.stack });
  if (!res.headersSent) res.status(500).json({ error: "internal_server_error" });
});

const httpServer = app.listen(config.server.port, () => {
  log.info("post-call-server listening", { port: config.server.port });
});

const chatSweeper = startChatSessionSweeper();
const transferSweeper = startTransferReconciliation();

const gracefulShutdown = async (signal: string) => {
  log.info("shutdown signal received", { signal });
  const forceExitTimer = setTimeout(() => {
    log.error("forced exit — shutdown timed out");
    process.exit(1);
  }, 5000);
  forceExitTimer.unref();

  try {
    clearInterval(chatSweeper);
    clearInterval(transferSweeper);
    await queue.close();
    await db.$disconnect();
  } catch (err) {
    log.error("shutdown cleanup failed", { message: (err as Error).message });
  }

  httpServer.close(() => {
    log.info("http server closed");
    process.exit(0);
  });
};

process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  log.error("unhandled promise rejection", { reason: String(reason) });
});
process.on("uncaughtException", (err) => {
  log.error("uncaught exception", { message: err.message, stack: err.stack });
});
