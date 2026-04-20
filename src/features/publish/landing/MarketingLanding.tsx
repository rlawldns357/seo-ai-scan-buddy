import { Helmet } from "react-helmet-async";
import Hero from "./Hero";
import ValueProp from "./ValueProp";
import HowItWorks from "./HowItWorks";
import AudienceFit from "./AudienceFit";
import ValueCards from "./ValueCards";
import LandingFaq from "./LandingFaq";
import FinalCta from "./FinalCta";

export default function MarketingLanding() {
  return (
    <>
      <Helmet>
        <title>Auto Publish — 진단에서 콘텐츠 운영까지 | SearchTune OS</title>
        <meta
          name="description"
          content="SEO·AEO·GEO 관점에서 필요한 콘텐츠를 찾고, SearchTune OS 전용 페이지에 자동으로 발행해 사이트 운영을 더 쉽게 시작하세요."
        />
      </Helmet>
      <div className="w-full">
        <Hero />
        <ValueProp />
        <HowItWorks />
        <AudienceFit />
        <ValueCards />
        <LandingFaq />
        <FinalCta />
      </div>
    </>
  );
}
