import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../../config/database.js";
import { typesense } from "../../config/typesense.js";
import { enqueueSearchOutbox } from "@antigravity/db";
import { SearchOutboxProcessor } from "./outbox.service.js";

test("enqueueSearchOutbox — atomically creates a PENDING search outbox event", async () => {
  let createdEventData: any = null;

  const mockTx = {
    searchOutboxEvent: {
      create: async (args: any) => {
        createdEventData = args.data;
        return { id: "outbox-uuid-1", ...args.data, createdAt: new Date(), updatedAt: new Date() };
      },
    },
  };

  const result = await enqueueSearchOutbox(mockTx as any, {
    tenantId: "tenant-outbox-1",
    entityType: "contact",
    entityId: "contact-123",
    action: "UPSERT",
    payload: {
      id: "contact-123",
      firstName: "Aarav",
      lastName: "Sharma",
      phones: ["+919876543210"],
    },
  });

  assert.equal(result.id, "outbox-uuid-1");
  assert.equal(createdEventData.status, "PENDING");
  assert.equal(createdEventData.tenantId, "tenant-outbox-1");
  assert.equal(createdEventData.entityType, "contact");
  assert.equal(createdEventData.action, "UPSERT");
  assert.equal(createdEventData.payload.firstName, "Aarav");
});

test("SearchOutboxProcessor — successfully syncs UPSERT to Typesense and marks PROCESSED", async () => {
  const processor = new SearchOutboxProcessor();

  const mockEvents = [
    {
      id: "evt-1",
      tenantId: "tenant-1",
      entityType: "contact",
      entityId: "c-1",
      action: "UPSERT",
      payload: { id: "c-1", firstName: "Rahul", lastName: "Verma" },
      status: "PENDING",
      retryCount: 0,
      lastError: null,
      createdAt: new Date(),
    },
  ];

  let claimedIds: string[] = [];
  let updatedStatus: any = null;
  let upsertedDoc: any = null;

  (db as any).searchOutboxEvent = {
    findMany: async () => mockEvents,
    updateMany: async (args: any) => {
      claimedIds = args.where.id.in;
      return { count: claimedIds.length };
    },
    update: async (args: any) => {
      updatedStatus = args.data.status;
      return { id: args.where.id, ...args.data };
    },
    count: async () => 0,
  };

  (typesense as any).collections = (collectionName: string) => ({
    documents: () => ({
      upsert: async (doc: any) => {
        upsertedDoc = doc;
        assert.equal(collectionName, "contacts");
        return { success: true };
      },
    }),
  });

  const result = await processor.processBatch(10);

  assert.equal(result.processed, 1);
  assert.equal(result.failed, 0);
  assert.deepEqual(claimedIds, ["evt-1"]);
  assert.equal(updatedStatus, "PROCESSED");
  assert.equal(upsertedDoc.firstName, "Rahul");
});

test("SearchOutboxProcessor — successfully syncs DELETE to Typesense and handles 404 idempotently", async () => {
  const processor = new SearchOutboxProcessor();

  const mockEvents = [
    {
      id: "evt-2",
      tenantId: "tenant-1",
      entityType: "deal",
      entityId: "d-1",
      action: "DELETE",
      payload: { id: "d-1" },
      status: "PENDING",
      retryCount: 0,
      lastError: null,
      createdAt: new Date(),
    },
  ];

  let deletedDocId: string | null = null;
  let updatedStatus: any = null;

  (db as any).searchOutboxEvent = {
    findMany: async () => mockEvents,
    updateMany: async () => ({ count: 1 }),
    update: async (args: any) => {
      updatedStatus = args.data.status;
      return { id: args.where.id, ...args.data };
    },
    count: async () => 0,
  };

  (typesense as any).collections = (collectionName: string) => ({
    documents: (docId: string) => ({
      delete: async () => {
        deletedDocId = docId;
        assert.equal(collectionName, "deals");
        // Simulate Typesense 404 Not Found (already deleted)
        const notFoundErr: any = new Error("Document not found");
        notFoundErr.httpStatus = 404;
        throw notFoundErr;
      },
    }),
  });

  const result = await processor.processBatch(10);

  assert.equal(result.processed, 1);
  assert.equal(result.failed, 0);
  assert.equal(deletedDocId, "d-1");
  assert.equal(updatedStatus, "PROCESSED");
});

test("SearchOutboxProcessor — increments retryCount and records lastError on sync failure", async () => {
  const processor = new SearchOutboxProcessor();

  const mockEvents = [
    {
      id: "evt-3",
      tenantId: "tenant-1",
      entityType: "contact",
      entityId: "c-3",
      action: "UPSERT",
      payload: { id: "c-3" },
      status: "PENDING",
      retryCount: 1,
      lastError: null,
      createdAt: new Date(),
    },
  ];

  let savedRetryCount = 0;
  let savedStatus = "";
  let savedError = "";

  (db as any).searchOutboxEvent = {
    findMany: async () => mockEvents,
    updateMany: async () => ({ count: 1 }),
    update: async (args: any) => {
      savedStatus = args.data.status;
      savedRetryCount = args.data.retryCount;
      savedError = args.data.lastError;
      return { id: args.where.id, ...args.data };
    },
    count: async () => 1,
  };

  (typesense as any).collections = () => ({
    documents: () => ({
      upsert: async () => {
        throw new Error("Typesense connection refused: 503");
      },
    }),
  });

  const result = await processor.processBatch(10);

  assert.equal(result.processed, 0);
  assert.equal(result.failed, 1);
  assert.equal(savedStatus, "PENDING"); // Re-queued because retryCount 2 < 5
  assert.equal(savedRetryCount, 2);
  assert.match(savedError, /Typesense connection refused/);
});

test("SearchOutboxProcessor — marks event FAILED when max retries exceeded", async () => {
  const processor = new SearchOutboxProcessor();

  const mockEvents = [
    {
      id: "evt-4",
      tenantId: "tenant-1",
      entityType: "contact",
      entityId: "c-4",
      action: "UPSERT",
      payload: { id: "c-4" },
      status: "PENDING",
      retryCount: 4, // Next failure will hit maxRetries (5)
      lastError: null,
      createdAt: new Date(),
    },
  ];

  let savedStatus = "";
  let savedRetryCount = 0;

  (db as any).searchOutboxEvent = {
    findMany: async () => mockEvents,
    updateMany: async () => ({ count: 1 }),
    update: async (args: any) => {
      savedStatus = args.data.status;
      savedRetryCount = args.data.retryCount;
      return { id: args.where.id, ...args.data };
    },
    count: async () => 0,
  };

  (typesense as any).collections = () => ({
    documents: () => ({
      upsert: async () => {
        throw new Error("Unrecoverable schema mismatch");
      },
    }),
  });

  const result = await processor.processBatch(10);

  assert.equal(result.processed, 0);
  assert.equal(result.failed, 1);
  assert.equal(savedStatus, "FAILED");
  assert.equal(savedRetryCount, 5);
});
