import twilio from "twilio";
import { db, applyCreditDelta } from "@antigravity/db";
import { creditsForCall } from "@antigravity/types";
import { getErrorMessage } from "@antigravity/errors";
import { config } from "../config.js";
import { createLogger } from "../logger.js";

const log = createLogger("job:transfer-reconciliation");

const SWEEP_INTERVAL_MS = 60_000;
const LOOKBACK_HOURS = 48;

/**
 * Bills the human-to-human leg of transferred calls. When the AI hands a
 * caller off via SIP REFER, Twilio ENDS the original inbound leg and creates
 * a NEW "trunking-originating" leg (caller → transfer target) that carries
 * the human conversation — its `duration` field is exactly the talk time.
 * The voice-server tags the log with `metadata.transfer = { status:
 * "answered", callerNumber, to, at }`; this sweeper locates that leg on
 * Twilio, writes the duration back onto the log, and applies an idempotent
 * credit charge (refId `{logId}:transfer`).
 */
export const sweepPendingTransfers = async (): Promise<void> => {
  if (!config.twilio.accountSid || !config.twilio.authToken) return;

  const cutoff = new Date(Date.now() - LOOKBACK_HOURS * 3_600_000);
  const rows = await db.communicationLog.findMany({
    where: {
      type: "CALL",
      occurredAt: { gt: cutoff },
      metadata: { path: ["transfer", "status"], equals: "answered" },
    },
    orderBy: { occurredAt: "asc" },
    take: 20,
    select: { id: true, tenantId: true, metadata: true },
  });
  if (rows.length === 0) return;

  const client = twilio(config.twilio.accountSid, config.twilio.authToken);

  for (const row of rows) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const transfer = (meta.transfer ?? {}) as Record<string, unknown>;

    const finalize = async (durationSeconds: number, status: string) => {
      await db.communicationLog.update({
        where: { id: row.id },
        data: {
          metadata: { ...meta, transfer: { ...transfer, status, durationSeconds } } as never,
        },
      });
    };

    try {
      const callerNumber = typeof transfer.callerNumber === "string" ? transfer.callerNumber : null;
      const target = typeof transfer.to === "string" ? transfer.to : null;
      const transferAt = typeof transfer.at === "string" ? new Date(transfer.at) : null;

      if (!callerNumber || !target || !transferAt || Number.isNaN(transferAt.getTime())) {
        log.error("transfer lacks callerNumber/to/at — marking unbillable", { logId: row.id });
        await finalize(0, "completed_unbilled");
        continue;
      }

      const legs = await client.calls.list({
        from: callerNumber,
        to: target,
        startTimeAfter: new Date(transferAt.getTime() - 60_000),
        limit: 5,
      });
      const stillLive = legs.some((c) => ["queued", "ringing", "in-progress"].includes(c.status));
      if (stillLive) continue; // humans still talking — retry next sweep

      const done = legs.find((c) => c.status === "completed");
      if (!done) {
        // The leg can lag Twilio's list API briefly; give it 30 minutes
        // before declaring the transfer unbillable.
        if (Date.now() - transferAt.getTime() > 30 * 60_000) {
          log.error("no completed transfer leg found on Twilio — marking unbillable", {
            logId: row.id,
            callerNumber,
            target,
          });
          await finalize(0, "completed_unbilled");
        }
        continue;
      }

      const durationSeconds = Math.max(0, Number(done.duration) || 0);
      await finalize(durationSeconds, "completed");
      log.info("transfer duration recorded", { logId: row.id, durationSeconds, legSid: done.sid });

      if (durationSeconds > 0) {
        const cost = creditsForCall(durationSeconds);
        const result = await applyCreditDelta({
          tenantId: row.tenantId,
          delta: -cost,
          reason: "CALL_DEDUCTION",
          refId: `${row.id}:transfer`,
          note: `Transfer leg to ${String(transfer.to ?? "team")} · ${Math.max(1, Math.ceil(durationSeconds / 60))} min`,
        });
        log.info(result.duplicate ? "transfer leg already charged" : "transfer leg charged", {
          logId: row.id,
          cost,
          applied: result.applied,
          balance: result.balance,
        });
      }
    } catch (err) {
      // Leave the row as-is: the next sweep retries, and the 48h lookback
      // window bounds how long a broken row can keep getting retried.
      log.error("transfer reconciliation failed — will retry next sweep", {
        logId: row.id,
        error: getErrorMessage(err),
      });
    }
  }
};

export const startTransferReconciliation = (): NodeJS.Timeout => {
  log.info("transfer reconciliation sweeper started", {
    intervalMs: SWEEP_INTERVAL_MS,
    lookbackHours: LOOKBACK_HOURS,
  });
  setTimeout(() => {
    sweepPendingTransfers().catch((err) =>
      log.error("sweep failed", { error: getErrorMessage(err) })
    );
  }, 10_000).unref();
  return setInterval(() => {
    sweepPendingTransfers().catch((err) =>
      log.error("sweep failed", { error: getErrorMessage(err) })
    );
  }, SWEEP_INTERVAL_MS);
};
