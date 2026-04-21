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
    <section className="py-12 md:py-24 px-4 md:px-6 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-[24px] leading-[1.3] md:text-4xl md:leading-tight font-bold tracking-tight text-foreground break-keep">
            검색엔진과 AI가{" "}
            <span className="text-primary">더 잘 이해하는 글</span>로 발행됩니다
          </h2>
          <p className="text-[15px] leading-[1.7] md:text-base md:leading-relaxed text-muted-foreground mt-5 break-keep">
            글 1개를 쓰면 Google 검색 노출, 답변 박스 채택, ChatGPT·Perplexity 인용까지
            한 번에 겨냥하도록 자동으로 정리됩니다.
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
