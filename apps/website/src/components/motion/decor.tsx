/* Ambient decorative shapes — bubbles, rings, half-circles, sun rays.
   Everything renders behind content: absolutely positioned, pointer-events
   off, hidden from screen readers, and stilled by prefers-reduced-motion. */

const TONES = {
  blue: { fill: "rgba(37, 99, 235, 0.10)", edge: "rgba(37, 99, 235, 0.28)" },
  sky: { fill: "rgba(14, 165, 233, 0.10)", edge: "rgba(14, 165, 233, 0.26)" },
  amber: { fill: "rgba(245, 158, 11, 0.10)", edge: "rgba(245, 158, 11, 0.30)" },
  slate: { fill: "rgba(100, 116, 139, 0.07)", edge: "rgba(100, 116, 139, 0.20)" },
  white: { fill: "rgba(255, 255, 255, 0.07)", edge: "rgba(255, 255, 255, 0.28)" },
} as const;

export type DecorTone = keyof typeof TONES;

interface ShapeProps {
  className?: string;
  size?: number;
  tone?: DecorTone;
  delay?: number;
  duration?: number;
}

/* Soft filled circle with a highlight, gently floating. */
export function Bubble({
  className = "",
  size = 44,
  tone = "blue",
  delay = 0,
  duration = 9,
}: ShapeProps) {
  const t = TONES[tone];
  return (
    <span
      aria-hidden
      className={`animate-float-soft pointer-events-none absolute rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 30%, ${t.edge}, ${t.fill} 62%)`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

/* Thin outlined circle, floating with a slow spin. */
export function Ring({
  className = "",
  size = 120,
  tone = "blue",
  delay = 0,
  duration = 12,
  thickness = 1.5,
}: ShapeProps & { thickness?: number }) {
  const t = TONES[tone];
  return (
    <span
      aria-hidden
      className={`animate-float-drift pointer-events-none absolute rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: `${thickness}px solid ${t.edge}`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

/* Outlined half circle (flat side down; flip for flat side up). */
export function HalfCircle({
  className = "",
  size = 120,
  tone = "sky",
  delay = 0,
  duration = 11,
  flip = false,
}: ShapeProps & { flip?: boolean }) {
  const t = TONES[tone];
  return (
    <span
      aria-hidden
      className={`animate-float-soft pointer-events-none absolute ${className}`}
      style={{
        width: size,
        height: size / 2,
        border: `1.5px solid ${t.edge}`,
        borderBottom: "none",
        borderRadius: `${size}px ${size}px 0 0`,
        transform: flip ? "rotate(180deg)" : undefined,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

/* Tiny solid dot accent. */
export function Dot({
  className = "",
  size = 8,
  tone = "amber",
  delay = 0,
  duration = 7,
}: ShapeProps) {
  const t = TONES[tone];
  return (
    <span
      aria-hidden
      className={`animate-float-soft pointer-events-none absolute rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: t.edge,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

/* Soft light beams sweeping down from above — the "sunlight" effect.
   Warm-tinted on light sections, cool white on dark ones. */
export function SunRays({
  className = "",
  warm = true,
  height = 520,
}: {
  className?: string;
  warm?: boolean;
  height?: number;
}) {
  const from = warm ? "rgba(253, 224, 148, 0.35)" : "rgba(191, 219, 254, 0.28)";
  const mid = warm ? "rgba(37, 99, 235, 0.05)" : "rgba(255, 255, 255, 0.04)";
  const beams = [
    { left: "8%", width: 130, skew: -14, delay: 0, opacity: 0.6 },
    { left: "30%", width: 90, skew: -11, delay: -6, opacity: 0.85 },
    { left: "52%", width: 150, skew: -13, delay: -3, opacity: 0.5 },
  ];
  return (
    <span
      aria-hidden
      className={`animate-rays-sway pointer-events-none absolute overflow-visible ${className}`}
      style={{ height, width: "60%", transformOrigin: "50% 0%" }}
    >
      {beams.map((b, i) => (
        <span
          key={i}
          className="animate-rays-breathe absolute top-0 blur-2xl"
          style={{
            left: b.left,
            width: b.width,
            height: "100%",
            opacity: b.opacity,
            background: `linear-gradient(to bottom, ${from}, ${mid} 55%, transparent 85%)`,
            transform: `skewX(${b.skew}deg)`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </span>
  );
}
