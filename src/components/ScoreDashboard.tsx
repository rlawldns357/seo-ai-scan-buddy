import { useEffect, useState } from "react";
import { type DemoResult } from "@/data/demoResults";
import ScoreRing from "@/components/ScoreRing";

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

function BarScore({ label, score, summary, delay }: { label: string; score: number; summary: string; delay: number }) {
  const [animated, setAnimated] = useState(0);
  const status = getScoreLabel(score);

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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${status.colorClass}`}>{status.text}</span>
          <span className={`text-lg font-bold ${status.colorClass}`}>{animated}</span>
        </div>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getBarColor(score)}`}
          style={{ width: `${animated}%` }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{summary}</p>
    </div>
  );
}

export default function ScoreDashboard({ result }: ScoreDashboardProps) {
  return (
    <div className="bg-card rounded-xl shadow-card p-6 sm:p-8 animate-fade-up" style={{ animationDelay: "0.2s" }}>
      {/* Total score - prominent */}
      <div className="flex flex-col items-center mb-8">
        <ScoreRing score={result.overall} label="전체 점수" delay={100} size={140} />
      </div>

      {/* SEO / AEO / GEO bar graphs */}
      <div className="space-y-5">
        <BarScore
          label="SEO"
          score={result.techSeo}
          summary={result.seoAxis.description}
          delay={300}
        />
        <BarScore
          label="AEO"
          score={result.contentClarity}
          summary={result.aeoAxis.description}
          delay={500}
        />
        <BarScore
          label="GEO"
          score={result.aiReadiness}
          summary={result.geoAxis.description}
          delay={700}
        />
      </div>

      <p className="text-xs text-muted-foreground text-center mt-6">
        점수는 핵심 신호를 요약한 데모 값이며, 개선하면 검색/AI 노출에 도움이 될 수 있어요.
      </p>
    </div>
  );
}
