import { ArrowUpRight, ExternalLink, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const AUTOBLOG_URL = "https://auto-blog-hive.lovable.app";

/**
 * 최하단 sticky CTA — Auto-Blog (분리 SaaS, 외부 링크).
 * 본 사이트 디자인과 의도적으로 대비되는 다크 톤 + 외부 이동 시그널 강조.
 */
export default function StickyBottomCTA() {
  const handleClick = () => {
    trackEvent("cta_click", { source: "sticky_cta", target: "autoblog" });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      {/* 상단 그라데이션 액센트 라인 — 본문과 분리감 */}
      <div className="h-[3px] w-full bg-gradient-to-r from-primary via-accent to-primary" />

      {/* Desktop layout */}
      <a
        href={AUTOBLOG_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="hidden sm:flex relative items-center gap-4 px-6 py-3.5 group bg-[hsl(220_15%_10%)] hover:bg-[hsl(220_15%_8%)] transition-colors"
      >
        <div className="container max-w-4xl mx-auto flex items-center gap-4">
          {/* 외부 서비스 뱃지 */}
          <div className="shrink-0 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-white/10 text-white border border-white/20">
              <ExternalLink className="w-2.5 h-2.5" />
              새 서비스
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Auto-Blog</span>
              <span className="text-white/90"> · 진단했다면, 이제 발행도 자동화</span>
            </p>
            <p className="text-[11px] text-white/55 mt-0.5">
              SEO·AEO·GEO 콘텐츠 30편을 큐에 쌓아 매일 자동 발행 · 별도 SaaS
            </p>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-white text-[hsl(220_15%_10%)] text-sm font-extrabold whitespace-nowrap group-hover:bg-white/90 group-hover:gap-2 transition-all shadow-lg">
            바로가기
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        </div>
      </a>

      {/* Mobile layout */}
      <a
        href={AUTOBLOG_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="sm:hidden block bg-[hsl(220_15%_10%)] active:bg-[hsl(220_15%_6%)] px-3 py-2.5 transition-colors"
      >
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest bg-white/10 text-white border border-white/20 leading-none">
            <ExternalLink className="w-2.5 h-2.5" />
            새 서비스
          </span>
          <p className="text-[11px] font-medium text-white/60 leading-none">
            진단 다음 단계는 <span className="font-bold text-white">자동 발행</span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 h-11 pl-4 pr-3 rounded-full bg-white text-[hsl(220_15%_10%)] shadow-lg">
          <span className="inline-flex items-center gap-2 text-sm font-extrabold">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-primary to-accent">
              <Sparkles className="w-3 h-3 text-primary-foreground" />
            </span>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Auto-Blog</span>
            <span>바로가기</span>
          </span>
          <ArrowUpRight className="w-4 h-4 shrink-0" />
        </div>
      </a>
    </div>
  );
}
