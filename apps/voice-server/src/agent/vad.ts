import * as silero from "@livekit/agents-plugin-silero";
import { type voice, type JobContext } from "@livekit/agents";

export interface VADConfig {
  minSilenceDurationMs?: number;
}

/**
 * Loads the Silero VAD model with low-latency silence detection tailored for Indian carrier telephony.
 * Explicit 200ms min-silence shaves significant latency compared to default 550ms.
 */
export async function loadSileroVAD(
  config: VADConfig = {},
): Promise<voice.AgentSessionOptions["vad"]> {
  const minSilence = config.minSilenceDurationMs ?? 200;
  return (await silero.VAD.load({
    minSilenceDuration: minSilence,
  })) as voice.AgentSessionOptions["vad"];
}

/**
 * Retrieves prewarmed VAD instance from worker process, or falls back to loading in-call.
 */
export async function getOrLoadVAD(
  ctx: JobContext,
  callLog?: { warn: (msg: string, meta?: any) => void },
): Promise<voice.AgentSessionOptions["vad"]> {
  let vad = ctx.proc.userData.vad as voice.AgentSessionOptions["vad"] | undefined;
  if (!vad) {
    if (callLog) callLog.warn("prewarmed VAD missing — loading in-call fallback");
    vad = await loadSileroVAD({ minSilenceDurationMs: 200 });
  }
  return vad;
}

/**
 * Pre-configured turn handling parameters optimized for telephony latency and Indian speech patterns:
 * - turnDetection: "vad" (overcomes Sarvam END_SPEECH / FINAL_TRANSCRIPT skew)
 * - endpointing: fixed window (150ms min, 800ms max)
 * - interruption: VAD-based with minWords=2 to ignore backchannels ("haan", "hmm")
 * - preemptiveGeneration: starts TTS synthesis while user finishes speaking
 */
export function getTurnHandlingConfig(): voice.AgentSessionOptions["turnHandling"] {
  return {
    turnDetection: "vad",
    endpointing: { mode: "fixed", minDelay: 150, maxDelay: 800 },
    interruption: {
      enabled: true,
      mode: "vad",
      minWords: 2,
      minDuration: 500,
    },
    preemptiveGeneration: { enabled: true, preemptiveTts: true, maxSpeechDuration: 10000 },
  };
}
