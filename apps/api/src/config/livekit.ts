import { AccessToken, AgentDispatchClient, RoomServiceClient } from "livekit-server-sdk";
import { env } from "./env.js";

export interface TestCallCredentials {
  wsUrl: string;
  token: string;
  roomName: string;
  identity: string;
  agentName: string;
}

export const isLivekitConfigured = (): boolean =>
  !!(env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET);

const assertConfigured = (): void => {
  if (!isLivekitConfigured()) {
    throw new Error(
      "LiveKit is not configured — set LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET"
    );
  }
};

/**
 * Convert the LiveKit `ws(s)://` URL to the `http(s)://` REST/host form
 * required by the server-side SDK clients.
 */
const httpUrlFromWs = (wsUrl: string): string =>
  wsUrl.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");

/**
 * Mint a LiveKit access token for a browser-based test call.
 *
 * Encodes the target `agentId` in the room name (for observability) and in
 * the room metadata (so the voice-server agent worker knows which AI agent
 * to load). Also registers an explicit agent dispatch so the worker joins
 * the room even though no SIP inbound trunk did so.
 */
export const createTestCallCredentials = async (input: {
  agentId: string;
  userIdentity: string;
  userName?: string;
  /** Phone-like identity persisted as the contact's number for this call. */
  callerId?: string;
  ttlSeconds?: number;
}): Promise<TestCallCredentials> => {
  assertConfigured();

  const roomName = `test-${input.agentId}-${Date.now().toString(36)}`;
  const agentName = env.LIVEKIT_AGENT_NAME;
  const roomMetadata = JSON.stringify({
    agentId: input.agentId,
    callSource: "browser",
    callerId: input.callerId ?? input.userIdentity,
    callerName: input.userName,
  });

  const roomService = new RoomServiceClient(
    httpUrlFromWs(env.LIVEKIT_URL!),
    env.LIVEKIT_API_KEY!,
    env.LIVEKIT_API_SECRET!
  );
  await roomService.createRoom({
    name: roomName,
    metadata: roomMetadata,
    emptyTimeout: 60,
    maxParticipants: 4,
  });

  const dispatch = new AgentDispatchClient(
    httpUrlFromWs(env.LIVEKIT_URL!),
    env.LIVEKIT_API_KEY!,
    env.LIVEKIT_API_SECRET!
  );
  await dispatch.createDispatch(roomName, agentName, {
    metadata: roomMetadata,
  });

  const at = new AccessToken(env.LIVEKIT_API_KEY!, env.LIVEKIT_API_SECRET!, {
    identity: input.userIdentity,
    name: input.userName ?? input.userIdentity,
    ttl: input.ttlSeconds ?? 60 * 15,
  });
  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  });

  const token = await at.toJwt();

  return {
    wsUrl: env.LIVEKIT_URL!,
    token,
    roomName,
    identity: input.userIdentity,
    agentName,
  };
};
