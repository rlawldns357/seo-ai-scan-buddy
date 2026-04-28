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
    <section className="mt-12 max-w-2xl mx-auto text-left">
      <div className="px-1 mb-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
          About
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-2.5">
        {/* What */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Search className="w-3 h-3 text-primary" strokeWidth={2.5} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
              What
            </span>
          </div>
          <h3 className="text-[13px] font-semibold text-foreground mb-1 leading-snug">
            검색·AI가 내 사이트를 어떻게 보는지
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            URL 하나로 SEO·AEO·GEO 3개 축 점수와 약점을 10초 안에.
          </p>
        </div>

        {/* So what */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 text-accent" strokeWidth={2.5} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
              So what
            </span>
          </div>
          <h3 className="text-[13px] font-semibold text-foreground mb-1 leading-snug">
            뭘 고쳐야 하는지 우선순위까지
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            왜·어떻게·예상 효과를 함께. 무료, 회원가입 없음.
          </p>
        </div>
      </div>
    </section>
  );
}
