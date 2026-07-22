import { db } from "@antigravity/db";
import { createLogger } from "../logger.js";

const log = createLogger("caller-context");

export interface CallerContext {
  /** Contact's name, when it is a real one (not the "Unknown Caller" placeholder). */
  name?: string;
  openDeals: {
    title: string;
    stage: string;
    value: number;
    summary: string | null;
  }[];
  lastCallAt?: Date;
  lastCallSummary?: string;
}

/**
 * Returning-caller context injected into the system prompt at call start so
 * the agent recognizes the caller, doesn't re-pitch from scratch, and can
 * resolve "wo wala booking" to the actual open deal. One indexed contact
 * lookup + two small queries — runs in parallel with the credit check, and
 * any failure degrades to a first-time-caller prompt.
 */
export const loadCallerContext = async (
  tenantId: string,
  callerNumber: string,
): Promise<CallerContext | null> => {
  if (!callerNumber || callerNumber === "unknown") return null;

  try {
    const contact = await db.contact.findFirst({
      where: { tenantId, phones: { has: callerNumber }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!contact) return null;

    const [deals, lastCall] = await Promise.all([
      db.deal.findMany({
        where: { tenantId, contactId: contact.id, deletedAt: null, actualCloseDate: null },
        orderBy: { lastActivityAt: "desc" },
        take: 3,
        select: { title: true, stage: true, value: true, aiSummary: true },
      }),
      db.communicationLog.findFirst({
        where: { tenantId, contactId: contact.id },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true, extractedFields: true },
      }),
    ]);

    const isPlaceholderName =
      contact.firstName === "Unknown" || contact.firstName.trim().length === 0;
    const name = isPlaceholderName
      ? undefined
      : `${contact.firstName} ${contact.lastName ?? ""}`.trim();

    const extracted = lastCall?.extractedFields as Record<string, unknown> | null;
    const lastCallSummary =
      typeof extracted?.summary === "string" && extracted.summary.trim()
        ? extracted.summary.trim()
        : undefined;

    if (!name && deals.length === 0 && !lastCallSummary) return null;

    return {
      name,
      openDeals: deals.map((d) => ({
        title: d.title,
        stage: d.stage,
        value: d.value,
        summary: d.aiSummary,
      })),
      lastCallAt: lastCall?.occurredAt,
      lastCallSummary,
    };
  } catch (err) {
    log.warn("caller context lookup failed — continuing without it", {
      callerNumber,
      message: (err as Error).message,
    });
    return null;
  }
};
