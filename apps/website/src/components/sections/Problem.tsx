import { PhoneMissed, PhoneIncoming, Wallet, ArrowRight, X, Check } from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "../motion/primitives";

const BAD_OPTIONS = [
  {
    icon: PhoneMissed,
    title: "Let it ring",
    body: "No voicemail. They dial the next shop on Google and book there.",
  },
  {
    icon: PhoneIncoming,
    title: "Answer it yourself",
    body: "The paying customer in front of you waits while you quote prices.",
  },
  {
    icon: Wallet,
    title: "Hire a receptionist",
    body: "A full salary for one shift — and the 9 PM calls still go unanswered.",
  },
];

const DESKBUDDY_WINS = [
  "Picks up on the first ring, 24/7",
  "Speaks Hindi, Hinglish + 4 more languages",
  "Books the slot, saves the lead, follows up",
];

export function Problem() {
  return (
    <section className="bg-bg-canvas px-4 sm:px-6 py-16 sm:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="The problem"
          title="Every missed call is a customer you paid to lose"
          sub="Ads, boards, word of mouth — you spend to make the phone ring. Then it rings at the worst moment."
          className="mb-12"
        />

        <div className="grid lg:grid-cols-[1fr_1.05fr] gap-5 lg:gap-8 items-stretch">
          {/* the three old options */}
          <Stagger className="flex flex-col gap-3">
            {BAD_OPTIONS.map((o) => (
              <StaggerItem key={o.title} className="flex-1">
                <div className="group h-full flex items-center gap-4 bg-bg-subtle border border-line-default rounded-[14px] px-5 py-4 transition-colors hover:border-negative/25">
                  <div className="h-10 w-10 shrink-0 rounded-[10px] bg-bg-muted text-fg-muted flex items-center justify-center transition-colors group-hover:bg-negative-50 group-hover:text-negative">
                    <o.icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-bold text-fg-primary flex items-center gap-2">
                      {o.title}
                    </h3>
                    <p className="text-[13px] text-fg-secondary leading-snug mt-0.5">{o.body}</p>
                  </div>
                  <span className="ml-auto h-6 w-6 shrink-0 rounded-full bg-negative-50 text-negative flex items-center justify-center">
                    <X className="h-3.5 w-3.5" />
                  </span>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          {/* option four */}
          <Reveal delay={0.15}>
            <div className="relative h-full overflow-hidden bg-bg-inverse rounded-[16px] p-7 sm:p-8 flex flex-col justify-between">
              <div aria-hidden className="absolute inset-0 bg-grid-dark" />
              <div
                aria-hidden
                className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand/25 blur-[80px]"
              />
              <div className="relative">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-300 mb-3">
                  The fourth option
                </p>
                <p className="text-[22px] sm:text-[26px] font-extrabold tracking-tight text-white leading-tight">
                  DeskBuddy answers.
                  <br />
                  Every single time.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {DESKBUDDY_WINS.map((w) => (
                    <li key={w} className="flex items-center gap-2.5 text-[13.5px] text-white/80">
                      <span className="h-[18px] w-[18px] rounded-full bg-brand/25 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-brand-300" />
                      </span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="https://app.deskbuddy.in/register"
                className="btn-shine group relative mt-7 inline-flex items-center justify-center gap-2 self-start text-[14px] font-semibold text-white bg-brand hover:bg-brand-600 rounded-[10px] px-6 py-3 transition-all shadow-[0_10px_28px_-10px_rgba(37,99,235,0.6)]"
              >
                Try it free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
