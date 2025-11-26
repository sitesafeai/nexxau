import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ProblemSection } from "./components/ProblemSection";
import { VisualEvidenceSection } from "./components/VisualEvidenceSection";
import { FeatureDiagramSection } from "./components/FeatureDiagramSection";
import { WhatWeDoSection } from "./components/WhatWeDoSection";
import { IndustrySelectorSection } from "./components/IndustrySelectorSection";
import { InsuranceSection } from "./components/InsuranceSection";
import { WhyItMattersSection } from "./components/WhyItMattersSection";
import { ProofSection } from "./components/ProofSection";
import { PricingSection } from "./components/PricingSection";
import { FinalCTA } from "./components/FinalCTA";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a1628]">
      <Header />
      <main>
        <Hero />
        <ProblemSection />
        <VisualEvidenceSection />
        <FeatureDiagramSection />
        <WhatWeDoSection />
        <IndustrySelectorSection />
        <InsuranceSection />
        <WhyItMattersSection />
        <ProofSection />
        <PricingSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}