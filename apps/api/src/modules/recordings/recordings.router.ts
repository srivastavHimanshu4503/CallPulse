import { Router } from "express";
import type { Request, Response } from "express";
import crypto from "crypto";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { tenantMiddleware } from "../../middleware/tenant.middleware.js";
import { db } from "../../config/database.js";
import { env } from "../../config/env.js";
import { sendSuccess, sendError } from "../../utils/response.js";

/**
 * Call-recording playback.
 *
 * Two backends live behind the same interface:
 *   • S3 — LiveKit-egress recordings written to our own bucket. The media
 *     endpoint issues a 302 to a fresh pre-signed GET URL; the browser
 *     talks to S3 directly (native Range support → free seeking + duration).
 *   • Provider — legacy Twilio URLs already stored on old rows. We proxy
 *     these through with Basic Auth. Plivo also went through this path
 *     briefly before egress rolled out.
 *
 * Same two-step flow either way, so the UI + stored data never change:
 *   1. GET /recordings/:logId/url   (authed)   → short-lived signed link
 *   2. GET /recordings/:logId/media?exp&sig    → 302 to S3, or stream provider
 */

const SIGNED_TTL_MS = 60 * 60 * 1000; // 1 hour
const S3_PRESIGN_TTL_SEC = 15 * 60; // 15 min — long enough to load + seek

const sign = (logId: string, exp: number): string =>
  crypto.createHmac("sha256", env.JWT_SECRET).update(`recording:${logId}:${exp}`).digest("hex");

// Lazily-built S3 client. `env.RECORDINGS_S3_REGION` is optional so we boot
// without recordings configured; the client is only ever used inside the
// S3 branch of the media proxy after we confirm the URL host matches.
let s3Client: S3Client | null = null;
const getS3Client = (): S3Client => {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.RECORDINGS_S3_REGION || process.env.AWS_REGION,
    });
  }
  return s3Client;
};

/**
 * Detect whether a stored recording URL points at our own S3 bucket.
 * Handles both the virtual-hosted style (`<bucket>.s3.<region>.amazonaws.com`)
 * and the path style (`s3.<region>.amazonaws.com/<bucket>/…`).
 */
const parseS3Url = (url: string): { bucket: string; key: string } | null => {
  if (!env.RECORDINGS_S3_BUCKET) return null;
  try {
    const u = new URL(url);
    const host = u.hostname;
    const region = env.RECORDINGS_S3_REGION || process.env.AWS_REGION || "";
    if (host === `${env.RECORDINGS_S3_BUCKET}.s3.${region}.amazonaws.com`) {
      return { bucket: env.RECORDINGS_S3_BUCKET, key: u.pathname.replace(/^\//, "") };
    }
    if (host.startsWith("s3.") && host.endsWith(".amazonaws.com")) {
      const [, bucket, ...rest] = u.pathname.split("/");
      if (bucket === env.RECORDINGS_S3_BUCKET) {
        return { bucket, key: rest.join("/") };
      }
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Pick the Basic Auth header for a stored recording URL by host. Twilio
 * media lives behind api.twilio.com and requires the account creds; Plivo
 * media is delivered from a public S3 bucket (recordings.plivo.com /
 * s3.amazonaws.com) and takes no auth. Any other host — e.g. a future S3
 * of our own — falls through with no header.
 */
const pickProviderAuth = (url: string): string | null => {
  try {
    const host = new URL(url).hostname;
    if (host.endsWith("twilio.com")) {
      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) return null;
      return (
        "Basic " +
        Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")
      );
    }
    // Plivo recording_urls are public S3; no header needed.
    return null;
  } catch {
    return null;
  }
};

const router: Router = Router();

// ── Step 1: authed → signed link ──
router.get("/:logId/url", authMiddleware, tenantMiddleware, async (req: Request, res: Response) => {
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
    sendSuccess(
      res,
      { url: `/api/v1/recordings/${logId}/media?exp=${exp}&sig=${sign(logId!, exp)}` },
      200,
    );
  } catch (err: any) {
    sendError(res, err.message || "Failed to create recording link", 500);
  }
});

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

    // Fast path — our own S3 bucket. Redirect the browser to a fresh
    // pre-signed GET. S3 handles Range natively, so seeking + duration work
    // without any proxy buffering on our side. The pre-sign uses ambient
    // AWS creds (AWS_PROFILE=indiai locally, ECS task role in prod).
    const s3 = parseS3Url(log.recordingUrl);
    if (s3) {
      const presigned = await getSignedUrl(
        getS3Client(),
        new GetObjectCommand({ Bucket: s3.bucket, Key: s3.key }),
        { expiresIn: S3_PRESIGN_TTL_SEC },
      );
      res.redirect(302, presigned);
      return;
    }

    // Provider adapter — pick auth based on the stored URL host. Twilio
    // recordings need Basic Auth against api.twilio.com; Plivo returns a
    // public S3 URL that needs no auth at all. Range support is ESSENTIAL:
    // without it the <audio> element can't determine total duration or
    // seek, so the player shows no timeline.
    const range = req.header("range");
    const authHeader = pickProviderAuth(log.recordingUrl);
    const upstream = await fetch(log.recordingUrl, {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
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
