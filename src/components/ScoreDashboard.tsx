import { type DemoResult, type AxisAnalysis } from "@/data/demoResults";
import SemiCircleGauge, { getGradeLabel, getGradeColorClass } from "@/components/SemiCircleGauge";
import { Search, Bot, MapPin, AlertTriangle, CheckCircle, Wrench, TrendingUp } from "lucide-react";

interface ScoreDashboardProps {
  result: DemoResult;
}

const axisConfig = {
  SEO: { icon: Search, accent: "text-primary" },
  AEO: { icon: Bot, accent: "text-accent" },
  GEO: { icon: MapPin, accent: "text-score-excellent" },
};

function AxisBlock({ axis, score, delay }: { axis: AxisAnalysis; score: number; delay: number }) {
  const safeAxis = {
    ...axis,
    strengths: axis.strengths || [],
    impactEstimates: axis.impactEstimates || [],
    findings: axis.findings || [],
    quickFixes: axis.quickFixes || [],
  };
  const config = axisConfig[axis.label as keyof typeof axisConfig] || axisConfig.SEO;
  const Icon = config.icon;
  const grade = getGradeLabel(score);
  const gradeColor = getGradeColorClass(score);

  return (
    <div
      className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-up flex flex-col"
      style={{ animationDelay: `${delay / 1000}s` }}
    >
      {/* Gauge + label */}
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

      {/* Insights */}
      <div className="border-t border-border px-4 py-3.5 space-y-3 flex-1">
        {/* Issues */}
        <InsightSection
          icon={<AlertTriangle className="w-3 h-3 text-score-warning" />}
          title="핵심 이슈"
          items={axis.findings}
          itemColor="text-muted-foreground"
        />

        {/* Strengths */}
        <InsightSection
          icon={<CheckCircle className="w-3 h-3 text-score-excellent" />}
          title="강점"
          items={axis.strengths}
          itemColor="text-muted-foreground"
        />

        {/* Quick fixes */}
        <InsightSection
          icon={<Wrench className="w-3 h-3 text-primary" />}
          title="권장 개선"
          items={axis.quickFixes}
          itemColor="text-foreground"
        />

        {/* Impact estimates */}
        {axis.impactEstimates.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-score-good" />
              <span className="text-[10px] font-semibold text-foreground">예상 효과</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {axis.impactEstimates.map((est, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-score-good/8 text-[10px] font-medium text-score-good border border-score-good/15"
                >
                  {est.action} → {est.axis} +{est.points}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightSection({
  icon,
  title,
  items,
  itemColor,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  itemColor: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[10px] font-semibold text-foreground">{title}</span>
      </div>
      <ul className="space-y-0.5 pl-4">
        {items.map((item, i) => (
          <li key={i} className={`text-[11px] ${itemColor} leading-relaxed list-disc`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ScoreDashboard({ result }: ScoreDashboardProps) {
  return (
    <div className="space-y-5">
      {/* 3-column gauge grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <AxisBlock axis={result.seoAxis} score={result.techSeo} delay={200} />
        <AxisBlock axis={result.aeoAxis} score={result.contentClarity} delay={400} />
        <AxisBlock axis={result.geoAxis} score={result.aiReadiness} delay={600} />
      </div>
    </div>
  );
}
