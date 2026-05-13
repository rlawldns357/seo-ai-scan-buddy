import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import { SoftwareApplicationJsonLd } from "@/components/JsonLd";
import FunnelCTAs from "@/components/FunnelCTAs";
import { Search, BarChart3, Shield, Zap, ArrowRight, Store, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const ABOUT_TITLE = "서치튠OS 소개 – AI 검색 시대의 SEO·AEO·GEO 진단 도구";
const ABOUT_DESC = "서치튠OS(SearchTune OS)는 URL만 입력하면 SEO·AEO·GEO 3개 축과 Google Lighthouse 실측을 한 번에 제공하는 한국어 AI 검색 진단 도구입니다.";
const ABOUT_URL = "https://searchtuneos.com/about";

const analyticFeatures = [
  {
    icon: Search,
    title: "SEO 진단",
    desc: "메타 태그, 구조화 데이터, Canonical, Sitemap 등 기술 SEO를 점검합니다.",
  },
  {
    icon: BarChart3,
    title: "AEO 준비도",
    desc: "ChatGPT, Perplexity, 뤼튼, 클로바X 등 AI가 내 콘텐츠를 답변으로 인용할 수 있는지 분석합니다.",
  },
  {
    icon: Shield,
    title: "GEO 가시성",
    desc: "Google SGE, Naver Cue:, Bing Copilot 등 생성형 검색에서 출처로 선택될 준비가 되었는지 평가합니다.",
  },
  {
    icon: Zap,
    title: "Lighthouse 실측",
    desc: "모바일·데스크톱 성능, 접근성, SEO 점수를 Google PSI API로 실시간 측정합니다.",
  },
];


export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{ABOUT_TITLE}</title>
        <meta name="description" content={ABOUT_DESC} />
        <link rel="canonical" href={ABOUT_URL} />
        <meta property="og:title" content={ABOUT_TITLE} />
        <meta property="og:description" content={ABOUT_DESC} />
        <meta property="og:url" content={ABOUT_URL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={ABOUT_TITLE} />
        <meta name="twitter:description" content={ABOUT_DESC} />
      </Helmet>
      <SoftwareApplicationJsonLd />
      <Navbar />
      <main className="flex-1 px-4 pt-20 pb-40 sm:pt-24 sm:pb-44">
        <div className="container max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight text-center mb-4">
            SearchTune <span className="font-extrabold">OS</span>
          </h1>
          <p className="text-center text-foreground text-base sm:text-lg mb-3 leading-relaxed font-medium">
            서치튠OS(SearchTune OS)는 2026년 출시된 한국어 기반 AI 검색 진단 도구로,<br className="hidden sm:block" />
            URL만 입력하면 SEO·AEO·GEO 3개 축의 점수를 즉시 분석합니다.
          </p>
          <p className="text-center text-muted-foreground text-sm mb-12 leading-relaxed">
            SEO·AEO·GEO 3개 축을 데이터 기반으로 함께 점검합니다.
            <br />
            <span className="text-xs text-muted-foreground/60">마지막 엔진 업데이트: 2026년 4월 · Google Lighthouse v12 기준 · Schema.org 2024 표준 기반</span>
          </p>

          {/* Analytics Section */}
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            SEO · AEO · GEO 분석
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-12">
            {analyticFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border/50 bg-muted/20 p-6 space-y-3"
              >
                <div className="gradient-primary rounded-xl p-2.5 w-fit">
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Naver Store Dedicated Diagnosis — NEW */}
          <Link
            to="/naver-store"
            className="group block rounded-2xl border border-naver/15 p-6 mb-12 hover:border-naver/30 transition-all"
            style={{
              background: "var(--gradient-naver-subtle)",
              boxShadow: "var(--shadow-naver)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="shrink-0 rounded-xl p-2.5"
                style={{ background: "var(--gradient-naver)" }}
              >
                <Store className="w-5 h-5 text-naver-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase text-naver-deep">
                    <Sparkles className="w-3 h-3" /> NEW
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
                    네이버 전용 진단
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-foreground mb-1.5">
                  스마트스토어·쇼핑 검색 최적화 진단이 추가됐어요
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  스마트스토어 URL만 입력하면 상품명·태그·카테고리·리뷰 신호 등 네이버 쇼핑 랭킹 핵심 요소를 별도 진단합니다.
                  일반 SEO/AEO/GEO 진단과 동일한 3축 점수 체계로 비교 가능합니다.
                </p>
                <span className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-naver-deep group-hover:gap-2 transition-all">
                  네이버 스토어 진단 받기 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>

          <section className="mt-12 space-y-6 text-sm text-muted-foreground leading-relaxed">
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                왜 SEO만으로는 부족한가요?
              </h2>
              <p>
                AI 검색엔진이 기존 검색 결과를 대체하고 있기 때문입니다. 이제 웹사이트는 전통 검색엔진 가시성뿐 아니라, AI 답변 추출 적합성(AEO)과 생성형 검색에서의 인용 준비도(GEO)까지 함께 점검해야 합니다.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                AEO(AI 답변 최적화)란 무엇인가요?
              </h2>
              <p>
                ChatGPT·Perplexity 같은 AI가 내 콘텐츠를 직접 답변으로 인용하도록 최적화하는 전략입니다. Q&A 구조, 명확한 직접 답변, FAQPage 스키마 적용이 핵심이며, AEO는 Answer Engine Optimization의 약자입니다.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                GEO(생성형 검색 최적화)란 무엇인가요?
              </h2>
              <p>
                Google SGE·Naver Cue: 등 AI 검색에서 내 콘텐츠가 출처로 인용되도록 준비하는 전략입니다. AI 크롤러(GPTBot, ClaudeBot 등) 접근 허용, 명확한 엔티티 정보, 데이터 기반 콘텐츠가 GEO 점수를 높이는 핵심 요소입니다.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                어떻게 점수를 계산하나요?
              </h2>
              <p>
                Google Lighthouse v12 실측 데이터와 AI 콘텐츠 분석을 결합한 하이브리드 방식입니다. SEO·AEO·GEO 각 축은 5~6개 하위 신호별 가중치를 적용해 0~100점으로 독립 산출하며, 분석 엔진은 2주마다 최신 트렌드를 반영하여 자동 업데이트됩니다.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                비용이 드나요?
              </h2>
              <p>
                무료입니다. 현재 베타 서비스로 회원가입 없이 URL만 입력하면 바로 분석 결과를 확인할 수 있습니다.
              </p>
            </div>
          </section>

          <div className="mt-8 mb-8 flex flex-col items-center text-center">
            <p className="text-sm text-muted-foreground mb-3">지금 바로 내 사이트를 점검해 보세요</p>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2.5 h-14 w-full sm:w-auto px-10 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-lg hover:opacity-90 hover:shadow-xl transition-all"
            >
              🚀 서치튠OS 무료로 분석하기
            </a>
          </div>

          <div className="mt-8">
            <FunnelCTAs />
          </div>
        </div>
      </main>
      <StickyBottomCTA />
    </div>
  );
}
