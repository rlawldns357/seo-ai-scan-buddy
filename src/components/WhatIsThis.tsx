import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * '이 제품이 뭐하는 도구인지'를 첫 방문자에게 짧게 설명하는 섹션.
 * FAQ 위에 배치하며, FAQ와 동일한 토글(아코디언) 스타일을 사용해
 * 시각적 위계를 가볍게 유지함.
 */
const items = [
  {
    q: "이게 뭐하는 도구예요?",
    a: "URL 한 줄로 Google 검색(SEO), ChatGPT·Perplexity 답변(AEO), 생성형 검색 인용(GEO) — 3개 축의 점수와 약점을 10초 안에 보여주는 무료 진단 도구예요.",
  },
  {
    q: "분석한 다음엔 뭘 할 수 있어요?",
    a: "점수만 주는 게 아니라, 효과 큰 개선 항목을 우선순위로 정렬해 왜·어떻게·예상 효과까지 알려줘요. 회원가입 없이 바로 써볼 수 있어요.",
  },
];

export default function WhatIsThis() {
  return (
    <section className="mt-10 max-w-lg mx-auto text-left">
      <h2 className="text-center mb-3 text-xs font-medium text-muted-foreground/60 uppercase tracking-widest">
        About
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {items.map((it, i) => (
          <AccordionItem
            key={i}
            value={`about-${i}`}
            className="border-b border-border/60 last:border-b-0"
          >
            <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-3.5 text-left">
              {it.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 pt-0">
              {it.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
