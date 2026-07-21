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
 * Sarvam STT that can be flushed from the outside. The agents core NEVER
 * flushes the STT stream on VAD end-of-speech, so even with the websocket
 * negotiated with `flush_signal=true`, Sarvam sits on the final transcript
 * until its OWN endpoint detection fires — measured at 700–1100ms of dead
 * air per turn. The voice pipeline calls `flushActive()` the moment Silero
 * VAD reports the caller stopped, which makes the plugin send
 * `{"type":"flush"}` and Sarvam finalize immediately.
 */
export class FlushableSarvamSTT extends sarvam.STT {
  #active: agentsSTT.SpeechStream | null = null;

  stream(options?: Parameters<sarvam.STT["stream"]>[0]): ReturnType<sarvam.STT["stream"]> {
    const s = super.stream(options);
    this.#active = s;
    return s;
  }

  flushActive(): void {
    try {
      this.#active?.flush();
    } catch {
      /* stream may already be closed at call teardown — nothing to flush */
    }
  }
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
export const createSTT = (opts: STTBuildOptions): FlushableSarvamSTT => {
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
  return new FlushableSarvamSTT({
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
