import express, { Express } from "express";
import cors from "cors";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { sendSuccess } from "./utils/response.js";

const app: Express = express();

// Standard express middleware configurations
app.use(cors({ origin: "*" })); // Configure strictly in production
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route - returns { success: true, version: "1.1.0" } as requested
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    version: "1.1.0",
    data: {
      version: "1.1.0",
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
    version: "1.1.0",
  });
});

// Global error handler
app.use(errorMiddleware);

export default app;
export { app };
