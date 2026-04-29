import { ArrowUpRight, ExternalLink } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import autoblogLogo from "@/assets/autoblog-logo.png";

const AUTOBLOG_URL = "https://auto-blog-hive.lovable.app";

/**
 * 최하단 sticky CTA — Auto-Blog (분리 SaaS, 외부 링크).
 * 본문과 분리감을 주되 너무 어둡지 않은 슬레이트 톤 + 실제 브랜드 로고로 외부 서비스 시그널 강조.
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
        className="hidden sm:flex relative items-center px-6 py-3 group bg-[hsl(225_22%_32%)] hover:bg-[hsl(225_24%_28%)] transition-colors"
      >
        <div className="container max-w-4xl mx-auto flex items-center gap-4">
          {/* 브랜드 로고 칩 */}
          <div className="shrink-0 flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-widest bg-white/15 text-white border border-white/25">
              <ExternalLink className="w-2.5 h-2.5" />
              새 서비스
            </span>
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-lg shadow-black/20 ring-1 ring-white/40">
              <img
                src={autoblogLogo}
                alt="Auto-Blog"
                className="w-9 h-9 object-contain"
                loading="lazy"
                decoding="async"
              />
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">
              <span className="bg-gradient-to-r from-[hsl(230_95%_75%)] to-[hsl(268_85%_78%)] bg-clip-text text-transparent">
                Auto-Blog
              </span>
              <span className="text-white/95"> · 진단했다면, 이제 발행도 자동화</span>
            </p>
            <p className="text-[11px] text-white/65 mt-0.5">
              SEO·AEO·GEO 콘텐츠 30편을 큐에 쌓아 매일 자동 발행 · 별도 SaaS
            </p>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-white text-[hsl(225_28%_22%)] text-sm font-extrabold whitespace-nowrap group-hover:bg-white/95 group-hover:gap-2 transition-all shadow-lg">
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
        className="sm:hidden block bg-[hsl(225_22%_32%)] active:bg-[hsl(225_24%_24%)] px-3 py-2.5 transition-colors"
      >
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest bg-white/15 text-white border border-white/25 leading-none">
            <ExternalLink className="w-2.5 h-2.5" />
            새 서비스
          </span>
          <p className="text-[11px] font-medium text-white/70 leading-none">
            진단 다음 단계는 <span className="font-bold text-white">자동 발행</span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 h-11 pl-2 pr-3 rounded-full bg-white text-[hsl(225_28%_22%)] shadow-lg">
          <span className="inline-flex items-center gap-2 text-sm font-extrabold">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white ring-1 ring-black/5">
              <img
                src={autoblogLogo}
                alt="Auto-Blog"
                className="w-7 h-7 object-contain"
                loading="lazy"
                decoding="async"
              />
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
