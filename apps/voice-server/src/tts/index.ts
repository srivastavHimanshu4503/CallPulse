import * as sarvam from "@livekit/agents-plugin-sarvam";
import type { tts as agentsTTS } from "@livekit/agents";
import { config } from "../config.js";
import { createLogger } from "../logger.js";

const log = createLogger("tts");

export interface TTSBuildOptions {
  /** Sarvam TTS language code, e.g. `hi-IN`, `en-IN`. */
  language: string;
  /** Sarvam bulbul:v3 speaker id (e.g. `ritu`, `amelia`, `arvind`). */
  speaker: string;
  /** Playback speed multiplier (1.0 = default). */
  pace?: number;
}

/**
 * Build the pipeline TTS. Sarvam `bulbul:v3` is the default because it
 * handles Indic languages and Hinglish with natural intonation, and streams
 * audio out sentence-by-sentence which minimises perceived phone latency.
 */
export const createTTS = (opts: TTSBuildOptions): agentsTTS.TTS => {
  if (!config.tts.sarvamApiKey) {
    throw new Error("SARVAM_API_KEY is required for the default TTS provider");
  }
  // Speed and prosody defaults are tuned for a phone-natural feel:
  //   pace 1.15  → ~15% faster than default; matches a real receptionist's
  //                cadence instead of the sluggish default
  //   temperature 0.85 → more prosodic variation, less monotone / robotic
  const pace = opts.pace ?? 1.15;
  log.info("initializing tts provider", {
    provider: "sarvam",
    model: "bulbul:v3",
    language: opts.language,
    speaker: opts.speaker,
    pace,
  });
  return new sarvam.TTS({
    apiKey: config.tts.sarvamApiKey,
    model: "bulbul:v3",
    streaming: true,
    speaker: opts.speaker,
    targetLanguageCode: opts.language,
    pace,
    temperature: 0.85,
  });
};
