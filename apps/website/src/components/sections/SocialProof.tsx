import {
  Scissors,
  Stethoscope,
  Wrench,
  Building2,
  ShoppingBag,
  Tent,
  GraduationCap,
  Store,
  Dumbbell,
  Utensils,
  Camera,
  Sparkles,
} from "lucide-react";
import { Reveal } from "../motion/primitives";

const ROW_A = [
  { icon: Scissors, label: "Salons & spas" },
  { icon: Stethoscope, label: "Clinics" },
  { icon: Wrench, label: "Garages" },
  { icon: Building2, label: "Real estate" },
  { icon: ShoppingBag, label: "Boutiques" },
  { icon: Tent, label: "Event services" },
];

const ROW_B = [
  { icon: GraduationCap, label: "Coaching classes" },
  { icon: Store, label: "E-commerce" },
  { icon: Dumbbell, label: "Gyms & studios" },
  { icon: Utensils, label: "Restaurants" },
  { icon: Camera, label: "Photographers" },
  { icon: Sparkles, label: "Home services" },
];

function Row({
  items,
  reverse = false,
}: {
  items: typeof ROW_A;
  reverse?: boolean;
}) {
  const track = [...items, ...items, ...items];
  return (
    <div className="marquee-mask overflow-hidden">
      <div
        className={`flex w-max gap-3 pr-3 ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        }`}
      >
        {track.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-fg-secondary bg-bg-canvas border border-line-default rounded-full px-4 py-2 whitespace-nowrap hover:border-brand/30 hover:text-brand transition-colors"
          >
            <t.icon className="h-3.5 w-3.5 opacity-60" />
            {t.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SocialProof() {
  return (
    <section className="bg-bg-subtle border-y border-line-subtle py-10 overflow-hidden">
      <Reveal y={12}>
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.16em] text-fg-muted mb-7 px-4">
          Answering calls for businesses across India
        </p>
      </Reveal>
      <div className="space-y-3">
        <Row items={ROW_A} />
        <Row items={ROW_B} reverse />
      </div>
    </section>
  );
}
