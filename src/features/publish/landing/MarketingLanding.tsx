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
        <title>AutoBlog 소개 — 콘텐츠 운영 자동화 | SearchTune OS</title>
        <meta
          name="description"
          content="SearchTune OS의 AutoBlog 소개 페이지. SEO·AEO·GEO 관점에서 필요한 콘텐츠를 찾고 전용 페이지에 자동 발행하는 흐름을 살펴보세요."
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
