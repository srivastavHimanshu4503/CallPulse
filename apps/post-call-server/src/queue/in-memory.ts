import { EventEmitter } from "events";
import { randomUUID } from "crypto";

import { createLogger } from "../logger.js";
import type { EnqueueOptions, JobHandle, JobProcessor, Queue, QueueMetrics } from "./types.js";

interface InternalJob<T> extends JobHandle<T> {
  maxAttempts: number;
  backoffMs: number;
}

interface Options {
  concurrency: number;
  maxAttempts: number;
}

/**
 * In-memory queue. Same public shape as BullMQ so swapping to BullMQ+Redis
 * later is a single-file change (`queue/factory.ts`).
 *
 * Trade-offs vs BullMQ:
 *   - No persistence: a process crash drops all waiting/active jobs. This is
 *     acceptable for post-call processing because the source of truth
 *     (`CommunicationLog` row with `extractionStatus = PENDING`) can be
 *     re-scanned by a reconciliation job.
 *   - No cross-process sharing: horizontal scale requires promoting to Redis.
 *   - Retries use linear backoff (BullMQ's default is exponential); good
 *     enough for our transient failure profile (LLM rate limits, DB blips).
 */
export class InMemoryQueue<T> implements Queue<T> {
  private log = createLogger("queue:in-memory");
  private events = new EventEmitter();
  private waiting: InternalJob<T>[] = [];
  private active = new Set<string>();
  private processor: JobProcessor<T> | null = null;
  private counts = { completed: 0, failed: 0 };
  private closed = false;

  constructor(
    public readonly name: string,
    private readonly opts: Options,
  ) {}

  async add(jobName: string, data: T, opts: EnqueueOptions = {}): Promise<JobHandle<T>> {
    if (this.closed) throw new Error(`Queue "${this.name}" is closed`);
    const id = opts.jobId ?? randomUUID();

    // Idempotent enqueue — BullMQ dedupes by jobId across the whole queue
    // (waiting + active + completed windows). We mirror the waiting/active
    // slice; a completed job with the same id may re-enter. For our use
    // case (jobId = logId) that's fine — completed jobs are cheap to skip
    // on the processor side once we add idempotency there.
    const dup =
      this.waiting.find((j) => j.id === id) ??
      (this.active.has(id) ? { id, name: jobName, data, attemptsMade: 0 } : null);
    if (dup) {
      this.log.debug("skipping duplicate enqueue", { id, jobName });
      return dup as JobHandle<T>;
    }

    const job: InternalJob<T> = {
      id,
      name: jobName,
      data,
      attemptsMade: 0,
      maxAttempts: opts.attempts ?? this.opts.maxAttempts,
      backoffMs: opts.backoffMs ?? 2_000,
    };
    this.waiting.push(job);
    this.log.info("job enqueued", {
      id,
      name: jobName,
      waiting: this.waiting.length,
      active: this.active.size,
    });
    this.pump();
    return job;
  }

  process(processor: JobProcessor<T>): void {
    if (this.processor) throw new Error(`Queue "${this.name}" already has a processor`);
    this.processor = processor;
    this.pump();
  }

  on(event: "completed" | "failed", listener: (...args: any[]) => void): void {
    this.events.on(event, listener);
  }

  metrics(): QueueMetrics {
    return {
      waiting: this.waiting.length,
      active: this.active.size,
      completed: this.counts.completed,
      failed: this.counts.failed,
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    this.waiting = [];
  }

  private pump(): void {
    if (!this.processor) return;
    while (!this.closed && this.active.size < this.opts.concurrency && this.waiting.length > 0) {
      const job = this.waiting.shift();
      if (!job) break;
      this.active.add(job.id);
      void this.run(job);
    }
  }

  private async run(job: InternalJob<T>): Promise<void> {
    if (!this.processor) return;
    job.attemptsMade += 1;
    try {
      await this.processor(job);
      this.counts.completed += 1;
      this.active.delete(job.id);
      this.events.emit("completed", job);
      this.log.info("job completed", { id: job.id, name: job.name, attempts: job.attemptsMade });
      this.pump();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.active.delete(job.id);
      if (job.attemptsMade < job.maxAttempts) {
        const delay = job.backoffMs * job.attemptsMade;
        this.log.warn("job failed — will retry", {
          id: job.id,
          name: job.name,
          attempts: job.attemptsMade,
          maxAttempts: job.maxAttempts,
          retryInMs: delay,
          message: error.message,
        });
        setTimeout(() => {
          if (this.closed) return;
          this.waiting.push(job);
          this.pump();
        }, delay).unref();
        return;
      }
      this.counts.failed += 1;
      this.events.emit("failed", job, error);
      this.log.error("job failed — max attempts exhausted (dead-letter)", {
        id: job.id,
        name: job.name,
        attempts: job.attemptsMade,
        message: error.message,
      });
      this.pump();
    }
  }
}
