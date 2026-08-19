import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Phone, Volume2 } from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";
import { EASE, Reveal } from "../motion/primitives";

const LANGUAGES = [
  {
    name: "Hindi",
    script: "हिन्दी",
    greeting: "नमस्ते! मैं आपकी क्या मदद कर सकती हूँ?",
    translit: "Namaste! Main aapki kya madad kar sakti hoon?",
    accent: "linear-gradient(135deg, #f97316, #ec4899)",
  },
  {
    name: "Hinglish",
    script: "Hinglish",
    greeting: "Hello ji! Batayiye, appointment chahiye?",
    translit: "For customers who mix Hindi and English naturally",
    accent: "linear-gradient(135deg, #f59e0b, #ef4444)",
  },
  {
    name: "English",
    script: "English",
    greeting: "Hello! How can I help you today?",
    translit: "Clear, warm, natural Indian English accent",
    accent: "linear-gradient(135deg, #2563eb, #7c3aed)",
  },
  {
    name: "Marathi",
    script: "मराठी",
    greeting: "नमस्कार! मी तुमची कशी मदत करू?",
    translit: "Namaskar! Mi tumchi kashi madat karu?",
    accent: "linear-gradient(135deg, #ea580c, #f97316)",
  },
  {
    name: "Tamil",
    script: "தமிழ்",
    greeting: "வணக்கம்! நான் எப்படி உதவலாம்?",
    translit: "Vanakkam! Naan eppadi udhavalam?",
    accent: "linear-gradient(135deg, #0ea5e9, #10b981)",
  },
  {
    name: "Telugu",
    script: "తెలుగు",
    greeting: "నమస్తే! నేను మీకు ఎలా సహాయం చేయగలను?",
    translit: "Namaste! Nenu meeku ela sahayam cheyagalanu?",
    accent: "linear-gradient(135deg, #7c3aed, #ec4899)",
  },
];

export function Languages() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % LANGUAGES.length), 3200);
    return () => clearInterval(id);
  }, [paused]);

  const active = LANGUAGES[index] ?? LANGUAGES[0]!;

  return (
    <section className="relative bg-bg-canvas px-4 sm:px-6 py-12 sm:py-16 overflow-hidden">
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[380px] w-[680px] rounded-full opacity-25 blur-[100px]"
        style={{
          background:
            "radial-gradient(circle at 30% 50%, rgba(37,99,235,0.22), transparent 60%), radial-gradient(circle at 75% 50%, rgba(249,115,22,0.22), transparent 60%)",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Languages"
          title="Answers in the language your customer thinks in"
          sub="Studio-quality voices in six Indian languages. Same warmth, same natural pauses, same understanding. Whichever language the caller uses, DeskBuddy replies fluently."
          className="mb-10"
        />

        <div
          className="grid lg:grid-cols-[1fr_1fr] gap-8 lg:gap-10 items-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* language chip grid */}
          <div className="grid grid-cols-3 gap-2.5 order-2 lg:order-1">
            {LANGUAGES.map((l, i) => {
              const isActive = i === index;
              return (
                <button
                  key={l.name}
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setPaused(true);
                  }}
                  className={`group relative rounded-[12px] p-3.5 text-left transition-all overflow-hidden ${
                    isActive
                      ? "text-white shadow-[0_10px_28px_-12px_rgba(37,99,235,0.55)]"
                      : "bg-bg-raised border border-line-default text-fg-primary hover:border-brand/30"
                  }`}
                  style={isActive ? { background: l.accent } : undefined}
                >
                  <p
                    className={`text-[18px] font-extrabold leading-none ${
                      isActive ? "text-white" : "text-fg-primary"
                    }`}
                  >
                    {l.script}
                  </p>
                  <p
                    className={`mt-1.5 text-[11px] font-semibold uppercase tracking-wide ${
                      isActive ? "text-white/80" : "text-fg-muted"
                    }`}
                  >
                    {l.name}
                  </p>
                </button>
              );
            })}
          </div>

          {/* phone frame with live greeting */}
          <div className="relative order-1 lg:order-2 flex justify-center">
            <div
              aria-hidden
              className="absolute inset-0 rounded-[40px] opacity-40 blur-3xl"
              style={{ background: active.accent }}
            />
            <div className="relative w-full max-w-[340px] bg-bg-raised border border-line-default rounded-[20px] shadow-[0_24px_60px_-24px_rgba(15,23,42,0.22)] overflow-hidden">
              {/* status bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-line-subtle bg-bg-subtle/70">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-8 w-8 rounded-full text-white flex items-center justify-center shadow-sm"
                    style={{ background: active.accent }}
                  >
                    <Phone className="h-3.5 w-3.5" fill="currentColor" />
                  </span>
                  <div>
                    <p className="text-[12px] font-bold text-fg-primary leading-tight">
                      Your business
                    </p>
                    <p className="text-[10.5px] text-positive font-semibold leading-tight">
                      Answering in {active.name}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-positive bg-positive-50 rounded-full px-2 py-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-positive animate-ping opacity-60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive" />
                  </span>
                  LIVE
                </span>
              </div>

              {/* greeting bubble */}
              <div className="p-5 min-h-[170px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={active.name}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <div
                      className="rounded-[14px] rounded-br-[4px] px-4 py-3 text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)]"
                      style={{ background: active.accent }}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Volume2 className="h-3 w-3 opacity-70" />
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                          DeskBuddy · {active.name}
                        </p>
                      </div>
                      <p className="text-[15px] font-semibold leading-relaxed">{active.greeting}</p>
                    </div>
                    <p className="mt-2.5 text-[11.5px] text-fg-muted italic px-1">
                      {active.translit}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* waveform footer */}
              <div className="px-5 py-3 border-t border-line-subtle bg-bg-subtle/50 flex items-center justify-between">
                <div className="flex items-center gap-[3px]" aria-hidden>
                  {[6, 12, 8, 16, 10, 18, 7, 14, 9, 15, 6, 11].map((h, i) => (
                    <span
                      key={i}
                      className="wave-bar w-[3px] rounded-full bg-brand/50"
                      style={{ height: h, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <span className="text-[10.5px] font-semibold text-fg-muted tabular-nums">
                  0:0{index + 2}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Reveal delay={0.1}>
          <p className="mt-8 text-center text-[13px] text-fg-muted">
            Hinglish included, because most Indian conversations mix.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
