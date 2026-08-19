import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";

// Every card gets a cover image (Unsplash CDN, stable direct-file URLs) and a
// warm gradient fallback that shows if the image fails to load. Photos are
// picked to feel like actual Indian small-business environments.
type Industry = {
  slug: string;
  name: string;
  tagline: string;
  gradient: string;
  image: string;
  quote: { caller: string; agent: string };
  metric: string;
};

const INDUSTRIES: Industry[] = [
  {
    slug: "salon",
    name: "Salons & Spas",
    tagline: "Book every walk-in call, even on Sunday nights.",
    gradient: "linear-gradient(135deg, #f97316, #ec4899)",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=75",
    quote: {
      caller: "Kal shaam haircut ke liye slot milega?",
      agent: "Ji bilkul, kal 5 baje free hai. Kis naam se book karoon?",
    },
    metric: "32% more bookings",
  },
  {
    slug: "clinic",
    name: "Clinics & Dentists",
    tagline: "Handle patient calls when your front desk is with someone else.",
    gradient: "linear-gradient(135deg, #0ea5e9, #10b981)",
    image:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=75",
    quote: {
      caller: "Doctor sahab se kal milna hai, evening me time milega?",
      agent: "Dr. Mehta kal 6-8 available hain. 6:30 ka slot book kar deti hoon.",
    },
    metric: "40% fewer no-shows",
  },
  {
    slug: "restaurant",
    name: "Restaurants",
    tagline: "Take reservations and catering enquiries during peak dinner rush.",
    gradient: "linear-gradient(135deg, #dc2626, #f59e0b)",
    image:
      "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=75",
    quote: {
      caller: "Weekend ke liye 15 log ki booking ho sakti hai?",
      agent: "Weekend 8 baje table for 15 available. Aapka naam aur contact?",
    },
    metric: "3× more enquiry bookings",
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    tagline: "Qualify every buyer call, even at 2 AM.",
    gradient: "linear-gradient(135deg, #2563eb, #7c3aed)",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=75",
    quote: {
      caller: "2BHK flat abhi available hai? Budget 45 lakh tak.",
      agent: "Ji available hai. Photos aur site visit details WhatsApp par bhej deti hoon.",
    },
    metric: "5× qualified leads",
  },
  {
    slug: "coaching",
    name: "Coaching Centres",
    tagline: "Answer parent enquiries during admission season.",
    gradient: "linear-gradient(135deg, #7c3aed, #ec4899)",
    image:
      "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=75",
    quote: {
      caller: "JEE coaching ke liye batch details chahiye class 11 ke liye.",
      agent: "Class 11 JEE batch Monday shaam 4 baje start hoti hai. Bachche ka naam?",
    },
    metric: "2× demo enrolments",
  },
  {
    slug: "gym",
    name: "Gyms & Studios",
    tagline: "Book trials when trainers are on the floor.",
    gradient: "linear-gradient(135deg, #059669, #0ea5e9)",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=75",
    quote: {
      caller: "Monthly membership kitne ki hai gym ki?",
      agent: "Monthly 1899, quarterly 4999. Free trial available, slot book kar doon?",
    },
    metric: "45% more trial bookings",
  },
  {
    slug: "automobile",
    name: "Auto Service",
    tagline: "Book service slots even when the workshop is chaotic.",
    gradient: "linear-gradient(135deg, #ea580c, #7c2d12)",
    image:
      "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&auto=format&fit=crop&q=75",
    quote: {
      caller: "Swift ki general service karani hai, kab slot milega?",
      agent: "General service 3500 mein, kal subah 10 baje slot available.",
    },
    metric: "30% more service slots",
  },
  {
    slug: "laundry",
    name: "Laundry",
    tagline: "Schedule pickups while customers are still on the fence.",
    gradient: "linear-gradient(135deg, #0ea5e9, #6366f1)",
    image:
      "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800&auto=format&fit=crop&q=75",
    quote: {
      caller: "Suit dry clean kitne ka hai aur kab pickup ho sakti hai?",
      agent: "Suit dry clean 250. Kal subah 10-12 ke beech pickup available.",
    },
    metric: "60% more pickups",
  },
];

function IndustryCard({ ind }: { ind: Industry }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <a
      href={`/for/${ind.slug}`}
      className="group relative flex-shrink-0 w-[300px] sm:w-[340px] snap-start bg-bg-raised border border-line-default rounded-[18px] overflow-hidden shadow-sm hover:shadow-[0_24px_60px_-24px_rgba(15,23,42,0.22)] transition-all"
    >
      {/* cover */}
      <div className="relative h-[180px] overflow-hidden" style={{ background: ind.gradient }}>
        {imgOk && (
          <img
            src={ind.image}
            alt={`${ind.name} in India`}
            loading="lazy"
            onError={() => setImgOk(false)}
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply opacity-95 group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 text-[10.5px] font-bold text-white bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1">
          {ind.metric}
        </span>
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-[19px] font-extrabold text-white tracking-tight leading-tight">
            {ind.name}
          </h3>
        </div>
      </div>

      {/* body */}
      <div className="p-5">
        <p className="text-[13.5px] text-fg-secondary leading-relaxed mb-4">{ind.tagline}</p>

        <div className="bg-bg-subtle border border-line-subtle rounded-[10px] p-3.5 space-y-2">
          <div className="flex items-start gap-2">
            <Quote className="h-3.5 w-3.5 text-fg-muted mt-1 shrink-0" />
            <p className="text-[12px] text-fg-primary leading-relaxed italic">
              "{ind.quote.caller}"
            </p>
          </div>
          <div className="flex items-start gap-2 pl-4">
            <span className="inline-block h-[6px] w-[6px] rounded-full bg-brand mt-[7px] shrink-0" />
            <p className="text-[12px] text-brand font-medium leading-relaxed">
              "{ind.quote.agent}"
            </p>
          </div>
        </div>

        <span className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand group-hover:gap-2 transition-all">
          See {ind.name.toLowerCase()} setup
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </a>
  );
}

export function Industries() {
  const railRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      setProgress(max > 0 ? el.scrollLeft / max : 0);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const scroll = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    const cardW = el.querySelector<HTMLElement>("a")?.offsetWidth ?? 320;
    el.scrollBy({ left: (cardW + 20) * dir * 2, behavior: "smooth" });
  };

  return (
    <section
      id="industries"
      className="relative bg-bg-subtle px-4 sm:px-6 py-12 sm:py-16 overflow-hidden"
    >
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Industries"
          title="Trusted across every kind of small business"
          sub="Salons, clinics, garages, real-estate offices, gyms, restaurants. DeskBuddy learns your services and answers your callers like it has worked at your counter for years."
          className="mb-8"
        />

        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="hidden sm:block flex-1 h-[3px] bg-line-subtle rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-150"
              style={{
                width: `${Math.max(20, progress * 100 + 20)}%`,
                background: "linear-gradient(90deg, #2563eb, #f97316)",
              }}
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous industries"
              onClick={() => scroll(-1)}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-bg-raised border border-line-default text-fg-primary hover:border-brand/30 hover:text-brand transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next industries"
              onClick={() => scroll(1)}
              className="h-9 w-9 flex items-center justify-center rounded-full bg-bg-raised border border-line-default text-fg-primary hover:border-brand/30 hover:text-brand transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* rail lives inside the container, so it stays inset from the page edge */}
        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 sm:-mx-6 px-4 sm:px-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {INDUSTRIES.map((ind) => (
            <IndustryCard key={ind.slug} ind={ind} />
          ))}
        </div>
      </div>
    </section>
  );
}
