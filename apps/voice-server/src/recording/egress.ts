import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";
import { config } from "../config.js";
import { createLogger } from "../logger.js";

const log = createLogger("recording:egress");

export interface StartedEgress {
  egressId: string;
  /** Public https URL of the object once egress finishes uploading. */
  mediaUrl: string;
  /** S3 object key — the bit after the bucket name. */
  s3Key: string;
}

/**
 * Fire off a LiveKit Cloud room-composite egress that mixes all audio in
 * the room into a single MP3 and uploads it directly to our S3 bucket.
 *
 * Why room-composite and not track-composite: we don't know participant
 * SIDs at boot (SIP joiner comes in a moment later) and we want caller +
 * agent mixed together. Room-composite is dead simple: "record this room,
 * audio only, mp3, done."
 *
 * Why one bucket, one filepath per callSid: the S3 URL is deterministic
 * BEFORE the file finishes uploading, so we can persist it on the
 * CommunicationLog at hangup even though the upload lands a few seconds
 * later. The playback proxy just pre-signs a fresh GET each time, and
 * returns 404 gracefully if the object isn't there yet.
 */
export const startCallEgress = async (
  roomName: string,
  callSid: string,
  tenantId: string,
): Promise<StartedEgress | null> => {
  if (!config.recordings.isConfigured) return null;
  if (!config.livekit.isConfigured) return null;

  const bucket = config.recordings.bucket!;
  const region = config.recordings.region!;
  // Namespaced by tenant so a bucket-wide leak stays scoped, and keyed by
  // callSid so re-runs deterministically overwrite (rare, but safe).
  const s3Key = `calls/${tenantId}/${callSid}.mp3`;
  const mediaUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`;

  // LiveKit Cloud egress is over HTTPS, not the ws:// signalling URL.
  const httpUrl = config.livekit
    .url!.replace(/^ws:\/\//, "http://")
    .replace(/^wss:\/\//, "https://");
  const client = new EgressClient(httpUrl, config.livekit.apiKey!, config.livekit.apiSecret!);

  const s3 = new S3Upload({
    accessKey: config.recordings.accessKey!,
    secret: config.recordings.secret!,
    region,
    bucket,
  });
  const output = new EncodedFileOutput({
    fileType: EncodedFileType.MP3,
    filepath: s3Key,
    output: { case: "s3", value: s3 },
  });

  try {
    const info = await client.startRoomCompositeEgress(roomName, output, {
      audioOnly: true,
    });
    log.info("egress started", { roomName, callSid, egressId: info.egressId, s3Key });
    return { egressId: info.egressId, mediaUrl, s3Key };
  } catch (err) {
    log.error("failed to start egress", {
      roomName,
      callSid,
      message: (err as Error).message,
    });
    return null;
  }
};

/**
 * Stop an egress cleanly at call end. LiveKit finalizes and uploads the
 * MP3 asynchronously — a few seconds after this call returns, the object
 * exists at the URL we recorded when starting.
 */
export const stopCallEgress = async (egressId: string): Promise<void> => {
  if (!config.livekit.isConfigured) return;

  const httpUrl = config.livekit
    .url!.replace(/^ws:\/\//, "http://")
    .replace(/^wss:\/\//, "https://");
  const client = new EgressClient(httpUrl, config.livekit.apiKey!, config.livekit.apiSecret!);
  try {
    await client.stopEgress(egressId);
    log.info("egress stopped", { egressId });
  } catch (err) {
    // Egress may auto-stop when the room drains; a "not active" error here
    // is fine and expected on the tail of a normal hangup.
    log.warn("stop egress failed (likely already ended)", {
      egressId,
      message: (err as Error).message,
    });
  }
};
