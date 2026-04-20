import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "내 사이트에 바로 올라가는 건가요?",
    a: "아니요. 콘텐츠는 SearchTune OS 안에 생성되는 전용 콘텐츠 페이지에 발행됩니다. 즉 별도 블로그를 직접 운영하지 않아도, 내 사이트와 연결된 형태로 콘텐츠를 쌓고 운영할 수 있습니다.",
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
    <section className="py-16 md:py-24 px-2 md:px-6 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground text-center mb-10">
          자주 묻는 질문
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="border border-border/50 bg-card rounded-2xl px-5 border-b"
            >
              <AccordionTrigger className="text-sm md:text-base font-semibold text-foreground hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
