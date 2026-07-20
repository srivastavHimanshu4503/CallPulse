import { ScrollProgress } from "./components/common/ScrollProgress";
import { Nav } from "./components/sections/Nav";
import { Hero } from "./components/sections/Hero";
import { SocialProof } from "./components/sections/SocialProof";
import { Problem } from "./components/sections/Problem";
import { HowItWorks } from "./components/sections/HowItWorks";
import { Features } from "./components/sections/Features";
import { CallJourney } from "./components/sections/CallJourney";
import { Industries } from "./components/sections/Industries";
import { Statement } from "./components/sections/Statement";
import { Languages } from "./components/sections/Languages";
import { Pricing } from "./components/sections/Pricing";
import { FAQ } from "./components/sections/FAQ";
import { FinalCTA } from "./components/sections/FinalCTA";
import { Footer } from "./components/sections/Footer";

export default function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollProgress />
      <Nav />
      <main>
        <Hero />
        <SocialProof />
        <Problem />
        <HowItWorks />
        <Features />
        <CallJourney />
        <Industries />
        <Languages />
        <Pricing />
        <FAQ />
        <Statement />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
