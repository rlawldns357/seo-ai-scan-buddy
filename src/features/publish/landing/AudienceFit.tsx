import { Check } from "lucide-react";

const ITEMS = [
  "블로그를 따로 구축하기엔 아직 부담스러운 분",
  "사이트에 들어갈 콘텐츠를 빠르게 쌓아보고 싶은 분",
  "무엇을 써야 할지 매번 고민되는 분",
  "운영은 가볍게 시작하고, 반응을 보며 키우고 싶은 분",
];

export default function AudienceFit() {
  return (
    <section id="audience" className="py-12 md:py-24 px-4 md:px-6 bg-muted/30 scroll-mt-20">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[24px] leading-[1.3] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground text-center mb-8 md:mb-10 break-keep">
          이런 분들에게 <span className="text-primary">잘 맞습니다</span>
        </h2>
        <ul className="space-y-2.5 md:space-y-3">
          {ITEMS.map((t, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-4 rounded-2xl border border-border/50 bg-card"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </span>
              <span className="text-[15px] leading-[1.6] md:text-base text-foreground break-keep">{t}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
