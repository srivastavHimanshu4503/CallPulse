import { db } from "@antigravity/db";
import { getErrorMessage } from "@antigravity/errors";
import { createLogger } from "../logger.js";

const log = createLogger("persistence:log-status");

/**
 * Update the `CommunicationLog.extractionStatus` field so the UI + downstream
 * consumers can see whether post-call processing has finished. Every write
 * here is best-effort: a status-update failure must never take down the
 * pipeline — the extraction results still exist in the job context and the
 * queue layer decides on retries.
 */

export const markExtractionInProgress = async (logId: string): Promise<void> => {
  try {
    const res = await db.communicationLog.updateMany({
      where: { id: logId },
      data: { extractionStatus: "PENDING" },
    });
    if (res.count === 0) {
      log.warn("no CommunicationLog row for logId — skipping status tracking", { logId });
    }
  } catch (err) {
    log.warn("failed to mark extraction PENDING", {
      logId,
      message: getErrorMessage(err),
    });
  }
};

/**
 * Final status write. Persists whatever data the pipeline produced — even a
 * partially-failed run keeps its extracted fields and lead score, with the
 * failure reasons recorded in metadata for later re-driving.
 */
export const finalizeExtraction = async (
  logId: string,
  result: {
    status: "COMPLETED" | "FAILED";
    extractedFields?: Record<string, unknown>;
    leadScore?: number;
    errors?: string[];
  },
): Promise<void> => {
  try {
    // Merge — never replace — the metadata JSON: it already carries keys
    // written by the voice server (transfer outcome, dialedNumber, room)
    // that billing and the UI read later.
    let metadata: Record<string, unknown> | undefined;
    if (result.errors && result.errors.length > 0) {
      const existing = await db.communicationLog.findUnique({
        where: { id: logId },
        select: { metadata: true },
      });
      metadata = {
        ...((existing?.metadata as Record<string, unknown> | null) ?? {}),
        extractionErrors: result.errors,
      };
    }

    await db.communicationLog.updateMany({
      where: { id: logId },
      data: {
        extractionStatus: result.status,
        extractedFields:
          result.extractedFields && Object.keys(result.extractedFields).length > 0
            ? (result.extractedFields as any)
            : undefined,
        sentimentScore: typeof result.leadScore === "number" ? result.leadScore : undefined,
        metadata: metadata as any,
      },
    });
  } catch (err) {
    log.error("failed to finalize extraction status", {
      logId,
      status: result.status,
      message: getErrorMessage(err),
    });
  }

  // NOTE: the call Activity keeps its simple factual title ("Inbound call ·
  // 47s"). The LLM summary is intentionally NOT written over it — the
  // timeline UI reads it from commLog.extractedFields.summary and shows it
  // inside the call card, so the list stays scannable.
};
