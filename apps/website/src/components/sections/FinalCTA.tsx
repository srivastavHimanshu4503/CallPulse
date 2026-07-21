import { ArrowRight, Phone } from "lucide-react";
import { Reveal } from "../motion/primitives";
import { Bubble, Ring, SunRays } from "../motion/decor";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-bg-inverse px-4 sm:px-6 py-20 sm:py-28">
      <div aria-hidden className="absolute inset-0 bg-grid-dark" />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[360px] w-[680px] rounded-full bg-brand/20 blur-[110px]"
      />
      {/* cool moonlight beams on the dark section */}
      <SunRays className="left-1/2 -translate-x-1/3 top-0" warm={false} height={420} />
      <Ring className="hidden md:block top-16 left-[10%]" size={120} tone="white" duration={14} />
      <Ring className="hidden sm:block bottom-14 right-[8%]" size={70} tone="blue" delay={-4} />
      <Bubble className="hidden sm:block top-1/3 right-[14%]" size={26} tone="white" delay={-2} />
      <Bubble className="bottom-24 left-[18%]" size={16} tone="sky" delay={-6} />

      <div className="relative max-w-3xl mx-auto text-center">
        <Reveal>
          <div className="relative inline-flex items-center justify-center mb-8">
            <span className="ring-pulse absolute h-20 w-20 rounded-full border border-brand/40" />
            <span
              className="ring-pulse absolute h-20 w-20 rounded-full border border-brand/25"
              style={{ animationDelay: "0.8s" }}
            />
            <span className="relative h-14 w-14 rounded-full bg-brand flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(37,99,235,0.7)]">
              <Phone className="h-6 w-6 text-white" />
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <h2 className="text-3xl sm:text-[46px] font-extrabold tracking-tight text-white leading-[1.1]">
            Your next customer is calling.
            <br />
            <span className="text-gradient-brand">Answer every time.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-5 text-[15px] text-white/60 leading-relaxed max-w-md mx-auto">
            Set up your AI receptionist tonight. It'll be taking bookings before
            your morning chai.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <a
            href="https://app.deskbuddy.in/register"
            className="btn-shine group mt-9 inline-flex items-center justify-center gap-2 h-[52px] px-9 text-[15.5px] font-semibold text-white bg-brand hover:bg-brand-600 rounded-[10px] transition-all shadow-[0_14px_40px_-10px_rgba(37,99,235,0.7)] hover:-translate-y-0.5"
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
