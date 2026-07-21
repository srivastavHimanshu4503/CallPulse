import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";
import { Bubble, HalfCircle, Orb, Sparkle, SunRays } from "../motion/decor";

const WORDS =
  "A missed call doesn't leave a voicemail. It books with your competitor. DeskBuddy makes sure that never happens again.".split(
    " "
  );

const BRAND_FROM = WORDS.length - 4; // "never happens again." + "that"

function Word({
  children,
  progress,
  range,
  brand,
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  brand: boolean;
}) {
  const opacity = useTransform(progress, range, [0.12, 1]);
  return (
    <motion.span
      style={{ opacity }}
      className={`inline-block mr-[0.28em] ${brand ? "text-brand" : "text-fg-primary"}`}
    >
      {children}
    </motion.span>
  );
}

export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"],
  });

  return (
    <section className="relative overflow-hidden bg-bg-canvas px-4 sm:px-6 py-20 sm:py-28">
      <SunRays className="left-[24%] top-0" height={420} />
      <Orb className="hidden md:block top-[20%] -left-40" size={380} tone="amber" opacity={0.18} />
      <Bubble className="hidden sm:block top-1/4 left-[12%]" size={22} tone="amber" delay={-2} />
      <Bubble className="hidden md:block bottom-[30%] right-[8%]" size={28} tone="blue" delay={-5} />
      <Sparkle className="hidden sm:block top-[18%] right-[18%]" size={24} tone="amber" delay={-1} />
      <Sparkle className="bottom-[22%] left-[22%]" size={16} tone="violet" delay={-2.6} />
      <HalfCircle className="hidden md:block -bottom-px right-[10%]" size={120} tone="sky" />
      <div className="relative max-w-4xl mx-auto">
        <p
          ref={ref}
          className="text-[30px] sm:text-[44px] lg:text-[52px] font-extrabold tracking-tight leading-[1.18] text-center"
        >
          {WORDS.map((w, i) => (
            <Word
              key={i}
              progress={scrollYProgress}
              range={[i / WORDS.length, (i + 1) / WORDS.length]}
              brand={i >= BRAND_FROM}
            >
              {w}
            </Word>
          ))}
        </p>
      </div>
    </section>
  );
}
