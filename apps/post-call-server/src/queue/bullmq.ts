import { EventEmitter } from "events";
import { Queue as BullQueue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";

import { createLogger } from "../logger.js";
import type {
  EnqueueOptions,
  JobHandle,
  JobProcessor,
  Queue,
  QueueEvents,
  QueueMetrics,
} from "./types.js";

interface BullMqOptions {
  concurrency: number;
  maxAttempts: number;
  redisUrl?: string;
  host?: string;
  port?: number;
  password?: string;
}

/**
 * BullMQ-backed queue for production workloads.
 * Persists all post-call processing jobs to Redis, ensuring that restarts,
 * crashes, and scaling events never drop billing deductions, contact extractions,
 * or owner notifications.
 */
export class BullMqQueue<T> implements Queue<T> {
  private log = createLogger("queue:bullmq");
  private events = new EventEmitter();
  private bullQueue: BullQueue<T, void, string>;
  private worker: Worker<T, void, string> | null = null;
  private processor: JobProcessor<T> | null = null;
  private redisConnection: Redis;
  private workerConnection: Redis;
  private closed = false;

  constructor(
    public readonly name: string,
    private readonly opts: BullMqOptions,
  ) {
    const connectionOptions = opts.redisUrl
      ? opts.redisUrl
      : {
          host: opts.host || "localhost",
          port: opts.port || 6379,
          password: opts.password,
          maxRetriesPerRequest: null,
        };

    // BullMQ requires maxRetriesPerRequest: null for blocking commands
    this.redisConnection =
      typeof connectionOptions === "string"
        ? new Redis(connectionOptions, { maxRetriesPerRequest: null })
        : new Redis(connectionOptions);

    this.workerConnection =
      typeof connectionOptions === "string"
        ? new Redis(connectionOptions, { maxRetriesPerRequest: null })
        : new Redis(connectionOptions);

    this.bullQueue = new BullQueue<T, void, string>(name, {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: opts.maxAttempts,
        backoff: {
          type: "exponential",
          delay: 2_000,
        },
        removeOnComplete: {
          count: 1000,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 5000,
        },
      },
    });

    this.redisConnection.on("error", (err) => {
      this.log.error("redis queue connection error", { message: err.message });
    });

    this.workerConnection.on("error", (err) => {
      this.log.error("redis worker connection error", { message: err.message });
    });
  }

  async add(jobName: string, data: T, opts: EnqueueOptions = {}): Promise<JobHandle<T>> {
    if (this.closed) throw new Error(`Queue "${this.name}" is closed`);

    const job = await this.bullQueue.add(jobName as any, data as any, {
      jobId: opts.jobId,
      attempts: opts.attempts ?? this.opts.maxAttempts,
      backoff: opts.backoffMs
        ? {
            type: "exponential",
            delay: opts.backoffMs,
          }
        : undefined,
    });

    const handle: JobHandle<T> = {
      id: String(job.id),
      name: job.name,
      data: job.data as T,
      attemptsMade: job.attemptsMade,
    };

    this.log.info("job enqueued in BullMQ", {
      id: handle.id,
      name: jobName,
      queue: this.name,
    });

    return handle;
  }

  process(processor: JobProcessor<T>): void {
    if (this.processor) throw new Error(`Queue "${this.name}" already has a processor`);
    this.processor = processor;

    this.worker = new Worker<T, void, string>(
      this.name,
      async (job: Job<T, void, string>) => {
        const handle: JobHandle<T> = {
          id: String(job.id),
          name: job.name,
          data: job.data as T,
          attemptsMade: job.attemptsMade,
        };
        await processor(handle);
      },
      {
        connection: this.workerConnection,
        concurrency: this.opts.concurrency,
      },
    );

    this.worker.on("completed", (job: Job<T, void, string>) => {
      const handle: JobHandle<T> = {
        id: String(job.id),
        name: job.name,
        data: job.data as T,
        attemptsMade: job.attemptsMade,
      };
      this.events.emit("completed", handle);
    });

    this.worker.on("failed", (job: Job<T, void, string> | undefined, err: Error) => {
      if (!job) return;
      const handle: JobHandle<T> = {
        id: String(job.id),
        name: job.name,
        data: job.data as T,
        attemptsMade: job.attemptsMade,
      };
      this.events.emit("failed", handle, err);
    });

    this.worker.on("error", (err) => {
      this.log.error("bullmq worker error", { message: err.message });
    });
  }

  on<K extends keyof QueueEvents<T>>(event: K, listener: QueueEvents<T>[K]): void {
    this.events.on(event, listener as (...args: unknown[]) => void);
  }

  async metrics(): Promise<QueueMetrics> {
    try {
      const counts = await this.bullQueue.getJobCounts("waiting", "active", "completed", "failed");
      return {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
      };
    } catch (err) {
      this.log.warn("failed to fetch BullMQ metrics", { message: (err as Error).message });
      return {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      };
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.worker) {
      await this.worker.close();
    }
    await this.bullQueue.close();
    await this.redisConnection.quit();
    await this.workerConnection.quit();
    this.log.info("BullMQ queue closed gracefully");
  }
}
