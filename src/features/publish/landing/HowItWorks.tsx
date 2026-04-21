import { Link2, Sparkles, FileText, Quote, LineChart } from "lucide-react";

const STEPS = [
  { icon: Link2, title: "페이지 만들기", desc: "사이트 URL과 주제만 입력하면 전용 콘텐츠 페이지가 만들어집니다." },
  { icon: Sparkles, title: "SEO·AEO·GEO 자동 설계", desc: "3개 축이 동시에 반영된 초안이 자동 생성됩니다." },
  { icon: FileText, title: "구조화된 형태로 발행", desc: "FAQ·HowTo 스키마와 내부 링크가 포함된 형태로 발행됩니다." },
  { icon: Quote, title: "검색·AI 인용 가능성 확보", desc: "Google·Naver 노출과 ChatGPT·Perplexity 인용에 동시에 대응합니다." },
  { icon: LineChart, title: "성과 이어보기", desc: "조회·세션과 인용 가능성을 같은 화면에서 추적합니다." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-16 md:py-24 px-2 md:px-6 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
            페이지 만들기에서 <span className="text-primary">검색·AI 인용</span>까지
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-4 leading-relaxed">
            5단계 흐름이 자동으로 이어집니다. 매번 직접 점검할 필요가 없습니다.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="relative p-5 rounded-2xl border border-border/50 bg-card hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-bold text-primary">STEP {i + 1}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
