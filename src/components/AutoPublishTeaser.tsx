import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Search, MessageSquareQuote, Quote, Layers } from "lucide-react";

/**
 * Short summary block on the home (diagnostic) screen.
 * Positions AutoBlog as the bridge from "diagnosis" to "structured content
 * operations that get cited by search engines AND AI answer engines".
 */
const VALUE_PILLARS = [
  { icon: Search, label: "SEO 검색 노출", desc: "Google·Naver" },
  { icon: MessageSquareQuote, label: "AEO 답변 채택", desc: "검색 답변 박스" },
  { icon: Quote, label: "GEO AI 인용", desc: "ChatGPT·Perplexity" },
  { icon: Layers, label: "구조화 운영", desc: "스키마·내부 링크" },
];

export default function AutoPublishTeaser() {
  return (
    <section className="mt-14 max-w-lg mx-auto text-left">
      <div className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wide">
            <Sparkles className="w-3 h-3" /> NEW · AutoBlog
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
          진단 다음 단계, <span className="text-primary">검색엔진과 AI 답변 엔진이 인용하는 콘텐츠</span>로 운영하세요
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          단순 블로그 툴이 아닙니다. SEO 검색 노출, AEO 답변 채택, GEO AI 인용까지
          한 번에 겨냥하도록 글을 자동 설계하고, 구조화된 콘텐츠 운영으로 이어줍니다.
        </p>

        <ul className="mt-4 grid grid-cols-2 gap-2">
          {VALUE_PILLARS.map(({ icon: Icon, label, desc }) => (
            <li
              key={label}
              className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/40"
            >
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-foreground truncate">{label}</span>
                <span className="block text-[10px] text-muted-foreground truncate">{desc}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <Link
            to="/auth?next=/dashboard"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            AutoBlog 시작해보기 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/autoblog"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
          >
            AutoBlog 자세히 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
