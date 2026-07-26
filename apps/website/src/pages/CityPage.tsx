import { useParams, Navigate } from "react-router-dom";
import { getCityBySlug } from "../data/cities";
import { useSeoMeta } from "../hooks/useSeoMeta";
import { Nav } from "../components/sections/Nav";
import { LandingHero } from "../components/sections/LandingHero";
import { HowItWorks } from "../components/sections/HowItWorks";
import { Features } from "../components/sections/Features";
import { Industries } from "../components/sections/Industries";
import { Languages } from "../components/sections/Languages";
import { Pricing } from "../components/sections/Pricing";
import { FAQ } from "../components/sections/FAQ";
import { FinalCTA } from "../components/sections/FinalCTA";
import { Footer } from "../components/sections/Footer";
import { ScrollProgress } from "../components/common/ScrollProgress";

export function CityPage() {
  const { city: slug } = useParams<{ city: string }>();
  const city = slug ? getCityBySlug(slug) : undefined;

  if (!city) return <Navigate to="/" replace />;

  const canonical = `https://www.deskbuddy.in/city/${city.slug}`;
  useSeoMeta({
    title: city.metaTitle,
    description: city.metaDescription,
    canonical,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <ScrollProgress />
      <Nav />
      <main>
        <LandingHero
          eyebrow={`For ${city.name} businesses · Made in India 🇮🇳`}
          h1={`AI Receptionist for Businesses in ${city.name}`}
          subhead={`${city.localPhrase} — DeskBuddy answers every call 24/7 in your customer's language, books appointments, and sends WhatsApp follow-ups. Trusted by ${city.businessTypes} across ${city.name}.`}
          proofPoint={`Small businesses across ${city.name}, ${city.state} are using DeskBuddy to catch every after-hours enquiry — the calls that used to ring out are now bookings on the calendar.`}
        />
        <HowItWorks />
        <Features />
        <Industries />
        <Languages />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
