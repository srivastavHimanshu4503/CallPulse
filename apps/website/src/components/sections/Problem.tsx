import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  PhoneMissed,
  UserX,
  Clock,
  IndianRupee,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";
import { EASE, Reveal, Stagger, StaggerItem } from "../motion/primitives";

const PAIN_STATS = [
  {
    icon: PhoneMissed,
    value: "1 in 3",
    label: "business calls go unanswered during peak hours",
  },
  {
    icon: UserX,
    value: "62%",
    label: "of callers hang up and dial your competitor instead",
  },
  {
    icon: Clock,
    value: "45%",
    label: "of enquiry calls come in outside business hours",
  },
];

// Ticker that counts missed rupees while the visitor is on the page.
// Uses a realistic ballpark of ₹1,000 per missed lead, one every 4 seconds.
function LostRevenueTicker() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (reduce) {
      setCount(12000);
      return;
    }
    const id = setInterval(() => setCount((c) => c + 1000), 4000);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <div className="relative h-full overflow-hidden rounded-[16px] p-6 sm:p-7 bg-bg-inverse">
      <div aria-hidden className="absolute inset-0 bg-grid-dark opacity-60" />
      <div
        aria-hidden
        className="absolute -right-16 -top-20 h-64 w-64 rounded-full opacity-60 blur-[80px]"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.45), transparent 70%)" }}
      />
      <div className="relative h-full flex flex-col">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--saffron-300))] mb-3 inline-flex items-center gap-2">
          <TrendingDown className="h-3.5 w-3.5" />
          Missed while you read this page
        </p>
        <div className="flex items-baseline gap-1">
          <IndianRupee className="h-8 w-8 sm:h-10 sm:w-10 text-white self-center" strokeWidth={2.5} />
          <motion.span
            key={count}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="text-[42px] sm:text-[56px] font-extrabold tracking-tight text-white leading-none tabular-nums"
          >
            {count.toLocaleString("en-IN")}
          </motion.span>
        </div>
        <p className="mt-3 text-[13.5px] text-white/70 leading-relaxed max-w-sm">
          At about ₹1,000 per missed lead. That's revenue walking away every four
          seconds while a phone rings out somewhere in India.
        </p>

        <div className="mt-auto pt-6 flex flex-wrap items-center gap-3">
          <a
            href="https://app.deskbuddy.in/register"
            className="btn-primary group inline-flex items-center gap-2 h-11 px-5 text-[13.5px] font-semibold rounded-[10px]"
          >
            Stop losing calls
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <span className="text-[12px] text-white/50">Free to start, 5 minutes to set up</span>
        </div>
      </div>
    </div>
  );
}

export function Problem() {
  return (
    <section className="relative bg-bg-canvas px-4 sm:px-6 py-12 sm:py-16 overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-20 right-0 h-[320px] w-[320px] rounded-full opacity-25 blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.25), transparent 70%)" }}
      />
      <div className="relative max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="The problem"
          title="Every missed call is a customer who found someone else"
          sub="Ads, boards, Google, referrals. You spend all that money to make the phone ring. Then it rings when you can't pick up, and that customer never calls back."
          className="mb-8"
        />

        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-5 lg:gap-6 items-stretch">
          <Stagger className="grid grid-cols-1 gap-3">
            {PAIN_STATS.map((s) => (
              <StaggerItem key={s.label}>
                <div className="flex items-center gap-4 bg-bg-subtle border border-line-default rounded-[14px] px-5 py-4 h-full">
                  <div className="h-11 w-11 shrink-0 rounded-[10px] bg-negative-50 text-negative flex items-center justify-center">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[24px] sm:text-[28px] font-extrabold text-fg-primary leading-none tabular-nums">
                      {s.value}
                    </p>
                    <p className="text-[13px] text-fg-secondary leading-snug mt-1">{s.label}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal delay={0.15}>
            <LostRevenueTicker />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
