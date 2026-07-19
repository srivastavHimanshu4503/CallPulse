import { db } from "../client.js";
import type { CommunicationLog, Prisma } from "../../generated/prisma-client/index.js";

/**
 * Persist a call summary at the end of a voice session.
 *
 * Called by the voice-server on `call.ended`. `tenantId`, `agentId`, and
 * `contactId` MUST be resolved beforehand — this function does not create
 * contacts implicitly; use `contacts.findOrCreateByPhone` for that first.
 */
export const logCall = async (input: {
  tenantId: string;
  agentId: string;
  contactId: string;
  phoneNumberId?: string;
  direction: "INBOUND" | "OUTBOUND";
  status: "COMPLETED" | "NO_ANSWER" | "FAILED" | "VOICEMAIL" | "BUSY";
  durationSeconds: number;
  transcript?: string;
  transcriptJson?: Prisma.InputJsonValue;
  provider?: string;
  providerRef?: string;
  metadata?: Prisma.InputJsonValue;
  occurredAt: Date;
}): Promise<CommunicationLog> => {
  // The CommunicationLog is the record of the call; the Activity row is what
  // surfaces it on the contact's timeline. Created together atomically so a
  // call can never exist without its timeline entry.
  return db.$transaction(async (tx) => {
    const row = await tx.communicationLog.create({
      data: {
        tenantId: input.tenantId,
        agentId: input.agentId,
        contactId: input.contactId,
        phoneNumberId: input.phoneNumberId,
        type: "CALL",
        direction: input.direction,
        status: input.status,
        duration: input.durationSeconds,
        transcript: input.transcript,
        transcriptJson: input.transcriptJson,
        provider: input.provider,
        providerRef: input.providerRef,
        metadata: input.metadata,
        occurredAt: input.occurredAt,
      },
    });

    const transferred = !!(input.metadata as { transfer?: { initiated?: boolean } } | undefined)
      ?.transfer?.initiated;

    await tx.activity.create({
      data: {
        tenantId: input.tenantId,
        contactId: input.contactId,
        type: input.direction === "INBOUND" ? "CALL_INBOUND" : "CALL_OUTBOUND",
        direction: input.direction,
        summary: `${input.direction === "INBOUND" ? "Inbound" : "Outbound"} call · ${formatDuration(input.durationSeconds)}${transferred ? " · transferred" : ""}`,
        commLogId: row.id,
        occurredAt: input.occurredAt,
      },
    });

    return row;
  });
};

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
