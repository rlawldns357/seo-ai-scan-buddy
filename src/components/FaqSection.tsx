import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const faqs = [
  {
    q: "SEO, AEO, GEO가 뭔가요?",
    a: "SEO(검색엔진 최적화)는 Google·Naver 등에서 상위 노출을 위한 기술이고, AEO(AI 답변 최적화)는 ChatGPT·Perplexity·뤼튼·클로바X·Gemini 같은 AI가 내 콘텐츠를 답변으로 인용하도록 최적화하는 것, GEO(생성형 검색 최적화)는 Google SGE·Naver Cue:·Bing Copilot 등 AI 검색 결과에 출처로 선택되도록 하는 전략입니다.",
  },
  {
    q: "서치튠OS(SearchTune OS)는 어떤 서비스인가요?",
    a: "서치튠OS(SearchTune OS)는 URL만 입력하면 SEO·AEO·GEO 3개 축의 점수를 즉시 분석하고, 항목별 개선 포인트와 우선순위를 알려주는 무료 AI 검색 진단 도구입니다.",
  },
  {
    q: "분석에 비용이 드나요?",
    a: "현재 베타 서비스로 무료 이용할 수 있습니다. 별도 회원가입 없이 URL만 입력하면 바로 분석 결과를 확인할 수 있습니다.",
  },
  {
    q: "어떤 항목을 분석하나요?",
    a: "메타 태그(title, description, canonical), 구조화 데이터(JSON-LD/Schema.org), 모바일·데스크톱 Lighthouse 성능 점수, 그리고 AI 검색 준비도(인용 가능성, 답변 추출 적합성, 엔티티 명확성 등)를 종합적으로 진단합니다.",
  },
  {
    q: "점수는 어떻게 계산되나요?",
    a: "Google PageSpeed Insights(Lighthouse) 실측 데이터와 AI 기반 콘텐츠 분석을 결합한 하이브리드 방식으로 SEO·AEO·GEO 각 축의 점수를 독립적으로 산출합니다. 각 축은 5~6개의 하위 신호별 가중치를 적용해 0~100점으로 계산됩니다.",
  },
  {
    q: "AEO 점수가 낮으면 어떻게 개선하나요?",
    a: "FAQ 등 Q&A 구조의 콘텐츠를 추가하고, 핵심 질문에 대한 명확한 직접 답변을 본문에 포함시키세요. Schema.org의 FAQPage 마크업을 적용하면 AI가 답변을 추출하기 더 쉬워집니다.",
  },
  {
    q: "GEO 점수가 낮으면 어떻게 개선하나요?",
    a: "브랜드·조직 정보를 명확히 하고(Organization 스키마), 데이터·통계·출처를 본문에 포함시키세요. AI 크롤러(GPTBot, OAI-SearchBot 등)의 접근을 robots.txt에서 허용하면 생성형 검색에서의 인용 가능성이 높아집니다.",
  },
  {
    q: "구조화 데이터(JSON-LD)란 무엇인가요?",
    a: "구조화 데이터는 검색엔진과 AI가 페이지 내용을 정확히 이해할 수 있도록 Schema.org 표준에 따라 정보를 표현하는 코드입니다. FAQ, 소프트웨어, 조직 정보 등을 JSON-LD 형식으로 삽입하면 리치 스니펫 표시와 AI 인용 확률이 높아집니다.",
  },
  {
    q: "Lighthouse 점수와 SEO 점수는 다른 건가요?",
    a: "네, 다릅니다. Lighthouse 점수는 Google이 측정하는 성능·접근성·SEO 기술 점수이고, 서치튠OS(SearchTune OS)의 SEO 점수는 크롤링 가능성, 인덱싱 준비도, 스니펫 품질, 구조화 데이터 등을 종합적으로 평가한 자체 점수입니다. 두 점수를 함께 보면 더 정확한 진단이 가능합니다.",
  },
  {
    q: "분석 결과를 받아볼 수 있나요?",
    a: "분석 결과 화면에서 이메일을 등록하시면 맞춤 개선 가이드와 상세 리포트를 받아보실 수 있습니다.",
  },
];

interface FaqSectionProps {
  compact?: boolean;
  expanded?: boolean;
}

export default function FaqSection({ compact = false, expanded = false }: FaqSectionProps) {
  const items = compact ? faqs.slice(0, 3) : faqs;

  return (
    <section className={compact ? "" : "mt-10 mb-6"}>
      {!compact && (
        <h2 className={`text-center mb-4 tracking-tight ${expanded ? "text-sm font-bold text-foreground" : "text-xs font-medium text-muted-foreground/60 uppercase tracking-widest"}`}>
          자주 묻는 질문
        </h2>
      )}
      {expanded ? (
        <Accordion type="multiple" defaultValue={items.map((_, i) => `faq-${i}`)} className="w-full space-y-1.5">
          {items.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border-0 border-b border-border/50 px-1"
            >
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:text-foreground hover:no-underline py-2.5">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-muted-foreground/70 leading-relaxed pb-2.5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
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
      )}
    </section>
  );
}
