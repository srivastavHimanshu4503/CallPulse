import twilio from "twilio";
import { db, applyCreditDelta } from "@antigravity/db";
import { creditsForCall } from "@antigravity/types";
import { getErrorMessage } from "@antigravity/errors";
import { config } from "../config.js";
import { createLogger } from "../logger.js";
import { resolveProvider } from "./recording-fetch.js";

const log = createLogger("job:transfer-reconciliation");

const SWEEP_INTERVAL_MS = 60_000;
const LOOKBACK_HOURS = 48;

/**
 * Bills the human-to-human leg of transferred calls. When the AI hands a
 * caller off via SIP REFER, the carrier ENDS the original inbound leg and
 * creates a NEW "trunking-originating" leg (caller → transfer target) that
 * carries the human conversation. The voice-server tags the log with
 * `metadata.transfer = { status: "answered", callerNumber, to, at }`
 * regardless of which carrier handled the call, so this sweeper resolves
 * the owning provider the same way recording-fetch does (by the dialed
 * DID's PhoneNumber row) and locates that leg on Twilio or Plivo — writing
 * the duration back onto the log and applying an idempotent credit charge
 * (refId `{logId}:transfer`).
 */
export const sweepPendingTransfers = async (): Promise<void> => {
  const twilioConfigured = Boolean(config.twilio.accountSid && config.twilio.authToken);
  const plivoConfigured = Boolean(config.plivo.authId && config.plivo.authToken);
  if (!twilioConfigured && !plivoConfigured) return;

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

  const twilioClient = twilioConfigured
    ? twilio(config.twilio.accountSid, config.twilio.authToken)
    : null;

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

      const dialed = typeof meta.dialedNumber === "string" ? meta.dialedNumber : undefined;
      const provider = await resolveProvider(row.tenantId, dialed);

      let stillLive: boolean;
      let doneDurationSeconds: number | null;
      let legRef: string | null = null;

      if (provider === "PLIVO") {
        if (!plivoConfigured) {
          log.error(
            "transfer leg is on Plivo but Plivo is not configured — will retry next sweep",
            {
              logId: row.id,
            },
          );
          continue;
        }
        const leg = await findPlivoTransferLeg(callerNumber, target, transferAt);
        stillLive = leg.stillLive;
        doneDurationSeconds = leg.durationSeconds;
        legRef = leg.callUuid;
      } else {
        if (!twilioClient) {
          log.error(
            "transfer leg is on Twilio but Twilio is not configured — will retry next sweep",
            {
              logId: row.id,
            },
          );
          continue;
        }
        const legs = await twilioClient.calls.list({
          from: callerNumber,
          to: target,
          startTimeAfter: new Date(transferAt.getTime() - 60_000),
          limit: 5,
        });
        stillLive = legs.some((c) => ["queued", "ringing", "in-progress"].includes(c.status));
        const done = legs.find((c) => c.status === "completed");
        doneDurationSeconds = done ? Math.max(0, Number(done.duration) || 0) : null;
        legRef = done?.sid ?? null;
      }

      if (stillLive) continue; // humans still talking — retry next sweep

      if (doneDurationSeconds === null) {
        // The leg can lag the carrier's list API briefly; give it 30 minutes
        // before declaring the transfer unbillable.
        if (Date.now() - transferAt.getTime() > 30 * 60_000) {
          log.error("no completed transfer leg found — marking unbillable", {
            logId: row.id,
            provider,
            callerNumber,
            target,
          });
          await finalize(0, "completed_unbilled");
        }
        continue;
      }

      const durationSeconds = doneDurationSeconds;
      await finalize(durationSeconds, "completed");
      log.info("transfer duration recorded", { logId: row.id, provider, durationSeconds, legRef });

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

// ── Plivo ───────────────────────────────────────────────────────────────
interface PlivoTransferCall {
  call_uuid: string;
  from_number: string;
  to_number: string;
  initiation_time?: string;
  answer_time?: string;
  end_time?: string;
}

/**
 * Locate the Plivo transfer leg (caller → transfer target) and, once it has
 * ended, its billable duration. Mirrors fetchPlivoRecording's auth/matching
 * pattern in recording-fetch.ts, but — unlike a recording fetch, which only
 * ever runs after the call is long over — this can run while the transfer
 * is still live, so it can't filter by `end_time` server-side. Instead it
 * pulls the most recent calls and matches client-side by number + time
 * proximity to the transfer, the same way the Twilio path above does.
 *
 * `end_time` presence is used as the live/completed signal rather than
 * `call_state`, since call_state's exact enum values aren't verified here —
 * an ended call always carries `end_time`, regardless of how it ended.
 */
const findPlivoTransferLeg = async (
  callerNumber: string,
  target: string,
  transferAt: Date,
): Promise<{ stillLive: boolean; durationSeconds: number | null; callUuid: string | null }> => {
  const authHeader =
    "Basic " + Buffer.from(`${config.plivo.authId}:${config.plivo.authToken}`).toString("base64");
  const baseUrl = `https://api.plivo.com/v1/Account/${config.plivo.authId}`;

  const bareCaller = callerNumber.replace(/^\+/, "");
  const bareTarget = target.replace(/^\+/, "");

  const callsResp = await fetch(`${baseUrl}/Call/?${new URLSearchParams({ limit: "20" })}`, {
    headers: { Authorization: authHeader },
    signal: AbortSignal.timeout(15_000),
  });
  if (!callsResp.ok) {
    log.warn("Plivo call list failed", { status: callsResp.status });
    return { stillLive: true, durationSeconds: null, callUuid: null }; // retry next sweep
  }
  const callsBody = (await callsResp.json()) as { objects?: PlivoTransferCall[] };
  const calls = callsBody.objects || [];

  const candidates = calls
    .filter((c) => c.from_number?.replace(/^\+/, "") === bareCaller)
    .filter((c) => c.to_number?.replace(/^\+/, "") === bareTarget)
    .filter((c) => {
      const started = c.initiation_time ? new Date(c.initiation_time).getTime() : 0;
      return started >= transferAt.getTime() - 60_000;
    })
    .sort((a, b) => {
      const ai = a.initiation_time ? new Date(a.initiation_time).getTime() : 0;
      const bi = b.initiation_time ? new Date(b.initiation_time).getTime() : 0;
      return Math.abs(ai - transferAt.getTime()) - Math.abs(bi - transferAt.getTime());
    });

  const call = candidates[0];
  if (!call) return { stillLive: false, durationSeconds: null, callUuid: null };
  if (!call.end_time) return { stillLive: true, durationSeconds: null, callUuid: call.call_uuid };

  const start = call.answer_time ?? call.initiation_time;
  const durationSeconds = start
    ? Math.max(
        0,
        Math.round((new Date(call.end_time).getTime() - new Date(start).getTime()) / 1000),
      )
    : 0;
  return { stillLive: false, durationSeconds, callUuid: call.call_uuid };
};

export const startTransferReconciliation = (): NodeJS.Timeout => {
  log.info("transfer reconciliation sweeper started", {
    intervalMs: SWEEP_INTERVAL_MS,
    lookbackHours: LOOKBACK_HOURS,
  });
  setTimeout(() => {
    sweepPendingTransfers().catch((err) =>
      log.error("sweep failed", { error: getErrorMessage(err) }),
    );
  }, 10_000).unref();
  return setInterval(() => {
    sweepPendingTransfers().catch((err) =>
      log.error("sweep failed", { error: getErrorMessage(err) }),
    );
  }, SWEEP_INTERVAL_MS);
};
