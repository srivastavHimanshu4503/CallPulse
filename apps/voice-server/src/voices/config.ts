export type VoiceKey = "hinglish" | "hindi" | "english";

export interface LanguageCodes {
  /** Sarvam STT language code (BCP-47). */
  stt: string;
  /** Sarvam TTS language code (BCP-47). */
  tts: string;
  /** Default Sarvam bulbul:v3 speaker for this language when the agent has none set. */
  speaker: string;
}

const CODES: Record<VoiceKey, LanguageCodes> = {
  hinglish: { stt: "hi-IN", tts: "hi-IN", speaker: "ritu" },
  hindi:    { stt: "hi-IN", tts: "hi-IN", speaker: "ritu" },
  english:  { stt: "en-IN", tts: "en-IN", speaker: "amelia" },
};

export const resolveLanguageCodes = (key: VoiceKey): LanguageCodes => CODES[key];
