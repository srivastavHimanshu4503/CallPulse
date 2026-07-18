/**
 * Minimal queue interface, shaped after BullMQ's public API so a swap to
 * BullMQ+Redis is a single-file change in `queue/factory.ts`. Consumers of
 * this interface do not know or care which backend is running.
 */

export interface JobHandle<T> {
  id: string;
  name: string;
  data: T;
  attemptsMade: number;
}

export type JobProcessor<T> = (job: JobHandle<T>) => Promise<void>;

export interface QueueEvents<T> {
  completed: (job: JobHandle<T>) => void;
  failed: (job: JobHandle<T>, err: Error) => void;
}

export interface EnqueueOptions {
  /** Unique job id — enables idempotent enqueues (BullMQ semantics). */
  jobId?: string;
  /** Total attempts allowed including the first. */
  attempts?: number;
  /** ms to wait between retries; grows linearly by default. */
  backoffMs?: number;
}

export interface Queue<T> {
  name: string;
  add(name: string, data: T, opts?: EnqueueOptions): Promise<JobHandle<T>>;
  process(processor: JobProcessor<T>): void;
  on<K extends keyof QueueEvents<T>>(event: K, listener: QueueEvents<T>[K]): void;
  /** Snapshot of queue depth — for /health and future admin UI. */
  metrics(): QueueMetrics;
  close(): Promise<void>;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}
