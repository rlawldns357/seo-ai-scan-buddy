import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ListChecks, Users, LayoutGrid, HelpCircle } from "lucide-react";

/**
 * Short summary block on the home (diagnostic) screen.
 * Acts as a transition hub: explains AutoBlog in 2-3 sentences and
 * makes it visually clear that the detailed sections live on the
 * dedicated AutoBlog page (`/dashboard`) — not removed.
 */
const PREVIEW_ITEMS = [
  { icon: ListChecks, label: "5단계 프로세스" },
  { icon: Users, label: "타깃 사용자" },
  { icon: LayoutGrid, label: "핵심 가치 카드" },
  { icon: HelpCircle, label: "FAQ" },
];

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
        <h2 className="text-base sm:text-lg font-bold text-foreground leading-snug">
          진단 이후에는 <span className="text-primary">콘텐츠 운영까지</span> 자동화할 수 있습니다
        </h2>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          SearchTune OS는 사이트 진단에서 끝나지 않고, 필요한 콘텐츠를 찾고
          전용 페이지에 자동 발행하는 운영 흐름까지 확장할 수 있습니다.
        </p>

        <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/40">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">
            AutoBlog 페이지에서 자세히 볼 수 있어요
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {PREVIEW_ITEMS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-card border border-border/50 text-[11px] text-foreground"
              >
                <Icon className="w-3 h-3 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <Link
            to="/auth?next=/dashboard"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            내 사이트 연결하기 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-full border border-border bg-card text-foreground text-sm font-semibold hover:bg-muted/50 transition-colors"
          >
            AutoBlog 자세히 보기
          </Link>
        </div>
      </div>
    </section>
  );
}
