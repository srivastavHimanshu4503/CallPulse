import { db } from "../../config/database.js";
import { typesense } from "../../config/typesense.js";
import { logger } from "../../utils/logger.js";

export interface OutboxProcessResult {
  processed: number;
  failed: number;
  remaining: number;
}

export class SearchOutboxProcessor {
  private isProcessing = false;
  private readonly maxRetries = 5;

  /**
   * Process a batch of pending search outbox events.
   * Atomically claims events to PROCESSING state to prevent concurrent double-syncing.
   */
  async processBatch(batchSize = 50): Promise<OutboxProcessResult> {
    if (this.isProcessing) {
      return { processed: 0, failed: 0, remaining: 0 };
    }

    this.isProcessing = true;
    let processedCount = 0;
    let failedCount = 0;

    try {
      // 1. Fetch pending events eligible for processing
      const events = await (db as any).searchOutboxEvent.findMany({
        where: {
          status: "PENDING",
          retryCount: { lt: this.maxRetries },
        },
        orderBy: { createdAt: "asc" },
        take: batchSize,
      });

      if (!events || events.length === 0) {
        return { processed: 0, failed: 0, remaining: 0 };
      }

      // 2. Mark claimed events as PROCESSING
      const eventIds = events.map((e: any) => e.id);
      await (db as any).searchOutboxEvent.updateMany({
        where: { id: { in: eventIds }, status: "PENDING" },
        data: { status: "PROCESSING" },
      });

      // 3. Process each event through Typesense adapter
      for (const event of events) {
        try {
          const collection = `${event.entityType}s`; // e.g. "contacts", "deals"

          if (event.action === "UPSERT") {
            try {
              await (typesense as any).collections(collection).documents().upsert(event.payload);
            } catch (tsErr: any) {
              logger.warn({ error: tsErr?.message, collection }, "Typesense upsert warning");
              throw tsErr;
            }
          } else if (event.action === "DELETE") {
            try {
              await (typesense as any).collections(collection).documents(event.entityId).delete();
            } catch (tsErr: any) {
              // 404 (Not Found) is idempotent for delete operations
              if (tsErr?.httpStatus !== 404) {
                throw tsErr;
              }
            }
          }

          // Mark PROCESSED on successful sync
          await (db as any).searchOutboxEvent.update({
            where: { id: event.id },
            data: {
              status: "PROCESSED",
              processedAt: new Date(),
              lastError: null,
            },
          });
          processedCount++;
        } catch (err: any) {
          failedCount++;
          const newRetryCount = event.retryCount + 1;
          const isFailedPermanently = newRetryCount >= this.maxRetries;

          logger.error(
            { eventId: event.id, error: err?.message, retryCount: newRetryCount },
            "Failed to sync search outbox event to Typesense",
          );

          await (db as any).searchOutboxEvent.update({
            where: { id: event.id },
            data: {
              status: isFailedPermanently ? "FAILED" : "PENDING",
              retryCount: newRetryCount,
              lastError: err?.message || String(err),
            },
          });
        }
      }

      const remaining = await (db as any).searchOutboxEvent.count({
        where: { status: "PENDING" },
      });

      return {
        processed: processedCount,
        failed: failedCount,
        remaining,
      };
    } finally {
      this.isProcessing = false;
    }
  }
}

export const searchOutboxProcessor = new SearchOutboxProcessor();
