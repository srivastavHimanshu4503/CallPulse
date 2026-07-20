import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { SectionHeading } from "../common/SectionHeading";
import { EASE, Reveal } from "../motion/primitives";

const LANGUAGES = [
  { name: "Hindi", greeting: "नमस्ते! मैं आपकी क्या मदद कर सकती हूँ?" },
  { name: "Hinglish", greeting: "Hello ji! Batayiye, appointment chahiye?" },
  { name: "English", greeting: "Hello! How can I help you today?" },
  { name: "Marathi", greeting: "नमस्कार! मी तुमची कशी मदत करू?" },
  { name: "Tamil", greeting: "வணக்கம்! நான் எப்படி உதவலாம்?" },
  { name: "Telugu", greeting: "నమస్తే! నేను మీకు ఎలా సహాయం చేయగలను?" },
];

export function Languages() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % LANGUAGES.length), 2800);
    return () => clearInterval(id);
  }, [paused]);

  const active = LANGUAGES[index] ?? LANGUAGES[0]!;

  return (
    <section className="relative bg-bg-canvas px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
      <div
        aria-hidden
        className="animate-drift absolute top-1/3 left-1/2 -translate-x-1/2 h-[380px] w-[680px] rounded-full bg-brand/[0.05] blur-[100px]"
      />

      <div className="relative max-w-3xl mx-auto text-center">
        <SectionHeading
          eyebrow="Languages"
          title={
            <>
              Speaks like your front desk,
              <br className="hidden sm:block" /> not a robot
            </>
          }
          sub="Studio-quality voices that greet, pause, and reassure like a person. Your customers talk in the language they think in — DeskBuddy keeps up."
        />

        <Reveal delay={0.1} className="mt-12">
          {/* rotating greeting */}
          <div className="relative h-[110px] sm:h-[100px] flex flex-col items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.name}
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
                transition={{ duration: 0.45, ease: EASE }}
                className="px-4"
              >
                <p className="text-[22px] sm:text-[28px] font-bold tracking-tight text-fg-primary">
                  "{active.greeting}"
                </p>
              </motion.div>
            </AnimatePresence>

            {/* waveform under greeting */}
            <div className="mt-4 flex items-center gap-[3px]" aria-hidden>
              {[6, 12, 8, 16, 10, 18, 7, 14, 9, 15, 6, 11].map((h, i) => (
                <span
                  key={i}
                  className="wave-bar w-[3px] rounded-full bg-brand/50"
                  style={{ height: h, animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>

          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
            onMouseLeave={() => setPaused(false)}
          >
            {LANGUAGES.map((l, i) => {
              const isActive = i === index;
              return (
                <button
                  key={l.name}
                  type="button"
                  onMouseEnter={() => {
                    setPaused(true);
                    setIndex(i);
                  }}
                  onClick={() => {
                    setPaused(true);
                    setIndex(i);
                  }}
                  className={`relative text-[14px] font-semibold rounded-full px-5 py-2.5 transition-colors ${
                    isActive
                      ? "text-white"
                      : "text-fg-primary bg-bg-muted hover:bg-bg-highlight hover:text-brand"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="language-pill"
                      className="absolute inset-0 rounded-full bg-brand shadow-[0_6px_16px_-6px_rgba(37,99,235,0.55)]"
                      transition={{ duration: 0.4, ease: EASE }}
                    />
                  )}
                  <span className="relative">{l.name}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-7 text-[12.5px] text-fg-muted">
            Hinglish included — because real conversations mix.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
