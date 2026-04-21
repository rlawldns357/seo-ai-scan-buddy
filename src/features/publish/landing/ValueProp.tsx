import { Search, MessageSquareQuote, Quote } from "lucide-react";

const AXES = [
  {
    icon: Search,
    tag: "SEO",
    title: "검색엔진이 잘 읽는 글",
    desc: "Google·Naver가 무슨 글인지 바로 이해하도록 제목·메타·헤딩·내부 링크 구조를 자동으로 잡아드립니다.",
  },
  {
    icon: MessageSquareQuote,
    tag: "AEO",
    title: "답변 박스에 뽑히는 글",
    desc: "검색 답변 박스와 음성 답변에 그대로 인용되도록 질문–답변 형식과 핵심 정의 문장을 함께 만들어 둡니다.",
  },
  {
    icon: Quote,
    tag: "GEO",
    title: "AI가 출처로 가져가는 글",
    desc: "ChatGPT·Perplexity·Gemini가 답변할 때 우리 브랜드를 출처로 가져갈 수 있게 근거 문장과 구조화 데이터를 더해줍니다.",
  },
];

export default function ValueProp() {
  return (
    <section className="py-16 md:py-24 px-2 md:px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
            단순 블로그 툴이 아닙니다.<br />
            <span className="text-primary">검색·AI 인용 인프라</span>입니다
          </h2>
          <p className="text-sm md:text-base text-muted-foreground mt-5 leading-relaxed">
            AutoBlog는 SEO·AEO·GEO 3개 축을 동시에 겨냥해 글을 자동 설계하고,
            구조화된 형태로 발행해 검색엔진과 AI 답변 엔진이 모두 인용할 수 있게 만듭니다.
          </p>
        </div>

        <div className="mt-10 grid md:grid-cols-3 gap-4">
          {AXES.map(({ icon: Icon, tag, title, desc }) => (
            <div
              key={tag}
              className="p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[11px] font-bold text-primary tracking-wider">{tag}</span>
              </div>
              <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <p className="text-xs md:text-sm text-muted-foreground mt-8 text-center max-w-2xl mx-auto leading-relaxed">
          복잡한 CMS 없이도 위 3개 축이 자동 반영된 콘텐츠가 내 전용 페이지에 차곡차곡 쌓입니다.
        </p>
      </div>
    </section>
  );
}
