import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Tag,
  Bookmark,
  PenLine,
  Wand2,
  CalendarClock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import BetaSignupModal from "@/components/BetaSignupModal";
import { trackEvent } from "@/lib/analytics";

/**
 * Light embed-style AutoBlog launch teaser on the home screen.
 * Notion/Slack link-preview vibe: light card, brand strip on the left,
 * a hero tagline + a 4-step "process" rail to make it feel tangible.
 *
 * Sections:
 *   1) Brand row — wordmark, NEW, 50% promo
 *   2) Hero tagline — emotional headline + supporting line
 *   3) Process rail — 주제 → 생성 → 예약 → 발행·노출 (4 steps)
 *   4) CTA — 무료 베타 신청하기 + 자세히 보기
 *   5) Footer strip — promo recap
 */
export default function AutoPublishTeaser() {
  const [betaOpen, setBetaOpen] = useState(false);

  const openBeta = () => {
    trackEvent("autoblog_beta_modal_open", { source: "home_teaser" });
    setBetaOpen(true);
  };

  const steps = [
    { Icon: PenLine, label: "주제 한 줄", desc: "브랜드·키워드 입력" },
    { Icon: Wand2, label: "AI 생성", desc: "SEO·AEO·GEO 3축" },
    { Icon: CalendarClock, label: "자동 예약", desc: "요일·시간 큐" },
    { Icon: TrendingUp, label: "발행 + 노출", desc: "검색·AI 인용" },
  ];

  return (
    <section className="mt-12 max-w-2xl mx-auto">
      <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        {/* embed brand strip */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-accent" />

        <div className="pl-5 pr-5 sm:pl-6 sm:pr-6 py-5 sm:py-6">
          {/* 1. Brand row */}
          <header className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/20">
              <Bookmark
                className="w-3.5 h-3.5 text-primary"
                fill="currentColor"
              />
            </div>
            <div className="leading-tight mr-1">
              <div className="text-[15px] font-extrabold tracking-tight text-foreground">
                Auto
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Blog
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium tracking-wide">
                by SearchTune OS
              </div>
            </div>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-primary to-accent text-primary-foreground leading-none shadow-sm">
              <Sparkles className="w-2.5 h-2.5" /> NEW
            </span>
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-extrabold tracking-wider uppercase">
              <Tag className="w-3 h-3" /> 평생 50%
            </span>
          </header>

          {/* 2. Hero tagline */}
          <div className="mt-5">
            <h2 className="text-xl sm:text-[1.6rem] font-extrabold text-foreground leading-[1.25] tracking-tight break-keep">
              매일 글 안 써도,{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                검색·AI에 노출되는 콘텐츠
              </span>
              가 알아서 쌓입니다
            </h2>
            <p className="mt-2 text-[13px] sm:text-sm text-muted-foreground leading-relaxed break-keep">
              주제 한 줄이면 AutoBlog가 글 작성부터 예약·발행, 스키마·내부 링크 셋업까지 자동으로 운영해줘요.
            </p>
          </div>

          {/* 3. Process rail */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                작동 방식
              </span>
              <span className="text-[10px] font-bold text-accent inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> 셋업 후 손 안 가게
              </span>
            </div>
            <ol className="relative grid grid-cols-4 gap-1 sm:gap-2">
              {/* connector line */}
              <div
                className="absolute left-0 right-0 top-3 h-px bg-gradient-to-r from-primary/30 via-border to-accent/30"
                aria-hidden
              />
              {steps.map(({ Icon, label, desc }, i) => (
                <li key={label} className="relative flex flex-col items-center text-center gap-1.5">
                  <span className="relative z-10 inline-flex items-center justify-center w-7 h-7 rounded-full bg-card border-2 border-primary/30 text-primary shadow-sm">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="block text-[10px] font-extrabold text-foreground leading-tight">
                    {label}
                  </span>
                  <span className="hidden sm:block text-[9px] text-muted-foreground leading-tight">
                    {desc}
                  </span>
                  <span className="absolute -top-1 right-1 text-[8px] font-extrabold text-muted-foreground/60">
                    {i + 1}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* 4. CTAs */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <button
              onClick={openBeta}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> 무료 베타 신청하기{" "}
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/autoblog"
              className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border bg-card text-foreground text-sm font-bold hover:bg-muted/50 transition-colors"
            >
              자세히 보기
            </Link>
          </div>
        </div>

        {/* 5. Footer strip */}
        <div className="border-t border-border bg-muted/30 pl-5 pr-4 sm:pl-6 sm:pr-5 py-2 flex items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground truncate">
            초대 사용자 무료 ·{" "}
            <span className="font-bold text-foreground">정식 출시 시 Pro 평생 50% 자동 적용</span>
          </p>
          <Link
            to="/autoblog"
            className="text-[11px] font-bold text-primary hover:underline whitespace-nowrap inline-flex items-center gap-0.5 shrink-0"
          >
            제품 페이지 <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </article>

      <BetaSignupModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </section>
  );
}
