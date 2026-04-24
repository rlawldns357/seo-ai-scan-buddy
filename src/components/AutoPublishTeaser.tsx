import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, CalendarClock, Layers3, CheckCircle2 } from "lucide-react";

/**
 * Home-screen teaser for AutoBlog.
 * Reframes the message from "speed" to "inventory + autonomy" per
 * mem://strategy/inventory-frame-positioning. Visualizes a small Kanban-like
 * queue to make the value tangible at a glance.
 */
const QUEUE_PREVIEW = [
  { state: "발행됨", tone: "success" as const, title: "가을 신상품 코디 가이드" },
  { state: "예약", tone: "info" as const, title: "주말 세일 안내 — 토요일 09:00" },
  { state: "초안", tone: "muted" as const, title: "리뷰 베스트 5 큐레이션" },
];

const toneClass = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  info: "bg-primary/10 text-primary",
  muted: "bg-muted text-muted-foreground",
};

export default function AutoPublishTeaser() {
  return (
    <section className="mt-14 max-w-lg mx-auto text-left">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.04] p-6 sm:p-7 shadow-sm">
        {/* decorative glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-40 h-40 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-wider uppercase">
              <Sparkles className="w-3 h-3" /> NEW
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
              AutoBlog · 콘텐츠 운영 자동화
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground leading-tight tracking-tight">
            진단했다면, 이제{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              한 달치 콘텐츠
            </span>
            를<br className="hidden sm:block" /> 큐에 쌓아두세요
          </h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            주제 한 줄이면 SEO·AEO·GEO 3축 최적화된 글이 자동으로 생성·예약·발행됩니다.
            <span className="text-foreground font-semibold"> 매번 새로 쓰지 않아도 됩니다.</span>
          </p>

          {/* mini queue visualization */}
          <div className="mt-5 rounded-2xl border border-border/50 bg-background/60 backdrop-blur-sm p-3 space-y-2">
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Layers3 className="w-3.5 h-3.5" /> 발행 큐 미리보기
              </span>
              <span className="text-[10px] text-muted-foreground">자동 보충</span>
            </div>
            {QUEUE_PREVIEW.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-card border border-border/40"
              >
                <span
                  className={`shrink-0 inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full ${toneClass[item.tone]}`}
                >
                  {item.state}
                </span>
                <span className="text-xs sm:text-[13px] text-foreground truncate flex-1">
                  {item.title}
                </span>
                {item.tone === "success" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
                {item.tone === "info" && (
                  <CalendarClock className="w-3.5 h-3.5 text-primary shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <Link
              to="/auth?next=/dashboard"
              className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
            >
              AutoBlog 시작하기 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/autoblog"
              className="inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
            >
              어떻게 작동하나요?
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
