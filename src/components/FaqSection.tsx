import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "SEO, AEO, GEO가 뭔가요?",
    a: "SEO(검색엔진 최적화)는 Google·Naver 등에서 상위 노출을 위한 기술이고, AEO(AI 답변 최적화)는 ChatGPT·Perplexity 같은 AI가 내 콘텐츠를 인용하도록 최적화하는 것, GEO(생성형 검색 최적화)는 Google SGE 등 AI 검색 결과에 출처로 선택되도록 하는 전략입니다.",
  },
  {
    q: "분석에 비용이 드나요?",
    a: "현재 무료 베타 서비스로, 비용 없이 무제한 분석할 수 있습니다.",
  },
  {
    q: "어떤 항목을 분석하나요?",
    a: "메타 태그, 구조화 데이터, 모바일·데스크톱 Lighthouse 점수, AI 검색 준비도(Schema.org, 인용 가능성 등)를 종합적으로 진단합니다.",
  },
  {
    q: "서브페이지도 분석할 수 있나요?",
    a: "네, 가능합니다. 다만 홈페이지(루트 URL)와 서브페이지 중 어떤 것을 분석할지 선택할 수 있습니다.",
  },
  {
    q: "결과 리포트를 저장할 수 있나요?",
    a: "이메일을 등록하시면 분석 결과 요약과 개선 가이드를 받아보실 수 있습니다.",
  },
];

interface FaqSectionProps {
  compact?: boolean;
}

export default function FaqSection({ compact = false }: FaqSectionProps) {
  const items = compact ? faqs.slice(0, 3) : faqs;

  return (
    <section className={compact ? "" : "mt-12"}>
      {!compact && (
        <h2 className="text-lg font-bold text-foreground text-center mb-5">
          자주 묻는 질문
        </h2>
      )}
      <Accordion type="single" collapsible className="w-full space-y-2">
        {items.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="border border-border rounded-xl px-4 bg-card/60 backdrop-blur-sm"
          >
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-3">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed pb-3">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
