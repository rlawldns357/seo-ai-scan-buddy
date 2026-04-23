import { Link2, Sparkles, FileText, Quote, LineChart } from "lucide-react";

const STEPS = [
  { icon: Link2, title: "블로그 허브 만들기", desc: "사이트 URL과 다룰 주제만 입력하면 전용 블로그 허브가 만들어집니다." },
  { icon: Sparkles, title: "검색·AI 관점 자동 반영", desc: "한 글에 검색 노출·답변 채택·AI 인용 관점이 같이 반영된 초안이 만들어집니다." },
  { icon: FileText, title: "구조까지 갖춰서 발행", desc: "FAQ·HowTo 스키마와 내부 링크가 포함된 형태로 자동 발행됩니다." },
  { icon: Quote, title: "검색·AI가 잘 이해", desc: "Google·Naver는 잘 노출하고, ChatGPT·Perplexity는 출처로 가져갑니다." },
  { icon: LineChart, title: "성과 한 화면에서 확인", desc: "조회·세션과 인용 가능성을 같은 화면에서 이어서 추적합니다." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-12 md:py-24 px-4 md:px-6 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14 max-w-2xl mx-auto">
          <h2 className="text-[24px] leading-[1.3] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground break-keep">
            블로그 허브에서 <span className="text-primary">검색·AI가 이해하는 글</span>까지
          </h2>
          <p className="text-[15px] leading-[1.7] md:text-base md:leading-relaxed text-muted-foreground mt-4 break-keep">
            5단계 흐름이 자동으로 이어집니다. 매번 직접 점검할 필요가 없습니다.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4">
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
                <h3 className="text-[15px] md:text-base font-semibold text-foreground mb-2 break-keep">{s.title}</h3>
                <p className="text-[13px] leading-[1.65] md:text-xs md:leading-relaxed text-muted-foreground break-keep">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
