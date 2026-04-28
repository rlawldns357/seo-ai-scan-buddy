import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const faqs = [
  {
    q: "이게 뭐하는 도구예요?",
    a: "URL 한 줄만 입력하면 Google 검색(SEO), ChatGPT·Perplexity 답변(AEO), 생성형 검색 인용(GEO) — 3개 축의 점수와 약점을 즉시 진단해 주는 무료 도구예요. 빠른 분석(Lighthouse 스킵)은 보통 약 3초면 끝나고, 전체 분석도 1분 안에 끝나요.",
  },
  {
    q: "분석한 다음엔 뭘 할 수 있어요?",
    a: "점수만 주는 게 아니라, 효과 큰 개선 항목을 우선순위로 정렬해 왜·어떻게·예상 효과까지 알려줘요. 회원가입 없이 바로 써볼 수 있어요.",
  },
  {
    q: "SEO, AEO, GEO가 뭔가요?",
    a: "세 가지 모두 검색에서 발견되기 위한 전략이지만 대상이 다릅니다. SEO(검색엔진 최적화)는 Google·Naver 등 전통 검색엔진 상위 노출, AEO(AI 답변 최적화)는 ChatGPT·Perplexity·뤼튼·클로바X·Gemini 같은 AI가 내 콘텐츠를 답변으로 인용하도록 최적화, GEO(생성형 검색 최적화)는 Google SGE·Naver Cue:·Bing Copilot 등 AI 검색 결과에 출처로 선택되도록 하는 전략입니다.",
  },
  {
    q: "서치튠OS(SearchTune OS)는 어떤 서비스인가요?",
    a: "URL만 입력하면 SEO·AEO·GEO 3개 축 점수를 즉시 분석하는 무료 AI 검색 진단 도구입니다. 서치튠OS(SearchTune OS)는 2026년 출시되어, 항목별 개선 포인트와 우선순위를 자동으로 알려줍니다. Google Lighthouse v12 실측 데이터와 AI 기반 콘텐츠 분석을 결합한 하이브리드 방식을 사용합니다.",
  },
  {
    q: "분석에 비용이 드나요?",
    a: "무료입니다. 현재 베타 서비스로, 별도 회원가입 없이 URL만 입력하면 바로 분석 결과를 확인할 수 있습니다.",
  },
  {
    q: "어떤 항목을 분석하나요?",
    a: "총 15개 이상의 신호를 종합 진단합니다. 메타 태그(title, description, canonical), 구조화 데이터(JSON-LD/Schema.org), 모바일·데스크톱 Lighthouse 성능 점수, 그리고 AI 검색 준비도(인용 가능성, 답변 추출 적합성, 엔티티 명확성 등)를 포함합니다.",
  },
  {
    q: "점수는 어떻게 계산되나요?",
    a: "Google Lighthouse v12 실측 데이터와 AI 기반 콘텐츠 분석을 결합한 하이브리드 방식입니다. SEO·AEO·GEO 각 축은 5~6개의 하위 신호별 가중치를 적용해 0~100점으로 독립 산출됩니다. 분석 엔진은 2주마다 최신 검색 트렌드를 반영하여 자동 업데이트됩니다(마지막 업데이트: 2026년 4월).",
  },
  {
    q: "AEO 점수가 낮으면 어떻게 개선하나요?",
    a: "Q&A 구조의 콘텐츠를 추가하고 핵심 질문에 직접 답변을 포함하세요. FAQ 등 Q&A 구조의 콘텐츠를 추가하고, Schema.org의 FAQPage 마크업을 적용하면 AI가 답변을 추출하기 더 쉬워집니다.",
  },
  {
    q: "GEO 점수가 낮으면 어떻게 개선하나요?",
    a: "AI 크롤러 접근을 허용하고 브랜드 엔티티 정보를 명확히 하세요. Organization 스키마를 적용하고, 데이터·통계·출처를 본문에 포함시키세요. robots.txt에서 GPTBot, OAI-SearchBot 등의 접근을 허용하면 생성형 검색에서의 인용 가능성이 높아집니다.",
  },
  {
    q: "구조화 데이터(JSON-LD)란 무엇인가요?",
    a: "검색엔진과 AI가 페이지 내용을 정확히 이해할 수 있도록 정보를 표현하는 코드입니다. Schema.org 표준에 따라 FAQ, 소프트웨어, 조직 정보 등을 JSON-LD 형식으로 삽입하면 리치 스니펫 표시와 AI 인용 확률이 높아집니다.",
  },
  {
    q: "Lighthouse 점수와 SEO 점수는 다른 건가요?",
    a: "네, 다릅니다. Lighthouse 점수는 Google이 측정하는 성능·접근성·SEO 기술 점수이고, 서치튠OS의 SEO 점수는 크롤링 가능성, 인덱싱 준비도, 스니펫 품질, 구조화 데이터 등을 종합 평가한 자체 점수입니다. 두 점수를 함께 보면 더 정확한 진단이 가능합니다.",
  },
  {
    q: "분석 결과를 받아볼 수 있나요?",
    a: "네, PDF 리포트로 받아보실 수 있습니다. 분석 결과 화면에서 이메일을 등록하시면 맞춤 개선 가이드와 상세 PDF 리포트를 즉시 발송해 드립니다.",
  },
];

interface FaqSectionProps {
  compact?: boolean;
  expanded?: boolean;
}

export default function FaqSection({ compact = false, expanded = false }: FaqSectionProps) {
  const items = compact ? faqs.slice(0, 5) : faqs;

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
