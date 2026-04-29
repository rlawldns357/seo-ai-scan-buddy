import { ArrowUpRight, Layers, Calendar, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const AUTOBLOG_URL = "https://auto-blog-hive.lovable.app";

/**
 * Auto-Blog teaser — links to the standalone product with a value-prop summary.
 * Frame: 재고(큐) 모델 — "속도가 아닌 재고" (mem://strategy/inventory-frame-positioning)
 */
export default function AutoPublishTeaser() {
  const handleClick = () => {
    trackEvent("autoblog_beta_modal_open", { source: "home_teaser_external" });
  };

  return (
    <section className="mt-3 max-w-4xl mx-auto">
      <a
        href={AUTOBLOG_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="group block w-full text-left rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-elevated transition-all duration-300 overflow-hidden"
      >
        {/* Top row: badge + headline + arrow */}
        <div className="px-5 sm:px-6 pt-4 pb-3 flex items-center gap-4 sm:gap-5">
          <div className="flex flex-col items-start shrink-0 border-r border-border pr-4 sm:pr-5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] uppercase text-primary leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live
            </span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase text-foreground/70 leading-none">
              New Product
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1">
              SEO·AEO·GEO 3축으로 자동 발행되는 콘텐츠 엔진
            </p>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-tight">
              Auto-Blog<span className="text-muted-foreground font-medium"> — 진단을 넘어, 자동 발행까지</span>
            </h3>
          </div>

          <div className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-colors">
            <ArrowUpRight className="w-4 h-4 text-foreground group-hover:text-background transition-colors" />
          </div>
        </div>

        {/* Description + value props */}
        <div className="px-5 sm:px-6 pb-4 border-t border-border/50 pt-3 mt-1">
          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed mb-3">
            진단으로 끝나는 게 아니라, <span className="text-foreground font-semibold">콘텐츠 30편을 큐에 쌓아두고 KST 스케줄에 맞춰 자동 발행</span>합니다.
            발행된 글은 SEO/AEO/GEO 점수로 자동 채점되고, 같은 사이트 글에 자동 백링크가 연결됩니다.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
              <Layers className="w-3.5 h-3.5 text-primary shrink-0" />
              <span><span className="font-semibold text-foreground">큐 재고</span> 모델</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
              <span><span className="font-semibold text-foreground">스케줄</span> 자동 발행</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>3축 <span className="font-semibold text-foreground">자동 채점</span></span>
            </div>
          </div>
        </div>
      </a>
    </section>
  );
}
