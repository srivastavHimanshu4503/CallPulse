import express, { Express } from "express";
import cors from "cors";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.middleware.js";
import { sendSuccess } from "./utils/response.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { agentsRouter } from "./modules/agents/agents.router.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.router.js";
import { crmRouter } from "./modules/crm/crm.router.js";
import { bookingsRouter } from "./modules/bookings/bookings.router.js";
import { workflowsRouter } from "./modules/workflows/workflows.router.js";
import { billingRouter, billingWebhookHandler } from "./modules/billing/billing.router.js";
import { telephonyRouter } from "./modules/telephony/telephony.router.js";
import { recordingsRouter } from "./modules/recordings/recordings.router.js";
import { whatsappRouter, whatsappConversationsRouter } from "./modules/whatsapp/whatsapp.router.js";

const app: Express = express();

// Standard express middleware configurations
app.use(cors({ origin: "*" })); // Configure strictly in production
app.use(requestLoggerMiddleware);

// Razorpay webhook needs the RAW request bytes for signature verification,
// so it mounts BEFORE the global JSON parser.
app.post("/api/v1/billing/webhook", express.raw({ type: "*/*" }), billingWebhookHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/agents", agentsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/crm", crmRouter);
app.use("/api/v1/bookings", bookingsRouter);
app.use("/api/v1/workflows", workflowsRouter);
app.use("/api/v1/billing", billingRouter);
app.use("/api/v1/telephony", telephonyRouter);
app.use("/api/v1/recordings", recordingsRouter);
app.use("/api/v1/webhooks/whatsapp", whatsappRouter);
app.use("/api/v1/whatsapp", whatsappConversationsRouter);


// Health Check Route - returns { success: true, version: "1.0.0" } as requested
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    version: "1.0.0",
    data: {
      version: "1.0.0",
      status: "healthy",
      timestamp: new Date().toISOString(),
    },
    error: null,
  });
});

// Scaffold endpoint for API base
app.get("/api/v1", (_req, res) => {
  sendSuccess(res, {
    name: "Antigravity API Service",
    version: "1.0.0",
  });
});

// Global error handler
app.use(errorMiddleware);

export default app;
export { app };
