import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./config.js";
import { createLogger } from "./logger.js";
import voiceRouter from "./channels/voice/index.js";

const log = createLogger("server");

// Optional native import — worker cannot boot without it, but Express still can.
let agentsPkg: any = null;
try {
  agentsPkg = await import("@livekit/agents");
} catch (err) {
  log.warn("@livekit/agents failed to load; running in Express-only mode", {
    error: (err as Error)?.message,
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    env: config.env,
    timestamp: new Date().toISOString(),
    providers: {
      livekit: config.livekit.isConfigured,
      twilio: config.twilio.isConfigured,
      stt: !!config.stt.deepgramApiKey,
      tts: !!config.tts.sarvamApiKey,
      llm: {
        primary: `${config.llm.primary.provider}/${config.llm.primary.model}`,
        fallbacks: config.llm.fallbacks.map((f) => `${f.provider}/${f.model}`),
      },
    },
  });
});

app.use("/webhook/call", voiceRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error("unhandled request error", { message: err.message, stack: err.stack });
  if (!res.headersSent) res.status(500).json({ error: "internal_server_error" });
});

const httpServer = app.listen(config.server.port, () => {
  log.info("http server listening", {
    port: config.server.port,
    publicUrl: config.server.publicUrl,
  });
});

let worker: any = null;
if (agentsPkg && config.livekit.isConfigured) {
  try {
    log.info("initializing livekit agent worker", { agentName: "inbound-agent" });
    if (typeof agentsPkg.initializeLogger === "function") {
      agentsPkg.initializeLogger({ level: config.server.logLevel });
    }
    worker = new agentsPkg.Worker(
      new agentsPkg.WorkerOptions({
        agent: path.resolve(__dirname, "./agent/index.js"),
        wsURL: config.livekit.url!,
        apiKey: config.livekit.apiKey!,
        apiSecret: config.livekit.apiSecret!,
        agentName: "inbound-agent",
        // The child job process has to cold-import the whole dep graph
        // (Prisma generated client, LiveKit plugins, Sarvam/OpenAI SDKs) on
        // every spawn. LiveKit's default 10s budget is too tight in dev on
        // a Mac. Bump to 30s so we never falsely time out. In production
        // with `numIdleProcesses` warmed, real dispatch latency is < 100ms.
        initializeProcessTimeout: 30_000,
        // Keep 2 child processes warm and idle so an incoming job can be
        // handed to a ready worker instead of paying the cold-start tax.
        numIdleProcesses: 2,
        // Fixed port for the SDK's built-in health server: GET / returns 200
        // when the worker is registered with LiveKit and 503 when the
        // WebSocket has silently died (observed zombie connections in dev).
        // Docker's healthcheck probes this so autoheal can restart us.
        port: 8081,
      })
    );
    worker
      .run()
      .then(() => log.info("livekit agent worker running"))
      .catch((err: Error) => log.error("worker crashed", { message: err.message, stack: err.stack }));
  } catch (err) {
    log.error("failed to initialize worker", { message: (err as Error)?.message });
  }
} else {
  log.warn("livekit worker not started", {
    livekitConfigured: config.livekit.isConfigured,
    agentsLoaded: !!agentsPkg,
  });
}

const gracefulShutdown = async (signal: string) => {
  log.info("shutdown signal received", { signal });
  const forceExitTimer = setTimeout(() => {
    log.error("forced exit — shutdown timed out");
    process.exit(1);
  }, 5000);
  forceExitTimer.unref();

  try {
    if (worker) await worker.close();
    log.info("worker closed");
  } catch (err) {
    log.error("error closing worker", { message: (err as Error)?.message });
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
