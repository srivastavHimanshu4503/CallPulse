export type VoiceKey = "hinglish" | "hindi" | "english";

export interface LanguageCodes {
  /** Sarvam STT language code (BCP-47). */
  stt: string;
  /** Sarvam TTS language code (BCP-47). */
  tts: string;
  /** Default Sarvam bulbul:v3 speaker for this language when the agent has none set. */
  speaker: string;
}

// Warm male voices from bulbul:v3. Other options if you want to swap:
//   Hindi/Hinglish male: aditya, rahul, dev, kabir, anand, advait
//   English (en-IN) male: anand, advait, sunny, tarun, soham
const CODES: Record<VoiceKey, LanguageCodes> = {
  hinglish: { stt: "hi-IN", tts: "hi-IN", speaker: "shubh" },
  hindi:    { stt: "hi-IN", tts: "hi-IN", speaker: "shubh" },
  english:  { stt: "en-IN", tts: "en-IN", speaker: "anand" },
};

export const resolveLanguageCodes = (key: VoiceKey): LanguageCodes => CODES[key];
