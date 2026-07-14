import * as sarvam from "@livekit/agents-plugin-sarvam";
import * as openai from "@livekit/agents-plugin-openai";
import type { tts as agentsTTS } from "@livekit/agents";
import { config } from "../config.js";
import { createLogger } from "../logger.js";

const log = createLogger("tts");

export interface TTSBuildOptions {
  /** The full voice config string from the agent model (e.g. `sarvam:priya` or `openai:alloy`). */
  voice: string;
  /** Language fallback code (BCP-47), e.g. `hi-IN` or `en-IN`. */
  language: string;
  /** Playback speed multiplier (1.0 = default). */
  pace?: number;
}

/**
 * Normalizes and parses the voice identifier to determine the provider and voice ID.
 */
export const parseVoiceString = (voiceStr: string): { provider: "sarvam" | "openai"; voiceId: string } => {
  const normalized = (voiceStr || "").toLowerCase().trim();

  let provider: "sarvam" | "openai" = "sarvam";
  let voiceId = "priya";

  if (normalized.startsWith("sarvam:")) {
    provider = "sarvam";
    voiceId = normalized.slice("sarvam:".length);
  } else if (normalized.startsWith("openai:")) {
    provider = "openai";
    voiceId = normalized.slice("openai:".length);
  } else if (normalized === "priya (indian female)" || normalized === "priya") {
    provider = "sarvam";
    voiceId = "priya";
  } else if (normalized === "aravind") {
    provider = "sarvam";
    voiceId = "soham";
  } else if (normalized === "aditi") {
    provider = "sarvam";
    voiceId = "ritu";
  } else if (normalized === "kabir") {
    provider = "sarvam";
    voiceId = "kabir";
  } else if (normalized === "deepika") {
    provider = "sarvam";
    voiceId = "kavitha";
  } else {
    const openaiVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "ash", "ballad", "coral", "sage", "verse", "marin", "cedar"];
    if (openaiVoices.includes(normalized)) {
      provider = "openai";
      voiceId = normalized;
    } else {
      provider = "sarvam";
      voiceId = "priya";
    }
  }

  // Map unrecognized legacy/prefixed Sarvam speakers to active ones
  if (provider === "sarvam") {
    if (voiceId === "aravind") voiceId = "soham";
    if (voiceId === "aditi") voiceId = "ritu";
    if (voiceId === "deepika") voiceId = "kavitha";
  }

  return { provider, voiceId };
};

/**
 * Build the pipeline TTS. Instantiates Sarvam bulbul:v3 or OpenAI TTS
 * dynamically based on the parsed voice configuration.
 */
export const createTTS = (opts: TTSBuildOptions): agentsTTS.TTS => {
  const { provider, voiceId } = parseVoiceString(opts.voice);
  const pace = opts.pace ?? 1.0;

  if (provider === "openai") {
    if (!config.tts.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required for the OpenAI TTS provider");
    }
    log.info("initializing tts provider", {
      provider: "openai",
      model: "tts-1",
      voice: voiceId,
      speed: pace,
    });
    return new openai.TTS({
      apiKey: config.tts.openaiApiKey,
      model: "tts-1",
      voice: voiceId as any,
      speed: pace,
    });
  } else {
    if (!config.tts.sarvamApiKey) {
      throw new Error("SARVAM_API_KEY is required for the default TTS provider");
    }
    log.info("initializing tts provider", {
      provider: "sarvam",
      model: "bulbul:v3",
      language: opts.language,
      speaker: voiceId,
      pace,
    });
    return new sarvam.TTS({
      apiKey: config.tts.sarvamApiKey,
      model: "bulbul:v3",
      streaming: true,
      speaker: voiceId,
      targetLanguageCode: opts.language,
      pace,
      temperature: 0.6,
      sampleRate: 24000,
    });
  }
};
