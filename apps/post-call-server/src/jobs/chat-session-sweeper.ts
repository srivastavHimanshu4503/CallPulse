import { db } from "@antigravity/db";
import { getErrorMessage } from "@antigravity/errors";
import { config } from "../config.js";
import { createLogger } from "../logger.js";
import { runChatSessionPipeline } from "./pipeline.js";
import type { PostCallJob, TranscriptTurn } from "./types.js";

const log = createLogger("job:chat-session-sweeper");

/**
 * Chats have no hangup. A session counts as over after N minutes of silence
 * (config.chat.idleMinutes); this sweeper then runs the same post-processing
 * a call gets (intent → extraction → deal → scoring → notifications).
 *
 * A late reply simply opens a NEW session in the webhook handler — the
 * chat-deal-creation handler decides whether that new session continues the
 * previous deal or is a fresh one.
 */
export const sweepIdleChatSessions = async (): Promise<void> => {
  const idleCutoff = new Date(Date.now() - config.chat.idleMinutes * 60_000);
  const sessions = await db.chatSession.findMany({
    where: { status: "OPEN", lastMessageAt: { lt: idleCutoff } },
    orderBy: { lastMessageAt: "asc" },
    take: 20,
  });
  if (sessions.length === 0) return;

  log.info("processing idle chat sessions", { count: sessions.length });
  for (const session of sessions) {
    // Claim atomically so overlapping sweeps never double-process.
    const claimed = await db.chatSession.updateMany({
      where: { id: session.id, status: "OPEN" },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
    if (claimed.count !== 1) continue;

    try {
      const dealId = await processSession(session.id);
      if (dealId) {
        await db.chatSession.update({ where: { id: session.id }, data: { dealId } });
      }
    } catch (err) {
      // Release the claim so the next sweep retries.
      log.error("session processing failed — reopening for retry", {
        sessionId: session.id,
        error: getErrorMessage(err),
      });
      await db.chatSession
        .updateMany({
          where: { id: session.id },
          data: { status: "OPEN", processedAt: null },
        })
        .catch(() => {});
    }
  }
};

const processSession = async (sessionId: string): Promise<string | undefined> => {
  const session = await db.chatSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { contact: { select: { phones: true } } },
  });
  if (!session.commLogId) {
    log.warn("session has no anchor log — nothing to process", { sessionId });
    return undefined;
  }

  // One session = one CommunicationLog; the whole conversation lives in its
  // transcriptJson (same shape as a call transcript). That log anchors the
  // pipeline: extraction persists onto it, deal idempotency keys on it.
  const commLog = await db.communicationLog.findUniqueOrThrow({
    where: { id: session.commLogId },
    select: { id: true, transcriptJson: true },
  });
  const rawTurns = Array.isArray(commLog.transcriptJson) ? commLog.transcriptJson : [];
  const transcript: TranscriptTurn[] = rawTurns
    .map((t) => t as { role?: string; text?: string; at?: string })
    .filter((t) => (t.role === "user" || t.role === "assistant") && t.text)
    .map((t) => ({
      role: t.role as "user" | "assistant",
      text: t.text!,
      at: t.at ?? new Date().toISOString(),
    }));

  if (!transcript.some((t) => t.role === "user")) {
    log.info("session has no customer messages — closing without processing", { sessionId });
    return undefined;
  }

  // Duration from the last turn's timestamp, not session.lastMessageAt —
  // a manual "end conversation" rewinds lastMessageAt to force the sweep.
  const lastTurnAt = transcript[transcript.length - 1]?.at;
  const durationSeconds = Math.round(
    ((lastTurnAt ? new Date(lastTurnAt).getTime() : session.lastMessageAt.getTime()) -
      session.startedAt.getTime()) /
      1000,
  );
  // The conversation is over: the log leaves IN_PROGRESS regardless of how
  // post-processing goes.
  await db.communicationLog.update({
    where: { id: commLog.id },
    data: { status: "COMPLETED", duration: Math.max(durationSeconds, 0) },
  });

  const job: PostCallJob = {
    logId: commLog.id,
    callSid: `chat-${session.id}`,
    tenantId: session.tenantId,
    agentId: session.agentId,
    contactId: session.contactId,
    callerNumber: session.contact.phones[0] ?? "unknown",
    startedAt: session.startedAt.toISOString(),
    durationSeconds: Math.max(durationSeconds, 0),
    direction: "INBOUND",
    callSource: "browser", // not a SIP call — recording fetch is not in the chat pipeline anyway
    transcript,
    metadata: { channel: "whatsapp", sessionId: session.id },
  };

  log.info("running chat pipeline for session", {
    sessionId,
    turns: transcript.length,
    anchorLogId: commLog.id,
  });
  await runChatSessionPipeline(job);

  // The pipeline reports the deal on the anchor log's DEAL_CREATED activity
  // (create path) — for the merge path chat-deal-creation logs it, and we
  // read the freshest link from the activity if present.
  const activity = await db.activity.findFirst({
    where: { commLogId: commLog.id, type: "DEAL_CREATED" },
    select: { dealId: true },
  });
  return activity?.dealId ?? undefined;
};

export const startChatSessionSweeper = (): NodeJS.Timeout => {
  const intervalMs = config.chat.sweepIntervalMinutes * 60_000;
  log.info("chat session sweeper started", {
    idleMinutes: config.chat.idleMinutes,
    sweepIntervalMinutes: config.chat.sweepIntervalMinutes,
  });
  // First sweep shortly after boot so a restart doesn't delay processing.
  setTimeout(() => {
    sweepIdleChatSessions().catch((err) =>
      log.error("sweep failed", { error: getErrorMessage(err) }),
    );
  }, 15_000).unref();

  const timer = setInterval(() => {
    sweepIdleChatSessions().catch((err) =>
      log.error("sweep failed", { error: getErrorMessage(err) }),
    );
  }, intervalMs);
  timer.unref();
  return timer;
};
