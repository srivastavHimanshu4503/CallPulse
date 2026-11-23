import { db } from "../client.js";
import type { Prisma, SearchOutboxEvent } from "../../generated/prisma-client/index.js";

export interface EnqueueSearchOutboxInput {
  tenantId: string;
  entityType: "contact" | "deal";
  entityId: string;
  action: "UPSERT" | "DELETE";
  payload: Record<string, any>;
}

/**
 * Enqueue a search outbox event inside a transaction or on the primary db client.
 * Guarantees atomic search synchronization with database writes.
 */
export async function enqueueSearchOutbox(
  txOrDb: Prisma.TransactionClient | typeof db,
  input: EnqueueSearchOutboxInput,
): Promise<SearchOutboxEvent> {
  return (txOrDb as any).searchOutboxEvent.create({
    data: {
      tenantId: input.tenantId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload,
      status: "PENDING",
    },
  });
}
