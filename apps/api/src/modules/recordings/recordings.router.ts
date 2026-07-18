import { Router } from "express";
import type { Request, Response } from "express";
import crypto from "crypto";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";
import { db } from "../../config/database.js";
import { env } from "../../config/env.js";
import { sendSuccess, sendError } from "../../utils/response.js";

/**
 * Call-recording playback.
 *
 * Media lives with the provider (Twilio today, S3 later) and always needs
 * credentials — so the browser never gets the raw provider URL. Instead:
 *
 *   1. GET /recordings/:logId/url  (authed)  → short-lived signed link
 *   2. GET /recordings/:logId/media?exp&sig  → verifies the signature and
 *      STREAMS the audio from the provider.
 *
 * S3 migration plan: step 2's provider fetch becomes an S3 presigned
 * redirect — steps 1, the UI, and the stored data don't change at all.
 */

const SIGNED_TTL_MS = 60 * 60 * 1000; // 1 hour

const sign = (logId: string, exp: number): string =>
  crypto.createHmac("sha256", env.JWT_SECRET).update(`recording:${logId}:${exp}`).digest("hex");

const router: Router = Router();

// ── Step 1: authed → signed link ──
router.get(
  "/:logId/url",
  authMiddleware,
  tenantMiddleware,
  async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { logId } = req.params;
      const log = await db.communicationLog.findFirst({
        where: { id: logId, tenantId },
        select: { recordingUrl: true },
      });
      if (!log?.recordingUrl) {
        sendError(res, "No recording for this call", 404);
        return;
      }
      const exp = Date.now() + SIGNED_TTL_MS;
      sendSuccess(res, { url: `/api/v1/recordings/${logId}/media?exp=${exp}&sig=${sign(logId!, exp)}` }, 200);
    } catch (err: any) {
      sendError(res, err.message || "Failed to create recording link", 500);
    }
  },
);

// ── Step 2: signed → stream from the provider ──
// No auth middleware: <audio> tags can't send headers; the HMAC + expiry in
// the query string IS the authorization.
router.get("/:logId/media", async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const exp = Number(req.query.exp || 0);
    const sig = String(req.query.sig || "");
    if (!exp || exp < Date.now() || sig !== sign(logId!, exp)) {
      res.status(403).json({ success: false, error: "Link expired or invalid" });
      return;
    }

    const log = await db.communicationLog.findFirst({
      where: { id: logId },
      select: { recordingUrl: true },
    });
    if (!log?.recordingUrl) {
      res.status(404).json({ success: false, error: "No recording" });
      return;
    }

    // Provider adapter — Twilio basic-auth fetch today, S3 redirect later.
    // Range support is ESSENTIAL: without it the <audio> element can't
    // determine total duration or seek, so the player shows no timeline.
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const range = req.header("range");
    const upstream = await fetch(log.recordingUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
        ...(range ? { Range: range } : {}),
      },
    });
    if (!upstream.ok || !upstream.body) {
      res.status(502).json({ success: false, error: "Recording unavailable from provider" });
      return;
    }

    // Call recordings are small (≈240 KB/min at 32 kbps, capped calls) —
    // buffering lets us serve REAL 206 range responses regardless of what
    // the provider supports. Browsers need those for duration + seeking.
    const buf = Buffer.from(await upstream.arrayBuffer());
    const total = buf.length;

    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=3600");

    const m = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
    if (m && total > 0) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), total - 1) : total - 1;
      if (start >= total || start > end) {
        res.status(416).setHeader("Content-Range", `bytes */${total}`);
        res.end();
        return;
      }
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
      res.setHeader("Content-Length", String(end - start + 1));
      res.end(buf.subarray(start, end + 1));
    } else {
      res.status(200);
      res.setHeader("Content-Length", String(total));
      res.end(buf);
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: err.message || "Stream failed" });
    } else {
      res.end();
    }
  }
});

export const recordingsRouter = router;
export default recordingsRouter;
