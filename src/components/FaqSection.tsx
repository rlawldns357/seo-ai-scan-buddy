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
    q: "점수는 어떻게 계산되나요?",
    a: "Google Lighthouse 실측 데이터와 자체 AI 준비도 분석을 결합하여 SEO·AEO·GEO 각 축의 점수를 산출합니다. 각 항목별 가중치를 적용해 종합 등급을 부여합니다.",
  },
  {
    q: "점수가 낮으면 어떻게 개선하나요?",
    a: "분석 결과에서 항목별 개선 포인트를 확인할 수 있고, 이메일을 등록하시면 맞춤 개선 가이드를 받아보실 수 있습니다.",
  },
];

interface FaqSectionProps {
  compact?: boolean;
}

export default function FaqSection({ compact = false }: FaqSectionProps) {
  const items = compact ? faqs.slice(0, 3) : faqs;

  return (
    <section className={compact ? "" : "mt-8"}>
      {!compact && (
        <h2 className="text-xs font-medium text-muted-foreground/60 text-center mb-4 uppercase tracking-widest">
          자주 묻는 질문
        </h2>
      )}
      <Accordion type="single" collapsible className="w-full space-y-1.5">
        {items.map((faq, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            className="border-0 border-b border-border/50 px-1"
          >
            <AccordionTrigger className="text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline py-2.5">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-[11px] text-muted-foreground/70 leading-relaxed pb-2.5">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
