import { motion } from "framer-motion";
import { Check, Zap, Phone, MessageCircle, Send } from "lucide-react";
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
      "Bookings, CRM and workflows",
      "WhatsApp and SMS follow-ups",
      "Call transfer to your phone",
      "Call recordings and analytics",
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
      whileHover={p.comingSoon ? undefined : { y: -4 }}
      transition={{ duration: 0.25 }}
      className={`relative h-full flex flex-col bg-bg-raised rounded-[14px] p-7 ${
        p.highlight ? "" : "border border-line-default shadow-sm"
      } ${p.comingSoon ? "opacity-70" : ""}`}
    >
      <h3 className="text-[16px] font-bold text-fg-primary">{p.name}</h3>
      <p className="text-[13px] text-fg-muted mt-1">{p.blurb}</p>

      <div className="mt-5 mb-6 pb-6 border-b border-line-subtle">
        {p.comingSoon || price === null ? (
          <span className="text-[22px] font-extrabold text-fg-muted">Coming soon</span>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-[40px] font-extrabold text-fg-primary tracking-tight leading-none">
              {inr(price)}
            </span>
            <span className="text-[13px] text-fg-muted font-medium">
              {price === 0 ? "forever" : "/month"}
            </span>
          </div>
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
              ? "btn-primary"
              : "text-fg-primary border border-line-default hover:bg-bg-muted"
          }`}
        >
          {p.cta}
        </a>
      )}
    </motion.div>
  );
}

const CREDIT_ROWS = [
  {
    icon: Phone,
    label: "Voice calls",
    cost: `${CREDIT_COSTS.VOICE_PER_MINUTE} credits / minute`,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp message",
    cost: `${CREDIT_COSTS.WHATSAPP} credit`,
  },
  {
    icon: Send,
    label: "SMS message",
    cost: `${CREDIT_COSTS.SMS} credit`,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative overflow-hidden bg-bg-subtle px-4 sm:px-6 py-12 sm:py-16">
      <div className="relative max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing, in rupees"
          sub="Start free. Upgrade when the calls do. Credits are the only meter, so no per-seat charges and no surprise bills."
          className="mb-8"
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

        {/* Credit cost breakdown, its own block so it does not feel bolted onto pricing */}
        <Reveal delay={0.15}>
          <div className="mt-14 bg-bg-raised border border-line-default rounded-[14px] p-6 sm:p-7 max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[rgb(var(--saffron-600))] mb-1.5">
                  How credits work
                </p>
                <h3 className="text-[18px] font-bold text-fg-primary">
                  One credit meter. Every plan.
                </h3>
              </div>
              <p className="text-[13px] text-fg-muted max-w-sm">
                Credits are shared across voice, WhatsApp and SMS. Buy more only if
                you run out during the month.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4">
              {CREDIT_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-3 bg-bg-subtle border border-line-subtle rounded-[10px] px-4 py-3.5"
                >
                  <span className="h-9 w-9 rounded-[9px] bg-bg-highlight text-brand flex items-center justify-center shrink-0">
                    <row.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-fg-primary leading-tight">
                      {row.label}
                    </p>
                    <p className="text-[12px] text-fg-muted mt-0.5">{row.cost}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 pt-5 border-t border-line-subtle text-[12.5px] text-fg-muted text-center">
              Need more? Top-up packs start at{" "}
              <b className="text-fg-primary">{inr(CREDIT_PACKS[0].priceInr)}</b> for{" "}
              <b className="text-fg-primary">{CREDIT_PACKS[0].credits} credits</b>. Cancel
              anytime, no lock-in.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
