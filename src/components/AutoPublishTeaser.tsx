import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  CalendarClock,
  FileText,
  Tag,
} from "lucide-react";
import BetaSignupModal from "@/components/BetaSignupModal";
import { trackEvent } from "@/lib/analytics";

/**
 * Compact "new product launch" teaser for AutoBlog on the home screen.
 * Light card style, condensed height, structured to explain at a glance:
 *   1) New product badge + 50% promo
 *   2) Headline + one-line value
 *   3) 3-step "what it does" mini queue
 *   4) Beta CTA (opens modal) + secondary "how it works"
 */
export default function AutoPublishTeaser() {
  const [betaOpen, setBetaOpen] = useState(false);

  const openBeta = () => {
    trackEvent("autoblog_beta_modal_open", { source: "home_teaser" });
    setBetaOpen(true);
  };

  return (
    <section className="mt-14 max-w-lg mx-auto text-left">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-accent/[0.05] p-5 sm:p-6 shadow-sm">
        {/* soft glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-12 w-40 h-40 rounded-full bg-accent/15 blur-3xl" />

        <div className="relative">
          {/* 1. Badges */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-extrabold tracking-widest uppercase shadow-sm">
              <Sparkles className="w-3 h-3" /> NEW
            </span>
            <span className="text-[11px] font-bold text-muted-foreground tracking-wide">
              AutoBlog · 콘텐츠 운영 자동화
            </span>
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-[10px] font-extrabold tracking-wide">
              <Tag className="w-3 h-3" /> 평생 50%
            </span>
          </div>

          {/* 2. Headline + one-line value */}
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight tracking-tight">
            진단했다면, 이제{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              한 달치 콘텐츠
            </span>
            를 큐에 쌓아두세요
          </h2>
          <p className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed break-keep">
            주제 한 줄이면 SEO·AEO·GEO 3축 최적화된 글이{" "}
            <span className="text-foreground font-semibold">자동 생성·예약·발행</span>
            됩니다.
          </p>

          {/* 3. Mini queue — compact, structured */}
          <div className="mt-4 rounded-2xl border border-border/50 bg-background/60 backdrop-blur-sm p-2 space-y-1.5">
            <div className="flex items-center justify-between px-1.5 pt-1 pb-0.5">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wide uppercase">
                발행 큐 미리보기
              </span>
              <span className="text-[10px] font-bold text-accent">자동 보충</span>
            </div>
            {[
              {
                tone: "success" as const,
                Icon: CheckCircle2,
                state: "발행됨",
                title: "가을 신상품 코디 가이드",
              },
              {
                tone: "info" as const,
                Icon: CalendarClock,
                state: "예약",
                title: "주말 세일 — 토요일 09:00",
              },
              {
                tone: "muted" as const,
                Icon: FileText,
                state: "초안",
                title: "리뷰 베스트 5 큐레이션",
              },
            ].map(({ tone, Icon, state, title }) => {
              const stateClass =
                tone === "success"
                  ? "bg-accent/15 text-accent"
                  : tone === "info"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground";
              const iconClass =
                tone === "success"
                  ? "text-accent"
                  : tone === "info"
                    ? "text-primary"
                    : "text-muted-foreground";
              return (
                <div
                  key={title}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-card border border-border/40"
                >
                  <span
                    className={`shrink-0 inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${stateClass}`}
                  >
                    {state}
                  </span>
                  <span className="text-[12px] text-foreground truncate flex-1">
                    {title}
                  </span>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${iconClass}`} />
                </div>
              );
            })}
          </div>

          {/* 4. CTAs */}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={openBeta}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity shadow-sm"
            >
              <Sparkles className="w-4 h-4" /> 베타 신청하기{" "}
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link
              to="/autoblog"
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full border border-border bg-card text-foreground text-sm font-bold hover:bg-muted/50 transition-colors"
            >
              어떻게 작동하나요?
            </Link>
          </div>

          <p className="text-[11px] text-muted-foreground mt-2.5">
            초대 사용자 무료 · 정식 출시 시 <span className="font-bold text-foreground">Pro 평생 50%</span> 자동 적용
          </p>
        </div>
      </div>

      <BetaSignupModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </section>
  );
}
