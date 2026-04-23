import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

const HIGHLIGHTS = [
  "SEO·AEO·GEO 3축 자동 설계",
  "전용 블로그 허브 즉시 생성",
  "요일·시간 자동 발행 스케줄",
];

export default function FinalCta() {
  return (
    <section className="relative py-20 md:py-36 px-4 md:px-6 overflow-hidden">
      {/* deep background layers for weight */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/40 to-background" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] h-[680px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-52 h-52 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative max-w-4xl mx-auto">
        <div className="relative text-center p-8 md:p-16 rounded-[28px] md:rounded-[36px] border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 shadow-[0_30px_80px_-20px_hsl(var(--primary)/0.25)] backdrop-blur">
          {/* top badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[11px] md:text-xs font-semibold text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              지금 바로 시작하기
            </span>
          </div>

          <h2 className="text-[28px] leading-[1.2] md:text-5xl md:leading-[1.15] font-bold tracking-tight text-foreground break-keep">
            검색엔진과 AI가{" "}
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              우리 브랜드를 인용하게
            </span>
            <br className="hidden md:block" />
            만드는 콘텐츠 운영
          </h2>

          <p className="text-[15px] leading-[1.75] md:text-lg md:leading-relaxed text-muted-foreground mt-6 max-w-2xl mx-auto break-keep">
            페이지 1개를 만들면 검색 노출·답변 채택·AI 인용 관점이 같이 반영된 글이
            구조까지 갖춰서 자동으로 발행됩니다.
          </p>

          {/* highlight chips */}
          <ul className="mt-8 flex flex-wrap items-center justify-center gap-2 md:gap-3">
            {HIGHLIGHTS.map((h) => (
              <li
                key={h}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 border border-border/50 px-3 py-1.5 text-[12px] md:text-sm text-foreground/80"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                {h}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/auth?next=/dashboard" className="w-full sm:w-auto order-1 sm:order-2">
              <Button
                size="lg"
                className="rounded-full h-14 px-10 gap-2 w-full sm:w-auto justify-center text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
              >
                페이지 만들기 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#how" className="w-full sm:w-auto order-2 sm:order-1">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full h-14 px-8 w-full sm:w-auto justify-center text-base"
              >
                작동 방식 보기
              </Button>
            </a>
          </div>

          {/* trust line */}
          <p className="mt-6 text-[12px] md:text-xs text-muted-foreground">
            신용카드 등록 없이 시작 · 언제든 자동 발행 정지 가능
          </p>
        </div>
      </div>
    </section>
  );
}
