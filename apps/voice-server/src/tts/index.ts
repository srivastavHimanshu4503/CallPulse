import * as sarvam from "@livekit/agents-plugin-sarvam";
import * as elevenlabs from "@livekit/agents-plugin-elevenlabs";
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
  /** User-tuned provider settings from the agent row (0–1 floats). */
  settings?: {
    stability?: number;
    similarityBoost?: number;
    style?: number;
    temperature?: number;
  };
  /** Sarvam pronunciation dictionary id (word → spoken-form overrides). */
  dictId?: string;
}

// Sarvam bulbul:v3 speakers grouped by gender. Used to (a) tag logs so a
// wrong-gender complaint is diagnosable at a glance, and (b) map legacy /
// display names to the current speaker id.
const SARVAM_FEMALE = new Set([
  "priya", "ritu", "neha", "pooja", "simran", "kavya", "ishita", "shreya",
  "roopa", "amelia", "sophia", "tanya", "shruti", "suhani", "kavitha", "rupali",
]);
const SARVAM_MALE = new Set([
  "shubh", "aditya", "rahul", "rohan", "amit", "dev", "ratan", "varun",
  "manan", "sumit", "kabir", "aayan", "ashutosh", "advait", "anand", "tarun",
  "sunny", "mani", "gokul", "vijay", "mohit", "rehan", "soham",
]);

// Legacy OpenAI TTS voice ids. OpenAI TTS was removed as a provider (its
// Hindi is unusable on real calls) — old agent rows carrying these values
// fall back to the Sarvam default voice.
const LEGACY_OPENAI_VOICES = new Set([
  "alloy", "shimmer", "nova", "coral", "sage", "marin",
  "echo", "fable", "onyx", "ash", "ballad", "verse", "cedar",
]);

const SARVAM_LEGACY_MAP: Record<string, string> = {
  aravind: "soham",
  aditi: "ritu",
  deepika: "kavitha",
  "priya (indian female)": "priya",
};

// ElevenLabs default premade voices offered in the VoiceSelector (IDs are
// case-sensitive): Sarah, Matilda, Jessica, Bella, Alice / Brian, Eric,
// George, Daniel, Chris.
const ELEVENLABS_FEMALE = new Set([
  "EXAVITQu4vr4xnSDxMaL", "XrExE9yKIg1WjnnlVkGX", "cgSgspJ2msm6clMCkdW9",
  "hpp4J3VqNfWAUOO0d1Us", "Xb7hH8MSUJpSbSDYk0k2",
]);
const ELEVENLABS_MALE = new Set([
  "nPczCjzI2devNBz1zQrb", "cjVigY5qzO86Huf0OWal", "JBFqnCBsd6RMkjVDRZzb",
  "onwK4e9ZLuTAKqWW03F9", "iP95p4xoKVk53GoZ742B",
]);

const inferGender = (provider: "sarvam" | "elevenlabs", voiceId: string): "male" | "female" | "unknown" => {
  if (provider === "sarvam") {
    if (SARVAM_FEMALE.has(voiceId)) return "female";
    if (SARVAM_MALE.has(voiceId)) return "male";
  } else if (provider === "elevenlabs") {
    if (ELEVENLABS_FEMALE.has(voiceId)) return "female";
    if (ELEVENLABS_MALE.has(voiceId)) return "male";
  }
  return "unknown";
};

const DEFAULT_SARVAM_VOICE = "priya"; // female — matches DB column default.

// Per-provider speaking-pace defaults. Providers interpret the same nominal
// multiplier very differently: the old global 0.9 made Sarvam bulbul drag
// noticeably while ElevenLabs turbo still sounded rushed. Applied only when
// the agent has no explicit voiceSpeed configured.
const DEFAULT_PACE: Record<"sarvam" | "elevenlabs", number> = {
  sarvam: 1.0,
  elevenlabs: 0.85,
};

// Per-provider safe pace ranges: Sarvam bulbul:v3 accepts 0.5–2.0, ElevenLabs
// hard-caps speed to [0.7, 1.2] (out-of-range values 400). The UI enforces
// the same bounds but the DB value is clamped here too so a hand-edited row
// can't break TTS.
const PACE_RANGE: Record<"sarvam" | "elevenlabs", [number, number]> = {
  sarvam: [0.5, 2.0],
  elevenlabs: [0.7, 1.2],
};
const clampPace = (provider: "sarvam" | "elevenlabs", pace: number): number => {
  const [min, max] = PACE_RANGE[provider];
  return Math.min(max, Math.max(min, pace));
};

/**
 * Gender of the configured voice, resolved the same way `createTTS` resolves
 * the speaker. Used to render gender-correct Hindi first-person verb forms in
 * the system prompt ("karti hoon" vs "karta hoon") — a female voice speaking
 * masculine Hindi is an instant immersion-breaker.
 */
export const getVoiceGender = (voiceStr: string): "male" | "female" | "unknown" => {
  const { provider, voiceId } = parseVoiceString(voiceStr);
  return inferGender(provider, voiceId);
};

/**
 * Parse the voice identifier stored on the agent row into `(provider, voiceId)`.
 *
 * Accepts prefix form (`sarvam:priya`, `openai:alloy`) written by the current
 * VoiceSelector UI, and unprefixed legacy values (`priya`, `Priya (Indian
 * Female)`, `Aravind`, etc.) that were saved by earlier versions of the wizard.
 *
 * If the input is empty/blank, the parse falls back to Sarvam Priya (female)
 * — the same default as the DB column, and specifically NOT the Sarvam plugin
 * default (`shubh`, male), which would otherwise be picked up silently and
 * present as "I selected a female voice but a male is speaking."
 */
export const parseVoiceString = (voiceStr: string): { provider: "sarvam" | "elevenlabs"; voiceId: string } => {
  const normalized = (voiceStr || "").toLowerCase().trim();
  if (!normalized) {
    return { provider: "sarvam", voiceId: DEFAULT_SARVAM_VOICE };
  }

  let provider: "sarvam" | "elevenlabs" = "sarvam";
  let voiceId: string;

  if (normalized.startsWith("sarvam:")) {
    provider = "sarvam";
    voiceId = normalized.slice("sarvam:".length).trim();
  } else if (normalized.startsWith("openai:") || LEGACY_OPENAI_VOICES.has(normalized)) {
    // OpenAI TTS was removed — legacy rows fall back to the default voice.
    return { provider: "sarvam", voiceId: DEFAULT_SARVAM_VOICE };
  } else if (normalized.startsWith("elevenlabs:")) {
    // ElevenLabs voice IDs are case-sensitive — slice from the original
    // string, not the lowercased copy.
    provider = "elevenlabs";
    voiceId = voiceStr.trim().slice("elevenlabs:".length).trim();
  } else {
    provider = "sarvam";
    voiceId = SARVAM_LEGACY_MAP[normalized] ?? normalized;
  }

  // Apply legacy → active speaker mapping AFTER prefix stripping, so both
  // `Aravind` (legacy display name) and `sarvam:aravind` (legacy id form)
  // resolve to `soham` on today's Sarvam bulbul:v3.
  if (provider === "sarvam" && SARVAM_LEGACY_MAP[voiceId]) {
    voiceId = SARVAM_LEGACY_MAP[voiceId]!;
  }

  // Guard against an empty voiceId slipping through (e.g. DB row of just
  // `sarvam:` — unlikely but real if someone hand-edits). Falling through
  // to the Sarvam plugin's own default would pick `shubh` (male), which
  // silently violates the persona configuration.
  if (!voiceId) {
    return { provider: "sarvam", voiceId: DEFAULT_SARVAM_VOICE };
  }

  return { provider, voiceId };
};

/**
 * Build the pipeline TTS from the agent's persona config. This is the ONLY
 * path that decides which voice speaks on the call — the LiveKit plugin
 * defaults must never leak through.
 */
export const createTTS = (opts: TTSBuildOptions): agentsTTS.TTS => {
  const { provider, voiceId } = parseVoiceString(opts.voice);
  const pace = clampPace(provider, opts.pace ?? DEFAULT_PACE[provider]);
  const gender = inferGender(provider, voiceId);
  const settings = opts.settings ?? {};

  // ElevenLabs is kept for legacy agents that still carry a premium voice;
  // the UI no longer offers it (Sarvam-only catalog).
  if (provider === "elevenlabs") {
    if (!config.tts.elevenlabsApiKey) {
      throw new Error("ELEVENLABS_API_KEY is required for the ElevenLabs TTS provider");
    }
    log.info("initializing tts provider", {
      provider: "elevenlabs",
      model: "eleven_turbo_v2_5",
      voice: voiceId,
      gender,
      configuredVoice: opts.voice,
      speed: pace,
      stability: settings.stability ?? 0.5,
      similarityBoost: settings.similarityBoost ?? 0.75,
      style: settings.style,
    });
    return new elevenlabs.TTS({
      apiKey: config.tts.elevenlabsApiKey,
      // turbo_v2_5, NOT flash_v2_5: flash's lower TTFB came with an audible
      // quality drop ("voice is not clear") on Hindi calls. Turbo's ~250ms
      // TTFB is inaudible next to STT+LLM time; clarity wins.
      model: "eleven_turbo_v2_5",
      voiceId,
      language: opts.language.split("-")[0],
      voiceSettings: {
        speed: pace,
        stability: settings.stability ?? 0.5,
        similarity_boost: settings.similarityBoost ?? 0.75,
        ...(settings.style !== undefined ? { style: settings.style } : {}),
      },
    });
  }

  if (!config.tts.sarvamApiKey) {
    throw new Error("SARVAM_API_KEY is required for the default TTS provider");
  }
  log.info("initializing tts provider", {
    provider: "sarvam",
    model: "bulbul:v3",
    language: opts.language,
    speaker: voiceId,
    gender,
    configuredVoice: opts.voice,
    pace,
    temperature: settings.temperature ?? 0.6,
    dictId: opts.dictId,
  });
  return new sarvam.TTS({
    apiKey: config.tts.sarvamApiKey,
    model: "bulbul:v3",
    streaming: true,
    speaker: voiceId,
    targetLanguageCode: opts.language,
    pace,
    temperature: settings.temperature ?? 0.6,
    sampleRate: 24000,
    ...(opts.dictId ? { dictId: opts.dictId } : {}),
  });
};
