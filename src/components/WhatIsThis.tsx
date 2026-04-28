import { Search, Sparkles } from "lucide-react";

/**
 * '이 제품이 뭐하는 제품인지'를 첫 방문자에게 30초 안에 설명하는 섹션.
 * FAQ 위에 배치해 "왜 분석해야 하지?" → "이 도구가 무엇을 해주지?" 흐름을 잡음.
 *
 * 2가지 핵심 질문에 답함:
 *  1) 이게 뭐하는 도구야? (What)
 *  2) 분석한 다음엔 뭘 할 수 있어? (So what)
 */
export default function WhatIsThis() {
  return (
    <section className="mt-16 max-w-2xl mx-auto text-left">
      <div className="flex items-baseline justify-between px-1 mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          About
        </h2>
        <span className="text-[10px] text-muted-foreground/70">서치튠OS는 어떤 도구인가요?</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {/* What */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Search className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
              What
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-2 leading-snug tracking-tight">
            내 사이트가 검색·AI에게<br />어떻게 보이는지 진단해요
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            URL 한 줄로 Google 검색(SEO), ChatGPT·Perplexity 답변(AEO),
            생성형 검색 인용(GEO) — <span className="font-semibold text-foreground">3개 축의 점수와 약점</span>을
            10초 만에 보여줘요.
          </p>
        </div>

        {/* So what */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent">
              So what
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mb-2 leading-snug tracking-tight">
            뭘 고쳐야 하는지<br />우선순위까지 알려줘요
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            점수만 주는 도구가 아니에요. 가장 효과 큰 개선 항목을{" "}
            <span className="font-semibold text-foreground">우선순위로 정렬</span>해
            왜·어떻게·예상 효과까지 함께 알려줘요. 무료, 회원가입 없음.
          </p>
        </div>
      </div>
    </section>
  );
}
