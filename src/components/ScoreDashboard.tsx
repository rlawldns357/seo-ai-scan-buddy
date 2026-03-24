import { type DemoResult, type AxisAnalysis, type Improvement } from "@/data/demoResults";
import SemiCircleGauge, { getGradeLabel, getGradeColorClass } from "@/components/SemiCircleGauge";
import {
  Search, Bot, Sparkles,
  AlertTriangle, CheckCircle, Zap, Wrench, Plus, TrendingUp, AlertCircle,
  Lock,
} from "lucide-react";

interface ScoreDashboardProps {
  result: DemoResult;
}

const axisConfig = {
  SEO: { icon: Search, accent: "text-primary" },
  AEO: { icon: Bot, accent: "text-accent" },
  GEO: { icon: Sparkles, accent: "text-score-excellent" },
};

/* ── Sub-signal bar ── */
function SignalBar({ name, score, weight }: { name: string; score: number; weight: number }) {
  const color =
    score >= 75 ? "bg-score-excellent" :
    score >= 60 ? "bg-score-good" :
    score >= 40 ? "bg-score-warning" :
    "bg-score-poor";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-[100px] shrink-0 truncate">{name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-foreground w-6 text-right tabular-nums">{score}</span>
      <span className="text-[9px] text-muted-foreground w-6 text-right">×{weight}</span>
    </div>
  );
}

/* ── Improvement row ── */
function ImprovementRow({ icon, label, item }: { icon: React.ReactNode; label: string; item: Improvement }) {
  return (
    <div className="flex items-start gap-1.5">
      {icon}
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-semibold text-foreground">{label}</span>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{item.label}</p>
      </div>
      <span className="shrink-0 px-1.5 py-0.5 rounded bg-primary/8 text-[10px] font-semibold text-primary border border-primary/15">
        {item.pointRange}
      </span>
    </div>
  );
}

/* ── Main axis block ── */
function AxisBlock({ axis, score, delay }: { axis: AxisAnalysis; score: number; delay: number }) {
  const config = axisConfig[axis.label];
  const Icon = config.icon;
  const grade = getGradeLabel(score);
  const gradeColor = getGradeColorClass(score);

  return (
    <div
      className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-up flex flex-col"
      style={{ animationDelay: `${delay / 1000}s` }}
    >
      {/* Score header */}
      <div className="pt-5 px-5 pb-3 flex flex-col items-center">
        <div className="flex items-center gap-1.5 mb-2">
          <Icon className={`w-4 h-4 ${config.accent}`} />
          <span className="text-sm font-bold text-foreground">{axis.label}</span>
        </div>
        <SemiCircleGauge score={score} size={130} delay={delay} />
        <span className={`text-xs font-semibold ${gradeColor} -mt-1`}>{grade}</span>
        <p className="text-[11px] text-muted-foreground text-center mt-2 leading-relaxed">
          {axis.description}
        </p>
      </div>

      {/* Score cap warning */}
      {axis.scoreCap && (
        <div className="mx-4 mb-2 flex items-start gap-1.5 px-3 py-2 rounded-lg bg-score-warning/8 border border-score-warning/15">
          <Lock className="w-3 h-3 text-score-warning shrink-0 mt-0.5" />
          <span className="text-[10px] text-score-warning leading-relaxed">{axis.scoreCap}</span>
        </div>
      )}

      {/* Sub-signals */}
      <div className="border-t border-border px-4 py-3 space-y-1.5">
        <span className="text-[10px] font-semibold text-foreground flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-muted-foreground" />
          하위 신호
        </span>
        {(axis.subSignals || []).map((s, i) => (
          <SignalBar key={i} name={s.name} score={s.score} weight={s.weight} />
        ))}
      </div>

      {/* Rationale */}
      <div className="border-t border-border px-4 py-3">
        <span className="text-[10px] font-semibold text-foreground flex items-center gap-1 mb-1">
          <AlertCircle className="w-3 h-3 text-muted-foreground" />
          점수 사유
        </span>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{axis.scoreRationale}</p>
      </div>

      {/* Issues & Strengths */}
      <div className="border-t border-border px-4 py-3 space-y-3">
        {/* Issues */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-foreground flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-score-warning" />
            핵심 이슈
          </span>
          <ul className="space-y-0.5 pl-4">
            {(axis.issues || []).map((item, i) => (
              <li key={i} className="text-[11px] text-muted-foreground leading-relaxed list-disc">{item}</li>
            ))}
          </ul>
        </div>

        {/* Strengths */}
        <div className="space-y-1">
          <span className="text-[10px] font-semibold text-foreground flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-score-excellent" />
            잘된 점
          </span>
          <ul className="space-y-0.5 pl-4">
            {(axis.strengths || []).map((item, i) => (
              <li key={i} className="text-[11px] text-muted-foreground leading-relaxed list-disc">{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Improvements */}
      <div className="border-t border-border px-4 py-3 space-y-2.5 flex-1">
        {axis.priorityFix && (
          <ImprovementRow
            icon={<Zap className="w-3 h-3 text-score-warning shrink-0 mt-0.5" />}
            label="가장 먼저 할 개선"
            item={axis.priorityFix}
          />
        )}
        {axis.quickFix && (
          <ImprovementRow
            icon={<Wrench className="w-3 h-3 text-primary shrink-0 mt-0.5" />}
            label="빠르게 할 수 있는 개선"
            item={axis.quickFix}
          />
        )}
        {(axis.additionalFixes || []).map((fix, i) => (
          <ImprovementRow
            key={i}
            icon={<Plus className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />}
            label="추가 개선"
            item={fix}
          />
        ))}
      </div>
    </div>
  );
}

export default function ScoreDashboard({ result }: ScoreDashboardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <AxisBlock axis={result.seoAxis} score={result.seoScore} delay={200} />
      <AxisBlock axis={result.aeoAxis} score={result.aeoScore} delay={400} />
      <AxisBlock axis={result.geoAxis} score={result.geoScore} delay={600} />
    </div>
  );
}
