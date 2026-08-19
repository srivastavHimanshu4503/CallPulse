import {
  Phone,
  BookOpen,
  CalendarCheck,
  Users,
  MessageCircle,
  PhoneForwarded,
  BarChart3,
} from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";
import { SpotlightCard } from "../common/SpotlightCard";
import { Stagger, StaggerItem } from "../motion/primitives";

// Kept intentionally tight so all six features are visible in one viewport.
// One icon + short title + one-line body per card, no fillers.
const FEATURES = [
  {
    icon: Phone,
    title: "Answers every call",
    body: "First ring, 24/7, in six Indian languages. Natural voice, never rushed.",
  },
  {
    icon: BookOpen,
    title: "Learns your business",
    body: "Services, prices, timings and FAQs, built into your agent at signup.",
  },
  {
    icon: CalendarCheck,
    title: "Books appointments",
    body: "Takes the slot during the call. Callers walk away with a confirmed time.",
  },
  {
    icon: Users,
    title: "Saves every caller to CRM",
    body: "Every conversation becomes a contact with history, transcript and deal.",
  },
  {
    icon: MessageCircle,
    title: "Follows up on WhatsApp",
    body: "Sends the confirmation, reminder or booking details right after the call.",
  },
  {
    icon: PhoneForwarded,
    title: "Transfers hot leads",
    body: "When the caller says the magic word, DeskBuddy passes the call to you.",
  },
];

const cardCls =
  "h-full bg-bg-raised border border-line-default rounded-[14px] p-5 shadow-sm hover:shadow-[0_16px_44px_-20px_rgba(15,23,42,0.16)] hover:border-brand/25 transition-all";

export function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-bg-canvas px-4 sm:px-6 py-12 sm:py-16"
    >
      <div
        aria-hidden
        className="absolute -top-32 -left-10 h-[300px] w-[300px] rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(37,99,235,0.28), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -right-10 h-[300px] w-[300px] rounded-full opacity-20 blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.28), transparent 70%)" }}
      />
      <div className="relative max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Features"
          title="Everything a receptionist does. Automated."
          sub="From picking up to closing the loop, DeskBuddy runs the whole conversation and hands you a customer who is ready to walk in."
          className="mb-8"
        />

        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <SpotlightCard className={cardCls}>
                <div className="flex items-start gap-3">
                  <span className="h-10 w-10 shrink-0 rounded-[10px] bg-bg-highlight text-brand flex items-center justify-center">
                    <f.icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[14.5px] font-bold text-fg-primary leading-snug mb-1">
                      {f.title}
                    </h3>
                    <p className="text-[13px] text-fg-secondary leading-relaxed">{f.body}</p>
                  </div>
                </div>
              </SpotlightCard>
            </StaggerItem>
          ))}
        </Stagger>

        <p className="mt-8 text-center text-[13px] text-fg-muted">
          Plus call recordings, transcripts, analytics and workflows.{" "}
          <BarChart3 className="inline h-3.5 w-3.5 text-brand -mt-0.5" /> All included.
        </p>
      </div>
    </section>
  );
}
