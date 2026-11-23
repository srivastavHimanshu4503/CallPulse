import { config } from "../config.js";
import { createLogger } from "../logger.js";
import { InMemoryQueue } from "./in-memory.js";
import { BullMqQueue } from "./bullmq.js";
import type { Queue } from "./types.js";

const log = createLogger("queue:factory");

/**
 * Single seam that decides which queue backend runs.
 * Supports BullMQ with Redis persistence, with graceful automatic
 * fallback to InMemoryQueue for lightweight local development.
 */
export const createQueue = <T>(name: string): Queue<T> => {
  const backend = config.queue.backend;
  const hasRedis = Boolean(config.redis.url || (config.redis.host && process.env.REDIS_HOST));

  if (backend === "bullmq" || (backend === "auto" && hasRedis)) {
    try {
      log.info(`initializing BullMQ Redis queue for "${name}"`, {
        url: config.redis.url ? config.redis.url.replace(/:[^:@]*@/, ":***@") : undefined,
        host: config.redis.host,
        port: config.redis.port,
      });

      return new BullMqQueue<T>(name, {
        concurrency: config.queue.concurrency,
        maxAttempts: config.queue.maxAttempts,
        redisUrl: config.redis.url,
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      });
    } catch (err) {
      log.error(
        `failed to initialize BullMQ queue, falling back to in-memory: ${(err as Error).message}`,
      );
    }
  }

  log.info(
    `initializing InMemoryQueue for "${name}" (in-memory mode; jobs will not survive crashes)`,
  );
  return new InMemoryQueue<T>(name, {
    concurrency: config.queue.concurrency,
    maxAttempts: config.queue.maxAttempts,
  });
};
