import { useState, useEffect } from "react";
import { Search, MessageCircle, Globe, Loader2, CheckCircle2 } from "lucide-react";
import FaqSection from "@/components/FaqSection";

export type AnalysisPhase = "crawling" | "ai-analyzing" | "psi-measuring" | "done";

interface LoadingScreenProps {
  completedPhases?: Set<AnalysisPhase>;
  skipLighthouse?: boolean;
}

interface InsightCard {
  icon: React.ReactNode;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
}

const insights: InsightCard[] = [
  {
    icon: <Search className="w-5 h-5" />,
    tag: "SEO",
    tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    title: "검색엔진 최적화",
    description: "Google·Naver 등 검색엔진이 내 사이트를 잘 이해하고 상위에 노출할 수 있도록 기술적·콘텐츠적 요소를 최적화하는 것입니다.",
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    tag: "AEO",
    tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    title: "AI 답변 최적화",
    description: "ChatGPT·Perplexity 같은 AI가 내 콘텐츠를 인용하거나 답변 소스로 채택할 수 있도록, 명확하고 구조화된 정보를 제공하는 전략입니다.",
  },
  {
    icon: <Globe className="w-5 h-5" />,
    tag: "GEO",
    tagColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    title: "AI 생성 검색 최적화",
    description: "Google SGE·AI Overview 등 생성형 검색 결과에서 내 사이트가 신뢰할 수 있는 출처로 선택되도록 권위와 신뢰 신호를 강화하는 것입니다.",
  },
  {
    icon: <Search className="w-5 h-5" />,
    tag: "Tip",
    tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    title: "왜 SEO만으로는 부족할까?",
    description: "검색의 40% 이상이 AI 기반으로 전환되고 있어요. 기존 SEO에 AEO·GEO를 더해야 AI 시대에도 검색 노출을 유지할 수 있습니다.",
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    tag: "Tip",
    tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    title: "구조화된 데이터란?",
    description: "Schema.org 마크업으로 페이지 내용을 기계가 이해할 수 있게 표현한 것이에요. FAQ, How-to, Article 등의 스키마가 AI 인용 확률을 높여줍니다.",
  },
];

interface Step {
  phase: AnalysisPhase;
  label: string;
}

const steps: Step[] = [
  { phase: "crawling", label: "페이지 크롤링 중…" },
  { phase: "ai-analyzing", label: "AI 분석 중…" },
  { phase: "psi-measuring", label: "Lighthouse 측정 중…" },
];

export default function LoadingScreen({ completedPhases = new Set(), skipLighthouse = false }: LoadingScreenProps) {
  const [cardIndex, setCardIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const cardTimer = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCardIndex((prev) => (prev + 1) % insights.length);
        setFadeIn(true);
      }, 300);
    }, 4000);
    return () => clearInterval(cardTimer);
  }, []);

  const card = insights[cardIndex];
  const activeSteps = skipLighthouse ? steps.filter((s) => s.phase !== "psi-measuring") : steps;
  const allDone = activeSteps.every((s) => completedPhases.has(s.phase));

  return (
    <main className="flex-1 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Steps */}
        <div className="space-y-3">
          <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin-slow" />
          <div className="flex flex-col gap-2 items-start max-w-[260px] mx-auto mt-4">
            {activeSteps.map((step, i) => {
              const done = completedPhases.has(step.phase);
              const active = !done && (i === 0 || activeSteps.slice(0, i).every((s) => completedPhases.has(s.phase)));
              return (
                <div
                  key={step.phase}
                  className={`flex items-center gap-2.5 transition-all duration-500 ${
                    done
                      ? "text-primary"
                      : active
                        ? "text-foreground"
                        : "text-muted-foreground/40"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-muted-foreground/20 shrink-0" />
                  )}
                  <span className={`text-sm font-medium ${active ? "animate-pulse" : ""}`}>
                    {done ? step.label.replace("…", " ✓") : step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-[260px] mx-auto mt-2">
            <div className="h-1.5 rounded-full bg-muted-foreground/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{
                  width: allDone
                    ? "100%"
                    : `${(Array.from(completedPhases).filter((p) => activeSteps.some((s) => s.phase === p)).length / activeSteps.length) * 85 + 5}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Info card */}
        <div
          className={`bg-card rounded-xl border border-border p-5 text-left transition-all duration-300 ${
            fadeIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${card.tagColor}`}>
              {card.icon}
              {card.tag}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-foreground mb-1.5">
            {card.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {card.description}
          </p>
        </div>

        {/* Subtle hint */}
        <p className="text-[11px] text-muted-foreground/60">
          {skipLighthouse ? "AI 분석만 실행 · 30초 이내" : "모바일 + 데스크톱 동시 측정 · 평균 10~30초"}
        </p>

        {/* FAQ */}
        <div className="text-left">
          <FaqSection compact />
        </div>
      </div>
    </main>
  );
}
