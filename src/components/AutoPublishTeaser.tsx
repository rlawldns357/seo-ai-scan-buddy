import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Short summary block on the home (diagnostic) screen.
 * Explains what AutoBlog is in 2-3 sentences and links to the dedicated page.
 * Does NOT alter the existing diagnostic flow above it.
 */
export default function AutoPublishTeaser() {
  return (
    <section className="mt-14 max-w-lg mx-auto text-left">
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wide">
            <Sparkles className="w-3 h-3" /> AutoBlog
          </span>
          <span className="text-[11px] text-muted-foreground font-medium">
            진단 그다음 단계
          </span>
        </div>
        <p className="text-sm sm:text-base text-foreground leading-relaxed">
          진단으로 끝내지 말고, 콘텐츠 운영까지 이어가세요.
          AutoBlog는 진단 결과를 바탕으로 내 사이트에 필요한 SEO·AEO·GEO 콘텐츠를 자동으로 만들어
          SearchTune OS 전용 페이지에 발행해주는 기능입니다.
          별도 블로그 없이도, 진단 다음 단계인 콘텐츠 운영까지 자연스럽게 확장할 수 있습니다.
        </p>
        <Link
          to="/dashboard"
          className="mt-5 inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          AutoBlog 페이지로 이동 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
