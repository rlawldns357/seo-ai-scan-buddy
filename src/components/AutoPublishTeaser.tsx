import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import BetaSignupModal from "@/components/BetaSignupModal";
import { trackEvent } from "@/lib/analytics";

/**
 * Premium minimal horizontal teaser — focused solely on "신제품 출시".
 * Editorial typography, restrained color, single CTA.
 */
export default function AutoPublishTeaser() {
  const [betaOpen, setBetaOpen] = useState(false);

  const openBeta = () => {
    trackEvent("autoblog_beta_modal_open", { source: "home_teaser" });
    setBetaOpen(true);
  };

  return (
    <section className="mt-3 max-w-2xl mx-auto">
      <button
        onClick={openBeta}
        className="group w-full text-left rounded-2xl border border-border bg-card hover:border-foreground/20 hover:shadow-elevated transition-all duration-300"
      >
        <div className="px-5 sm:px-6 py-4 flex items-center gap-4 sm:gap-5">
          {/* meta label */}
          <div className="flex flex-col items-start shrink-0 border-r border-border pr-4 sm:pr-5">
            <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.18em] uppercase text-primary leading-none">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live
            </span>
            <span className="mt-1.5 text-[10px] font-semibold tracking-wider uppercase text-foreground/70 leading-none">
              Closed Beta
            </span>
          </div>

          {/* headline */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground mb-1">
              지금 사용해볼 수 있습니다
            </p>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight text-foreground leading-tight truncate">
              AutoBlog<span className="text-muted-foreground font-medium"> — 클로즈베타 신청하기</span>
            </h3>
          </div>

          {/* arrow */}
          <div className="shrink-0 w-9 h-9 rounded-full border border-border flex items-center justify-center group-hover:bg-foreground group-hover:border-foreground transition-colors">
            <ArrowUpRight className="w-4 h-4 text-foreground group-hover:text-background transition-colors" />
          </div>
        </div>
      </button>

      <BetaSignupModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </section>
  );
}
