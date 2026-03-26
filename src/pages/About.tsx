import Navbar from "@/components/Navbar";
import StickyBottomCTA from "@/components/StickyBottomCTA";
import { SoftwareApplicationJsonLd } from "@/components/JsonLd";
import { Search, BarChart3, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "SEO 진단",
    desc: "메타 태그, 구조화 데이터, Canonical, Sitemap 등 기술 SEO를 점검합니다.",
  },
  {
    icon: BarChart3,
    title: "AEO 준비도",
    desc: "ChatGPT, Perplexity, 뤼튼, 클로바X, 코파일럿, Gemini 등 AI가 내 콘텐츠를 답변으로 인용할 수 있는지 분석합니다.",
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
      <SoftwareApplicationJsonLd />
      <Navbar />
      <main className="flex-1 py-16 px-4">
        <div className="container max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight text-center mb-4">
            SearchTune <span className="font-extrabold">OS</span>
          </h1>
          <p className="text-center text-muted-foreground text-base sm:text-lg mb-12 leading-relaxed">
            URL만 입력하면 SEO, AEO, GEO 점수와<br className="hidden sm:block" />
            AI 검색 준비도를 빠르게 확인할 수 있어요.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mb-16">
            {features.map((f) => (
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
              </p>
            </div>
          </section>

          <div className="mt-16 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 h-12 px-8 rounded-2xl gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              무료로 분석하기
            </a>
          </div>
        </div>
      </main>
      <StickyBottomCTA />
    </div>
  );
}
