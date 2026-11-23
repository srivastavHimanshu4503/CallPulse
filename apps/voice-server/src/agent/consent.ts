import type { VoiceKey } from "../voices/config.js";

/**
 * DPDP Act 2023 Statutory Recording Disclosures in regional Indian languages.
 * "This call is recorded for quality and appointment booking purposes."
 */
export const DPDP_CONSENT_DISCLOSURES: Record<VoiceKey, string> = {
  english: "This call is recorded for quality and appointment booking purposes.",
  hindi: "यह कॉल गुणवत्ता और अपॉइंटमेंट बुकिंग के उद्देश्य से रिकॉर्ड की जा रही है।",
  hinglish: "Yeh call quality aur appointment booking ke purpose se record ki ja rahi hai.",
  marathi: "हा कॉल गुणवत्ता आणि अपॉइंटमेंट बुकिंगच्या उद्देशाने रेकॉर्ड केला जात आहे.",
  tamil: "இந்த அழைப்பு தரம் மற்றும் முன்பதிவு நோக்கங்களுக்காக பதிவு செய்யப்படுகிறது.",
  telugu: "ఈ కాల్ నాణ్యత మరియు అపాయింట్‌మెంట్ బుకింగ్ ప్రయోజనాల కోసం రికార్డ్ చేయబడుతోంది.",
  bengali: "এই কলটি গুণমান এবং অ্যাপয়েন্টমেন্ট বুকিংয়ের উদ্দেশ্যে রেকর্ড করা হচ্ছে।",
  gujarati: "આ કોલ ગુણવત્તા અને એપોઇન્ટમેન્ટ બુકિંગના હેતુ માટે રેકોર્ડ કરવામાં આવી રહ્યો છે.",
  kannada: "ಗುಣಮಟ್ಟ ಮತ್ತು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕಿಂಗ್ ಉದ್ದೇಶಗಳಿಗಾಗಿ ಈ ಕರೆಯನ್ನು ರೆಕಾರ್ಡ್ ಮಾಡಲಾಗುತ್ತಿದೆ.",
  malayalam:
    "ഗുണനിലവാരത്തിനും അപ്പോയിന്റ്മെന്റ് ബുക്കിംഗിനും വേണ്ടി ഈ കോൾ റെക്കോർഡ് ചെയ്യപ്പെടുന്നു.",
  punjabi: "ਇਹ ਕਾਲ ਗੁਣਵੱਤਾ ਅਤੇ ਮੁਲਾਕਾਤ ਬੁਕਿੰਗ ਦੇ ਉਦੇਸ਼ਾਂ ਲਈ ਰਿਕਾਰਡ ਕੀਤੀ ਜਾ ਰਹੀ ਹੈ।",
  odia: "ଏହି କଲ୍ ଗୁଣବତ୍ତା ଏବଂ ଆପଏଣ୍ଟମେଣ୍ଟ ବୁକିଂ ଉଦ୍ଦେଶ୍ୟରେ ରେକର୍ଡ କରାଯାଉଛି।",
};

/**
 * Returns the statutory DPDP consent disclosure for a resolved language key.
 */
export function getRecordingConsentDisclaimer(lang: VoiceKey): string {
  return DPDP_CONSENT_DISCLOSURES[lang] || DPDP_CONSENT_DISCLOSURES.hinglish;
}

/**
 * Formats the call inception announcement by prepending the statutory DPDP Act consent
 * notice to the persona's greeting message.
 */
export function formatCallInceptionGreeting(
  greeting: string,
  lang: VoiceKey,
  consentRequired = true,
): string {
  if (!consentRequired) return greeting;
  const disclaimer = getRecordingConsentDisclaimer(lang);
  const cleanGreeting = (greeting || "").trim();
  return `${disclaimer} ${cleanGreeting}`.trim();
}

/**
 * Automatically redacts Indian PII (Aadhaar, PAN, Credit Cards) from transcripts
 * to guarantee DPDP Act 2023 data minimization.
 */
export function redactIndianPII(text: string): string {
  if (!text) return text;

  // Credit/Debit Cards: 16 digits (matched first to prevent 12-digit Aadhaar collision)
  const cardRegex = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;

  // Aadhaar: 12 digits (often grouped in 4-4-4, first digit 2-9)
  const aadhaarRegex = /\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g;

  // PAN: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F)
  const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi;

  return text
    .replace(cardRegex, "[REDACTED_CARD]")
    .replace(aadhaarRegex, "[REDACTED_AADHAAR]")
    .replace(panRegex, "[REDACTED_PAN]");
}
