import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Bubble, HalfCircle, Orb, Sparkle } from "../motion/decor";
import {
  Scissors,
  Stethoscope,
  Wrench,
  Building2,
  CalendarCheck,
  PhoneForwarded,
  MessageCircle,
  ClipboardList,
} from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";
import { EASE, Reveal } from "../motion/primitives";

const ROTATE_MS = 6000;

const INDUSTRIES = [
  {
    id: "salon",
    icon: Scissors,
    label: "Salon & spa",
    scenario: "A regular calls at 8:40 PM — you're closing up.",
    caller: "Didi, Sunday ko bridal makeup ka slot hai kya?",
    agent:
      "Ji haan! Sunday 11 baje ka slot available hai. Bridal package ₹8,000 se start hota hai — book kar doon?",
    outcome: { icon: CalendarCheck, text: "Booked while you closed the till" },
  },
  {
    id: "clinic",
    icon: Stethoscope,
    label: "Clinic",
    scenario: "A patient calls during consultation hours.",
    caller: "Doctor sahab se kal milna hai, evening me time milega?",
    agent:
      "Dr. Mehta kal shaam 6 se 8 available hain. 6:30 ka slot book kar deti hoon — aapka naam bata dijiye?",
    outcome: { icon: ClipboardList, text: "Appointment noted, patient details in CRM" },
  },
  {
    id: "garage",
    icon: Wrench,
    label: "Garage",
    scenario: "A breakdown call while both your hands are inside an engine.",
    caller: "Gaadi start nahi ho rahi, aaj dikha sakta hoon kya?",
    agent:
      "Bilkul, aap 4 baje tak le aaiye. Agar towing chahiye toh main aapko owner se connect kar deti hoon.",
    outcome: { icon: PhoneForwarded, text: "Urgent case warm-transferred to you" },
  },
  {
    id: "realestate",
    icon: Building2,
    label: "Real estate",
    scenario: "A buyer calls about a listing at 10 PM.",
    caller: "2BHK wala flat abhi available hai? Budget 45 lakh tak hai.",
    agent:
      "Ji available hai! Main aapko photos aur site visit ki details WhatsApp par bhej deti hoon. Kal visit rakhein?",
    outcome: { icon: MessageCircle, text: "Lead captured, details sent on WhatsApp" },
  },
];

export function Industries() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = INDUSTRIES[index] ?? INDUSTRIES[0]!;

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % INDUSTRIES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <section id="industries" className="relative bg-bg-subtle px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
      <Orb className="top-[-120px] left-[-100px]" size={400} tone="sky" opacity={0.2} />
      <Bubble className="hidden sm:block top-20 right-[8%]" size={30} tone="teal" delay={-3} />
      <Bubble className="hidden md:block bottom-32 left-[6%]" size={20} tone="pink" delay={-6} />
      <Sparkle className="hidden sm:block top-[35%] left-[14%]" size={18} tone="sky" delay={-2.2} />
      <HalfCircle className="hidden md:block -bottom-px left-[45%]" size={100} tone="amber" />
      <div className="relative max-w-5xl mx-auto">
        <SectionHeading
          eyebrow="Industries"
          title="Built for businesses like yours"
          sub="DeskBuddy learns your services, your prices, and your hours — then talks like it's worked at your counter for years."
          className="mb-12"
        />

        {/* tabs */}
        <Reveal delay={0.1}>
          <div
            className="flex flex-wrap justify-center gap-2 mb-8"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {INDUSTRIES.map((ind, i) => {
              const isActive = i === index;
              return (
                <button
                  key={ind.id}
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    setPaused(true);
                  }}
                  className={`relative inline-flex items-center gap-2 text-[13.5px] font-semibold rounded-full px-5 py-2.5 transition-colors overflow-hidden ${
                    isActive
                      ? "text-white"
                      : "text-fg-secondary bg-bg-canvas border border-line-default hover:text-fg-primary hover:border-brand/30"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="industry-pill"
                      className="absolute inset-0 rounded-full bg-brand"
                      transition={{ duration: 0.4, ease: EASE }}
                    />
                  )}
                  {isActive && !paused && (
                    <motion.span
                      key={`progress-${index}`}
                      className="absolute bottom-0 left-0 h-[2.5px] bg-white/40"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: ROTATE_MS / 1000, ease: "linear" }}
                    />
                  )}
                  <ind.icon className="relative h-3.5 w-3.5" />
                  <span className="relative">{ind.label}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* scenario card */}
        <Reveal delay={0.15}>
          <div
            className="relative min-h-[300px] sm:min-h-[260px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.99 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="relative bg-bg-raised border border-line-default rounded-[16px] shadow-[0_20px_50px_-28px_rgba(15,23,42,0.2)] p-6 sm:p-8 overflow-hidden"
              >
                <div
                  aria-hidden
                  className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/[0.06] blur-[70px]"
                />
                <p className="relative text-[12px] font-bold text-fg-muted uppercase tracking-[0.12em] mb-6">
                  {active.scenario}
                </p>

                <div className="relative space-y-3.5 max-w-2xl">
                  <motion.div
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[90%] sm:max-w-[75%] bg-bg-muted rounded-[14px] rounded-bl-[4px] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-fg-muted mb-0.5">
                        Caller
                      </p>
                      <p className="text-[14px] text-fg-primary leading-relaxed">
                        "{active.caller}"
                      </p>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.45, ease: EASE }}
                    className="flex justify-end"
                  >
                    <div className="max-w-[90%] sm:max-w-[75%] bg-brand rounded-[14px] rounded-br-[4px] px-4 py-3 shadow-[0_8px_20px_-8px_rgba(37,99,235,0.5)]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 mb-0.5">
                        DeskBuddy
                      </p>
                      <p className="text-[14px] text-white leading-relaxed">"{active.agent}"</p>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, type: "spring", stiffness: 260, damping: 20 }}
                  className="relative mt-6 inline-flex items-center gap-2 text-[12.5px] font-bold text-positive bg-positive-50 border border-positive/15 rounded-full px-4 py-2"
                >
                  <active.outcome.icon className="h-3.5 w-3.5" />
                  {active.outcome.text}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
