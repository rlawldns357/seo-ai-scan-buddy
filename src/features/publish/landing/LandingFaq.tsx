import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { HelpCircle, MessageCircle, ArrowRight } from "lucide-react";
import BetaSignupModal from "@/components/BetaSignupModal";

const FAQS = [
  {
    q: "내 사이트에 바로 올라가는 건가요?",
    a: "아니요. 콘텐츠는 SearchTune OS 안에 만들어진 전용 블로그 허브에 발행됩니다. 별도 블로그를 직접 운영하지 않아도, 내 브랜드 전용 페이지에 콘텐츠를 쌓고 운영할 수 있습니다.",
  },
  {
    q: "완전 자동으로만 운영해야 하나요?",
    a: "아니요. 초안만 생성하거나, 승인 후 발행하거나, 자동 발행으로 운영할 수 있습니다. 요일·시간·하루 발행 편수까지 직접 설정할 수 있어요.",
  },
  {
    q: "어떤 글이 발행되나요?",
    a: "내 사이트 주제와 설정한 운영 규칙에 맞는 설명형, FAQ형, 가이드형 콘텐츠가 자동으로 생성됩니다. SEO·AEO·GEO 3축 관점이 모두 반영된 구조로 발행돼요.",
  },
  {
    q: "콘텐츠 품질은 어떻게 보장되나요?",
    a: "발행 전 SEO/AEO/GEO 3축 점수가 자동으로 매겨지고, 마음에 안 드는 글은 재생성 버튼으로 다시 만들 수 있습니다. 검수 후 발행 모드를 쓰면 모든 글을 직접 확인하고 올릴 수 있어요.",
  },
  {
    q: "언제든 그만둘 수 있나요?",
    a: "네. 자동 발행은 토글 한 번으로 즉시 정지할 수 있고, 이미 발행된 콘텐츠는 그대로 유지됩니다. 구독 해지 후에도 블로그 허브 URL과 콘텐츠는 일정 기간 보존돼요.",
  },
];

export default function LandingFaq() {
  const [betaOpen, setBetaOpen] = useState(false);
  return (
    <section
      id="faq"
      className="relative py-16 md:py-28 px-4 md:px-6 bg-gradient-to-b from-muted/30 via-background to-muted/20 scroll-mt-20 overflow-hidden"
    >
      {/* subtle background accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative max-w-3xl mx-auto">
        <div className="flex flex-col items-center text-center mb-10 md:mb-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 backdrop-blur px-3 py-1 text-[11px] md:text-xs font-medium text-muted-foreground mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-primary" />
            FAQ
          </span>
          <h2 className="text-[26px] leading-[1.25] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground break-keep">
            궁금한 것들,{" "}
            <span className="text-primary">미리 답해드릴게요</span>
          </h2>
          <p className="text-[14px] md:text-base text-muted-foreground mt-3 max-w-xl break-keep">
            가장 많이 받는 질문 5가지를 모았어요. 더 궁금한 점은 언제든 문의 주세요.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue="item-0"
          className="space-y-2.5 md:space-y-3"
        >
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="group border border-border/50 bg-card/90 backdrop-blur rounded-2xl px-5 border-b transition-all hover:border-primary/40 hover:shadow-sm data-[state=open]:border-primary/60 data-[state=open]:shadow-md data-[state=open]:bg-card"
            >
              <AccordionTrigger className="text-[15px] md:text-base font-semibold text-foreground hover:no-underline text-left break-keep">
                <span className="flex items-start gap-3">
                  <span className="shrink-0 mt-0.5 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{f.q}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-[14px] leading-[1.75] md:text-sm md:leading-relaxed text-muted-foreground break-keep pl-9">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* closing impact card — bridges to FinalCta */}
        <div className="mt-10 md:mt-14 rounded-2xl border border-border/50 bg-card/90 backdrop-blur p-5 md:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left">
          <div className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-[15px] md:text-base font-semibold text-foreground break-keep">
              여기에 없는 질문이 있으세요?
            </p>
            <p className="text-[13px] md:text-sm text-muted-foreground mt-0.5 break-keep">
              팀에게 직접 물어보거나, 바로 페이지를 만들어 보세요.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              size="sm"
              onClick={() => setBetaOpen(true)}
              className="rounded-full h-10 px-5 gap-1.5 w-full sm:w-auto"
            >
              베타 신청하기 <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <BetaSignupModal open={betaOpen} onClose={() => setBetaOpen(false)} />
    </section>
  );
}
