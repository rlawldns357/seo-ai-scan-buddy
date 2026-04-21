import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "내 사이트에 바로 올라가는 건가요?",
    a: "아니요. 콘텐츠는 SearchTune OS 안에 만들어진 내 전용 콘텐츠 페이지에 발행됩니다. 별도 블로그를 직접 운영하지 않아도, 내 브랜드 전용 페이지에 콘텐츠를 쌓고 운영할 수 있습니다.",
  },
  {
    q: "완전 자동으로만 운영해야 하나요?",
    a: "아니요. 초안만 생성하거나, 승인 후 발행하거나, 자동 발행으로 운영할 수 있습니다.",
  },
  {
    q: "어떤 글이 발행되나요?",
    a: "내 사이트 주제와 설정한 운영 규칙에 맞는 설명형, FAQ형, 가이드형 콘텐츠가 자동으로 생성됩니다.",
  },
];

export default function LandingFaq() {
  return (
    <section id="faq" className="py-12 md:py-24 px-4 md:px-6 bg-muted/30 scroll-mt-20">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[24px] leading-[1.3] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground text-center mb-8 md:mb-10 break-keep">
          자주 묻는 질문
        </h2>
        <Accordion type="single" collapsible className="space-y-2.5 md:space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-border/50 bg-card rounded-2xl px-5 border-b"
            >
              <AccordionTrigger className="text-[15px] md:text-base font-semibold text-foreground hover:no-underline text-left break-keep">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] leading-[1.7] md:text-sm md:leading-relaxed text-muted-foreground break-keep">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
