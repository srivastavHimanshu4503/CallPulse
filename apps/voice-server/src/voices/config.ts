export type VoiceKey =
  | "hinglish"
  | "hindi"
  | "english"
  | "marathi"
  | "tamil"
  | "telugu"
  | "bengali"
  | "gujarati"
  | "kannada"
  | "malayalam"
  | "punjabi"
  | "odia";

export interface LanguageCodes {
  /** Sarvam STT language code (BCP-47). */
  stt: string;
  /** Sarvam TTS language code (BCP-47). */
  tts: string;
  /** Default Sarvam bulbul:v3 speaker for this language when the agent has none set. */
  speaker: string;
}

// Default speakers are only used when persona has no voice set at all. The
// caller-facing voice is always persona.voice from the DB — see agent/index.ts
// and tts/index.ts. These defaults exist as a floor, nothing more.
// Speakers follow Sarvam's per-language recommendation table (TTS best
// practices §10) — not every bulbul speaker performs equally in every
// language, and the old blanket "priya" default was audibly wrong for
// Bengali/Tamil/Malayalam/Odia.
const CODES: Record<VoiceKey, LanguageCodes> = {
  hinglish:  { stt: "hi-IN", tts: "hi-IN", speaker: "shubh" },
  hindi:     { stt: "hi-IN", tts: "hi-IN", speaker: "shubh" },
  english:   { stt: "en-IN", tts: "en-IN", speaker: "ratan" },
  marathi:   { stt: "mr-IN", tts: "mr-IN", speaker: "priya" },
  tamil:     { stt: "ta-IN", tts: "ta-IN", speaker: "ishita" },
  telugu:    { stt: "te-IN", tts: "te-IN", speaker: "priya" },
  bengali:   { stt: "bn-IN", tts: "bn-IN", speaker: "roopa" },
  gujarati:  { stt: "gu-IN", tts: "gu-IN", speaker: "priya" },
  kannada:   { stt: "kn-IN", tts: "kn-IN", speaker: "neha" },
  malayalam: { stt: "ml-IN", tts: "ml-IN", speaker: "pooja" },
  punjabi:   { stt: "pa-IN", tts: "pa-IN", speaker: "roopa" },
  odia:      { stt: "od-IN", tts: "od-IN", speaker: "ritu" },
};

export const resolveLanguageCodes = (key: VoiceKey): LanguageCodes => CODES[key];
