import * as sarvam from "@livekit/agents-plugin-sarvam";
import type { stt as agentsSTT } from "@livekit/agents";
import { config } from "../config.js";
import { createLogger } from "../logger.js";

const log = createLogger("stt");

export interface STTBuildOptions {
  /** Sarvam language code (BCP-47), e.g. `hi-IN`, `en-IN`. */
  language: string;
  /**
   * Recognition mode.
   *   - `translit` (default): Hindi/Indic content is transliterated to Roman
   *     script. English words stay as English. Produces a fully-Roman
   *     transcript that matches the way the LLM writes its replies, so the
   *     UI shows a consistent-looking chat.
   *   - `codemix`: mixed Devanagari + Roman (Sarvam's default Hinglish output).
   */
  mode?: "transcribe" | "verbatim" | "translit" | "codemix";
}

/**
 * Build the pipeline STT. Sarvam `saaras:v3` is used because:
 *   - it is native for Indian languages including Hinglish (`codemix` mode),
 *   - it streams partial + final transcripts over WebSocket, and
 *   - it is the same vendor as our TTS, so one API key powers both.
 *
 * Deepgram is a viable alternative but nova-3-multilingual (the model that
 * actually understands code-switched Hindi/English) requires a paid Deepgram
 * plan. `nova-2` falls back to English-only recognition and butchers Hinglish.
 */
export const createSTT = (opts: STTBuildOptions): agentsSTT.STT => {
  if (!config.tts.sarvamApiKey) {
    throw new Error("SARVAM_API_KEY is required for the default STT provider");
  }
  const mode = opts.mode ?? "translit";
  log.info("initializing stt provider", {
    provider: "sarvam",
    model: "saaras:v3",
    language: opts.language,
    mode,
  });
  return new sarvam.STT({
    apiKey: config.tts.sarvamApiKey,
    model: "saaras:v3",
    languageCode: opts.language,
    mode,
    streaming: true,
    // Default VAD sensitivity. `highVadSensitivity: true` was keeping Sarvam
    // in the "speaking" state across natural inter-utterance pauses, which
    // delayed / suppressed the END_OF_SPEECH signal LiveKit needs to close
    // the user turn and start LLM generation.
    highVadSensitivity: false,
    flushSignal: true,
  });
};
