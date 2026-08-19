import twilio from "twilio";
import { db } from "@antigravity/db";
import { getErrorMessage } from "@antigravity/errors";
import { createLogger } from "../logger.js";
import { config } from "../config.js";
import type { JobHandler, PostCallContext, PostCallJob } from "./types.js";

const log = createLogger("job:recording-fetch");

/**
 * Attach the trunk recording to the call log.
 *
 * We host two telephony providers side-by-side: Twilio for US DIDs, Plivo
 * for Indian DIDs (Zentrunk). Which one recorded a given call is decided
 * by the PhoneNumber row that owns the dialed number, so we resolve that
 * first and dispatch to the right fetcher. Both fetchers do the same job:
 * match the provider-side call by (dialed, caller, time-window), pull its
 * recording, and persist the media URL on the CommunicationLog.
 *
 * Storage: we persist the provider's media URL as-is (Twilio requires
 * Basic Auth to play; Plivo's is a public S3 link). Playback still goes
 * through the api server's signed-URL proxy, so moving media to S3 later
 * only changes the proxy — nothing here or in the UI.
 */
export const recordingFetch: JobHandler = {
  name: "recording-fetch",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    const { tenantId, logId, callSource, metadata } = ctx.job;

    if (callSource !== "sip") {
      log.info("skipping — browser test calls have no trunk recording", { logId });
      return {};
    }

    // LiveKit egress path (Twilio + Plivo alike): the voice-server has
    // already stamped an S3 URL on this row before we ran. Nothing to do.
    const existing = await db.communicationLog.findFirst({
      where: { id: logId, tenantId },
      select: { recordingUrl: true },
    });
    if (existing?.recordingUrl) {
      log.info("skipping — recordingUrl already set by egress", { logId });
      return {};
    }

    const dialed = typeof metadata?.dialedNumber === "string" ? metadata.dialedNumber : undefined;
    const provider = await resolveProvider(tenantId, dialed);

    try {
      if (provider === "PLIVO") {
        await fetchPlivoRecording(ctx.job);
      } else {
        await fetchTwilioRecording(ctx.job);
      }
    } catch (err) {
      // Recordings are a nice-to-have — never break the pipeline for them.
      log.error("recording fetch failed — continuing pipeline", {
        logId,
        provider,
        error: getErrorMessage(err),
      });
    }
    return {};
  },
};

/**
 * Resolve which telephony provider owns the dialed DID. We key off the
 * PhoneNumber row rather than any field on the call itself because that
 * row is the single source of truth for "who is billing this number".
 * Falls back to TWILIO when we can't attribute — matches historical rows.
 */
const resolveProvider = async (
  tenantId: string,
  dialed: string | undefined,
): Promise<"TWILIO" | "PLIVO"> => {
  if (!dialed) return "TWILIO";
  const row = await db.phoneNumber.findFirst({
    where: { tenantId, phoneNumber: dialed },
    select: { provider: true },
  });
  return row?.provider === "PLIVO" ? "PLIVO" : "TWILIO";
};

// ── Twilio ──────────────────────────────────────────────────────────────
const fetchTwilioRecording = async (job: PostCallJob): Promise<void> => {
  const { tenantId, logId, callerNumber, startedAt, metadata } = job;

  if (!config.twilio.accountSid || !config.twilio.authToken) {
    log.info("skipping — Twilio not configured", { logId });
    return;
  }

  const client = twilio(config.twilio.accountSid, config.twilio.authToken);
  const startAt = new Date(startedAt);
  const dialed = typeof metadata?.dialedNumber === "string" ? metadata.dialedNumber : undefined;

  // NOTE: SIP-trunk calls have `to` stored as a SIP URI
  // ("sip:+1743...@xyz.sip.livekit.cloud"), so Twilio's `to` list filter
  // (phone-number equality) never matches them. Fetch by time window
  // only and match the dialed number inside the URI ourselves.
  const calls = await client.calls.list({
    startTimeAfter: new Date(startAt.getTime() - 3 * 60_000),
    startTimeBefore: new Date(startAt.getTime() + 3 * 60_000),
    limit: 20,
  });
  const candidates = calls
    .filter((c) => !dialed || c.to.includes(dialed))
    .filter((c) => !callerNumber.startsWith("+") || c.from === callerNumber)
    .sort(
      (a, b) =>
        Math.abs((a.startTime?.getTime() ?? 0) - startAt.getTime()) -
        Math.abs((b.startTime?.getTime() ?? 0) - startAt.getTime()),
    );
  const call = candidates[0] ?? calls[0];
  if (!call) {
    log.warn("no matching Twilio call found", { logId, dialed, caller: callerNumber });
    return;
  }

  // Recordings can lag hangup by a few seconds.
  let recording = null;
  for (let attempt = 0; attempt < 3 && !recording; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 4_000));
    const recordings = await client.recordings.list({ callSid: call.sid, limit: 1 });
    recording = recordings[0] ?? null;
  }
  if (!recording) {
    log.warn("no recording for call (may be disabled or still processing)", {
      logId,
      twilioCallSid: call.sid,
    });
    return;
  }

  const mediaUrl = `https://api.twilio.com${recording.uri.replace(/\.json$/, ".mp3")}`;
  await db.communicationLog.updateMany({
    where: { id: logId, tenantId },
    data: { recordingUrl: mediaUrl },
  });
  log.info("recording attached", {
    logId,
    provider: "twilio",
    twilioCallSid: call.sid,
    durationSec: recording.duration,
  });
};

// ── Plivo ───────────────────────────────────────────────────────────────
interface PlivoCall {
  call_uuid: string;
  from_number: string;
  to_number: string;
  initiation_time?: string;
  end_time?: string;
}

interface PlivoRecording {
  recording_id: string;
  recording_url: string;
  call_uuid: string;
  duration?: string | number;
  add_time?: string;
}

/**
 * Fetch the Plivo recording for this call.
 *
 * Plivo Zentrunk (SIP trunk) calls surface in the Call resource, and the
 * recording — assuming trunk-level recording is enabled in the Plivo
 * console — surfaces in the Recording resource keyed by call_uuid. We
 * mirror the Twilio path: find the closest matching Call, then poll a
 * few times for its Recording (media can lag hangup).
 *
 * Plivo returns a public-ish S3 URL for `recording_url` — no Basic Auth
 * is required to fetch it, but our media proxy still routes through the
 * api server so we can swap the URL later without a UI change.
 */
const fetchPlivoRecording = async (job: PostCallJob): Promise<void> => {
  const { tenantId, logId, callerNumber, startedAt, metadata } = job;

  if (!config.plivo.authId || !config.plivo.authToken) {
    log.info("skipping — Plivo not configured", { logId });
    return;
  }

  const dialed = typeof metadata?.dialedNumber === "string" ? metadata.dialedNumber : undefined;
  const startAt = new Date(startedAt);
  const authHeader =
    "Basic " + Buffer.from(`${config.plivo.authId}:${config.plivo.authToken}`).toString("base64");
  const baseUrl = `https://api.plivo.com/v1/Account/${config.plivo.authId}`;

  // 1. Find the Plivo call closest to our start time. Plivo's Call list
  //    accepts `end_time__gt/lt` (ISO); we use a ±3 min window to catch
  //    the same call across clock skew and post-processing delay.
  const winStart = new Date(startAt.getTime() - 3 * 60_000).toISOString();
  const winEnd = new Date(startAt.getTime() + 6 * 60_000).toISOString();
  const callsQuery = new URLSearchParams({
    end_time__gt: winStart,
    end_time__lt: winEnd,
    limit: "20",
  });
  const callsResp = await fetch(`${baseUrl}/Call/?${callsQuery}`, {
    headers: { Authorization: authHeader },
    signal: AbortSignal.timeout(15_000),
  });
  if (!callsResp.ok) {
    log.warn("Plivo call list failed", { logId, status: callsResp.status });
    return;
  }
  const callsBody = (await callsResp.json()) as { objects?: PlivoCall[] };
  const calls: PlivoCall[] = callsBody.objects || [];
  // Plivo stores numbers without the leading +, and SIP-trunk calls carry
  // the DID in `to_number` verbatim. Match both formats.
  const bareDialed = dialed?.replace(/^\+/, "");
  const bareCaller = callerNumber?.replace(/^\+/, "");
  const candidates = calls
    .filter((c) => !bareDialed || c.to_number?.replace(/^\+/, "").includes(bareDialed))
    .filter(
      (c) =>
        !bareCaller ||
        !callerNumber.startsWith("+") ||
        c.from_number?.replace(/^\+/, "") === bareCaller,
    )
    .sort((a, b) => {
      const ai = a.initiation_time ? new Date(a.initiation_time).getTime() : 0;
      const bi = b.initiation_time ? new Date(b.initiation_time).getTime() : 0;
      return Math.abs(ai - startAt.getTime()) - Math.abs(bi - startAt.getTime());
    });
  const call = candidates[0] ?? calls[0];
  if (!call) {
    log.warn("no matching Plivo call found", { logId, dialed, caller: callerNumber });
    return;
  }

  // 2. Poll the Recording resource for this call_uuid. Plivo delivers
  //    recordings a few seconds after hangup, same as Twilio.
  let recording: PlivoRecording | null = null;
  for (let attempt = 0; attempt < 3 && !recording; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 4_000));
    const recQuery = new URLSearchParams({ call_uuid: call.call_uuid, limit: "1" });
    const recResp = await fetch(`${baseUrl}/Recording/?${recQuery}`, {
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(15_000),
    });
    if (!recResp.ok) {
      log.warn("Plivo recording list failed", { logId, status: recResp.status });
      continue;
    }
    const body = (await recResp.json()) as { objects?: PlivoRecording[] };
    recording = body.objects?.[0] ?? null;
  }
  if (!recording?.recording_url) {
    log.warn("no recording for Plivo call (trunk recording may be disabled)", {
      logId,
      callUuid: call.call_uuid,
    });
    return;
  }

  await db.communicationLog.updateMany({
    where: { id: logId, tenantId },
    data: { recordingUrl: recording.recording_url },
  });
  log.info("recording attached", {
    logId,
    provider: "plivo",
    callUuid: call.call_uuid,
    durationSec: recording.duration,
  });
};
