import { Star, Quote } from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";
import { Reveal, Stagger, StaggerItem } from "../motion/primitives";

type Testimonial = {
  name: string;
  role: string;
  business: string;
  city: string;
  initials: string;
  gradient: string;
  quote: string;
  metric: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Priya Sharma",
    role: "Owner",
    business: "Bliss Salon & Spa",
    city: "Bengaluru",
    initials: "PS",
    gradient: "linear-gradient(135deg, #f97316, #ec4899)",
    quote:
      "Weekends were a nightmare. Every second call went to voicemail. DeskBuddy now books my Saturday slots automatically while I'm with a client. Best decision I made this year.",
    metric: "32% more bookings in month one",
  },
  {
    name: "Dr. Ravi Mehta",
    role: "Founder",
    business: "Smile Dental Clinic",
    city: "Pune",
    initials: "RM",
    gradient: "linear-gradient(135deg, #0ea5e9, #10b981)",
    quote:
      "Patients call at odd hours for appointments. DeskBuddy handles them in Marathi and Hindi, sends WhatsApp reminders, and my no-show rate has dropped significantly.",
    metric: "40% fewer no-shows",
  },
  {
    name: "Amit Verma",
    role: "Co-founder",
    business: "Verma Motors",
    city: "Delhi",
    initials: "AV",
    gradient: "linear-gradient(135deg, #ea580c, #7c2d12)",
    quote:
      "Setup took me under 10 minutes. My workshop is loud and busy. Now every service enquiry gets answered, quoted, and slot-booked before I even wipe my hands.",
    metric: "30% more service slots filled",
  },
  {
    name: "Neha Kapoor",
    role: "Director",
    business: "Bright Minds Coaching",
    city: "Jaipur",
    initials: "NK",
    gradient: "linear-gradient(135deg, #7c3aed, #ec4899)",
    quote:
      "During admissions season we get 100+ parent calls a day. DeskBuddy answers every one, shares fees, and books demo classes. We doubled our demo enrolments.",
    metric: "2× demo class enrolments",
  },
  {
    name: "Rohit Iyer",
    role: "Broker",
    business: "Prime Property Advisors",
    city: "Mumbai",
    initials: "RI",
    gradient: "linear-gradient(135deg, #2563eb, #7c3aed)",
    quote:
      "Property buyers call the first three numbers they see. DeskBuddy makes sure mine is one that answers, qualifies the lead, and pushes it to my CRM instantly.",
    metric: "5× qualified enquiries",
  },
  {
    name: "Sanjay Rao",
    role: "Owner",
    business: "Fitness First Studio",
    city: "Hyderabad",
    initials: "SR",
    gradient: "linear-gradient(135deg, #059669, #0ea5e9)",
    quote:
      "My trainers can't answer calls between sessions. DeskBuddy books trial classes, shares pricing, and even follows up on WhatsApp. Feels like I hired a full-time receptionist.",
    metric: "45% more trial bookings",
  },
];

function Stars() {
  return (
    <div className="inline-flex gap-0.5" aria-label="5 out of 5 stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} className="h-3.5 w-3.5 text-[rgb(var(--saffron-500))]" fill="currentColor" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="relative bg-bg-canvas px-4 sm:px-6 py-12 sm:py-16 overflow-hidden">
      <div className="relative max-w-6xl mx-auto">
        <SectionHeading
          eyebrow="Loved by owners"
          title="Small businesses across India, running on DeskBuddy"
          sub="Salons, clinics, coaching centres, garages, brokers, studios. Different businesses, same problem solved."
          className="mb-10"
        />

        <Stagger className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name}>
              <div className="h-full flex flex-col bg-bg-raised border border-line-default rounded-[14px] p-5 sm:p-6 hover:border-brand/25 hover:shadow-[0_16px_40px_-20px_rgba(15,23,42,0.15)] transition-all">
                <div className="flex items-center justify-between mb-3">
                  <Stars />
                  <Quote className="h-4 w-4 text-fg-muted opacity-40" />
                </div>
                <p className="text-[13.5px] text-fg-primary leading-relaxed flex-1">
                  "{t.quote}"
                </p>
                <div className="mt-4 pt-4 border-t border-line-subtle flex items-center gap-3">
                  <span
                    className="h-10 w-10 rounded-full text-white text-[12px] font-bold flex items-center justify-center shrink-0"
                    style={{ background: t.gradient }}
                  >
                    {t.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-fg-primary truncate">{t.name}</p>
                    <p className="text-[11.5px] text-fg-muted truncate">
                      {t.role}, {t.business} · {t.city}
                    </p>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-1.5 self-start text-[10.5px] font-bold uppercase tracking-wide text-positive bg-positive-50 rounded-full px-2.5 py-1">
                  {t.metric}
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.15}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center">
            <div>
              <p className="text-[24px] sm:text-[28px] font-extrabold text-fg-primary leading-none">4.8/5</p>
              <p className="text-[11.5px] text-fg-muted mt-1">Average rating</p>
            </div>
            <div className="h-8 w-px bg-line-default hidden sm:block" />
            <div>
              <p className="text-[24px] sm:text-[28px] font-extrabold text-fg-primary leading-none">92%</p>
              <p className="text-[11.5px] text-fg-muted mt-1">Would recommend</p>
            </div>
            <div className="h-8 w-px bg-line-default hidden sm:block" />
            <div>
              <p className="text-[24px] sm:text-[28px] font-extrabold text-fg-primary leading-none">2 min</p>
              <p className="text-[11.5px] text-fg-muted mt-1">Median setup time</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
