import { config } from "../config.js";
import { InMemoryQueue } from "./in-memory.js";
import type { Queue } from "./types.js";

/**
 * Single seam that decides which queue backend runs. Today the only impl is
 * in-memory. When Redis lands, add a `BullMqQueue` implementing `Queue<T>`
 * and branch here on `POST_CALL_QUEUE_BACKEND`. Callers do not change.
 */
export const createQueue = <T>(name: string): Queue<T> =>
  new InMemoryQueue<T>(name, {
    concurrency: config.queue.concurrency,
    maxAttempts: config.queue.maxAttempts,
  });
