import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import AIPerceptionCard from "@/components/AIPerceptionCard";
import VerificationLinks from "@/components/VerificationLinks";
import EmailForm from "@/components/EmailForm";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import FaqSection from "@/components/FaqSection";
import HeroHeader from "@/components/design-v2/HeroHeader";
import ScoreSummary4Col from "@/components/design-v2/ScoreSummary4Col";
import PriorityActions from "@/components/design-v2/PriorityActions";
import OpportunityCostBanner from "@/components/design-v2/OpportunityCostBanner";
import ReportsInsights from "@/components/design-v2/ReportsInsights";

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
      <div className="max-w-4xl mx-auto space-y-5">
        <h1 className="sr-only">Design System Test</h1>

        {/* 1. Hero header — horizontal */}
        <HeroHeader url={DEMO_URL} psi={fakePsi} onRescan={() => alert("재스캔 (데모)")} />

        {/* 2. Score summary — 4-col grid (SEO/AEO/GEO + 전체+Lighthouse) */}
        <ScoreSummary4Col result={demoResult} mobile={fakePsi} desktop={fakePsi} />

        {/* 3. AI 노출 현황 — keeps 응답 점유율 측정 button naturally inside */}
        <AIPerceptionCard url={DEMO_URL} onAnswerShareClick={() => alert("응답 점유율 측정 모달 (데모)")} />

        {/* 4. 무엇을 먼저 해야 하나요? */}
        <PriorityActions result={demoResult} />

        {/* 5. 기회 비용 / 예상 손실 */}
        <OpportunityCostBanner onDetailClick={() => alert("상세 분석 (데모)")} />

        {/* 6. 리포트 & 인사이트 */}
        <ReportsInsights />

        <VerificationLinks url={DEMO_URL} />

        <EmailForm onSubmitted={() => {}} />
        <FaqSection expanded />
        <div className="h-24" />
      </div>
      <StickyBottomCTA />
    </main>
  </div>
);

export default DesignTest;
