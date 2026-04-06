import Navbar from "@/components/Navbar";
import ScoreDashboard from "@/components/ScoreDashboard";
import LighthouseScores from "@/components/LighthouseScores";
import ResultHeader from "@/components/ResultHeader";
import VerificationLinks from "@/components/VerificationLinks";
import EmailForm from "@/components/EmailForm";
import FunnelCTAs from "@/components/FunnelCTAs";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import FaqSection from "@/components/FaqSection";
import ShareButtons from "@/components/ShareButtons";
import { getDemoResult } from "@/data/demoResults";

const DEMO_URL = "https://example.com";
const demoResult = getDemoResult(DEMO_URL);

const fakePsi = {
  performance: 72,
  accessibility: 88,
  bestPractices: 91,
  seo: 85,
  screenshot: null,
  finalUrl: DEMO_URL,
  fetchTime: new Date().toISOString(),
};

const DesignTest = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navbar />
    <main className="flex-1 py-8 sm:py-12 px-2 sm:px-4 pb-24">
      <div className="max-w-4xl mx-auto space-y-5">
        <ResultHeader psi={fakePsi} psiError={null} url={DEMO_URL} />
        <LighthouseScores mobile={fakePsi} desktop={fakePsi} />
        <ScoreDashboard result={demoResult} url={DEMO_URL} />
        <VerificationLinks url={DEMO_URL} />
        <ShareButtons result={demoResult} url={DEMO_URL} />
        <FunnelCTAs result={demoResult} url={DEMO_URL} />
        <EmailForm onSubmitted={() => {}} />
        <FaqSection expanded />
        <div className="h-24" />
      </div>
      <StickyBottomCTA />
    </main>
  </div>
);

export default DesignTest;
