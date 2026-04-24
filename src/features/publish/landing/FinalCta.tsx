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
    <section className="relative w-full overflow-hidden py-24 md:py-40 px-4 md:px-6 bg-gradient-to-b from-background via-primary/5 to-background">
      {/* full-bleed background layers */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[800px] rounded-[50%] bg-primary/10 blur-[140px]" />
        <div className="absolute top-1/4 left-[10%] w-72 h-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-1/4 right-[10%] w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
        {/* subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto text-center">
        {/* top badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 backdrop-blur px-4 py-2 text-xs md:text-sm font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            지금 바로 시작하기
          </span>
        </div>

        <h2 className="text-[34px] leading-[1.15] md:text-7xl md:leading-[1.05] font-bold tracking-tight text-foreground break-keep">
          검색엔진과 AI가
          <br className="hidden sm:block" />{" "}
          <span className="bg-gradient-to-r from-primary via-primary to-primary/60 bg-clip-text text-transparent">
            우리 브랜드를 인용하게
          </span>
          <br />
          만드는 콘텐츠 운영
        </h2>

        <p className="text-base leading-[1.8] md:text-xl md:leading-relaxed text-muted-foreground mt-8 max-w-3xl mx-auto break-keep">
          페이지 1개를 만들면 검색 노출·답변 채택·AI 인용 관점이 같이 반영된 글이
          구조까지 갖춰서 자동으로 발행됩니다.
        </p>

        {/* highlight chips */}
        <ul className="mt-10 flex flex-wrap items-center justify-center gap-2 md:gap-3">
          {HIGHLIGHTS.map((h) => (
            <li
              key={h}
              className="inline-flex items-center gap-2 rounded-full bg-card/70 backdrop-blur border border-border/60 px-4 py-2 text-sm md:text-base text-foreground/85"
            >
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {h}
            </li>
          ))}
        </ul>

        {/* CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/auth?next=/dashboard" className="w-full sm:w-auto order-1 sm:order-2">
            <Button
              size="lg"
              className="rounded-full h-16 px-12 gap-2 w-full sm:w-auto justify-center text-base md:text-lg font-semibold shadow-2xl shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] transition-all"
            >
              페이지 만들기 <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <a href="#how" className="w-full sm:w-auto order-2 sm:order-1">
            <Button
              size="lg"
              variant="ghost"
              className="rounded-full h-16 px-10 w-full sm:w-auto justify-center text-base md:text-lg hover:bg-card/60"
            >
              작동 방식 보기
            </Button>
          </a>
        </div>

        {/* trust line */}
        <p className="mt-8 text-xs md:text-sm text-muted-foreground">
          신용카드 등록 없이 시작 · 언제든 자동 발행 정지 가능
        </p>
      </div>
    </section>
  );
}
