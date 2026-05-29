import { FileQuestion, Network, ShieldCheck, ArrowRight } from "lucide-react";
import { type DemoResult } from "@/data/demoResults";

interface Props {
  result: DemoResult;
}

const PRIORITY_META = [
  { icon: FileQuestion, tint: "text-accent", bg: "bg-accent/10", borderTint: "border-accent/20" },
  { icon: Network,      tint: "text-primary", bg: "bg-primary/10", borderTint: "border-primary/20" },
  { icon: ShieldCheck,  tint: "text-score-excellent", bg: "bg-score-excellent/10", borderTint: "border-score-excellent/20" },
];

export default function PriorityActions({ result }: Props) {
  // worst-axis first
  const axes = [
    { ax: result.seoAxis, sc: result.seoScore },
    { ax: result.aeoAxis, sc: result.aeoScore },
    { ax: result.geoAxis, sc: result.geoScore },
  ].sort((a, b) => a.sc - b.sc).slice(0, 3);

  return (
    <section className="rounded-3xl bg-card border border-border shadow-card p-4 sm:p-5 animate-fade-up">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-[15px] font-extrabold text-foreground">무엇을 먼저 해야 하나요?</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">현재 진단 결과를 바탕으로 우선순위를 제안드립니다.</p>
        </div>
        <button className="text-[11px] font-semibold text-primary hover:underline inline-flex items-center gap-1 shrink-0">
          모든 추천 보기 <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {axes.map(({ ax }, i) => {
          const meta = PRIORITY_META[i];
          const Icon = meta.icon;
          return (
            <div
              key={ax.label}
              className="rounded-2xl border border-border bg-muted/20 hover:bg-muted/30 hover:border-foreground/20 transition-all px-4 py-3.5 flex flex-col gap-2 group"
            >
              <div className="flex items-center justify-between">
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${meta.bg} ${meta.tint}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${meta.borderTint} ${meta.tint} ${meta.bg}`}>
                  우선순위 {i + 1}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{ax.label}</p>
                <h3 className="text-[14px] font-bold text-foreground leading-tight line-clamp-2">{ax.priorityFix.label}</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">{ax.description}</p>
              </div>
              <button className="mt-auto h-8 rounded-lg border border-border bg-card hover:bg-muted text-[12px] font-semibold text-foreground transition-colors inline-flex items-center justify-center gap-1">
                가이드 보기
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
