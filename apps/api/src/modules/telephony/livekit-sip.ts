import { SipClient, RoomConfiguration, RoomAgentDispatch } from "livekit-server-sdk";
import { env } from "../../config/env.js";

/**
 * LiveKit SIP routing automation. Two goals:
 *
 *   1. A wildcard inbound trunk exists (empty `numbers`), so ANY SIP INVITE
 *      from any upstream provider (Twilio, Plivo, or a future one) is
 *      accepted without per-DID whitelisting.
 *   2. At least one dispatch rule exists that spawns our voice agent for
 *      every accepted call, regardless of which trunk it landed on.
 *
 * This function is idempotent — safe to call at server startup AND after
 * every number purchase. Runs against LiveKit REST from the api-server;
 * fails soft if LiveKit env is missing (local dev without SIP setup).
 */

const AGENT_NAME = "inbound-agent";
const DISPATCH_RULE_NAME = "indiai-inbound-dispatch";
const WILDCARD_TRUNK_NAME = "indiai-inbound-wildcard";

const httpUrl = (ws: string): string =>
  ws.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");

let sip: SipClient | null = null;
const getSip = (): SipClient => {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error("LiveKit is not configured");
  }
  if (!sip) sip = new SipClient(httpUrl(env.LIVEKIT_URL), env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  return sip;
};

const isLiveKitConfigured = (): boolean =>
  Boolean(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);

/**
 * Ensures the wildcard trunk + a global dispatch rule exist. Call at startup
 * so a freshly-provisioned LiveKit project doesn't need any dashboard clicks
 * before it can accept calls.
 */
export const ensureLiveKitInboundReady = async (): Promise<void> => {
  if (!isLiveKitConfigured()) {
    console.warn("[livekit-sip] LiveKit not configured — skipping inbound setup");
    return;
  }

  const client = getSip();

  // ── Wildcard trunk ──
  const trunks = await client.listSipInboundTrunk();
  const wildcard = trunks.find((t) => !t.numbers || t.numbers.length === 0);
  if (!wildcard) {
    await client.createSipInboundTrunk(WILDCARD_TRUNK_NAME, [], { krispEnabled: true });
    console.log(`[livekit-sip] created wildcard inbound trunk "${WILDCARD_TRUNK_NAME}"`);
  }

  // ── Global dispatch rule ──
  const rules = await client.listSipDispatchRule();
  const globalRule = rules.find((r) => !r.trunkIds || r.trunkIds.length === 0);
  if (!globalRule) {
    await client.createSipDispatchRule(
      { type: "individual", roomPrefix: "call-" },
      {
        name: DISPATCH_RULE_NAME,
        trunkIds: [], // empty = applies to all trunks
        roomConfig: new RoomConfiguration({
          agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
        }),
      },
    );
    console.log(`[livekit-sip] created global dispatch rule "${DISPATCH_RULE_NAME}"`);
  }
};

/**
 * Kept for interface parity with the previous per-DID approach. The wildcard
 * trunk already accepts every DID, so we just make sure the wildcard exists.
 * `phoneNumber` is ignored on purpose — it's fine because the dispatch rule
 * spawns the agent for any accepted call.
 */
export const ensureNumberRouted = async (_phoneNumber: string): Promise<void> => {
  await ensureLiveKitInboundReady();
};
