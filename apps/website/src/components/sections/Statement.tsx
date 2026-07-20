import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef } from "react";

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
    <section className="bg-bg-canvas px-4 sm:px-6 py-20 sm:py-28">
      <div className="max-w-4xl mx-auto">
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
