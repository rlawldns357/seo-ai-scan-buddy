import { useState } from "react";
import { type DemoResult, type AxisAnalysis, type Improvement } from "@/data/demoResults";
import SemiCircleGauge, { getGradeLabel, getGradeColorClass } from "@/components/SemiCircleGauge";
import {
  Search, Bot, Sparkles,
  AlertTriangle, CheckCircle, Zap, Wrench, Plus, TrendingUp, AlertCircle,
  Lock, ShieldAlert, ChevronDown, ArrowRight,
} from "lucide-react";

interface ScoreDashboardProps {
  result: DemoResult;
}

const axisConfig = {
  SEO: {
    icon: Search,
    accent: "text-primary",
    lossLabel: "검색 노출 손실 가능성",
    lossDesc: "지금 검색 노출 기회를 놓치고 있습니다",
    warnDesc: "검색 노출 효율을 더 높일 수 있습니다",
  },
  AEO: {
    icon: Bot,
    accent: "text-accent",
    lossLabel: "답변 채택 손실 가능성",
    lossDesc: "답변형 검색에서 선택될 가능성이 낮습니다",
    warnDesc: "AI 답변 채택률을 개선할 여지가 있습니다",
  },
  GEO: {
    icon: Sparkles,
    accent: "text-score-excellent",
    lossLabel: "인용 기회 손실 가능성",
    lossDesc: "생성형 검색 엔진이 신뢰 가능한 출처로 인식하기 어려운 상태입니다",
    warnDesc: "생성형 검색에서의 인용 가능성을 높일 수 있습니다",
  },
};

type Severity = "critical" | "warning" | "ok" | "good";

function getSeverity(score: number): Severity {
  if (score < 40) return "critical";
  if (score < 60) return "warning";
  if (score < 75) return "ok";
  return "good";
}

function getSeverityBadge(severity: Severity) {
  switch (severity) {
    case "critical":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-score-poor/12 text-score-poor border border-score-poor/20 animate-pulse">
          <ShieldAlert className="w-3 h-3" />
          즉시 개선 필요
        </span>
      );
    case "warning":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-score-warning/10 text-score-warning border border-score-warning/20">
          <AlertTriangle className="w-3 h-3" />
          개선 권장
        </span>
      );
    case "ok":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-score-good/10 text-score-good border border-score-good/20">
          양호
        </span>
      );
    case "good":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-score-excellent/10 text-score-excellent border border-score-excellent/20">
          <CheckCircle className="w-3 h-3" />
          우수
        </span>
      );
  }
}

/* ── Sub-signal bar (compact) ── */
function SignalBar({ name, score, weight }: { name: string; score: number; weight: number }) {
  const color =
    score >= 75 ? "bg-score-excellent" :
    score >= 60 ? "bg-score-good" :
    score >= 40 ? "bg-score-warning" :
    "bg-score-poor";
  const isCritical = score < 40;
  return (
    <div className={`flex items-center gap-2 py-0.5 ${isCritical ? "px-1.5 -mx-1.5 rounded bg-score-poor/[0.06]" : ""}`}>
      <span className={`text-[11px] w-[100px] shrink-0 truncate ${isCritical ? "font-semibold text-score-poor" : "text-muted-foreground"}`}>{name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[11px] font-semibold w-6 text-right tabular-nums ${isCritical ? "text-score-poor" : "text-foreground"}`}>{score}</span>
      <span className="text-[9px] text-muted-foreground/60 w-5 text-right">×{weight}</span>
    </div>
  );
}

/* ── Improvement row (compact) ── */
function ImprovementRow({ icon, label, item, urgent }: { icon: React.ReactNode; label: string; item: Improvement; urgent?: boolean }) {
  return (
    <div className={`flex items-start gap-2 ${urgent ? "px-2.5 py-2 -mx-1 rounded-lg bg-score-poor/[0.04] border border-score-poor/10" : ""}`}>
      {icon}
      <div className="flex-1 min-w-0">
        <span className={`text-[11px] font-semibold ${urgent ? "text-score-poor" : "text-foreground"}`}>{label}</span>
        <p className="text-[12px] text-muted-foreground leading-relaxed">{item.label}</p>
      </div>
      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[11px] font-bold border ${
        urgent
          ? "bg-score-poor/10 text-score-poor border-score-poor/20"
          : "bg-primary/10 text-primary border-primary/15"
      }`}>
        {item.pointRange}
      </span>
    </div>
  );
}

/* ── Compact summary line for toggle preview ── */
function getToggleSummary(axis: AxisAnalysis, severity: Severity): string {
  if (severity === "critical") {
    return `핵심 이슈 ${axis.issues.length}건 · 우선 개선 시 ${axis.priorityFix?.pointRange || ""} 상승 예상`;
  }
  if (severity === "warning") {
    return `이슈 ${axis.issues.length}건 · 개선 시 ${axis.priorityFix?.pointRange || ""} 상승 가능`;
  }
  return `하위 신호 ${axis.subSignals.length}개 · 잘된 점 ${axis.strengths.length}건`;
}

/* ── Unified axis card ── */
function AxisCard({ axis, score, delay }: { axis: AxisAnalysis; score: number; delay: number }) {
  const [open, setOpen] = useState(false);
  const config = axisConfig[axis.label];
  const Icon = config.icon;
  const severity = getSeverity(score);
  const isCritical = severity === "critical";
  const isWarning = severity === "warning";

  const cardRing = isCritical
    ? "ring-2 ring-score-poor/30"
    : isWarning
    ? "ring-1 ring-score-warning/25"
    : "ring-1 ring-border";

  return (
    <div
      className={`rounded-xl overflow-hidden bg-card ${cardRing} animate-fade-up flex flex-col`}
      style={{ animationDelay: `${delay / 1000}s` }}
    >
      {/* ─ Score summary (fixed height area) ─ */}
      <div className="flex flex-col items-center px-4 pt-5 pb-3 flex-1 min-h-[320px]">
        {/* Badge + label row */}
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${config.accent}`} />
          <span className="text-sm font-bold text-foreground">{axis.label}</span>
        </div>

        {/* Severity badge */}
        <div className="mb-2">{getSeverityBadge(severity)}</div>

        {/* Loss message for critical/warning */}
        {isCritical && (
          <p className="text-[11px] font-medium text-score-poor text-center mb-1 leading-snug">{config.lossDesc}</p>
        )}
        {isWarning && (
          <p className="text-[11px] text-score-warning text-center mb-1 leading-snug">{config.warnDesc}</p>
        )}

        {/* Gauge — compact */}
        <SemiCircleGauge score={score} size={120} delay={delay} />

        {/* Grade */}
        <span className={`text-xs font-semibold ${getGradeColorClass(score)} -mt-0.5`}>
          {getGradeLabel(score)}
        </span>

        {/* Description */}
        <p className="text-[11px] text-muted-foreground text-center mt-1.5 leading-relaxed line-clamp-2">
          {axis.description}
        </p>

        {/* Score cap */}
        {axis.scoreCap && (
          <div className={`w-full mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] leading-snug ${
            isCritical
              ? "bg-score-poor/6 border-score-poor/15 text-score-poor font-medium"
              : "bg-score-warning/6 border-score-warning/12 text-score-warning"
          }`}>
            <Lock className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{axis.scoreCap}</span>
          </div>
        )}
      </div>

      {/* ─ Toggle with summary preview ─ */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 border-t border-border text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-primary">상세 분석</span>
          <p className="text-[10px] text-muted-foreground truncate">
            {getToggleSummary(axis, severity)}
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* ─ Detail sections ─ */}
      {open && (
        <div className="border-t border-border">
          {/* Issues */}
          <div className={`px-4 py-3 space-y-1.5 ${isCritical ? "bg-score-poor/[0.02]" : ""}`}>
            <span className={`text-[11px] font-bold flex items-center gap-1 ${
              isCritical ? "text-score-poor" : "text-foreground"
            }`}>
              <AlertCircle className={`w-3.5 h-3.5 ${isCritical ? "text-score-poor" : "text-score-warning"}`} />
              핵심 이슈
              {isCritical && <span className="text-[9px] ml-0.5 text-score-poor/60">심각도 순</span>}
            </span>
            <ul className="space-y-1.5">
              {(axis.issues || []).map((item, i) => (
                <li key={i} className={`flex items-start gap-1.5 text-[12px] leading-relaxed ${
                  isCritical && i === 0 ? "font-semibold text-score-poor" :
                  isCritical ? "font-medium text-foreground" :
                  "text-muted-foreground"
                }`}>
                  <AlertTriangle className={`w-3 h-3 shrink-0 mt-0.5 ${isCritical ? "text-score-poor" : "text-score-warning"}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Rationale */}
          <div className="border-t border-border px-4 py-3">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3 text-muted-foreground" />
              점수 사유
            </span>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{axis.scoreRationale}</p>
          </div>

          {/* Sub-signals */}
          <div className="border-t border-border px-4 py-3 space-y-1">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              하위 신호
            </span>
            {(axis.subSignals || []).map((s, i) => (
              <SignalBar key={i} name={s.name} score={s.score} weight={s.weight} />
            ))}
          </div>

          {/* Strengths */}
          <div className="border-t border-border px-4 py-3 space-y-1">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-score-excellent" />
              잘된 점
            </span>
            <ul className="space-y-0.5 pl-4">
              {(axis.strengths || []).map((item, i) => (
                <li key={i} className="text-[12px] text-muted-foreground leading-relaxed list-disc">{item}</li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="border-t border-border px-4 py-3 space-y-2">
            <span className="text-[11px] font-bold text-foreground">개선 과제</span>
            {axis.priorityFix && (
              <ImprovementRow
                icon={<Zap className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isCritical ? "text-score-poor" : "text-score-warning"}`} />}
                label="🔥 가장 먼저"
                item={axis.priorityFix}
                urgent={isCritical}
              />
            )}
            {axis.quickFix && (
              <ImprovementRow
                icon={<Wrench className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />}
                label="⚡ 빠른 개선"
                item={axis.quickFix}
              />
            )}
            {(axis.additionalFixes || []).map((fix, i) => (
              <ImprovementRow
                key={i}
                icon={<Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                label="추가"
                item={fix}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Inline CTA ── */
function InlineCTA() {
  return (
    <div className="rounded-xl bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border border-primary/15 p-6 sm:p-8 text-center space-y-4 animate-fade-up" style={{ animationDelay: "0.5s" }}>
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-foreground">
          놓치고 있는 검색 기회, 확인하셨나요?
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
          위 분석은 무료 요약입니다. 더 구체적인 개선 우선순위와 실행 가이드를 받아보세요.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
          우선 개선 과제 받기
          <ArrowRight className="w-4 h-4" />
        </button>
        <button className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-lg border border-primary/20 text-primary font-medium text-sm hover:bg-primary/5 transition-colors">
          지금 가장 큰 문제 진단 받기
        </button>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function ScoreDashboard({ result }: ScoreDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 items-start">
        <AxisCard axis={result.seoAxis} score={result.seoScore} delay={200} />
        <AxisCard axis={result.aeoAxis} score={result.aeoScore} delay={400} />
        <AxisCard axis={result.geoAxis} score={result.geoScore} delay={600} />
      </div>
      <InlineCTA />
    </div>
  );
}
