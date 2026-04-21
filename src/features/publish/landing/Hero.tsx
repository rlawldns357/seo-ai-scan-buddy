import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, FileText, Sparkles, CheckCircle2 } from "lucide-react";

export default function Hero() {
  return (
    <section className="py-20 md:py-32 px-2 md:px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10 md:gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-3">
            <Sparkles className="w-3 h-3" /> Auto Publish · BETA
          </span>
          <p className="text-[11px] text-muted-foreground mb-4">
            메인에서 이어진 AutoBlog 상세 설명입니다.
          </p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
            진단에서 끝나지 말고,<br />
            <span className="text-primary">콘텐츠 운영까지 자동화</span>하세요
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-5 leading-relaxed">
            SEO·AEO·GEO 관점에서 필요한 콘텐츠를 찾고,<br />
            SearchTune OS 전용 페이지에 자동으로 발행해<br />
            사이트 운영을 더 쉽게 시작할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/auth?next=/dashboard">
              <Button size="lg" className="rounded-full h-12 px-6 gap-2">
                내 사이트 연결하기 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#how">
              <Button size="lg" variant="outline" className="rounded-full h-12 px-6">
                어떻게 동작하는지 보기
              </Button>
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-transparent blur-2xl rounded-3xl" aria-hidden />
          <div className="relative space-y-3">
            {[
              { title: "AI 검색 최적화 가이드 — 2026 업데이트", tag: "AEO", time: "방금 발행됨" },
              { title: "스타트업이 GEO를 시작할 때 챙겨야 할 5가지", tag: "GEO", time: "오늘 오전" },
              { title: "구조화 데이터로 검색 노출 끌어올리기", tag: "SEO", time: "어제" },
            ].map((p, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-2xl border border-border/50 bg-card shadow-sm hover:shadow-md transition-shadow"
                style={{ transform: `translateX(${i * 8}px)` }}
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {p.tag}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{p.time}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{p.title}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
