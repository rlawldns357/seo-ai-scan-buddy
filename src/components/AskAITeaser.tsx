import { ArrowUpRight, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

/**
 * Premium minimal horizontal teaser — Ask AI 진단.
 * Mirrors NaverStoreTeaser styling for visual consistency.
 * 스크롤 anchor: AIPerceptionCard 섹션(#ai-perception)으로 이동.
 */
export default function AskAITeaser() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    trackEvent("ask_ai_teaser_click", { source: "home_teaser" });
    const el = document.getElementById("ai-perception");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // 분석 전이면 — 인풋으로 스크롤하고 부드럽게 강조
      const input = document.querySelector<HTMLInputElement>('input[type="url"], input[name="url"]');
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus();
    }
  };

  return (
    <section className="mt-3 max-w-2xl mx-auto">
      <a
        href="#ai-perception"
        onClick={handleClick}
        className="group block w-full text-left rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-elevated transition-all duration-300"
      >
        <div className="px-5 sm:px-6 py-4 flex items-center gap-4 sm:gap-5">
          {/* meta label */}
          <div className="flex flex-col items-start shrink-0 border-r border-border pr-4 sm:pr-5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] uppercase text-score-excellent leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-score-excellent animate-pulse" />
              Live
            </span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase text-foreground/70 leading-none">
              Ask AI
            </span>
          </div>

          {/* headline */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              ChatGPT · Claude · Gemini · Perplexity
            </p>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-tight truncate">
              Ask AI<span className="text-muted-foreground font-medium"> — AI에게 직접 물어본 결과 보기</span>
            </h3>
          </div>

          {/* arrow */}
          <div className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-colors">
            <ArrowUpRight className="w-4 h-4 text-foreground group-hover:text-background transition-colors" />
          </div>
        </div>
      </a>
    </section>
  );
}
