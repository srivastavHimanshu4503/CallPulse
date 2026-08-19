import { SipClient, RoomConfiguration, RoomAgentDispatch } from "livekit-server-sdk";
import { env } from "../../config/env.js";

/**
 * LiveKit SIP routing automation. After a number is purchased on any
 * upstream provider (Twilio, Plivo, ...) we make sure LiveKit will accept
 * calls for it and dispatch our voice agent — zero console clicking for
 * the customer OR for us.
 */

const AGENT_NAME = "inbound-agent";
const DISPATCH_RULE_NAME = "indiai-inbound-dispatch";
const TRUNK_NAME = "indiai-inbound";

const httpUrl = (ws: string): string =>
  ws.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");

let sip: SipClient | null = null;
const getSip = (): SipClient => {
  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error("LiveKit is not configured");
  }
  if (!sip)
    sip = new SipClient(httpUrl(env.LIVEKIT_URL), env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  return sip;
};

/**
 * Ensure inbound calls to `phoneNumber` reach the voice agent:
 *  1. The number is on a LiveKit inbound trunk (append to the existing one,
 *     or create the first trunk). A trunk with an EMPTY numbers list accepts
 *     everything, so nothing to do in that case.
 *  2. At least one dispatch rule exists that spawns our agent per caller.
 */
export const ensureNumberRouted = async (phoneNumber: string): Promise<void> => {
  const client = getSip();

  // ── 1. Inbound trunk ──
  const trunks = await client.listSipInboundTrunk();
  const wildcard = trunks.find((t) => !t.numbers || t.numbers.length === 0);
  const holding = trunks.find((t) => t.numbers?.includes(phoneNumber));

  let trunkId: string | undefined = (wildcard ?? holding)?.sipTrunkId;
  if (!wildcard && !holding) {
    // One trunk per number keeps this append-only and idempotent — LiveKit
    // is happy with many inbound trunks.
    const created = await client.createSipInboundTrunk(
      `${TRUNK_NAME}-${phoneNumber.replace(/\D/g, "")}`,
      [phoneNumber],
      { krispEnabled: true },
    );
    trunkId = created.sipTrunkId;
  }

  // ── 2. Dispatch rule ──
  const rules = await client.listSipDispatchRule();
  if (rules.length === 0) {
    await client.createSipDispatchRule(
      { type: "individual", roomPrefix: "call-" },
      {
        name: DISPATCH_RULE_NAME,
        // Empty trunkIds = applies to every trunk, present and future.
        trunkIds: [],
        roomConfig: new RoomConfiguration({
          agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
        }),
      },
    );
  } else {
    // A rule scoped to specific trunks won't cover a NEW trunk we created.
    const covered = rules.some(
      (r) => !r.trunkIds || r.trunkIds.length === 0 || (trunkId && r.trunkIds.includes(trunkId)),
    );
    if (!covered && trunkId) {
      await client.createSipDispatchRule(
        { type: "individual", roomPrefix: "call-" },
        {
          name: `${DISPATCH_RULE_NAME}-${phoneNumber.replace(/\D/g, "")}`,
          trunkIds: [trunkId],
          roomConfig: new RoomConfiguration({
            agents: [new RoomAgentDispatch({ agentName: AGENT_NAME })],
          }),
        },
      );
    }
  }
};
