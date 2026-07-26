import { HelpCircle } from "lucide-react";
import { Reveal, Stagger, StaggerItem } from "../motion/primitives";

const FAQS = [
  {
    q: "Does it really speak Hindi?",
    a: "Yes. Hindi, Hinglish, English, Marathi, Tamil and Telugu. The voices are natural and conversational, and your agent replies in the language the caller uses.",
  },
  {
    q: "What happens when it can't answer something?",
    a: "It doesn't guess. Depending on your setup, it either warm-transfers the call to your phone or politely takes a message with the caller's details, which lands in your CRM.",
  },
  {
    q: "Do callers know they're talking to an AI?",
    a: "You decide. You control the greeting and how your agent introduces itself. Either way, the voice is natural enough that callers just get helped without any awkwardness.",
  },
  {
    q: "Do I need any new hardware or SIM?",
    a: "No. DeskBuddy runs entirely in the cloud on a phone number connected to your account. Your existing phones stay exactly as they are.",
  },
  {
    q: "Can I hear what my agent said on calls?",
    a: "Every call comes with a recording and a full transcript in your dashboard, so you can review conversations and refine your agent's answers.",
  },
  {
    q: "How long does setup take?",
    a: "Under 10 minutes. Your agent's knowledge base is generated automatically at signup, and most owners make a browser test call within their first five minutes.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. There is no lock-in and no cancellation fee. The free plan stays free forever.",
  },
  {
    q: "Is my customer data safe?",
    a: "Every call, transcript and contact stays inside your account. We never resell data, and you can export or delete anything from your dashboard.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative overflow-hidden bg-bg-canvas px-4 sm:px-6 py-12 sm:py-16">
      <div className="relative max-w-6xl mx-auto">
        <Reveal className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-brand bg-bg-highlight rounded-full px-3.5 py-1.5 mb-5">
            <HelpCircle className="h-3 w-3" />
            FAQ
          </span>
          <h2 className="text-[26px] sm:text-[34px] font-extrabold tracking-tight text-fg-primary leading-tight">
            Questions, answered
          </h2>
        </Reveal>

        <Stagger className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
          {FAQS.map((f) => (
            <StaggerItem key={f.q}>
              <div className="h-full bg-bg-raised border border-line-default rounded-[14px] p-5 sm:p-6 hover:border-brand/25 hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.15)] transition-all">
                <h3 className="text-[14.5px] font-bold text-fg-primary leading-snug mb-2.5">
                  {f.q}
                </h3>
                <p className="text-[13px] text-fg-secondary leading-relaxed">{f.a}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
