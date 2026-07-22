import * as React from "react";
import { BookOpen, Lightbulb } from "lucide-react";

/**
 * Per-tab setup instructions shown beside the agent form. Written for
 * non-technical business owners in English AND Hindi — the language toggle
 * persists so a Hindi-first user reads every tab in Hindi. Content is plain
 * data below; keep steps short (one action each) and tips concrete.
 */

type GuideLang = "en" | "hi";

interface GuideContent {
  title: string;
  intro: string;
  steps: string[];
  tips: string[];
}

const GUIDE: Record<string, Record<GuideLang, GuideContent>> = {
  general: {
    en: {
      title: "Set up your agent's identity",
      intro: "This is who answers your calls. Callers will hear this name and greeting on every call.",
      steps: [
        "Give the agent a human name — like \"Priya\" or \"Rahul\". Callers feel comfortable with real names.",
        "Pick a role — what this agent does for you (Receptionist, Sales, Support).",
        "Choose the language your callers speak. You can also change this later in the Voice tab.",
        "Write the greeting — the exact first line spoken on every call. Keep it short and in the caller's language.",
        "Pick a tone — Friendly works best for most businesses.",
      ],
      tips: [
        "Keep the greeting under 15 words and include your business name: \"Namaste! Sharma Tent House mein aapka swagat hai.\"",
        "The fallback message is what the agent says when it can't help — keep it reassuring.",
      ],
    },
    hi: {
      title: "अपने agent की पहचान set करें",
      intro: "यही आपके calls उठाएगा। हर call पर caller को यही नाम और greeting सुनाई देगी।",
      steps: [
        "Agent को इंसानी नाम दें — जैसे \"प्रिया\" या \"राहुल\"। असली नाम से caller को अच्छा लगता है।",
        "Role चुनें — यह agent आपके लिए क्या करेगा (Receptionist, Sales, Support)।",
        "वो भाषा चुनें जो आपके customers बोलते हैं। इसे बाद में Voice tab से भी बदल सकते हैं।",
        "Greeting लिखें — हर call की पहली line यही बोली जाएगी। छोटी रखें और caller की भाषा में लिखें।",
        "Tone चुनें — ज़्यादातर businesses के लिए Friendly सबसे अच्छा है।",
      ],
      tips: [
        "Greeting 15 शब्दों से छोटी रखें और business का नाम ज़रूर डालें: \"नमस्ते! शर्मा टेंट हाउस में आपका स्वागत है।\"",
        "Fallback message वो है जो agent तब बोलता है जब वो help नहीं कर पाता — भरोसा दिलाने वाली रखें।",
      ],
    },
  },
  knowledge: {
    en: {
      title: "Teach the agent your business",
      intro: "The agent answers ONLY from what you write here. The better your data, the better every call.",
      steps: [
        "In Business information, paste your raw data: services, full price list, packages, timings, address.",
        "Write facts only — \"Plastic chair ₹12 per chair\", \"Open 9am–8pm, Tuesday closed\".",
        "Add your website (optional) — we pull services and FAQs from it.",
        "In Agent guidelines, write how the agent should treat callers — like briefing a new receptionist.",
      ],
      tips: [
        "Always write per-unit prices (\"₹12 per chair\", \"₹3,500 per day\") — the agent quotes them exactly.",
        "Anything NOT written here, the agent will politely offer a callback for — it never invents prices.",
        "Good guideline examples: \"Always ask the event date before quoting\", \"Never promise same-day delivery\".",
        "Update prices here the moment they change — the agent uses them on the very next call.",
      ],
    },
    hi: {
      title: "Agent को अपना business सिखाएँ",
      intro: "Agent सिर्फ़ वही जवाब देता है जो आप यहाँ लिखेंगे। जितना अच्छा data, उतनी अच्छी हर call।",
      steps: [
        "Business information में अपना raw data paste करें: services, पूरी price list, packages, timings, address।",
        "सिर्फ़ facts लिखें — \"Plastic chair ₹12 प्रति chair\", \"सुबह 9 से रात 8, मंगलवार बंद\"।",
        "Website डालें (optional) — हम उससे services और FAQs निकाल लेते हैं।",
        "Agent guidelines में लिखें कि agent callers से कैसे बात करे — जैसे नए receptionist को समझा रहे हों।",
      ],
      tips: [
        "Price हमेशा per-unit लिखें (\"₹12 प्रति chair\", \"₹3,500 प्रति दिन\") — agent वही exact बताता है।",
        "जो यहाँ नहीं लिखा, उसके लिए agent politely callback offer करेगा — कभी अपने से price नहीं बनाएगा।",
        "अच्छी guidelines: \"Quote देने से पहले हमेशा event की date पूछो\", \"Same-day delivery का promise कभी मत करो\"।",
        "Price बदलते ही यहाँ update करें — अगली ही call से agent नई price बताएगा।",
      ],
    },
  },
  voice: {
    en: {
      title: "Choose how your agent sounds",
      intro: "Language decides which voices you see — every voice shown is tested to sound natural in it.",
      steps: [
        "Pick the agent's language — the voice list updates instantly.",
        "Press the play button on any voice to hear a sample.",
        "Start with a \"Recommended\" voice — these are the best match for your language.",
        "Adjust speaking speed if needed — 1× is natural; most businesses stay between 0.9× and 1.1×.",
        "If the agent says your brand name or any word wrong, add it in Pronunciation: word → how to say it.",
      ],
      tips: [
        "Preview voices with YOUR language selected — the same voice sounds different per language.",
        "Expressiveness: higher sounds more lively, lower sounds calmer and steadier.",
        "Pronunciation example: NAIC → \"N A I C\", PhonePe → \"फ़ोन पे\".",
      ],
    },
    hi: {
      title: "अपने agent की आवाज़ चुनें",
      intro: "भाषा चुनते ही सिर्फ़ वही voices दिखती हैं जो उस भाषा में natural लगती हैं।",
      steps: [
        "Agent की भाषा चुनें — voice list तुरंत update हो जाएगी।",
        "किसी भी voice पर play button दबाकर sample सुनें।",
        "\"Recommended\" voice से शुरू करें — ये आपकी भाषा के लिए सबसे अच्छी हैं।",
        "ज़रूरत हो तो speaking speed adjust करें — 1× natural है; ज़्यादातर businesses 0.9× से 1.1× रखते हैं।",
        "अगर agent आपका brand name या कोई word ग़लत बोले, तो Pronunciation में डालें: word → कैसे बोलना है।",
      ],
      tips: [
        "अपनी भाषा select करके ही voices preview करें — वही voice हर भाषा में अलग लगती है।",
        "Expressiveness: ज़्यादा = ज़्यादा lively, कम = शांत और stable।",
        "Pronunciation का example: NAIC → \"N A I C\", PhonePe → \"फ़ोन पे\"।",
      ],
    },
  },
  phone: {
    en: {
      title: "Connect a phone number & set limits",
      intro: "Your agent needs its own number to receive real calls. Limits keep you in control.",
      steps: [
        "Buy or attach an agent number — callers will dial this to reach your AI.",
        "Set max call duration — calls end automatically after this to prevent runaway costs.",
        "Set availability — 24x7, or business hours with your time zone.",
        "Keep DND compliance ON to stay TRAI-compliant.",
      ],
      tips: [
        "A purchased number binds permanently to this agent — it can't be moved later.",
        "You can test without a number: use the browser test call from the agents list.",
        "10 minutes max duration is enough for almost every business call.",
      ],
    },
    hi: {
      title: "Phone number जोड़ें और limits set करें",
      intro: "असली calls लेने के लिए agent को अपना number चाहिए। Limits से आप control में रहते हैं।",
      steps: [
        "Agent के लिए number खरीदें या attach करें — customers इसी पर call करेंगे।",
        "Max call duration set करें — इसके बाद call अपने आप कट जाती है, ताकि cost control में रहे।",
        "Availability set करें — 24x7, या अपने business hours और time zone के हिसाब से।",
        "DND compliance ON रखें — TRAI के नियमों के लिए ज़रूरी है।",
      ],
      tips: [
        "खरीदा हुआ number हमेशा के लिए इसी agent से जुड़ जाता है — बाद में बदला नहीं जा सकता।",
        "बिना number के भी test कर सकते हैं: agents list से browser test call करें।",
        "10 minute की max duration लगभग हर business call के लिए काफ़ी है।",
      ],
    },
  },
  workflows: {
    en: {
      title: "Automate what happens on calls",
      intro: "Workflows are optional superpowers — turn on only what your business needs.",
      steps: [
        "Lead intake: the agent naturally collects caller details (name, phone, requirement) during the call.",
        "SMS: automatically text the caller after specific situations — like sending your address.",
        "Call transfer: for the situations you define, the agent connects the caller to a real person's number.",
        "Calendar booking: let the agent book appointments directly into your calendar.",
      ],
      tips: [
        "Make transfer conditions specific: \"caller asks for the owner\" works better than \"important call\".",
        "Add a fallback transfer number for when the first person doesn't pick up.",
        "After saving, always make one browser test call to check the full flow end-to-end.",
      ],
    },
    hi: {
      title: "Calls पर automation set करें",
      intro: "Workflows optional हैं — सिर्फ़ वही ON करें जो आपके business को चाहिए।",
      steps: [
        "Lead intake: agent call के दौरान naturally caller की details लेता है (नाम, number, requirement)।",
        "SMS: कुछ situations के बाद caller को अपने आप message जाता है — जैसे address भेजना।",
        "Call transfer: आपकी बताई situation में agent call असली इंसान के number पर जोड़ देता है।",
        "Calendar booking: agent सीधे आपके calendar में appointment book कर सकता है।",
      ],
      tips: [
        "Transfer condition specific रखें: \"caller मालिक से बात माँगे\" — \"important call\" जैसा vague नहीं।",
        "Fallback transfer number भी डालें — पहला व्यक्ति न उठाए तो दूसरे पर try होगा।",
        "Save के बाद एक browser test call ज़रूर करें — पूरा flow end-to-end check हो जाता है।",
      ],
    },
  },
};

const LANG_STORAGE_KEY = "agent-setup-guide-lang";

export function SetupGuide({ tab }: { tab: string }): React.JSX.Element | null {
  const [lang, setLang] = React.useState<GuideLang>(() => {
    try {
      return (localStorage.getItem(LANG_STORAGE_KEY) as GuideLang) === "hi" ? "hi" : "en";
    } catch {
      return "en";
    }
  });

  const pick = (l: GuideLang) => {
    setLang(l);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, l);
    } catch {
      /* private mode — toggle still works for the session */
    }
  };

  const content = GUIDE[tab]?.[lang];
  if (!content) return null;

  return (
    <section className="bg-white border border-[#E5E5E5] rounded-[8px] p-5 font-sans">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2563EB]">
          <BookOpen className="h-3.5 w-3.5" />
          {lang === "hi" ? "Setup guide" : "Setup guide"}
        </span>
        <div className="flex items-center gap-1 p-0.5 bg-[#F7F7F7] rounded-[6px] border border-[#E5E5E5]">
          {(["en", "hi"] as GuideLang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => pick(l)}
              className={`px-2.5 h-6 text-[11px] font-semibold rounded-[4px] transition-all ${
                lang === l
                  ? "bg-white text-[#2563EB] shadow-sm ring-1 ring-[#2563EB]/15"
                  : "text-[#666666] hover:text-[#111111]"
              }`}
            >
              {l === "en" ? "English" : "हिंदी"}
            </button>
          ))}
        </div>
      </div>

      <h4 className="text-[13px] font-semibold text-[#111111] leading-snug">{content.title}</h4>
      <p className="text-[12px] text-[#666666] mt-1 leading-relaxed">{content.intro}</p>

      <ol className="mt-4 space-y-2.5">
        {content.steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="h-5 w-5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold flex items-center justify-center shrink-0 mt-[1px]">
              {i + 1}
            </span>
            <span className="text-[12px] text-[#333333] leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>

      {content.tips.length > 0 && (
        <div className="mt-4 bg-[#FAFAFA] border border-[#E5E5E5] rounded-[8px] p-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#111111] mb-2">
            <Lightbulb className="h-3.5 w-3.5 text-[#D97706]" />
            {lang === "hi" ? "काम की tips" : "Tips"}
          </span>
          <ul className="space-y-1.5">
            {content.tips.map((tip, i) => (
              <li key={i} className="text-[11px] text-[#666666] leading-relaxed flex items-start gap-1.5">
                <span className="text-[#D97706] mt-[2px] shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
