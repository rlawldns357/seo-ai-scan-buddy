import { Layers, Repeat, LineChart } from "lucide-react";

const CARDS = [
  {
    icon: Layers,
    title: "글마다 자동으로 구조 잡기",
    desc: "FAQ·HowTo 스키마, 내부 링크, 핵심 정의 문장이 글에 자동으로 들어가서 검색엔진과 AI가 헷갈리지 않습니다.",
  },
  {
    icon: Repeat,
    title: "3개 관점 자동 반영",
    desc: "주제만 입력하면 검색 노출(SEO)·답변 채택(AEO)·AI 인용(GEO) 관점이 하나의 글에 같이 반영됩니다.",
  },
  {
    icon: LineChart,
    title: "발행 후 성과까지 한 화면",
    desc: "조회·세션은 물론, 검색 노출 가능성과 AI 인용 가능성까지 같은 화면에서 이어서 확인할 수 있습니다.",
  },
];

export default function ValueCards() {
  return (
    <section id="values" className="py-12 md:py-24 px-4 md:px-6 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-14 max-w-2xl mx-auto">
          <h2 className="text-[24px] leading-[1.3] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground break-keep">
            왜 <span className="text-primary">AutoBlog</span>인가요?
          </h2>
          <p className="text-[15px] leading-[1.7] md:text-base md:leading-relaxed text-muted-foreground mt-4 break-keep">
            검색엔진과 AI가 헷갈리지 않게 글을 정리하는 작업을, 매번 직접 챙기지 않아도 됩니다.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-3 md:gap-4">
          {CARDS.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={i}
                className="p-5 md:p-6 rounded-2xl border border-border/50 bg-card hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-2 break-keep">{c.title}</h3>
                <p className="text-[14px] leading-[1.65] md:text-sm md:leading-relaxed text-muted-foreground break-keep">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
