import { useParams, Navigate } from "react-router-dom";
import { getVerticalBySlug } from "../data/verticals";
import { useSeoMeta } from "../hooks/useSeoMeta";
import { BreadcrumbSchema } from "../components/common/BreadcrumbSchema";
import { Nav } from "../components/sections/Nav";
import { LandingHero } from "../components/sections/LandingHero";
import { ExampleCall } from "../components/sections/ExampleCall";
import { HowItWorks } from "../components/sections/HowItWorks";
import { Features } from "../components/sections/Features";
import { Languages } from "../components/sections/Languages";
import { Pricing } from "../components/sections/Pricing";
import { FAQ } from "../components/sections/FAQ";
import { FinalCTA } from "../components/sections/FinalCTA";
import { Footer } from "../components/sections/Footer";
import { ScrollProgress } from "../components/common/ScrollProgress";

export function VerticalPage() {
  const { vertical: slug } = useParams<{ vertical: string }>();
  const vertical = slug ? getVerticalBySlug(slug) : undefined;

  if (!vertical) return <Navigate to="/" replace />;

  const canonical = `https://www.deskbuddy.in/for/${vertical.slug}`;
  useSeoMeta({
    title: vertical.metaTitle,
    description: vertical.metaDescription,
    canonical,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <ScrollProgress />
      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://www.deskbuddy.in/" },
          { name: "By industry", url: "https://www.deskbuddy.in/" },
          { name: vertical.name, url: canonical },
        ]}
      />
      <Nav />
      <main>
        <LandingHero
          eyebrow={`For ${vertical.name.toLowerCase()} · Made in India 🇮🇳`}
          h1={vertical.h1}
          subhead={vertical.subhead}
          proofPoint={vertical.proofPoint}
        />
        <ExampleCall vertical={vertical.name.toLowerCase()} script={vertical.exampleCall} />
        <HowItWorks />
        <Features />
        <Languages />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
