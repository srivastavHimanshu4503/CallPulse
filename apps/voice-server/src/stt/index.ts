import * as sarvam from "@livekit/agents-plugin-sarvam";
import * as deepgram from "@livekit/agents-plugin-deepgram";
import * as soniox from "@livekit/agents-plugin-soniox";
import type { stt as agentsSTT } from "@livekit/agents";
import { config } from "../config.js";
import { createLogger } from "../logger.js";

const log = createLogger("stt");

/** Common shape the voice pipeline needs: an STT whose active stream can be
 * force-finalized on VAD end-of-speech. */
export type PipelineSTT = agentsSTT.STT & { flushActive(): void };

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
 * Deepgram STT with the same flushActive() surface. Deepgram's plugin ignores
 * the base-class flush (no Finalize frame), but its own endpointing finalizes
 * within tens of ms AND it streams interim transcripts — which is the whole
 * point: interims let the SDK's preemptiveGeneration start the LLM while the
 * caller is still finishing, hiding LLM TTFT inside the end-of-utterance
 * window. Sarvam (finals only) can never do that.
 */
export class FlushableDeepgramSTT extends deepgram.STT {
  #active: agentsSTT.SpeechStream | null = null;

  stream(options?: Parameters<deepgram.STT["stream"]>[0]): ReturnType<deepgram.STT["stream"]> {
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
 * Soniox STT with the same flushActive() surface. Soniox `stt-rt-v5` is the
 * candidate that combines both wins:
 *   - streams per-token interims with an `is_final` flag → SDK preemptive
 *     generation fires the LLM while the caller is still finishing,
 *   - native code-switching in a single model → Hinglish transcribes
 *     correctly without dropping to fragments the way Deepgram did,
 *   - sub-200ms endpointing latency claimed (tunable via
 *     `endpointLatencyAdjustmentLevel` 0-3).
 * Language hints are non-strict so the model still auto-detects when the
 * caller code-switches — the hints just seed the language prior.
 */
export class FlushableSonioxSTT extends soniox.STT {
  #active: agentsSTT.SpeechStream | null = null;

  stream(options?: Parameters<soniox.STT["stream"]>[0]): ReturnType<soniox.STT["stream"]> {
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
 * Languages Deepgram nova-3 can serve. `multi` (nova-3 multilingual) covers
 * Hindi + English code-switching — Hinglish. Everything else (Tamil, Telugu,
 * Marathi, Bengali, ...) is NOT in nova-3 multilingual's language set and
 * must stay on Sarvam regardless of the configured provider.
 */
const DEEPGRAM_LANGUAGE_MAP: Record<string, string> = {
  "hi-IN": "multi",
  "en-IN": "multi",
};

/**
 * BCP-47 → Soniox language code. Soniox uses simple ISO-639 codes (no
 * region suffix). All major Indian languages are supported by the same
 * `stt-rt-v5` model, so language hints are enough — no per-language model
 * swap. Hindi calls always include English as a hint so Hinglish
 * code-switching is expected by the model.
 */
const SONIOX_LANGUAGE_HINTS: Record<string, string[]> = {
  "hi-IN": ["hi", "en"],
  "en-IN": ["en", "hi"],
  "en-US": ["en"],
  "ta-IN": ["ta", "en"],
  "te-IN": ["te", "en"],
  "bn-IN": ["bn", "en"],
  "mr-IN": ["mr", "en"],
  "gu-IN": ["gu", "en"],
  "kn-IN": ["kn", "en"],
  "ml-IN": ["ml", "en"],
  "pa-IN": ["pa", "en"],
};

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
export const createSTT = (opts: STTBuildOptions): PipelineSTT => {
  // Soniox path — the intended default going forward. `stt-rt-v5` streams
  // per-token interims with `is_final` flags AND handles Hindi/English
  // code-switching in one model, which the pipeline needs to actually
  // benefit from `preemptiveGeneration` on Hinglish calls. Endpoint latency
  // adjustment 3 (max) minimizes finalization delay — pair with tight
  // maxEndpointDelayMs so the SDK doesn't wait for Soniox's own finalizer.
  if (config.stt.provider === "soniox" && config.stt.sonioxApiKey) {
    const hints = SONIOX_LANGUAGE_HINTS[opts.language] ?? ["en", "hi"];
    log.info("initializing stt provider", {
      provider: "soniox",
      model: "stt-rt-v5",
      languageHints: hints,
      requestedLanguage: opts.language,
    });
    return new FlushableSonioxSTT({
      apiKey: config.stt.sonioxApiKey,
      model: "stt-rt-v5",
      languageHints: hints,
      // Non-strict: allow the model to still code-switch naturally. Strict
      // hints occasionally cause the model to force-map a mid-sentence
      // English word into the primary language.
      languageHintsStrict: false,
      // Push the endpointer as aggressive as it allows (0-3). The pipeline
      // still applies its own VAD-based turn detection on top, so any
      // over-eager Soniox endpointing gets rescued by our end-of-utterance
      // logic in the agent session.
      endpointLatencyAdjustmentLevel: 3,
      // Cap finalization wait — Soniox's default is longer than the SDK's
      // preemptive window needs. 500 is the plugin's enforced floor; combined
      // with endpointLatencyAdjustmentLevel: 3 above, typical finalization
      // still lands ~150-300ms — the cap is only a worst-case guard.
      maxEndpointDelayMs: 500,
      enableLanguageIdentification: true,
    });
  }
  if (config.stt.provider === "soniox" && !config.stt.sonioxApiKey) {
    log.warn("STT_PROVIDER=soniox but SONIOX_API_KEY missing — falling back to default provider");
  }

  const deepgramLanguage = DEEPGRAM_LANGUAGE_MAP[opts.language];
  if (config.stt.provider === "deepgram" && config.stt.deepgramApiKey && deepgramLanguage) {
    log.info("initializing stt provider", {
      provider: "deepgram",
      model: "nova-3",
      language: deepgramLanguage,
      requestedLanguage: opts.language,
    });
    return new FlushableDeepgramSTT({
      apiKey: config.stt.deepgramApiKey,
      model: "nova-3",
      language: deepgramLanguage,
      // Interim transcripts are the latency unlock — see FlushableDeepgramSTT.
      interimResults: true,
      // Voice pipeline consumes raw words; smart formatting turns "do hazaar"
      // style spoken numbers into digits which is fine for the LLM, but
      // punctuation helps sentence-level TTS phrasing downstream.
      punctuate: true,
      smartFormat: false,
    });
  }
  if (config.stt.provider === "deepgram" && !deepgramLanguage) {
    log.info("deepgram configured but language unsupported by nova-3 — using sarvam", {
      language: opts.language,
    });
  }

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
