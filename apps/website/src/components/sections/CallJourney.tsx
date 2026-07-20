import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "framer-motion";
import { useRef, useState } from "react";
import {
  PhoneIncoming,
  CalendarCheck,
  UserPlus,
  MessageCircle,
  CheckCheck,
  Check,
} from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";
import { EASE, Stagger, StaggerItem } from "../motion/primitives";

function AnsweredVisual() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-10 w-10 rounded-full bg-brand text-white text-[12px] font-bold flex items-center justify-center">
            SS
          </span>
          <div>
            <p className="text-[13.5px] font-bold text-fg-primary">Sharma Salon</p>
            <p className="text-[11.5px] text-positive font-semibold">Answered · first ring</p>
          </div>
        </div>
        <span className="text-[11.5px] font-semibold text-fg-muted tabular-nums">9:14 PM</span>
      </div>
      <div className="flex items-center gap-[3px] justify-center py-2" aria-hidden>
        {[8, 16, 10, 22, 13, 19, 9, 24, 12, 18, 8, 15, 11, 20, 7].map((h, i) => (
          <span
            key={i}
            className="wave-bar w-[3.5px] rounded-full bg-brand/60"
            style={{ height: h, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
      <div className="bg-brand rounded-[14px] rounded-bl-[4px] px-4 py-3 max-w-[90%]">
        <p className="text-[13.5px] text-white leading-relaxed">
          "Namaste, Sharma Salon! Main aapki kya madad kar sakti hoon?"
        </p>
      </div>
    </div>
  );
}

function BookedVisual() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted">
        Tomorrow · available slots
      </p>
      {["3:00 PM", "5:00 PM", "6:30 PM"].map((t, i) => (
        <motion.div
          key={t}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.12, duration: 0.4, ease: EASE }}
          className={`flex items-center justify-between rounded-[10px] px-4 py-3 border ${
            i === 1
              ? "bg-bg-highlight border-brand/40"
              : "bg-bg-subtle border-line-subtle opacity-60"
          }`}
        >
          <span
            className={`text-[13px] font-bold ${i === 1 ? "text-brand" : "text-fg-secondary"}`}
          >
            {t}
          </span>
          {i === 1 && (
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.65, type: "spring", stiffness: 300, damping: 18 }}
              className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-white bg-positive rounded-full px-2.5 py-1"
            >
              <CalendarCheck className="h-3 w-3" /> Booked · Priya
            </motion.span>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function CrmVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 rounded-full bg-bg-highlight text-brand text-[13px] font-extrabold flex items-center justify-center">
          PV
        </span>
        <div>
          <p className="text-[14.5px] font-bold text-fg-primary">Priya Verma</p>
          <p className="text-[11.5px] text-fg-muted">+91 98XXX XXX21 · new contact</p>
        </div>
        <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold text-brand bg-bg-highlight rounded-full px-2.5 py-1">
          <UserPlus className="h-3 w-3" /> Auto-created
        </span>
      </div>
      {[
        "Full call recording & transcript",
        "Interested in: haircut, keratin (₹2,499)",
        "Deal added · appointment tomorrow 5 PM",
      ].map((t, i) => (
        <motion.div
          key={t}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.14, duration: 0.4, ease: EASE }}
          className="flex items-center gap-2.5 bg-bg-subtle border border-line-subtle rounded-[10px] px-4 py-2.5"
        >
          <Check className="h-3.5 w-3.5 text-positive shrink-0" />
          <span className="text-[12.5px] font-medium text-fg-secondary">{t}</span>
        </motion.div>
      ))}
    </div>
  );
}

function WhatsappVisual() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted">
        WhatsApp · to Priya
      </p>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.45, ease: EASE }}
        className="bg-bg-subtle border border-line-subtle rounded-[14px] rounded-bl-[4px] px-4 py-3.5 max-w-[95%]"
      >
        <p className="text-[13px] text-fg-primary leading-relaxed">
          Namaste Priya ji! 💇‍♀️ Aapka appointment kal <b>5:00 PM</b> par confirm
          hai. Sharma Salon, MG Road. Milte hain!
        </p>
        <p className="mt-1.5 text-right text-[10.5px] text-fg-muted">
          9:16 PM <CheckCheck className="inline h-3.5 w-3.5 text-brand ml-0.5" />
        </p>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-[12px] text-fg-muted"
      >
        Sent automatically, 90 seconds after the call ended.
      </motion.p>
    </div>
  );
}

const STAGES = [
  {
    icon: PhoneIncoming,
    time: "9:14 PM",
    title: "The call is answered",
    body: "You're with a customer. DeskBuddy picks up on the first ring and greets in the caller's language.",
    visual: AnsweredVisual,
  },
  {
    icon: CalendarCheck,
    time: "9:15 PM",
    title: "The slot gets booked",
    body: "It checks tomorrow's availability, offers times, and confirms the booking — all on the call.",
    visual: BookedVisual,
  },
  {
    icon: UserPlus,
    time: "9:16 PM",
    title: "The caller becomes a customer",
    body: "A CRM contact is created automatically — recording, transcript, interests, and a deal attached.",
    visual: CrmVisual,
  },
  {
    icon: MessageCircle,
    time: "9:16 PM",
    title: "WhatsApp confirmation lands",
    body: "Booking details reach the caller's phone before they've put it down. Fewer no-shows, zero effort.",
    visual: WhatsappVisual,
  },
];

export function CallJourney() {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setStage(Math.min(STAGES.length - 1, Math.max(0, Math.floor(v * STAGES.length))));
  });

  const Active = STAGES[stage] ?? STAGES[0]!;

  return (
    <section className="bg-bg-canvas">
      {/* ── desktop: sticky scroll story ── */}
      <div ref={ref} className="hidden lg:block relative h-[320vh]">
        <div className="sticky top-0 h-screen flex items-center overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 w-full">
            <SectionHeading
              eyebrow="One call's journey"
              title="90 seconds. Zero effort from you."
              className="mb-10"
            />

            <div className="grid grid-cols-[1fr_1.1fr] gap-16 items-center">
              {/* stage list */}
              <div className="relative pl-8">
                {/* progress rail */}
                <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-line-default rounded-full overflow-hidden">
                  <motion.div
                    className="w-full bg-brand origin-top"
                    style={{ scaleY: scrollYProgress }}
                  />
                </div>

                <div className="space-y-9">
                  {STAGES.map((s, i) => {
                    const isActive = i === stage;
                    return (
                      <button
                        type="button"
                        key={s.title}
                        onClick={() => {
                          const el = ref.current;
                          if (!el) return;
                          const top =
                            el.offsetTop +
                            (i / STAGES.length) * (el.offsetHeight - window.innerHeight) +
                            10;
                          window.scrollTo({ top, behavior: "smooth" });
                        }}
                        className="block text-left w-full group"
                      >
                        <div className="flex items-center gap-3 mb-1.5">
                          <span
                            className={`h-8 w-8 rounded-[9px] flex items-center justify-center transition-colors duration-300 ${
                              isActive
                                ? "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)]"
                                : "bg-bg-muted text-fg-muted group-hover:text-fg-secondary"
                            }`}
                          >
                            <s.icon className="h-4 w-4" />
                          </span>
                          <span
                            className={`text-[11px] font-bold tabular-nums tracking-wide transition-colors duration-300 ${
                              isActive ? "text-brand" : "text-fg-muted"
                            }`}
                          >
                            {s.time}
                          </span>
                        </div>
                        <h3
                          className={`text-[17px] font-bold tracking-tight transition-colors duration-300 ${
                            isActive ? "text-fg-primary" : "text-fg-muted"
                          }`}
                        >
                          {s.title}
                        </h3>
                        <p
                          className={`mt-1 text-[13px] leading-relaxed transition-all duration-300 ${
                            isActive ? "text-fg-secondary" : "text-fg-muted/60"
                          }`}
                        >
                          {s.body}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* stage visual */}
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute -inset-8 rounded-[40px] bg-brand/[0.06] blur-3xl"
                />
                <AnimatePresence mode="wait">
                  <motion.div
                    key={stage}
                    initial={{ opacity: 0, y: 26, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -18, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="relative bg-bg-raised border border-line-default rounded-[18px] shadow-[0_24px_60px_-24px_rgba(15,23,42,0.22)] p-7 min-h-[320px] flex flex-col justify-center"
                  >
                    <Active.visual />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── mobile: stacked timeline ── */}
      <div className="lg:hidden px-4 sm:px-6 py-16">
        <SectionHeading
          eyebrow="One call's journey"
          title="90 seconds. Zero effort from you."
          className="mb-12"
        />
        <Stagger className="space-y-5 max-w-lg mx-auto">
          {STAGES.map((s) => (
            <StaggerItem key={s.title}>
              <div className="bg-bg-raised border border-line-default rounded-[14px] p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <span className="h-8 w-8 rounded-[9px] bg-bg-highlight text-brand flex items-center justify-center">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-bold text-brand tabular-nums">{s.time}</span>
                </div>
                <h3 className="text-[15.5px] font-bold text-fg-primary mb-1">{s.title}</h3>
                <p className="text-[13px] text-fg-secondary leading-relaxed mb-4">{s.body}</p>
                <div className="bg-bg-subtle border border-line-subtle rounded-[12px] p-4">
                  <s.visual />
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
