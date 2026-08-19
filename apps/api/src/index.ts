import { initSentry } from "@antigravity/observability";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { db } from "./config/database.js";

// Error monitoring — active only when SENTRY_DSN is set (deployed envs).
initSentry({ service: "api", environment: env.NODE_ENV });

async function main() {
  try {
    // Validate database connection before listening
    logger.info("Connecting to PostgreSQL...");
    await db.$connect();
    logger.info("PostgreSQL Database connected successfully!");

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Antigravity Core API started in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`Health check available at http://localhost:${env.PORT}/api/v1/health`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async () => {
      logger.info("Shutting down API server gracefully...");
      server.close();
      await db.$disconnect();
      process.exit(0);
    };

    process.once("SIGTERM", gracefulShutdown);
    process.once("SIGINT", gracefulShutdown);
  } catch (error) {
    logger.error("Failed to start Antigravity Core API:", error);
    process.exit(1);
  }
}

main();
