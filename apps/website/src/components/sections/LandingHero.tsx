import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { EASE } from "../motion/primitives";
import { Bubble, DottedRing, Orb, Ring, Sparkle } from "../motion/decor";

// Lightweight, data-driven hero for vertical + city landing pages. Keeps
// the same visual identity as the homepage Hero, but uses a static (non-
// SplitWords) H1 so it's easy to swap per route and remains SEO-clean.
export function LandingHero({
  eyebrow,
  h1,
  subhead,
  proofPoint,
  primaryCta = { label: "Get started free", href: "https://app.deskbuddy.in/register" },
  secondaryCta = { label: "See how it works", href: "#how-it-works" },
}: {
  eyebrow: string;
  h1: string;
  subhead: string;
  proofPoint?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}) {
  return (
    <section className="relative overflow-hidden bg-bg-canvas px-4 sm:px-6 pt-24 sm:pt-28 pb-16 sm:pb-20">
      <Orb className="hidden md:block top-[8%] right-[-160px]" size={480} tone="blue" opacity={0.18} />
      <Orb className="hidden md:block bottom-[-160px] left-[-120px]" size={360} tone="violet" opacity={0.14} />
      <DottedRing className="hidden lg:block top-32 left-[8%]" size={120} tone="blue" delay={-3} />
      <Ring className="hidden lg:block top-[35%] right-[12%]" size={140} tone="sky" delay={-4} />
      <Bubble className="hidden sm:block top-[22%] left-[6%]" size={22} tone="amber" delay={-6} />
      <Sparkle className="hidden sm:block bottom-[18%] right-[10%]" size={22} tone="blue" delay={-1} />

      <div className="relative max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="inline-flex items-center gap-2 bg-bg-highlight border border-brand/10 text-brand rounded-full px-3.5 py-1.5 mb-7"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span className="text-[11px] font-semibold tracking-wide">{eyebrow}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="text-[36px] sm:text-[46px] lg:text-[54px] font-extrabold tracking-[-0.02em] leading-[1.06] text-fg-primary"
        >
          {h1}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
          className="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-fg-secondary leading-relaxed"
        >
          {subhead}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28, ease: EASE }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a
            href={primaryCta.href}
            className="btn-shine group w-full sm:w-auto h-[52px] px-8 inline-flex items-center justify-center gap-2 text-[15.5px] font-semibold text-white bg-brand hover:bg-brand-600 rounded-[10px] transition-all shadow-[0_10px_28px_-10px_rgba(37,99,235,0.55)] hover:shadow-[0_14px_36px_-10px_rgba(37,99,235,0.65)] hover:-translate-y-0.5"
          >
            {primaryCta.label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href={secondaryCta.href}
            className="group w-full sm:w-auto h-[52px] px-8 inline-flex items-center justify-center gap-2 text-[15.5px] font-semibold text-fg-primary bg-bg-canvas/80 backdrop-blur hover:bg-bg-muted border border-line-default rounded-[10px] transition-all hover:-translate-y-0.5"
          >
            {secondaryCta.label}
          </a>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-4 text-[12.5px] text-fg-muted"
        >
          Free plan · 30 credits · no card required
        </motion.p>

        {proofPoint && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
            className="mt-10 max-w-xl mx-auto bg-bg-raised border border-line-subtle rounded-[14px] px-6 py-5"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand mb-2">
              Real result
            </p>
            <p className="text-[15px] text-fg-primary leading-relaxed">{proofPoint}</p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
