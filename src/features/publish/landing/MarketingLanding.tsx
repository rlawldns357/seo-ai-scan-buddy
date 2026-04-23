import { Helmet } from "react-helmet-async";
import Hero from "./Hero";
import ValueProp from "./ValueProp";
import HowItWorks from "./HowItWorks";
import AudienceFit from "./AudienceFit";
import ValueCards from "./ValueCards";
import Pricing from "./Pricing";
import LandingFaq from "./LandingFaq";
import FinalCta from "./FinalCta";

export default function MarketingLanding() {
  return (
    <>
      <Helmet>
        <title>AutoBlog — 검색엔진·AI 답변 인용 인프라 | SearchTune OS</title>
        <meta
          name="description"
          content="단순 블로그 툴이 아닙니다. SEO·AEO·GEO 3개 축으로 글을 자동 설계하고 구조화된 형태로 발행해, 검색엔진(Google·Naver)과 AI 답변 엔진(ChatGPT·Perplexity)이 우리 브랜드를 인용하게 만듭니다."
        />
      </Helmet>
      <div className="w-full">
        <Hero />
        <ValueProp />
        <HowItWorks />
        <AudienceFit />
        <ValueCards />
        <Pricing />
        <LandingFaq />
        <FinalCta />
      </div>
    </>
  );
}
