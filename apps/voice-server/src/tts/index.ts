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
  log.info("initializing tts provider", {
    provider: "sarvam",
    model: "bulbul:v3",
    language: opts.language,
    speaker: opts.speaker,
  });
  return new sarvam.TTS({
    apiKey: config.tts.sarvamApiKey,
    model: "bulbul:v3",
    streaming: true,
    speaker: opts.speaker,
    targetLanguageCode: opts.language,
    pace: opts.pace ?? 1.0,
    temperature: 0.6,
  });
};
