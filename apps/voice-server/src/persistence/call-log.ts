import { findOrCreateContactByPhone, logCall } from "@antigravity/db";
import type { CommunicationLog } from "@antigravity/db";

import { createLogger } from "../logger.js";
import type { TranscriptTurn } from "../agent/session.js";

const log = createLogger("persistence:call-log");

export interface PersistCallLogInput {
  callSid: string;
  callerNumber: string;
  callerName?: string;
  tenantId: string;
  agentId: string;
  phoneNumberId?: string;
  startedAt: Date;
  durationSeconds: number;
  direction: "INBOUND" | "OUTBOUND";
  callSource: "sip" | "browser";
  transcript: TranscriptTurn[];
  metadata: Record<string, unknown>;
}

export interface PersistedCallLog {
  logId: string;
  contactId: string;
}

/**
 * Persist the end-of-call state to `CommunicationLog`. Durability point for
 * the whole pipeline — this write MUST succeed before we hand off to the
 * post-call-server. If this throws, the caller decides whether to retry, but
 * we never lose the transcript silently: the raw payload is logged at error
 * level so it can be recovered from logs.
 *
 * Idempotency: `providerRef` is the LiveKit callSid, so a duplicate emission
 * (e.g. a retried shutdown) would create a duplicate row. We accept that for
 * now — the write path is called exactly once from `ctx.addShutdownCallback`.
 * If we ever move to at-least-once semantics, add a unique index on
 * (tenantId, provider, providerRef) and switch to `upsert`.
 */
export const persistCallLog = async (input: PersistCallLogInput): Promise<PersistedCallLog> => {
  // Skip DB rows for calls we can't attribute — the phone-number-lookup path
  // already aborts before session creation, but browser test-calls with a
  // synthesized "unknown" caller number still reach here. We keep them.
  const isBrowser = input.callSource === "browser";
  const phone = input.callerNumber && input.callerNumber !== "unknown"
    ? input.callerNumber
    : isBrowser
      ? `test-${input.callSid}`
      : "unknown";

  const nameParts = input.callerName?.trim().split(/\s+/) ?? [];
  const firstName = nameParts[0];

  const contact = await findOrCreateContactByPhone({
    tenantId: input.tenantId,
    phone,
    firstName: firstName ?? (isBrowser ? "Test" : "Unknown"),
    lastName: firstName ? nameParts.slice(1).join(" ") : "Caller",
  });

  const transcriptText = flattenTranscript(input.transcript);

  let row: CommunicationLog;
  try {
    row = await logCall({
      tenantId: input.tenantId,
      agentId: input.agentId,
      contactId: contact.id,
      phoneNumberId: input.phoneNumberId,
      direction: input.direction,
      status: "COMPLETED",
      durationSeconds: input.durationSeconds,
      transcript: transcriptText || undefined,
      transcriptJson: input.transcript.map((t) => ({
        role: t.role,
        text: t.text,
        at: t.at.toISOString(),
      })) as any,
      provider: isBrowser ? "livekit-browser" : "livekit-sip",
      providerRef: input.callSid,
      occurredAt: input.startedAt,
    });
  } catch (err) {
    log.error("failed to persist call log — recovery payload follows", {
      callSid: input.callSid,
      tenantId: input.tenantId,
      agentId: input.agentId,
      contactId: contact.id,
      durationSeconds: input.durationSeconds,
      turnCount: input.transcript.length,
      message: (err as Error).message,
    });
    log.error("call-log recovery payload", { payload: input });
    throw err;
  }

  log.info("call log persisted", {
    logId: row.id,
    callSid: input.callSid,
    contactId: contact.id,
    turnCount: input.transcript.length,
    durationSeconds: input.durationSeconds,
  });

  return { logId: row.id, contactId: contact.id };
};

const flattenTranscript = (turns: TranscriptTurn[]): string =>
  turns
    .map((t) => `${t.role === "assistant" ? "Agent" : "Caller"}: ${t.text.trim()}`)
    .join("\n");
