import { Link } from "react-router-dom";
import { ArrowRight, FileText, Sparkles } from "lucide-react";

/**
 * Additive teaser shown on the home (diagnostic) screen.
 * Introduces the "dedicated content page + auto publish" concept
 * without altering the existing diagnostic flow.
 */
export default function AutoPublishTeaser() {
  return (
    <section className="mt-14 max-w-lg mx-auto text-left">
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wide">
            <Sparkles className="w-3 h-3" /> NEW
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            진단 그다음, 콘텐츠 운영까지
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
          내 사이트 전용 콘텐츠 페이지에<br />
          <span className="text-primary">필요한 글이 자동으로 쌓입니다</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">
          사이트를 한 번 연결해두면, SearchTune OS 안에 만들어진 전용 페이지로
          SEO·AEO·GEO 관점의 콘텐츠가 자동으로 발행됩니다.
        </p>

        <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/40">
          <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
          <code className="text-[11px] sm:text-xs text-muted-foreground truncate">
            searchtuneos.com/sites/<span className="text-foreground font-semibold">내-사이트</span>
          </code>
        </div>

        <Link
          to="/dashboard"
          className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:underline"
        >
          Auto Publish 자세히 보기 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
