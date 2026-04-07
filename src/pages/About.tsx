import Navbar from "@/components/Navbar";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import { SoftwareApplicationJsonLd } from "@/components/JsonLd";
import FunnelCTAs from "@/components/FunnelCTAs";
import { Search, BarChart3, Shield, Zap, ArrowRight, Target, TrendingUp, MousePointerClick } from "lucide-react";

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

const performanceFeatures = [
  {
    icon: Target,
    title: "네이버 검색광고",
    desc: "키워드 분석부터 입찰 전략, 품질지수 관리까지 네이버 SA의 ROAS를 극대화합니다.",
  },
  {
    icon: MousePointerClick,
    title: "Google Ads",
    desc: "검색·디스플레이·쇼핑·영상 캠페인을 통합 운영하여 전환 단가를 최적화합니다.",
  },
  {
    icon: TrendingUp,
    title: "Meta 광고",
    desc: "Facebook·Instagram 타겟팅과 크리에이티브 최적화로 효율적인 리드 및 매출을 확보합니다.",
  },
  {
    icon: BarChart3,
    title: "데이터 분석 & GA",
    desc: "GA4, GTM 세팅부터 전환 퍼널 분석, 어트리뷰션 모델링까지 데이터 기반 의사결정을 지원합니다.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SoftwareApplicationJsonLd />
      <Navbar />
      <main className="flex-1 py-16 px-4">
        <div className="container max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight text-center mb-4">
            SearchTune <span className="font-extrabold">OS</span>
          </h1>
          <p className="text-center text-foreground text-base sm:text-lg mb-3 leading-relaxed font-medium">
            서치튠OS(SearchTune OS)는 2025년 출시된 한국어 기반 AI 검색 진단 도구로,<br className="hidden sm:block" />
            URL만 입력하면 SEO·AEO·GEO 3개 축의 점수를 즉시 분석합니다.
          </p>
          <p className="text-center text-muted-foreground text-sm mb-12 leading-relaxed">
            검색 최적화부터 퍼포먼스 마케팅까지, 데이터 기반으로 성장을 설계합니다.
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

          {/* Performance Marketing Section */}
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            퍼포먼스 마케팅
          </h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            검색 최적화로 유입을 만들고, 퍼포먼스 마케팅으로 전환을 극대화합니다.
            담당 광고 전문가가 매체별 캠페인을 직접 운영하고 성과를 관리합니다.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-16">
            {performanceFeatures.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border/50 bg-muted/20 p-6 space-y-3"
              >
                <div className="rounded-xl p-2.5 w-fit bg-accent/20">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

          <section className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                왜 SEO만으로는 부족한가요?
              </h2>
              <p>
                검색 환경이 빠르게 변하고 있습니다. 이제 웹사이트는 전통 검색엔진
                가시성뿐 아니라, AI 답변 추출 적합성과 생성형 검색 엔진에서의
                발견·인용·참조 준비도까지 함께 점검해야 합니다.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                AEO(AI 답변 최적화)란 무엇인가요?
              </h2>
              <p>
                AEO는 Answer Engine Optimization의 약자로, ChatGPT·Perplexity·뤼튼·클로바X 같은 AI 답변 엔진이
                내 콘텐츠를 직접 답변으로 인용하도록 최적화하는 전략입니다.
                Q&A 구조, 명확한 직접 답변, FAQPage 스키마 적용 등이 핵심입니다.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                GEO(생성형 검색 최적화)란 무엇인가요?
              </h2>
              <p>
                GEO는 Generative Engine Optimization의 약자로, Google SGE·Naver Cue:·Bing Copilot 등
                생성형 AI 검색에서 브랜드와 콘텐츠가 출처로 인용·참조되도록 준비하는 전략입니다.
                AI 크롤러 접근 허용, 명확한 출처·엔티티 정보, 데이터 기반 콘텐츠가 중요합니다.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                어떻게 점수를 계산하나요?
              </h2>
              <p>
                Google Lighthouse 실측 데이터, 규칙 기반 평가, LLM 평가를 혼합한
                하이브리드 방식으로 SEO·AEO·GEO 각 축의 점수를 독립적으로
                산출합니다. 공식 데이터와 자체 추정의 차이를 투명하게 구분합니다.
              </p>
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground mb-2">
                비용이 드나요?
              </h2>
              <p>
                현재 베타 서비스로 무료 이용할 수 있습니다.
                별도 회원가입 없이 URL만 입력하면 바로 분석 결과를 확인할 수 있습니다.
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
