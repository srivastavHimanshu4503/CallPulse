import { lazy, Suspense } from "react";
import { useSeoMeta } from "../hooks/useSeoMeta";
import { ScrollProgress } from "../components/common/ScrollProgress";
import { Nav } from "../components/sections/Nav";
import { Hero } from "../components/sections/Hero";
import { SocialProof } from "../components/sections/SocialProof";

// Below-the-fold sections lazy-load so the hero + call scene ships first.
const Problem = lazy(() => import("../components/sections/Problem").then((m) => ({ default: m.Problem })));
const HowItWorks = lazy(() => import("../components/sections/HowItWorks").then((m) => ({ default: m.HowItWorks })));
const Features = lazy(() => import("../components/sections/Features").then((m) => ({ default: m.Features })));
const Industries = lazy(() => import("../components/sections/Industries").then((m) => ({ default: m.Industries })));
const Languages = lazy(() => import("../components/sections/Languages").then((m) => ({ default: m.Languages })));
const Testimonials = lazy(() => import("../components/sections/Testimonials").then((m) => ({ default: m.Testimonials })));
const Pricing = lazy(() => import("../components/sections/Pricing").then((m) => ({ default: m.Pricing })));
const FAQ = lazy(() => import("../components/sections/FAQ").then((m) => ({ default: m.FAQ })));
const FinalCTA = lazy(() => import("../components/sections/FinalCTA").then((m) => ({ default: m.FinalCTA })));
const Footer = lazy(() => import("../components/sections/Footer").then((m) => ({ default: m.Footer })));

function SectionSkeleton({ h = "60vh" }: { h?: string }) {
  return <div className="bg-bg-canvas" style={{ minHeight: h }} aria-hidden />;
}

export function HomePage() {
  useSeoMeta({
    title: "DeskBuddy — AI Phone Receptionist for Indian Businesses",
    description:
      "DeskBuddy is an AI phone receptionist for Indian businesses. Answers calls 24/7 in Hindi, English & 4 more languages — bookings, CRM, WhatsApp on autopilot.",
    canonical: "https://www.deskbuddy.in/",
  });
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollProgress />
      <Nav />
      <main>
        <Hero />
        <SocialProof />
        <Suspense fallback={<SectionSkeleton />}>
          <Problem />
          <HowItWorks />
          <Features />
          <Industries />
          <Languages />
          <Testimonials />
          <Pricing />
          <FAQ />
          <FinalCTA />
        </Suspense>
      </main>
      <Suspense fallback={<SectionSkeleton h="30vh" />}>
        <Footer />
      </Suspense>
    </div>
  );
}
