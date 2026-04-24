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
  CheckCircle2,
  Search,
  MessageSquareQuote,
  Quote,
} from "lucide-react";
import BetaSignupModal from "@/components/BetaSignupModal";
import { trackEvent } from "@/lib/analytics";

/**
 * Light embed-style AutoBlog launch teaser on the home screen.
 * Notion/Slack link-preview vibe: light card, brand strip on the left,
 * structured content blocks. Medium height (not too short, not towering).
 *
 * Sections inside the card:
 *   1) Brand row — wordmark, NEW, 50% promo
 *   2) Headline + one-line value
 *   3) 3 brand pillars: 블로그 재고 / 자동 발행 / 최적화 노출
 *   4) Coverage row: SEO · AEO · GEO chips
 *   5) Mini "what's in your queue" list (3 lines)
 *   6) CTA row: Beta signup + secondary "어떻게 작동하나요"
 *   7) Footer strip: promo recap
 */
export default function AutoPublishTeaser() {
  const [betaOpen, setBetaOpen] = useState(false);

  const openBeta = () => {
    trackEvent("autoblog_beta_modal_open", { source: "home_teaser" });
    setBetaOpen(true);
  };

  const pillars = [
    {
      Icon: Layers3,
      label: "블로그 재고",
      desc: "주제 1개 → 콘텐츠 30편 큐 자동 보충",
    },
    {
      Icon: CalendarClock,
      label: "자동 발행",
      desc: "요일·시간 예약, KST 기준 자동 게시",
    },
    {
      Icon: TrendingUp,
      label: "최적화 노출",
      desc: "스키마·내부 링크·FAQ 자동 셋업",
    },
  ];

  const coverage = [
    { Icon: Search, label: "SEO", sub: "Google·Naver" },
    { Icon: MessageSquareQuote, label: "AEO", sub: "답변 박스" },
    { Icon: Quote, label: "GEO", sub: "ChatGPT·Perplexity" },
  ];

  const queue = [
    { state: "발행됨", title: "가을 신상품 코디 가이드", tone: "success" as const },
    { state: "예약", title: "주말 세일 안내 — 토 09:00", tone: "info" as const },
    { state: "초안", title: "리뷰 베스트 5 큐레이션", tone: "muted" as const },
  ];

  return (
    <section className="mt-12 max-w-2xl mx-auto">
      <article className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
        {/* embed-style brand strip on the left */}
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

          {/* 2. Headline */}
          <h2 className="mt-4 text-lg sm:text-xl font-extrabold text-foreground leading-snug tracking-tight break-keep">
            진단 다음 단계,{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              한 달치 블로그 재고
            </span>
            를 큐에 쌓아 자동 운영하세요
          </h2>
          <p className="mt-1.5 text-[13px] text-muted-foreground leading-relaxed break-keep">
            주제 한 줄이면 SEO·AEO·GEO 3축으로 최적화된 글이 자동 생성·예약·발행됩니다.
            매번 글을 새로 쓰지 않아도, 검색엔진과 AI가 인용하기 좋은 형태로 콘텐츠가 운영돼요.
          </p>

          {/* 3. Pillars */}
          <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {pillars.map(({ Icon, label, desc }) => (
              <li
                key={label}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50"
              >
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-extrabold text-foreground">
                    {label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground leading-snug">
                    {desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/* 4. Coverage chips */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase mr-1">
              커버리지
            </span>
            {coverage.map(({ Icon, label, sub }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border border-border text-[10px]"
              >
                <Icon className="w-3 h-3 text-primary" />
                <span className="font-extrabold text-foreground">{label}</span>
                <span className="text-muted-foreground">· {sub}</span>
              </span>
            ))}
          </div>

          {/* 5. Mini queue */}
          <div className="mt-4 rounded-xl border border-border/60 bg-background/60 p-2 space-y-1.5">
            <div className="flex items-center justify-between px-1.5 pt-0.5 pb-0.5">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider uppercase">
                내 발행 큐 미리보기
              </span>
              <span className="text-[10px] font-bold text-accent">자동 보충 · +27편 대기</span>
            </div>
            {queue.map(({ state, title, tone }) => {
              const stateClass =
                tone === "success"
                  ? "bg-accent/15 text-accent"
                  : tone === "info"
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground";
              return (
                <div
                  key={title}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border border-border/40"
                >
                  <span
                    className={`shrink-0 inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${stateClass}`}
                  >
                    {state}
                  </span>
                  <span className="text-[12px] text-foreground truncate flex-1">
                    {title}
                  </span>
                  {tone === "success" && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                  )}
                  {tone === "info" && (
                    <CalendarClock className="w-3.5 h-3.5 text-primary shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* 6. CTAs */}
          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={openBeta}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity shadow-sm"
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
        </div>

        {/* 7. Footer strip */}
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
