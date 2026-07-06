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
      {/* 상단 액센트 라인 — 본문과 분리감 */}
      <div className="h-[3px] w-full bg-gradient-to-r from-[hsl(351_90%_72%)] via-[hsl(351_85%_60%)] to-[hsl(351_90%_72%)]" />

      {/* Desktop layout */}
      <a
        href={AUTOBLOG_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className="hidden sm:flex relative items-center px-6 py-3 group bg-gradient-to-r from-[hsl(351_85%_62%)] via-[hsl(351_88%_66%)] to-[hsl(345_88%_64%)] hover:from-[hsl(351_85%_58%)] hover:to-[hsl(345_88%_60%)] transition-colors"
      >
        <div className="container max-w-4xl mx-auto flex items-center gap-4">
          {/* 브랜드 로고 칩 — 뱃지가 좌측, 로고가 우측 */}
          <div className="shrink-0 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-lg shadow-[hsl(351_60%_30%)]/30 ring-1 ring-white/40">
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
            <p className="leading-tight flex items-baseline gap-2 flex-wrap">
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-[hsl(40_100%_92%)] to-white bg-clip-text text-transparent drop-shadow-sm">
                Auto-Blog
              </span>
              <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-[hsl(40_100%_92%)] to-white bg-clip-text text-transparent drop-shadow-sm">
                오토 블로그
              </span>
              <span className="text-white/95 text-sm font-semibold">
                · 진단했다면, 이제 발행도 자동화
              </span>
            </p>
            <p className="text-[11px] text-white/80 mt-1">
              SEO·AEO·GEO 콘텐츠 30편을 큐에 쌓아 매일 자동 발행 · 별도 SaaS
            </p>
          </div>

          <span className="shrink-0 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-white text-[hsl(351_75%_50%)] text-sm font-extrabold whitespace-nowrap group-hover:bg-white/95 group-hover:gap-2 transition-all shadow-lg">
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
        className="sm:hidden block bg-gradient-to-r from-[hsl(351_85%_62%)] to-[hsl(345_88%_64%)] active:from-[hsl(351_85%_56%)] active:to-[hsl(345_88%_58%)] px-3 py-2.5 transition-colors"
      >
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <p className="text-[11px] font-medium text-white/85 leading-none">
            진단 다음 단계는 <span className="font-bold text-white">자동 발행</span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 h-11 pl-2 pr-3 rounded-full bg-white text-[hsl(351_75%_50%)] shadow-lg">
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
            <span className="text-[hsl(351_75%_50%)]">Auto-Blog</span>
            <span>바로가기</span>
          </span>
          <ArrowUpRight className="w-4 h-4 shrink-0" />
        </div>
      </a>
    </div>
  );
}
