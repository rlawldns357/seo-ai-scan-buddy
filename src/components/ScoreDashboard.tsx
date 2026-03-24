import { useEffect, useState } from "react";
import { type DemoResult, type AxisAnalysis } from "@/data/demoResults";
import { Search, Bot, MapPin, AlertTriangle, CheckCircle, Wrench } from "lucide-react";

interface ScoreDashboardProps {
  result: DemoResult;
}

const getScoreLabel = (score: number) => {
  if (score >= 75) return { text: "양호", colorClass: "text-score-excellent" };
  if (score >= 60) return { text: "보통", colorClass: "text-score-good" };
  if (score >= 40) return { text: "개선 필요", colorClass: "text-score-warning" };
  return { text: "주의", colorClass: "text-score-poor" };
};

const getBarColor = (score: number) => {
  if (score >= 75) return "bg-score-excellent";
  if (score >= 60) return "bg-score-good";
  if (score >= 40) return "bg-score-warning";
  return "bg-score-poor";
};

const getBarTrackColor = (score: number) => {
  if (score >= 75) return "bg-score-excellent/10";
  if (score >= 60) return "bg-score-good/10";
  if (score >= 40) return "bg-score-warning/10";
  return "bg-score-poor/10";
};

const axisConfig = {
  SEO: { icon: Search, accent: "text-primary", border: "border-primary/10" },
  AEO: { icon: Bot, accent: "text-accent", border: "border-accent/10" },
  GEO: { icon: MapPin, accent: "text-score-excellent", border: "border-score-excellent/10" },
};

function AnimatedBar({ score, delay }: { score: number; delay: number }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const interval = setInterval(() => {
        current += 2;
        if (current >= score) {
          setAnimated(score);
          clearInterval(interval);
        } else {
          setAnimated(current);
        }
      }, 15);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  return { animated };
}

function AxisBlock({ axis, score, delay }: { axis: AxisAnalysis; score: number; delay: number }) {
  const { animated } = AnimatedBar({ score, delay });
  const status = getScoreLabel(score);
  const config = axisConfig[axis.label as keyof typeof axisConfig] || axisConfig.SEO;
  const Icon = config.icon;

  return (
    <div className="bg-card rounded-xl shadow-card overflow-hidden animate-fade-up" style={{ animationDelay: `${delay / 1000}s` }}>
      {/* Score bar header */}
      <div className="p-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.accent}`} />
            <span className="text-sm font-bold text-foreground">{axis.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${status.colorClass}`}>{status.text}</span>
            <span className={`text-xl font-bold tabular-nums ${status.colorClass}`}>{animated}</span>
          </div>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${getBarTrackColor(score)}`}>
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(score)}`}
            style={{ width: `${animated}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">{axis.description}</p>
      </div>

      {/* Insights */}
      <div className="border-t border-border px-5 py-4 space-y-3">
        {/* Findings */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-score-warning" />
            <span className="text-[11px] font-semibold text-foreground">진단 결과</span>
          </div>
          <ul className="space-y-1 pl-5">
            {axis.findings.map((item, i) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed list-disc">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Quick fixes */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-foreground">바로 고칠 것</span>
          </div>
          <ul className="space-y-1 pl-5">
            {axis.quickFixes.map((item, i) => (
              <li key={i} className="text-xs text-foreground leading-relaxed list-disc marker:text-primary">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ScoreDashboard({ result }: ScoreDashboardProps) {
  const overallStatus = getScoreLabel(result.overall);

  return (
    <div className="space-y-4">
      {/* Compact total score summary */}
      <div className="flex items-center justify-center gap-2 animate-fade-up" style={{ animationDelay: "0.15s" }}>
        <span className={`text-lg font-bold tabular-nums ${overallStatus.colorClass}`}>
          총점 {result.overall}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className={`text-sm font-medium ${overallStatus.colorClass}`}>{overallStatus.text}</span>
      </div>

      {/* SEO / AEO / GEO blocks */}
      <div className="grid gap-4">
        <AxisBlock axis={result.seoAxis} score={result.techSeo} delay={200} />
        <AxisBlock axis={result.aeoAxis} score={result.contentClarity} delay={400} />
        <AxisBlock axis={result.geoAxis} score={result.aiReadiness} delay={600} />
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        점수는 핵심 신호를 요약한 데모 값이며, 개선하면 검색/AI 노출에 도움이 될 수 있어요.
      </p>
    </div>
  );
}
