import { Zap, Repeat, FlaskConical } from "lucide-react";

const CARDS = [
  { icon: Zap, title: "빠른 시작", desc: "복잡한 세팅 없이 콘텐츠 운영을 시작할 수 있습니다." },
  { icon: Repeat, title: "자동 발행", desc: "주제와 규칙만 정하면 글이 자동으로 쌓입니다." },
  { icon: FlaskConical, title: "가벼운 실험", desc: "큰 구축 없이 먼저 운영해보고 반응을 확인할 수 있습니다." },
];

export default function ValueCards() {
  return (
    <section id="values" className="py-16 md:py-24 px-2 md:px-6 scroll-mt-20">
      <div className="max-w-5xl mx-auto">
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
