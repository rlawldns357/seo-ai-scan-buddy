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
 * Compact, bookmark-shaped "AutoBlog" launch teaser on the home screen.
 * Wide & short ratio (no tall stacked layout). Brand-forward:
 *   - AutoBlog wordmark left
 *   - 3 brand pillars: 블로그 재고 · 자동 발행 · 최적화 노출
 *   - Beta CTA + 50% promo on the right
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
      <div className="relative">
        {/* Bookmark ribbon — wide, short */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-[hsl(232_47%_14%)] via-[hsl(232_47%_18%)] to-[hsl(232_47%_14%)] text-white shadow-lg">
          {/* notch tab on the left to evoke a bookmark */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-accent" />
          {/* soft glow */}
          <div className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 w-32 h-32 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-5 py-4">
            {/* LEFT: brand + pillars */}
            <div className="flex items-center gap-4 min-w-0">
              {/* Wordmark block */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
                  <Bookmark className="w-4 h-4 text-primary-foreground" fill="currentColor" />
                </div>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base font-extrabold tracking-tight">
                      Auto<span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Blog</span>
                    </span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-white/15 text-white ring-1 ring-white/20 leading-none">
                      <Sparkles className="w-2.5 h-2.5" /> NEW
                    </span>
                  </div>
                  <div className="text-[10px] text-white/55 font-medium tracking-wide">
                    by SearchTune OS
                  </div>
                </div>
              </div>

              {/* divider */}
              <div className="hidden md:block w-px h-10 bg-white/10 shrink-0" />

              {/* Pillars */}
              <ul className="hidden md:flex items-center gap-3 min-w-0">
                {pillars.map(({ Icon, label, desc }) => (
                  <li key={label} className="flex items-center gap-1.5 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white/10 text-white shrink-0">
                      <Icon className="w-3 h-3" />
                    </span>
                    <span className="leading-tight min-w-0">
                      <span className="block text-[11px] font-bold text-white truncate">
                        {label}
                      </span>
                      <span className="block text-[9px] text-white/55 truncate">
                        {desc}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>

              {/* Mobile: condensed pillar chips */}
              <ul className="flex md:hidden items-center gap-1.5 flex-wrap">
                {pillars.map(({ label }) => (
                  <li
                    key={label}
                    className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-bold ring-1 ring-white/10"
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            {/* RIGHT: CTA stack */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent text-[10px] font-extrabold tracking-wider uppercase ring-1 ring-accent/30">
                <Tag className="w-3 h-3" /> 평생 50%
              </span>
              <button
                onClick={openBeta}
                className="inline-flex items-center justify-center gap-1 h-9 px-4 rounded-full bg-white text-[hsl(232_47%_14%)] text-xs font-extrabold hover:bg-white/90 transition-colors shadow-md whitespace-nowrap"
              >
                베타 신청 <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* slim bottom strip with promo + secondary link */}
          <div className="relative border-t border-white/10 px-4 sm:px-5 py-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-white/65 truncate">
              초대 사용자 무료 ·{" "}
              <span className="font-bold text-white">정식 출시 시 Pro 평생 50% 자동 적용</span>
            </p>
            <Link
              to="/autoblog"
              className="text-[11px] font-bold text-white/80 hover:text-white transition-colors whitespace-nowrap inline-flex items-center gap-0.5 shrink-0"
            >
              자세히 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      <BetaSignupModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </section>
  );
}
