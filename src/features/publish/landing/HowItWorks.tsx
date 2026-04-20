import { Link2, Settings, Sparkles, FileText, CheckCircle2 } from "lucide-react";

const STEPS = [
  { icon: Link2, title: "사이트 연결", desc: "사이트 URL과 기본 주제를 입력합니다." },
  { icon: Settings, title: "발행 규칙 설정", desc: "어떤 주제로, 얼마나 자주 글을 올릴지 정합니다." },
  { icon: Sparkles, title: "콘텐츠 자동 생성", desc: "SearchTune OS가 사이트에 맞는 글을 준비합니다." },
  { icon: FileText, title: "전용 페이지에 자동 발행", desc: "글이 SearchTune OS 안의 내 전용 페이지에 차곡차곡 쌓입니다." },
  { icon: CheckCircle2, title: "필요하면 승인 후 발행", desc: "원하면 자동발행 대신 승인 후 발행으로 운영할 수 있습니다." },
];

export default function HowItWorks() {
  return (
    <section id="how" className="py-16 md:py-24 px-2 md:px-6 scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
            설정은 간단하고, <span className="text-primary">운영은 자동</span>입니다
          </h2>
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
