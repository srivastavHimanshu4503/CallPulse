import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, MonitorSmartphone, PhoneCall, Check, Play } from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";
import { EASE, Stagger, StaggerItem } from "../motion/primitives";
import { Bubble, DottedRing, HalfCircle, Orb, Ring, Sparkle } from "../motion/decor";

function KbVisual() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between bg-bg-canvas border border-line-subtle rounded-[8px] px-3 py-2">
        <span className="text-[11px] font-semibold text-fg-muted">Business name</span>
        <span className="text-[11px] font-bold text-fg-primary">Sharma Salon</span>
      </div>
      {["Services & prices", "Timings & address", "FAQs"].map((t, i) => (
        <motion.div
          key={t}
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 + i * 0.18, duration: 0.4, ease: EASE }}
          className="flex items-center gap-2 bg-bg-canvas border border-line-subtle rounded-[8px] px-3 py-2"
        >
          <Check className="h-3 w-3 text-positive" />
          <span className="text-[11px] font-medium text-fg-secondary">{t}</span>
          <span className="ml-auto text-[9.5px] font-bold text-brand bg-bg-highlight rounded-full px-1.5 py-0.5">
            auto
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function TestVisual() {
  return (
    <div className="flex items-center gap-3 bg-bg-canvas border border-line-subtle rounded-[10px] px-3.5 py-3">
      <span className="h-9 w-9 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
        <Play className="h-3.5 w-3.5 ml-0.5" fill="currentColor" />
      </span>
      <div className="flex-1">
        <p className="text-[11px] font-bold text-fg-primary mb-1.5">Browser test call</p>
        <div className="flex items-center gap-[2.5px]" aria-hidden>
          {[10, 16, 8, 18, 12, 15, 7, 14, 9, 17, 11, 6, 13, 8].map((h, i) => (
            <span
              key={i}
              className="wave-bar w-[2.5px] rounded-full bg-brand/60"
              style={{ height: h, animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>
      </div>
      <span className="text-[10px] font-semibold text-fg-muted tabular-nums">0:12</span>
    </div>
  );
}

function LiveVisual() {
  return (
    <div className="flex items-center justify-between bg-bg-canvas border border-line-subtle rounded-[10px] px-3.5 py-3">
      <div>
        <p className="text-[11px] font-bold text-fg-primary">+91 80XX XXXX42</p>
        <p className="text-[10.5px] text-fg-muted mt-0.5">Connected to your agent</p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-positive bg-positive-50 rounded-full px-2.5 py-1">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-positive animate-ping opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive" />
        </span>
        LIVE
      </span>
    </div>
  );
}

const STEPS = [
  {
    icon: Sparkles,
    n: "01",
    title: "Create your agent",
    body: "Tell us your business name — DeskBuddy writes your agent's knowledge base automatically.",
    visual: KbVisual,
  },
  {
    icon: MonitorSmartphone,
    n: "02",
    title: "Test it in your browser",
    body: "Talk to your agent before your customers do. Pick the voice, language, and greeting.",
    visual: TestVisual,
  },
  {
    icon: PhoneCall,
    n: "03",
    title: "Go live on your number",
    body: "Connect a phone number and you're done. Every missed call becomes an answered one.",
    visual: LiveVisual,
  },
];

export function HowItWorks() {
  const reduce = useReducedMotion();
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-bg-subtle px-4 sm:px-6 py-16 sm:py-24">
      <Orb className="-top-52 right-[-160px]" size={480} tone="teal" opacity={0.2} />
      <Orb className="hidden md:block bottom-[-200px] -left-40" size={460} tone="blue" opacity={0.22} delay={-9} />
      <DottedRing className="hidden md:block -top-12 right-[12%]" size={160} tone="teal" />
      <Ring className="hidden sm:block top-1/3 left-6" size={64} tone="pink" delay={-3} />
      <Bubble className="hidden sm:block top-[22%] left-[12%]" size={30} tone="violet" delay={-3} />
      <Bubble className="bottom-24 right-10" size={24} tone="amber" delay={-5} />
      <Sparkle className="hidden md:block top-[45%] right-[5%]" size={20} tone="teal" delay={-1.2} />
      <HalfCircle className="hidden lg:block -bottom-px right-[22%]" size={110} tone="violet" />
      <div className="relative max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="How it works"
          title="Live in under 10 minutes"
          sub="No hardware, no new SIM, no training sessions. Three steps and your front desk never sleeps again."
          className="mb-12"
        />

        <div className="relative">
          {/* connector line (desktop) */}
          <div className="hidden lg:block absolute top-[38px] left-[19%] right-[19%] h-[2px] bg-line-default rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand origin-left"
              initial={reduce ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.6, delay: 0.4, ease: EASE }}
            />
          </div>

          <Stagger className="grid sm:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <StaggerItem key={s.n}>
                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.3 }}
                  className="relative h-full bg-bg-raised border border-line-default rounded-[14px] p-6 shadow-sm hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.18)] transition-shadow"
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="relative z-10 h-11 w-11 rounded-[12px] bg-bg-highlight text-brand flex items-center justify-center">
                      <s.icon className="h-5 w-5" />
                    </div>
                    <span className="text-[38px] font-extrabold text-fg-primary/[0.06] leading-none select-none">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-bold text-fg-primary mb-2">{s.title}</h3>
                  <p className="text-[13.5px] text-fg-secondary leading-relaxed mb-5">{s.body}</p>
                  <div className="bg-bg-subtle rounded-[10px] p-2.5 border border-line-subtle">
                    <s.visual />
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  );
}
