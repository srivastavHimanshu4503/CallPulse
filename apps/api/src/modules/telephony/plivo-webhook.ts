import { Router } from "express";
import type { Request, Response } from "express";
import { env } from "../../config/env.js";

/**
 * Plivo webhook endpoints for the Application that fronts our purchased
 * Indian DIDs. Plivo POSTs here on every inbound call event; we reply with
 * Plivo XML that tells them how to route.
 *
 * Endpoints:
 *   POST /answer   — call is ringing. Return XML that dials LiveKit SIP,
 *                    which lands the call in an agent-dispatched room.
 *   POST /hangup   — call ended. Nothing to do (LiveKit handles teardown);
 *                    we just log for support/troubleshooting.
 *   POST /fallback — Plivo couldn't reach /answer. Return a polite XML
 *                    apology so the caller isn't hearing dead air.
 *
 * Configure these three URLs in your Plivo Application:
 *   Answer URL   → https://api.deskbuddy.in/api/v1/webhooks/plivo/answer
 *   Hangup URL   → https://api.deskbuddy.in/api/v1/webhooks/plivo/hangup
 *   Fallback URL → https://api.deskbuddy.in/api/v1/webhooks/plivo/fallback
 * (Or the equivalent ngrok/local URLs for dev.)
 */

const router: Router = Router();

/** XML-escape a small subset that could appear in phone numbers / SIP URIs. */
const xmlEscape = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Return Plivo XML that dials LiveKit's inbound SIP URI. LiveKit accepts
 * the SIP INVITE via our configured inbound trunk (`ensureNumberRouted`)
 * and the dispatch rule spawns the agent in a new room.
 */
router.post("/answer", (req: Request, res: Response) => {
  const from: string = String(req.body?.From || "");
  const to: string = String(req.body?.To || "");
  const callUuid: string = String(req.body?.CallUUID || "");

  console.log(`[plivo/answer] From=${from} To=${to} CallUUID=${callUuid}`);

  const sipHost = env.LIVEKIT_SIP_URI;
  if (!sipHost) {
    console.error("[plivo/answer] LIVEKIT_SIP_URI not set — returning apology XML");
    res.type("text/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak language="en-US" voice="WOMAN">This service is not configured yet. Please try again later.</Speak>
  <Hangup/>
</Response>`,
    );
    return;
  }

  // The `To` header is the DID that was dialed — pass it through as the
  // SIP user so LiveKit's inbound trunk / dispatch rule can key on it if
  // needed. `answerOnBridge` prevents Plivo from billing pre-answer time.
  const sipUser = to.replace(/^\+/, "") || "any";
  const sipUri = `sip:${xmlEscape(sipUser)}@${xmlEscape(sipHost)}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${xmlEscape(from)}" answerOnBridge="true" hangupOnStar="false">
    <SIP>${sipUri}</SIP>
  </Dial>
</Response>`;

  res.type("text/xml").send(xml);
});

/**
 * Plivo POSTs here after the call ends. LiveKit already tore down the room
 * (our voice-server handles that), so this is just for observability.
 */
router.post("/hangup", (req: Request, res: Response) => {
  const callUuid: string = String(req.body?.CallUUID || "");
  const duration: string = String(req.body?.Duration || req.body?.BillDuration || "");
  const hangupCause: string = String(req.body?.HangupCause || "");
  console.log(
    `[plivo/hangup] CallUUID=${callUuid} duration=${duration}s cause=${hangupCause}`,
  );
  res.status(200).end();
});

/**
 * Answer URL failure fallback. Reached only when Plivo can't hit /answer
 * (500, timeout, DNS). Play a short apology and hang up — better than
 * silent dead air.
 */
router.post("/fallback", (req: Request, res: Response) => {
  const callUuid: string = String(req.body?.CallUUID || "");
  console.error(`[plivo/fallback] fired — Answer URL failed. CallUUID=${callUuid}`);
  res.type("text/xml").send(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak language="en-US" voice="WOMAN">Our AI receptionist is temporarily unavailable. Please call back in a moment.</Speak>
  <Hangup/>
</Response>`,
  );
});

export const plivoWebhookRouter = router;
export default plivoWebhookRouter;
