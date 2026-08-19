import { Reveal } from "../motion/primitives";

export function SectionHeading({
  eyebrow,
  title,
  sub,
  className = "",
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  className?: string;
}) {
  return (
    <Reveal className={`text-center max-w-2xl mx-auto ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-brand bg-bg-highlight border border-brand/10 rounded-full px-3.5 py-1.5 mb-5">
        {eyebrow}
      </span>
      <h2 className="text-[28px] sm:text-4xl font-extrabold tracking-tight text-fg-primary leading-[1.15]">
        {title}
      </h2>
      {sub && (
        <p className="mt-4 text-[15px] sm:text-base text-fg-secondary leading-relaxed">{sub}</p>
      )}
    </Reveal>
  );
}
