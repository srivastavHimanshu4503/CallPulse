import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CheckCheck,
  IndianRupee,
  Languages as LanguagesIcon,
  Phone,
  Star,
  Timer,
} from "lucide-react";
import { CountUp, EASE, SplitWords } from "../motion/primitives";

/* ─────────────────── scripted live call ─────────────────── */

type ScriptStep =
  | { kind: "caller"; text: string; hold: number }
  | { kind: "agent"; text: string; hold: number; speakFor: number }
  | { kind: "event"; id: "booked" | "whatsapp"; hold: number };

const SCRIPT: ScriptStep[] = [
  { kind: "caller", text: "Kal shaam haircut ke liye slot milega?", hold: 1400 },
  {
    kind: "agent",
    text: "Ji bilkul! Kal 5 baje free hai. Kis naam se book karoon?",
    hold: 1800,
    speakFor: 1200,
  },
  { kind: "caller", text: "Priya. Aur keratin ka charge kya hai?", hold: 1400 },
  {
    kind: "agent",
    text: "Keratin ₹2,499 se start hota hai, Priya ji. Kal 5 baje slot pakka. WhatsApp bhej rahi hoon.",
    hold: 1900,
    speakFor: 1500,
  },
  { kind: "event", id: "booked", hold: 900 },
  { kind: "event", id: "whatsapp", hold: 4200 },
];

function Waveform({ bars = 5, light = false }: { bars?: number; light?: boolean }) {
  const heights = [8, 14, 10, 16, 9, 13, 7];
  return (
    <span className="inline-flex items-center gap-[3px] h-4" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`wave-bar w-[3px] rounded-full ${light ? "bg-white" : "bg-brand"}`}
          style={{ height: heights[i % heights.length], animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </span>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 h-4 px-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-fg-muted"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  );
}

type CallPhase = "ringing" | "answering" | "live";

function useCallLoop() {
  const [stepIndex, setStepIndex] = useState(-1);
  const [speaking, setSpeaking] = useState(false);
  const [callerTyping, setCallerTyping] = useState(false);
  const [phase, setPhase] = useState<CallPhase>("ringing");
  const [cycle, setCycle] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) {
      setStepIndex(SCRIPT.length - 1);
      setPhase("live");
      return;
    }
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((res) => timers.push(setTimeout(res, ms)));

    (async () => {
      setStepIndex(-1);
      setSpeaking(false);
      setCallerTyping(false);
      setPhase("ringing");
      await wait(1800);
      if (cancelled) return;
      setPhase("answering");
      await wait(550);
      if (cancelled) return;
      setPhase("live");
      await wait(400);
      for (let i = 0; i < SCRIPT.length; i++) {
        if (cancelled) return;
        const step = SCRIPT[i]!;
        if (step.kind === "agent") {
          setSpeaking(true);
          await wait(step.speakFor);
          setSpeaking(false);
        }
        if (step.kind === "caller") {
          setCallerTyping(true);
          await wait(750);
          setCallerTyping(false);
        }
        if (cancelled) return;
        setStepIndex(i);
        await wait(step.hold);
      }
      if (!cancelled) setCycle((c) => c + 1);
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [cycle, reduce]);

  return { stepIndex, speaking, callerTyping, phase };
}

function CallTimer({ running }: { running: boolean }) {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) {
      setS(0);
      return;
    }
    const id = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (
    <span className="tabular-nums">
      {mm}:{ss}
    </span>
  );
}

/* ─────────────── live call scene ─────────────── */

function LiveCallScene() {
  const { stepIndex, speaking, callerTyping, phase } = useCallLoop();
  const ringing = phase !== "live";

  const visible = SCRIPT.slice(0, stepIndex + 1);
  const messages = visible.filter((s) => s.kind !== "event");
  const eventIds = visible
    .filter((s): s is Extract<ScriptStep, { kind: "event" }> => s.kind === "event")
    .map((e) => e.id);

  return (
    <div className="relative">
      {/* soft ambient glow — one, not three */}
      <div
        aria-hidden
        className="absolute -inset-8 rounded-[48px] bg-gradient-to-br from-brand/[0.08] via-transparent to-[rgb(var(--saffron-500))]/[0.08] blur-3xl"
      />

      {/* floating outcome cards — reduced to just two, warmer accents */}
      <AnimatePresence>
        {eventIds.includes("booked") && (
          <motion.div
            key="booked"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="absolute -top-6 -right-6 z-20 hidden md:block"
          >
            <div className="animate-floaty flex items-center gap-2.5 bg-bg-raised border border-line-default rounded-[12px] shadow-[0_14px_36px_-14px_rgba(15,23,42,0.25)] px-4 py-3">
              <span className="h-8 w-8 rounded-[8px] bg-positive-50 text-positive flex items-center justify-center">
                <CalendarCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[12px] font-bold text-fg-primary leading-tight">Appointment booked</p>
                <p className="text-[11px] text-fg-muted">Kal · 5:00 PM</p>
              </div>
            </div>
          </motion.div>
        )}

        {eventIds.includes("whatsapp") && (
          <motion.div
            key="whatsapp"
            initial={{ opacity: 0, scale: 0.85, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="absolute -bottom-6 -left-6 z-20 hidden md:block"
          >
            <div className="animate-floaty-slow max-w-[240px] bg-bg-raised border border-line-default rounded-[12px] rounded-bl-[4px] shadow-[0_14px_36px_-14px_rgba(15,23,42,0.25)] px-4 py-3">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-positive mb-1">
                WhatsApp · sent
              </p>
              <p className="text-[12px] text-fg-primary leading-relaxed">
                Namaste Priya ji! Aapka appointment kal 5 PM confirm hai ✅
              </p>
              <p className="text-right mt-0.5">
                <CheckCheck className="inline h-3.5 w-3.5 text-brand" />
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* the phone card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
        className="relative bg-bg-raised border border-line-default rounded-[20px] shadow-[0_30px_80px_-30px_rgba(15,23,42,0.3)] overflow-hidden"
      >
        {/* incoming-call overlay */}
        <AnimatePresence>
          {ringing && (
            <motion.div
              key="incoming"
              exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.5, ease: EASE } }}
              className="absolute inset-0 z-20 bg-bg-raised/[0.97] backdrop-blur flex flex-col items-center justify-center"
            >
              <div className="relative flex items-center justify-center mb-6">
                <span className="ring-pulse absolute h-28 w-28 rounded-full border-2 border-brand/30" />
                <span
                  className="ring-pulse absolute h-28 w-28 rounded-full border-2 border-[rgb(var(--saffron-500))]/25"
                  style={{ animationDelay: "0.7s" }}
                />
                <span
                  className="relative h-[76px] w-[76px] rounded-full text-white text-xl font-extrabold flex items-center justify-center shadow-[0_14px_36px_-12px_rgba(37,99,235,0.6)]"
                  style={{ background: "linear-gradient(135deg, #1d4ed8, #f97316)" }}
                >
                  SS
                </span>
              </div>
              <p className="text-[17px] font-extrabold text-fg-primary tracking-tight">
                Sharma Salon
              </p>
              <p className="text-[12.5px] text-fg-muted mt-1">
                Incoming call · +91 98XXX XXX21
              </p>
              <motion.div
                animate={
                  phase === "answering"
                    ? { scale: [1, 0.82, 1.08, 1] }
                    : { scale: [1, 1.08, 1] }
                }
                transition={
                  phase === "answering"
                    ? { duration: 0.55, ease: EASE }
                    : { duration: 1.3, repeat: Infinity, ease: "easeInOut" }
                }
                className="mt-8 h-14 w-14 rounded-full bg-positive text-white flex items-center justify-center shadow-[0_12px_30px_-8px_rgba(22,163,74,0.55)]"
              >
                <Phone className="h-6 w-6" />
              </motion.div>
              <p className="mt-3.5 text-[11px] font-bold uppercase tracking-[0.14em] text-fg-muted">
                {phase === "answering" ? "DeskBuddy answering…" : "DeskBuddy picks up"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line-subtle bg-bg-subtle/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <span
                className="h-9 w-9 rounded-full text-white text-[12px] font-bold flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #f97316)" }}
              >
                SS
              </span>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-raised ${ringing ? "bg-attention" : "bg-positive"
                  }`}
              />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-fg-primary leading-tight truncate">
                Sharma Salon
              </p>
              <p className="text-[11px] text-fg-muted leading-tight">
                {ringing ? "Incoming call…" : "DeskBuddy answered"}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold rounded-full px-2.5 py-1 ${ringing ? "text-attention bg-attention-50" : "text-positive bg-positive-50"
              }`}
          >
            <Phone className="h-3 w-3" />
            {ringing ? "Ringing" : <CallTimer running={!ringing} />}
          </span>
        </div>

        {/* conversation */}
        <div className="px-5 pt-5 pb-4 min-h-[280px] sm:min-h-[300px] flex flex-col justify-end space-y-3">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={`m-${i}`}
                layout="position"
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className={m.kind === "caller" ? "flex justify-start" : "flex justify-end"}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-[14px] ${m.kind === "caller"
                    ? "bg-bg-muted rounded-bl-[4px]"
                    : "bg-brand text-white rounded-br-[4px] shadow-[0_6px_16px_-6px_rgba(37,99,235,0.45)]"
                    }`}
                >
                  <p
                    className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${m.kind === "caller" ? "text-fg-muted" : "text-white/70"
                      }`}
                  >
                    {m.kind === "caller" ? "Caller" : "DeskBuddy"}
                  </p>
                  <p
                    className={`text-[13.5px] leading-relaxed ${m.kind === "caller" ? "text-fg-primary" : "text-white"
                      }`}
                  >
                    {"text" in m ? m.text : null}
                  </p>
                </div>
              </motion.div>
            ))}

            {callerTyping && (
              <motion.div
                key="caller-typing"
                layout="position"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="flex justify-start"
              >
                <div className="bg-bg-muted rounded-[14px] rounded-bl-[4px] px-4 py-3">
                  <TypingDots />
                </div>
              </motion.div>
            )}

            {speaking && (
              <motion.div
                key="speaking"
                layout="position"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                className="flex justify-end"
              >
                <div className="bg-brand rounded-[14px] rounded-br-[4px] px-4 py-3 inline-flex items-center gap-2.5 shadow-[0_6px_16px_-6px_rgba(37,99,235,0.45)]">
                  <Waveform light />
                  <span className="text-[11.5px] font-semibold text-white/90">Speaking…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* mobile-only outcome chips */}
        <div className="px-5 pb-5 space-y-2 md:hidden min-h-[40px]">
          <AnimatePresence initial={false}>
            {eventIds.map((id) => {
              const meta = {
                booked: { icon: CalendarCheck, label: "Appointment booked · kal 5 PM" },
                whatsapp: { icon: CheckCheck, label: "WhatsApp confirmation sent" },
              }[id];
              const Icon = meta.icon;
              return (
                <motion.div
                  key={id}
                  layout="position"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="flex items-center gap-2.5 bg-positive-50 border border-positive/15 rounded-[8px] px-3.5 py-2"
                >
                  <Icon className="h-3.5 w-3.5 text-positive shrink-0" />
                  <span className="text-[12.5px] font-semibold text-fg-primary">{meta.label}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* bottom bar */}
        <div className="hidden md:flex items-center justify-between px-5 py-3 border-t border-line-subtle bg-bg-subtle/60">
          <span className="text-[11px] font-medium text-fg-muted">
            Live transcript · Hinglish
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand">
            <Waveform bars={4} /> Natural voice
          </span>
        </div>
      </motion.div>
    </div>
  );
}

/* ───────────────────────── hero ───────────────────────── */

const STATS = [
  { icon: Phone, value: "24/7", label: "Always answering", isText: true },
  { icon: LanguagesIcon, to: 6, label: "Indian languages" },
  { icon: Timer, to: 10, prefix: "<", suffix: " min", label: "To go live" },
] as const;

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-bg-canvas">
      {/* clean gradient wash — no dozens of orbs */}
      <div aria-hidden className="absolute inset-0 bg-grid opacity-70" />
      <div
        aria-hidden
        className="absolute -top-40 -right-20 h-[520px] w-[520px] rounded-full opacity-40 blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(249,115,22,0.35), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-20 h-[520px] w-[520px] rounded-full opacity-40 blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(37,99,235,0.35), transparent 70%)" }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 lg:pt-24 pb-16 sm:pb-20 grid lg:grid-cols-[1.05fr_0.95fr] gap-14 lg:gap-16 items-center">
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 bg-bg-raised border border-line-default shadow-sm"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-positive animate-ping opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-positive" />
            </span>
            <span className="text-[12px] font-semibold text-fg-primary tracking-normal">
              Built for Indian businesses
            </span>
          </motion.div>

          <h1 className="text-[38px] sm:text-[50px] lg:text-[60px] font-extrabold tracking-[-0.03em] leading-[1.08] text-fg-primary">
            <SplitWords text="Every call is a" delay={0.05} />
            <br />
            <SplitWords
              text="new opportunity."
              delay={0.28}
              wordClassName={() => "text-gradient-brand"}
            />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: EASE }}
            className="mt-6 max-w-xl mx-auto lg:mx-0 text-[15.5px] sm:text-[17px] text-fg-secondary leading-relaxed"
          >
            DeskBuddy is your AI phone receptionist. Every incoming call turns
            into a{" "}
            <b className="text-fg-primary">booked appointment</b>, a{" "}
            <b className="text-fg-primary">qualified lead</b> and a{" "}
            <b className="text-fg-primary">happy customer</b>. 24/7, in Hindi,
            English and 4 more Indian languages.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.78, ease: EASE }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3"
          >
            <a
              href="https://app.deskbuddy.in/register"
              className="btn-primary group w-full sm:w-auto h-[54px] px-8 inline-flex items-center justify-center gap-2 text-[15.5px] font-semibold rounded-[10px]"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a
              href="#how-it-works"
              className="group w-full sm:w-auto h-[54px] px-8 inline-flex items-center justify-center gap-2 text-[15.5px] font-semibold text-fg-primary bg-bg-canvas hover:bg-bg-muted border border-line-default rounded-[10px] transition-all hover:-translate-y-0.5"
            >
              See how it works
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.92 }}
            className="mt-5 flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-[12.5px] text-fg-muted"
          >
            <span className="inline-flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-positive" />
              Free plan, 30 credits included
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 text-[rgb(var(--saffron-500))]" fill="currentColor" />
              No credit card needed
            </span>
          </motion.div>

          {/* stats */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0, ease: EASE }}
            className="mt-9 grid grid-cols-3 gap-3 max-w-md mx-auto lg:mx-0"
          >
            {STATS.map((s) => (
              <div
                key={s.label}
                className="text-center lg:text-left border-t-2 border-line-subtle pt-3"
              >
                <p className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg-primary">
                  {"isText" in s && s.isText ? (
                    s.value
                  ) : (
                    <CountUp
                      to={"to" in s ? s.to : 0}
                      prefix={"prefix" in s ? s.prefix : ""}
                      suffix={"suffix" in s ? s.suffix : ""}
                    />
                  )}
                </p>
                <p className="mt-0.5 text-[11.5px] font-medium text-fg-muted">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <LiveCallScene />
      </div>
    </section>
  );
}
