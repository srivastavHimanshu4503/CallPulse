/* Ambient decorative layer — vivid gradient orbs, colored bubbles, rings,
   half-circles, sparkles and sunlight beams. Everything renders behind
   content: absolutely positioned, pointer-events off, hidden from screen
   readers, and stilled by prefers-reduced-motion. */

export const PALETTES = {
  blue: { from: "#60a5fa", to: "#1d4ed8", edge: "rgba(37, 99, 235, 0.55)" },
  sky: { from: "#7dd3fc", to: "#0284c7", edge: "rgba(14, 165, 233, 0.55)" },
  violet: { from: "#c4b5fd", to: "#6d28d9", edge: "rgba(139, 92, 246, 0.55)" },
  pink: { from: "#f9a8d4", to: "#db2777", edge: "rgba(236, 72, 153, 0.5)" },
  amber: { from: "#fcd34d", to: "#f97316", edge: "rgba(245, 158, 11, 0.6)" },
  teal: { from: "#5eead4", to: "#0d9488", edge: "rgba(20, 184, 166, 0.55)" },
  white: { from: "#ffffff", to: "#93c5fd", edge: "rgba(255, 255, 255, 0.6)" },
} as const;

export type Palette = keyof typeof PALETTES;

interface ShapeProps {
  className?: string;
  size?: number;
  tone?: Palette;
  delay?: number;
  duration?: number;
  opacity?: number;
}

/* Large blurred gradient orb — the vivid color wash behind sections. */
export function Orb({
  className = "",
  size = 420,
  tone = "violet",
  delay = 0,
  duration = 18,
  opacity = 0.30,
}: ShapeProps) {
  const p = PALETTES[tone];
  return (
    <span
      aria-hidden
      className={`animate-orb-drift pointer-events-none absolute rounded-full blur-[80px] ${className}`}
      style={{
        width: size,
        height: size,
        opacity,
        background: `radial-gradient(circle at 35% 35%, ${p.from}, ${p.to} 80%)`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

/* Filled gradient circle with a glossy highlight — clearly visible. */
export function Bubble({
  className = "",
  size = 44,
  tone = "blue",
  delay = 0,
  duration = 8,
  opacity = 0.85,
}: ShapeProps) {
  const p = PALETTES[tone];
  return (
    <span
      aria-hidden
      className={`animate-float-soft pointer-events-none absolute rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        opacity,
        background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
        boxShadow: `inset 0 ${size * 0.12}px ${size * 0.25}px rgba(255,255,255,0.55), 0 ${size * 0.18}px ${size * 0.4}px -${size * 0.14}px ${p.edge}`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

/* Outlined circle with a visible gradient stroke, floating + tilting. */
export function Ring({
  className = "",
  size = 120,
  tone = "blue",
  delay = 0,
  duration = 12,
  thickness = 3,
  opacity = 0.8,
}: ShapeProps & { thickness?: number }) {
  const p = PALETTES[tone];
  return (
    <span
      aria-hidden
      className={`animate-float-drift pointer-events-none absolute rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        opacity,
        padding: thickness,
        background: `linear-gradient(135deg, ${p.from}, ${p.to}) border-box`,
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

/* Dashed circle that slowly spins — visible motion without noise. */
export function DottedRing({
  className = "",
  size = 150,
  tone = "blue",
  duration = 30,
  opacity = 0.55,
}: ShapeProps) {
  const p = PALETTES[tone];
  return (
    <span
      aria-hidden
      className={`animate-spin-slower pointer-events-none absolute ${className}`}
      style={{ width: size, height: size, opacity, animationDuration: `${duration}s` }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke={p.edge}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="0.5 7"
        />
      </svg>
    </span>
  );
}

/* Filled pastel half-circle hugging a section edge. */
export function HalfCircle({
  className = "",
  size = 140,
  tone = "sky",
  delay = 0,
  duration = 10,
  flip = false,
  opacity = 0.55,
}: ShapeProps & { flip?: boolean }) {
  const p = PALETTES[tone];
  return (
    <span
      aria-hidden
      className={`animate-float-soft pointer-events-none absolute ${className}`}
      style={{
        width: size,
        height: size / 2,
        opacity,
        background: `linear-gradient(${flip ? "0deg" : "180deg"}, ${p.from}66, ${p.to}33)`,
        borderRadius: flip ? `0 0 ${size}px ${size}px` : `${size}px ${size}px 0 0`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

/* Four-point star that twinkles. */
export function Sparkle({
  className = "",
  size = 22,
  tone = "amber",
  delay = 0,
  duration = 3.6,
}: ShapeProps) {
  const p = PALETTES[tone];
  return (
    <span
      aria-hidden
      className={`animate-twinkle pointer-events-none absolute ${className}`}
      style={{ width: size, height: size, animationDelay: `${delay}s`, animationDuration: `${duration}s` }}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
        <path
          d="M12 0C12.9 6.6 17.4 11.1 24 12C17.4 12.9 12.9 17.4 12 24C11.1 17.4 6.6 12.9 0 12C6.6 11.1 11.1 6.6 12 0Z"
          fill={`url(#sp-${tone})`}
        />
        <defs>
          <linearGradient id={`sp-${tone}`} x1="0" y1="0" x2="24" y2="24">
            <stop stopColor={p.from} />
            <stop offset="1" stopColor={p.to} />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
}

/* Sunlight from a corner: a warm radial sun glow + angled light shafts. */
export function SunRays({
  className = "",
  warm = true,
  height = 560,
  width = "70%",
}: {
  className?: string;
  warm?: boolean;
  height?: number;
  width?: string;
}) {
  const core = warm ? "rgba(253, 230, 138, 0.55)" : "rgba(147, 197, 253, 0.4)";
  const beamFrom = warm ? "rgba(252, 211, 77, 0.5)" : "rgba(191, 219, 254, 0.45)";
  const beamMid = warm ? "rgba(251, 146, 60, 0.12)" : "rgba(147, 197, 253, 0.1)";
  const beams = [
    { left: "2%", width: 170, skew: -16, delay: 0, opacity: 0.75 },
    { left: "26%", width: 100, skew: -13, delay: -4, opacity: 1 },
    { left: "46%", width: 200, skew: -15, delay: -7, opacity: 0.6 },
    { left: "72%", width: 120, skew: -12, delay: -2, opacity: 0.85 },
  ];
  return (
    <span
      aria-hidden
      className={`animate-rays-sway pointer-events-none absolute overflow-visible ${className}`}
      style={{ height, width, transformOrigin: "50% 0%" }}
    >
      {/* sun core glow bleeding in from the top */}
      <span
        className="absolute -top-24 left-1/3 h-72 w-72 rounded-full blur-[70px]"
        style={{ background: `radial-gradient(circle, ${core}, transparent 70%)` }}
      />
      {beams.map((b, i) => (
        <span
          key={i}
          className="animate-rays-breathe absolute top-0 blur-xl"
          style={{
            left: b.left,
            width: b.width,
            height: "100%",
            opacity: b.opacity,
            background: `linear-gradient(to bottom, ${beamFrom}, ${beamMid} 60%, transparent 88%)`,
            transform: `skewX(${b.skew}deg)`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </span>
  );
}
