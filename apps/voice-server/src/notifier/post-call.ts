import { config } from "../config.js";
import { createLogger } from "../logger.js";
import type { TranscriptTurn } from "../agent/session.js";

const log = createLogger("notifier:post-call");

export interface PostCallDispatchInput {
  logId: string;
  callSid: string;
  tenantId: string;
  agentId: string;
  contactId: string;
  callerNumber: string;
  startedAt: Date;
  durationSeconds: number;
  direction: "INBOUND" | "OUTBOUND";
  callSource: "sip" | "browser";
  transcript: TranscriptTurn[];
  metadata: Record<string, unknown>;
}

/**
 * Hard cap on how long the shutdown callback waits for the post-call-server
 * to ack. Long enough for a DNS + TLS + POST roundtrip on a healthy network,
 * short enough that a hung/down post-call-server can't stall the LiveKit
 * child process teardown. If we hit this, the DB row still exists with
 * `extractionStatus = PENDING`, so a later reconciliation job can retry.
 */
const DISPATCH_TIMEOUT_MS = 5000;

/**
 * Dispatch to the post-call-server. MUST be awaited on the shutdown path —
 * previously we used `void fetch(...)` and the LiveKit child process would
 * die before the socket flushed, so the request never actually left the box
 * and every webhook silently failed with "fetch failed" / aborted.
 *
 * The DB row is already persisted before this fires, so if this rejects or
 * times out the transcript is safe: reconcile from `CommunicationLog` rows
 * with `extractionStatus = PENDING`.
 */
export const dispatchPostCall = async (input: PostCallDispatchInput): Promise<void> => {
  const url = config.postCallServer.ingestUrl;
  if (!url) {
    log.warn("post-call-server URL not configured — skipping dispatch", {
      logId: input.logId,
      callSid: input.callSid,
    });
    return;
  }

  const payload = {
    logId: input.logId,
    callSid: input.callSid,
    tenantId: input.tenantId,
    agentId: input.agentId,
    contactId: input.contactId,
    callerNumber: input.callerNumber,
    startedAt: input.startedAt.toISOString(),
    durationSeconds: input.durationSeconds,
    direction: input.direction,
    callSource: input.callSource,
    transcript: input.transcript.map((t) => ({
      role: t.role,
      text: t.text,
      at: t.at.toISOString(),
    })),
    metadata: input.metadata,
  };

  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Shared-secret auth. Post-call-server rejects requests where this
        // header is missing or doesn't match its own env-configured secret.
        ...(config.postCallServer.sharedSecret
          ? { "x-post-call-secret": config.postCallServer.sharedSecret }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      log.warn("post-call-server rejected ingest", {
        logId: input.logId,
        status: res.status,
        durationMs: Date.now() - started,
      });
      return;
    }
    log.info("post-call dispatch acked", {
      logId: input.logId,
      status: res.status,
      durationMs: Date.now() - started,
    });
  } catch (err) {
    const message = (err as Error).message;
    const aborted = (err as Error).name === "AbortError";
    log.warn("post-call dispatch failed", {
      logId: input.logId,
      url,
      aborted,
      message,
      durationMs: Date.now() - started,
    });
    console.error(
      "[CRITICAL] POST CALL WEBHOOK FAILED TO SEND!",
      aborted ? `timed out after ${DISPATCH_TIMEOUT_MS}ms` : message,
    );
  } finally {
    clearTimeout(timeout);
  }
};
