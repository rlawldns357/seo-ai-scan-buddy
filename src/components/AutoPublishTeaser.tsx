import { ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

const AUTOBLOG_URL = "https://auto-blog-hive.lovable.app";

/**
 * Premium minimal horizontal teaser — links to the standalone AutoBlog product.
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
        className="group block w-full text-left rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-elevated transition-all duration-300"
      >
        <div className="px-5 sm:px-6 py-4 flex items-center gap-4 sm:gap-5">
          {/* meta label */}
          <div className="flex flex-col items-start shrink-0 border-r border-border pr-4 sm:pr-5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] uppercase text-primary leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live
            </span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase text-foreground/70 leading-none">
              New Product
            </span>
          </div>

          {/* headline */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1">
              지금 바로 사용해보세요
            </p>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-tight truncate">
              AutoBlog<span className="text-muted-foreground font-medium"> — 사용해보기</span>
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
