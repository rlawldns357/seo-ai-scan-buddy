import Navbar from "@/components/Navbar";
import ScoreDashboard from "@/components/ScoreDashboard";
import LighthouseScores from "@/components/LighthouseScores";
import ResultHeader from "@/components/ResultHeader";
import VerificationLinks from "@/components/VerificationLinks";
import EmailForm from "@/components/EmailForm";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import FaqSection from "@/components/FaqSection";
import { getDemoResult } from "@/data/demoResults";
import type { PsiResult } from "@/lib/psi";

const fakePsi: PsiResult = {
  performance: 72,
  accessibility: 88,
  bestPractices: 91,
  seo: 85,
  screenshot: null,
  finalUrl: "https://example.com",
  fetchTime: "2025-01-01T00:00:00Z",
};

const demoUrl = "https://example.com";
const result = getDemoResult(demoUrl);

const DesignTest = () => (
  <div className="min-h-screen flex flex-col bg-background">
    <Navbar />
    <main className="flex-1 py-8 sm:py-12 px-4 pb-24">
      <div className="container max-w-4xl mx-auto space-y-5">
        <div className="text-center mb-4">
          <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-xs font-semibold">
            🎨 디자인 테스트 모드
          </span>
        </div>
        <ResultHeader psi={fakePsi} psiError={null} url={demoUrl} />
        <LighthouseScores mobile={fakePsi} desktop={{ ...fakePsi, performance: 95, seo: 92 }} />
        <ScoreDashboard result={result} />
        <VerificationLinks url={demoUrl} />
        <EmailForm onSubmitted={() => {}} />

        {/* FAQ */}
        <FaqSection />
      </div>

      <StickyBottomCTA />
    </main>
  </div>
);

export default DesignTest;
