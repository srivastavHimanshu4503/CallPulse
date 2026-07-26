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

const ITEMS = [
  { icon: Scissors, label: "Salons & spas" },
  { icon: Stethoscope, label: "Clinics" },
  { icon: Wrench, label: "Garages" },
  { icon: Building2, label: "Real estate" },
  { icon: ShoppingBag, label: "Boutiques" },
  { icon: Tent, label: "Event services" },
  { icon: GraduationCap, label: "Coaching classes" },
  { icon: Store, label: "E-commerce" },
  { icon: Dumbbell, label: "Gyms & studios" },
  { icon: Utensils, label: "Restaurants" },
  { icon: Camera, label: "Photographers" },
  { icon: Sparkles, label: "Home services" },
];

export function SocialProof() {
  const track = [...ITEMS, ...ITEMS];
  return (
    <section className="bg-bg-subtle border-y border-line-subtle py-8 overflow-hidden">
      <Reveal y={8}>
        <p className="text-center text-[11.5px] font-semibold uppercase tracking-[0.16em] text-fg-muted mb-5 px-4">
          <span className="text-[rgb(var(--saffron-600))]">Made for</span> · salons, clinics,
          garages, restaurants &amp; more
        </p>
      </Reveal>
      <div className="marquee-mask overflow-hidden">
        <div className="flex w-max gap-2.5 pr-2.5 animate-marquee">
          {track.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-secondary bg-bg-canvas border border-line-default rounded-full px-3.5 py-1.5 whitespace-nowrap"
            >
              <t.icon className="h-3.5 w-3.5 text-[rgb(var(--saffron-500))] opacity-80" />
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
