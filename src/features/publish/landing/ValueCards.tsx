import { Layers, Repeat, LineChart } from "lucide-react";

const CARDS = [
  {
    icon: Layers,
    title: "구조화된 콘텐츠 운영",
    desc: "FAQ·HowTo·Article 스키마, 내부 링크, 엔티티 정의가 포함된 형태로 발행돼 검색·AI 양쪽이 안정적으로 인용합니다.",
  },
  {
    icon: Repeat,
    title: "3개 축 자동 설계",
    desc: "주제만 입력하면 SEO·AEO·GEO 관점이 동시에 반영된 초안이 자동 생성됩니다. 매번 따로 점검할 필요가 없습니다.",
  },
  {
    icon: LineChart,
    title: "발행 → 인용까지 추적",
    desc: "발행한 글의 조회·세션은 물론, 검색 노출·AI 인용 가능성까지 같은 화면에서 이어서 확인할 수 있습니다.",
  },
];

export default function ValueCards() {
  return (
    <section id="values" className="py-16 md:py-24 px-2 md:px-6 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
            왜 <span className="text-primary">AutoBlog</span>인가요?
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed">
            검색·AI 답변 엔진이 인용하기 좋은 형태로 콘텐츠가 운영되는지 직접 챙기지 않아도 됩니다.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {CARDS.map((c, i) => {
            const Icon = c.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl border border-border/50 bg-card hover:shadow-md transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
