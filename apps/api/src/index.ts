import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { db } from "./config/database.js";

async function main() {
  try {
    // Validate database connection before listening
    logger.info("Connecting to PostgreSQL...");
    await db.$connect();
    logger.info("PostgreSQL Database connected successfully!");

    app.listen(env.PORT, () => {
      logger.info(`🚀 Antigravity Core API started in ${env.NODE_ENV} mode on port ${env.PORT}`);
      logger.info(`Health check available at http://localhost:${env.PORT}/api/v1/health`);
    });
  } catch (error) {
    logger.error("Failed to start Antigravity Core API:", error);
    process.exit(1);
  }
}

main();
