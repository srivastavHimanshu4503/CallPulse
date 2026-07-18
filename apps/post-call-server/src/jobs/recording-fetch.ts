import twilio from "twilio";
import { db } from "@antigravity/db";
import { getErrorMessage } from "@antigravity/errors";
import { createLogger } from "../logger.js";
import { config } from "../config.js";
import type { JobHandler, PostCallContext } from "./types.js";

const log = createLogger("job:recording-fetch");

/**
 * Attach the Twilio trunk recording to the call log.
 *
 * Matching: our call ids are LiveKit-side, so we find the Twilio call by
 * (dialed number, caller number, start-time window) and take the closest.
 * Recordings can lag the hangup by a few seconds, so we retry briefly.
 *
 * Storage: we persist Twilio's media URL (the provider truth). Playback
 * goes through the api server's signed-URL proxy, so moving media to S3
 * later only changes the proxy — nothing here or in the UI.
 */
export const recordingFetch: JobHandler = {
  name: "recording-fetch",
  async run(ctx: PostCallContext): Promise<Partial<PostCallContext>> {
    const { tenantId, logId, callSource, callerNumber, startedAt, metadata } = ctx.job;

    if (callSource !== "sip") {
      log.info("skipping — browser test calls have no trunk recording", { logId });
      return {};
    }
    if (!config.twilio.accountSid || !config.twilio.authToken) {
      log.info("skipping — Twilio not configured", { logId });
      return {};
    }

    try {
      const client = twilio(config.twilio.accountSid, config.twilio.authToken);
      const startAt = new Date(startedAt);
      const dialed = typeof metadata?.dialedNumber === "string" ? metadata.dialedNumber : undefined;

      // 1. Find the Twilio call closest to our start time.
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
        return {};
      }

      // 2. The recording may not be ready the instant the call ends.
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
        return {};
      }

      const mediaUrl = `https://api.twilio.com${recording.uri.replace(/\.json$/, ".mp3")}`;
      await db.communicationLog.updateMany({
        where: { id: logId, tenantId },
        data: { recordingUrl: mediaUrl },
      });
      log.info("recording attached", {
        logId,
        twilioCallSid: call.sid,
        durationSec: recording.duration,
      });
    } catch (err) {
      // Recordings are a nice-to-have — never break the pipeline for them.
      log.error("recording fetch failed — continuing pipeline", {
        logId,
        error: getErrorMessage(err),
      });
    }
    return {};
  },
};
