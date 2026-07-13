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
  occurredAt: Date;
}): Promise<CommunicationLog> => {
  return db.communicationLog.create({
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
      occurredAt: input.occurredAt,
    },
  });
};
