import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Layers3,
  CalendarClock,
  TrendingUp,
  Tag,
  Bookmark,
} from "lucide-react";
import BetaSignupModal from "@/components/BetaSignupModal";
import { trackEvent } from "@/lib/analytics";

/**
 * Compact "bookmark"-style AutoBlog launch teaser on the home screen.
 * Light theme. Wide, short ratio. Brand-forward:
 *   - Colored ribbon edge (bookmark feel)
 *   - AutoBlog wordmark + NEW
 *   - 3 brand pillars: 블로그 재고 · 자동 발행 · 최적화 노출
 *   - Beta CTA + 50% promo
 */
export default function AutoPublishTeaser() {
  const [betaOpen, setBetaOpen] = useState(false);

  const openBeta = () => {
    trackEvent("autoblog_beta_modal_open", { source: "home_teaser" });
    setBetaOpen(true);
  };

  const pillars = [
    { Icon: Layers3, label: "블로그 재고", desc: "큐에 쌓아두기" },
    { Icon: CalendarClock, label: "자동 발행", desc: "예약 운영" },
    { Icon: TrendingUp, label: "최적화 노출", desc: "SEO·AEO·GEO" },
  ];

  return (
    <section className="mt-12 max-w-2xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        {/* bookmark ribbon edge */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-accent" />

        <div className="pl-4 pr-4 sm:pr-5 py-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4">
          {/* LEFT: brand + pillars */}
          <div className="flex items-center gap-4 min-w-0">
            {/* Wordmark */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20">
                <Bookmark className="w-4 h-4 text-primary" fill="currentColor" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-foreground">
                    Auto<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Blog</span>
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary to-accent text-primary-foreground leading-none shadow-sm">
                    <Sparkles className="w-2.5 h-2.5" /> NEW
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium tracking-wide">
                  by SearchTune OS
                </div>
              </div>
            </div>

            {/* divider */}
            <div className="hidden md:block w-px h-10 bg-border shrink-0" />

            {/* Pillars (desktop) */}
            <ul className="hidden md:flex items-center gap-3 min-w-0">
              {pillars.map(({ Icon, label, desc }) => (
                <li key={label} className="flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary shrink-0">
                    <Icon className="w-3 h-3" />
                  </span>
                  <span className="leading-tight min-w-0">
                    <span className="block text-[11px] font-bold text-foreground truncate">
                      {label}
                    </span>
                    <span className="block text-[9px] text-muted-foreground truncate">
                      {desc}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {/* Pillars (mobile chips) */}
            <ul className="flex md:hidden items-center gap-1.5 flex-wrap">
              {pillars.map(({ label }) => (
                <li
                  key={label}
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold"
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT: CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/15 text-accent text-[10px] font-extrabold tracking-wider uppercase">
              <Tag className="w-3 h-3" /> 평생 50%
            </span>
            <button
              onClick={openBeta}
              className="inline-flex items-center justify-center gap-1 h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-extrabold hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
            >
              베타 신청 <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* slim bottom strip */}
        <div className="border-t border-border bg-muted/30 pl-4 pr-4 sm:pr-5 py-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground truncate">
            초대 사용자 무료 ·{" "}
            <span className="font-bold text-foreground">정식 출시 시 Pro 평생 50% 자동 적용</span>
          </p>
          <Link
            to="/autoblog"
            className="text-[11px] font-bold text-primary hover:underline whitespace-nowrap inline-flex items-center gap-0.5 shrink-0"
          >
            자세히 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <BetaSignupModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </section>
  );
}
