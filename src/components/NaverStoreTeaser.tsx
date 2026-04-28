import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";

/**
 * Premium minimal horizontal teaser — Naver Smart/Brand Store dedicated diagnostic.
 * Mirrors AutoPublishTeaser styling for visual consistency.
 */
export default function NaverStoreTeaser() {
  const handleClick = () => {
    trackEvent("naver_store_teaser_click", { source: "home_teaser" });
  };

  return (
    <section className="mt-4 max-w-2xl mx-auto">
      <Link
        to="/naver-store"
        onClick={handleClick}
        className="group block w-full text-left rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-elevated transition-all duration-300"
      >
        <div className="px-5 sm:px-6 py-4 flex items-center gap-4 sm:gap-5">
          {/* meta label */}
          <div className="flex flex-col items-start shrink-0 border-r border-border pr-4 sm:pr-5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] uppercase text-[#03C75A] leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#03C75A] animate-pulse" />
              New
            </span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase text-foreground/70 leading-none">
              Naver Store
            </span>
          </div>

          {/* headline */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1">
              스마트스토어 · 브랜드스토어 전용
            </p>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-tight truncate">
              Store Diagnostic<span className="text-muted-foreground font-medium"> — 네이버 전용 진단 시작</span>
            </h3>
          </div>

          {/* arrow */}
          <div className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-colors">
            <ArrowUpRight className="w-4 h-4 text-foreground group-hover:text-background transition-colors" />
          </div>
        </div>
      </Link>
    </section>
  );
}
