import { ArrowRight, Phone } from "lucide-react";
import { Reveal } from "../motion/primitives";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-bg-inverse px-4 sm:px-6 py-20 sm:py-28">
      <div aria-hidden className="absolute inset-0 bg-grid-dark" />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[360px] w-[720px] rounded-full opacity-60 blur-[110px]"
        style={{
          background:
            "radial-gradient(circle at 30% 50%, rgba(37,99,235,0.35), transparent 60%), radial-gradient(circle at 70% 50%, rgba(249,115,22,0.3), transparent 60%)",
        }}
      />

      <div className="relative max-w-3xl mx-auto text-center">
        <Reveal>
          <div className="relative inline-flex items-center justify-center mb-8">
            <span className="ring-pulse absolute h-20 w-20 rounded-full border border-brand/40" />
            <span
              className="ring-pulse absolute h-20 w-20 rounded-full border border-[rgb(var(--saffron-500))]/40"
              style={{ animationDelay: "0.8s" }}
            />
            <span
              className="relative h-14 w-14 rounded-full flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(249,115,22,0.6)]"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #f97316)" }}
            >
              <Phone className="h-6 w-6 text-white" />
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="text-3xl sm:text-[46px] font-extrabold tracking-tight text-white leading-[1.1]">
            Your next customer is calling.
            <br />
            <span className="text-gradient-warm">Answer every time.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-5 text-[15px] text-white/60 leading-relaxed max-w-md mx-auto">
            Set up your AI receptionist tonight. Kal subah chai peene se pehle, bookings aana shuru
            ho jayengi.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <a
            href="https://app.deskbuddy.in/register"
            className="btn-primary group mt-9 inline-flex items-center justify-center gap-2 h-[54px] px-9 text-[15.5px] font-semibold rounded-[10px]"
          >
            Get started free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <p className="mt-4 text-[12.5px] text-white/40">Free plan · no card required</p>
        </Reveal>
      </div>
    </section>
  );
}
