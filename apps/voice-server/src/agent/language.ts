import type { VoiceKey } from "../voices/config.js";

/**
 * Normalizes user-specified or STT-detected language strings into canonical VoiceKey identifiers.
 * Recognizes Indian regional languages and Hinglish.
 */
export const normalizeLanguage = (raw: string): VoiceKey => {
  const lower = (raw || "").toLowerCase().trim();
  if (lower.startsWith("hin") && lower.includes("glish")) return "hinglish";
  if (lower.startsWith("hin")) return "hindi";
  if (lower.startsWith("en")) return "english";
  if (lower.startsWith("mar")) return "marathi";
  if (lower.startsWith("tam")) return "tamil";
  if (lower.startsWith("tel")) return "telugu";
  if (lower.startsWith("ben") || lower.startsWith("bang")) return "bengali";
  if (lower.startsWith("guj")) return "gujarati";
  if (lower.startsWith("kan")) return "kannada";
  if (lower.startsWith("mal")) return "malayalam";
  if (lower.startsWith("pun") || lower.startsWith("pan")) return "punjabi";
  if (lower.startsWith("odi") || lower.startsWith("ori")) return "odia";
  return "hinglish";
};
