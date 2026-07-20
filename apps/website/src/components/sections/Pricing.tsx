import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import {
  PLAN_PRICE_INR,
  PLAN_CREDITS,
  PLAN_AGENT_LIMITS,
  CREDIT_COSTS,
  CREDIT_PACKS,
} from "@antigravity/types";
import { SectionHeading } from "../common/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "../motion/primitives";

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const PLANS = [
  {
    key: "FREE" as const,
    name: "Free",
    blurb: "Try DeskBuddy on real calls.",
    features: [
      `${PLAN_CREDITS.FREE} credits included`,
      `${PLAN_AGENT_LIMITS.FREE} AI agent`,
      "All six languages",
      "Test calls in your browser",
      "Call transcripts",
    ],
    cta: "Get started free",
    highlight: false,
    comingSoon: false,
  },
  {
    key: "PRO" as const,
    name: "Pro",
    blurb: "For businesses that live on the phone.",
    features: [
      `${PLAN_CREDITS.PRO} credits every month`,
      `Up to ${PLAN_AGENT_LIMITS.PRO} AI agents`,
      "Bookings, CRM & workflows",
      "WhatsApp & SMS follow-ups",
      "Call transfer to your phone",
      "Call recordings & analytics",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
    comingSoon: false,
  },
  {
    key: "GROWTH" as const,
    name: "Growth",
    blurb: "A middle tier for growing teams.",
    features: [
      `${PLAN_CREDITS.GROWTH} credits every month`,
      `Up to ${PLAN_AGENT_LIMITS.GROWTH} AI agents`,
      "Everything in Free",
    ],
    cta: "Coming soon",
    highlight: false,
    comingSoon: true,
  },
];

function PlanCard({ p }: { p: (typeof PLANS)[number] }) {
  const price = PLAN_PRICE_INR[p.key];
  return (
    <motion.div
      whileHover={p.comingSoon ? undefined : { y: -6 }}
      transition={{ duration: 0.3 }}
      className={`relative h-full flex flex-col bg-bg-raised rounded-[12.5px] p-6 sm:p-7 ${
        p.highlight ? "" : "border border-line-default shadow-sm"
      } ${p.comingSoon ? "opacity-70" : ""}`}
    >
      <h3 className="text-[15px] font-bold text-fg-primary">{p.name}</h3>
      <p className="text-[12.5px] text-fg-muted mt-0.5">{p.blurb}</p>

      <div className="mt-4 mb-5">
        {p.comingSoon || price === null ? (
          <span className="text-2xl font-extrabold text-fg-muted">Coming soon</span>
        ) : (
          <>
            <span className="text-[36px] font-extrabold text-fg-primary tracking-tight">
              {inr(price)}
            </span>
            <span className="text-[13px] text-fg-muted font-medium">
              {price === 0 ? " forever" : "/month"}
            </span>
          </>
        )}
      </div>

      <ul className="space-y-2.5 mb-7 flex-1">
        {p.features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-fg-secondary">
            <span className="h-[18px] w-[18px] rounded-full bg-positive-50 flex items-center justify-center shrink-0 mt-[1px]">
              <Check className="h-3 w-3 text-positive" />
            </span>
            {f}
          </li>
        ))}
      </ul>

      {p.comingSoon ? (
        <span className="block text-center text-[14px] font-semibold text-fg-muted border border-line-default rounded-[8px] px-4 py-3 cursor-default">
          {p.cta}
        </span>
      ) : (
        <a
          href="https://app.deskbuddy.in/register"
          className={`block text-center text-[14px] font-semibold rounded-[8px] px-4 py-3 transition-all ${
            p.highlight
              ? "btn-shine text-white bg-brand hover:bg-brand-600 shadow-[0_10px_24px_-10px_rgba(37,99,235,0.6)]"
              : "text-fg-primary border border-line-default hover:bg-bg-muted hover:border-brand/30"
          }`}
        >
          {p.cta}
        </a>
      )}
    </motion.div>
  );
}

export function Pricing() {
  return (
    <section id="pricing" className="bg-bg-subtle px-4 sm:px-6 py-16 sm:py-24">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing, in rupees"
          sub="Start free. Upgrade when the calls do. Credits are the only meter — no per-seat charges, no surprise bills."
          className="mb-12"
        />

        <Stagger className="grid sm:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((p) => (
            <StaggerItem key={p.key} className={p.highlight ? "sm:-mt-4 sm:-mb-2" : ""}>
              {p.highlight ? (
                <div className="relative h-full pt-3.5">
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-brand rounded-full px-3.5 py-1.5 shadow-[0_6px_16px_-6px_rgba(37,99,235,0.6)]">
                    <Zap className="h-3 w-3" fill="currentColor" /> Most popular
                  </span>
                  <div className="card-glow-border h-full shadow-[0_24px_60px_-24px_rgba(37,99,235,0.35)]">
                    <PlanCard p={p} />
                  </div>
                </div>
              ) : (
                <PlanCard p={p} />
              )}
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.2}>
          <p className="mt-10 text-center text-[12.5px] text-fg-muted leading-relaxed">
            Calls use {CREDIT_COSTS.VOICE_PER_MINUTE} credits/minute · WhatsApp{" "}
            {CREDIT_COSTS.WHATSAPP} · SMS {CREDIT_COSTS.SMS}. Need more? Top-up packs
            start at {inr(CREDIT_PACKS[0].priceInr)} for {CREDIT_PACKS[0].credits} credits.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
