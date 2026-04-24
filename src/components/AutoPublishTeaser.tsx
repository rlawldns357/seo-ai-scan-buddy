import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Rocket, Zap } from "lucide-react";

/**
 * Home-screen "new product launch" teaser for AutoBlog.
 * Optimized for instant "오! 신제품?!" recognition rather than feature explanation.
 */
export default function AutoPublishTeaser() {
  return (
    <section className="mt-16 max-w-lg mx-auto text-left">
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-accent/[0.06] p-7 sm:p-8 shadow-lg shadow-primary/5">
        {/* glow accents */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-48 h-48 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative">
          {/* Launch badge */}
          <div className="flex items-center justify-between gap-2 mb-5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-[11px] font-extrabold tracking-widest uppercase shadow-md">
              <Rocket className="w-3.5 h-3.5" /> Just Launched
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/15 text-accent text-[10px] font-extrabold tracking-widest uppercase ring-1 ring-accent/30">
              <Sparkles className="w-3 h-3" /> NEW
            </span>
          </div>

          {/* Product name — big and proud */}
          <div className="mb-4">
            <div className="text-[11px] font-bold text-primary tracking-widest uppercase mb-1.5">
              SearchTune OS 신제품
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-foreground leading-[1.05] tracking-tight">
              <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                AutoBlog
              </span>
            </h2>
            <p className="text-base sm:text-lg font-bold text-foreground mt-2 leading-snug">
              주제만 적으면, 알아서 글이 올라가는<br className="hidden sm:block" /> 자동 블로그 운영 도구
            </p>
          </div>

          {/* One-line value */}
          <div className="flex items-center gap-2 mt-4 px-3.5 py-3 rounded-2xl bg-background/70 backdrop-blur-sm border border-border/50">
            <Zap className="w-4 h-4 text-accent shrink-0" />
            <p className="text-sm text-foreground leading-snug">
              <span className="font-bold">매일 글 안 써도</span> 검색·AI 답변에 노출되는 콘텐츠가 쌓여요
            </p>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <Link
              to="/auth?next=/dashboard"
              className="inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-extrabold hover:opacity-90 transition-opacity shadow-md"
            >
              <Sparkles className="w-4 h-4" /> 무료로 써보기 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/autoblog"
              className="inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-full border border-border bg-card text-foreground text-sm font-bold hover:bg-muted/50 transition-colors"
            >
              제품 소개 보기
            </Link>
          </div>

          <p className="text-[11px] text-muted-foreground mt-3 text-center sm:text-left">
            베타 기간 무료 · 카드 등록 필요 없음
          </p>
        </div>
      </div>
    </section>
  );
}
