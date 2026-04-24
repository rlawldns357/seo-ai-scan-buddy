import { useState } from "react";
import { ArrowRight, Sparkles, Bookmark } from "lucide-react";
import BetaSignupModal from "@/components/BetaSignupModal";
import { trackEvent } from "@/lib/analytics";

/**
 * Compact horizontal launch bookmark for AutoBlog.
 * Single-row focus on "신제품 출시" — no pillars, no queue preview, no coverage chips.
 * Just: brand mark · NEW · headline · CTA.
 */
export default function AutoPublishTeaser() {
  const [betaOpen, setBetaOpen] = useState(false);

  const openBeta = () => {
    trackEvent("autoblog_beta_modal_open", { source: "home_teaser" });
    setBetaOpen(true);
  };

  return (
    <section className="mt-12 max-w-2xl mx-auto">
      <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        {/* left brand strip */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-accent" />

        <div className="pl-5 pr-4 sm:pl-6 sm:pr-5 py-3.5 flex items-center gap-3 sm:gap-4">
          {/* brand mark */}
          <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20 shrink-0">
            <Bookmark className="w-4 h-4 text-primary" fill="currentColor" />
          </div>

          {/* text block */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-muted-foreground">
                신제품 출시
              </span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary to-accent text-primary-foreground leading-none">
                <Sparkles className="w-2.5 h-2.5" /> NEW
              </span>
            </div>
            <p className="text-[13px] sm:text-sm font-extrabold text-foreground leading-snug tracking-tight break-keep truncate">
              Auto
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Blog
              </span>
              <span className="text-muted-foreground font-bold"> · </span>
              한 달치 블로그 재고를 자동 발행
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={openBeta}
            className="shrink-0 inline-flex items-center justify-center gap-1 h-9 px-3.5 sm:px-4 rounded-full bg-primary text-primary-foreground text-[12px] sm:text-[13px] font-extrabold hover:opacity-90 transition-opacity shadow-sm"
          >
            베타 신청 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </article>

      <BetaSignupModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </section>
  );
}
