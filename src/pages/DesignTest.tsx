import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import ScoreDashboard from "@/components/ScoreDashboard";
import AIPerceptionCard from "@/components/AIPerceptionCard";
import LighthouseScores from "@/components/LighthouseScores";
import ResultHeader from "@/components/ResultHeader";
import VerificationLinks from "@/components/VerificationLinks";
import EmailForm from "@/components/EmailForm";
import FunnelCTAs from "@/components/FunnelCTAs";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import FaqSection from "@/components/FaqSection";

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
    <Helmet>
      <title>Design System Test – 서치튠OS</title>
      <meta name="description" content="서치튠OS 내부 UI/UX 통합 테스트 페이지입니다." />
      <meta name="robots" content="noindex, nofollow" />
      <link rel="canonical" href="https://searchtuneos.com/design-test" />
    </Helmet>
    <Navbar />
    <main className="flex-1 px-2 sm:px-4 pt-10 pb-40 sm:pt-16 sm:pb-44">
        <AIPerceptionCard url={DEMO_URL} onAnswerShareClick={() => alert("응답 점유율 측정 모달 (데모)")} />
        <h1 className="sr-only">Design System Test</h1>
        <ResultHeader psi={fakePsi} psiError={null} url={DEMO_URL} result={demoResult} />
        <LighthouseScores mobile={fakePsi} desktop={fakePsi} />
        <AIPerceptionCard url={DEMO_URL} />
        <ScoreDashboard result={demoResult} url={DEMO_URL} />
        <VerificationLinks url={DEMO_URL} />
        
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
