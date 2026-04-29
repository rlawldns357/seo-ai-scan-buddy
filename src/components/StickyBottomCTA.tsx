import { ArrowUpRight, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const AUTOBLOG_URL = "https://auto-blog-hive.lovable.app";

/**
 * 최하단 sticky CTA — Auto-Blog (분리 SaaS)로 유도.
 * 진단 후 자연스럽게 "이제 발행도 자동화하세요" 흐름.
 */
export default function StickyBottomCTA() {
  const handleClick = () => {
    trackEvent("autoblog_beta_modal_open", { source: "sticky_cta" });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border">
      {/* Desktop layout */}
      <a
        href={AUTOBLOG_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="hidden sm:flex container max-w-4xl mx-auto items-center gap-4 px-4 py-3 group"
      >
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-sm">
          <Sparkles className="w-2.5 h-2.5" /> NEW
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight">
            진단했다면, 이제 <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">발행도 자동화</span>하세요
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Auto-Blog — SEO·AEO·GEO 3축 콘텐츠 30편을 큐에 쌓아 자동 발행
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-full gradient-primary text-primary-foreground text-sm font-bold whitespace-nowrap group-hover:opacity-90 transition-opacity">
          Auto-Blog 보기
          <ArrowUpRight className="w-3.5 h-3.5" />
        </span>
      </a>

      {/* Mobile layout */}
      <a
        href={AUTOBLOG_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="sm:hidden block px-3 py-2.5 active:opacity-80 transition-opacity"
      >
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary to-accent text-primary-foreground leading-none">
            <Sparkles className="w-2.5 h-2.5" /> NEW
          </span>
          <p className="text-[11px] font-medium text-muted-foreground leading-none">
            진단 다음 단계는 <span className="font-bold text-foreground">자동 발행</span>이에요
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 h-10 px-4 rounded-full gradient-primary text-primary-foreground">
          <span className="text-sm font-bold">Auto-Blog로 자동 발행 시작</span>
          <ArrowUpRight className="w-4 h-4 shrink-0" />
        </div>
      </a>
    </div>
  );
}
