import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { EASE, Reveal, Stagger, StaggerItem } from "../motion/primitives";
import { Bubble, DottedRing, Orb, Sparkle } from "../motion/decor";

const FAQS = [
  {
    q: "Does it really speak Hindi?",
    a: "Yes — Hindi, Hinglish, English, Marathi, Tamil, and Telugu. The voices are natural and conversational, and your agent replies in the language the caller uses.",
  },
  {
    q: "What happens when it can't answer something?",
    a: "It doesn't guess. Depending on your setup, it either warm-transfers the call to your phone or politely takes a message with the caller's details — which lands in your CRM.",
  },
  {
    q: "Do callers know they're talking to an AI?",
    a: "You decide. You control the greeting and how your agent introduces itself. Either way, the voice is natural enough that conversations stay comfortable — callers just get helped.",
  },
  {
    q: "Do I need any new hardware or SIM?",
    a: "No. DeskBuddy runs entirely in the cloud on a phone number connected to your account. Your existing phones stay exactly as they are.",
  },
  {
    q: "Can I hear what my agent said on calls?",
    a: "Every call comes with a recording and a full transcript in your dashboard, so you can review conversations and improve your agent's answers.",
  },
  {
    q: "How long does setup take?",
    a: "Under 10 minutes. Your agent's knowledge base is generated automatically at signup — most owners make a browser test call within their first five minutes.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There's no lock-in and no cancellation fee. The free plan stays free forever.",
  },
];

function Item({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`bg-bg-raised border rounded-[12px] transition-all ${
        open ? "border-brand/30 shadow-[0_10px_30px_-18px_rgba(37,99,235,0.35)]" : "border-line-default hover:border-line-strong"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <span
          className={`text-[11px] font-extrabold tabular-nums transition-colors ${
            open ? "text-brand" : "text-fg-muted/60"
          }`}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="flex-1 text-[14.5px] font-semibold text-fg-primary">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.25, ease: EASE }}
          className="shrink-0"
        >
          <ChevronDown className="h-4 w-4 text-fg-muted" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <p className="pl-[52px] pr-5 pb-4 text-[13.5px] text-fg-secondary leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  return (
    <section id="faq" className="relative overflow-hidden bg-bg-canvas px-4 sm:px-6 py-16 sm:py-24">
      <Orb className="hidden md:block top-[10%] right-[-140px]" size={400} tone="blue" opacity={0.16} />
      <DottedRing className="hidden lg:block top-24 right-[6%]" size={110} tone="violet" delay={-5} />
      <Bubble className="hidden sm:block bottom-32 left-[8%]" size={28} tone="sky" delay={-3} />
      <Bubble className="hidden md:block top-[30%] left-[4%]" size={16} tone="amber" delay={-6} />
      <Sparkle className="hidden sm:block bottom-[20%] right-[12%]" size={18} tone="blue" delay={-2} />
      <div className="relative max-w-3xl mx-auto">
        <Reveal className="text-center mb-12">
          <span className="inline-block text-[11px] font-semibold tracking-wide text-brand bg-bg-highlight rounded-full px-3.5 py-1.5 mb-5">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-[34px] font-bold tracking-tight text-fg-primary leading-tight">
            Questions, answered
          </h2>
        </Reveal>
        <Stagger className="space-y-3">
          {FAQS.map((f, i) => (
            <StaggerItem key={f.q}>
              <Item q={f.q} a={f.a} index={i} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
