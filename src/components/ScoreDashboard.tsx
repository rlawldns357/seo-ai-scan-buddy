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

/* ── Severity ── */
type Severity = "critical" | "warning" | "ok" | "good";

function getSeverity(score: number): Severity {
  if (score < 40) return "critical";
  if (score < 60) return "warning";
  if (score < 75) return "ok";
  return "good";
}

/* ── Summary card at top ── */
function ScoreSummaryCard({
  axis,
  score,
  delay,
}: {
  axis: AxisAnalysis;
  score: number;
  delay: number;
}) {
  const config = axisConfig[axis.label];
  const Icon = config.icon;
  const severity = getSeverity(score);
  const isCritical = severity === "critical";
  const isWarning = severity === "warning";

  const cardBorder = isCritical
    ? "ring-2 ring-score-poor/40 animate-pulse-glow"
    : isWarning
    ? "ring-1 ring-score-warning/30"
    : "ring-1 ring-border";

  const cardBg = isCritical
    ? "bg-gradient-to-b from-score-poor/[0.05] to-card"
    : isWarning
    ? "bg-gradient-to-b from-score-warning/[0.03] to-card"
    : "bg-card";

  return (
    <div
      className={`rounded-xl overflow-hidden ${cardBorder} ${cardBg} animate-fade-up flex flex-col items-center p-5 sm:p-6`}
      style={{ animationDelay: `${delay / 1000}s` }}
    >
      {/* Danger zone — shown first for low scores */}
      {isCritical && (
        <div className="w-full mb-4 px-3.5 py-3 rounded-lg bg-score-poor/8 border border-score-poor/20 text-center space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-score-poor/15 text-score-poor border border-score-poor/25 animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            즉시 개선 필요
          </span>
          <p className="text-sm font-semibold text-score-poor">{config.lossLabel}</p>
          <p className="text-xs text-score-poor/80">{config.lossDesc}</p>
        </div>
      )}
      {isWarning && (
        <div className="w-full mb-4 px-3.5 py-2.5 rounded-lg bg-score-warning/8 border border-score-warning/15 text-center space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-score-warning/10 text-score-warning border border-score-warning/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            개선 권장
          </span>
          <p className="text-xs text-score-warning/80">{config.warnDesc}</p>
        </div>
      )}

      {/* Axis label */}
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-5 h-5 ${config.accent}`} />
        <span className="text-base font-bold text-foreground">{axis.label}</span>
      </div>

      {/* Gauge */}
      <SemiCircleGauge score={score} size={140} delay={delay} />

      {/* Grade */}
      <span className={`text-sm font-semibold ${getGradeColorClass(score)} -mt-1`}>
        {getGradeLabel(score)}
      </span>

      {/* Description */}
      <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
        {axis.description}
      </p>

      {/* Score cap */}
      {axis.scoreCap && (
        <div className={`w-full mt-3 flex items-start gap-2 px-3 py-2 rounded-lg border ${
          isCritical
            ? "bg-score-poor/8 border-score-poor/20"
            : "bg-score-warning/8 border-score-warning/15"
        }`}>
          <Lock className={`w-4 h-4 shrink-0 mt-0.5 ${isCritical ? "text-score-poor" : "text-score-warning"}`} />
          <span className={`text-xs leading-relaxed ${isCritical ? "text-score-poor font-semibold" : "text-score-warning"}`}>
            {axis.scoreCap}
          </span>
        </div>
      )}
    </div>
  );
}

/* ── Sub-signal bar ── */
function SignalBar({ name, score, weight }: { name: string; score: number; weight: number }) {
  const color =
    score >= 75 ? "bg-score-excellent" :
    score >= 60 ? "bg-score-good" :
    score >= 40 ? "bg-score-warning" :
    "bg-score-poor";
  const isCritical = score < 40;
  return (
    <div className={`flex items-center gap-2.5 py-1 ${isCritical ? "px-2 -mx-2 rounded-md bg-score-poor/[0.06]" : ""}`}>
      <span className={`text-xs w-[110px] shrink-0 truncate ${isCritical ? "font-semibold text-score-poor" : "text-muted-foreground"}`}>{name}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold w-7 text-right tabular-nums ${isCritical ? "text-score-poor" : "text-foreground"}`}>{score}</span>
      <span className="text-[10px] text-muted-foreground w-7 text-right">×{weight}</span>
    </div>
  );
}

/* ── Issue row with loss framing ── */
function IssueRow({ text, severity, index }: { text: string; severity: Severity; index: number }) {
  const isCritical = severity === "critical";
  const isFirst = index === 0;
  return (
    <li className={`flex items-start gap-2 text-[13px] leading-relaxed ${
      isCritical && isFirst
        ? "font-semibold text-score-poor"
        : isCritical
        ? "font-medium text-foreground"
        : "text-muted-foreground"
    }`}>
      <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
        isCritical ? "text-score-poor" : "text-score-warning"
      }`} />
      <span>{text}</span>
    </li>
  );
}

/* ── Improvement row ── */
function ImprovementRow({ icon, label, item, urgent }: { icon: React.ReactNode; label: string; item: Improvement; urgent?: boolean }) {
  return (
    <div className={`flex items-start gap-2.5 ${urgent ? "px-3 py-2.5 -mx-1 rounded-lg bg-score-poor/[0.05] border border-score-poor/10" : ""}`}>
      {icon}
      <div className="flex-1 min-w-0">
        <span className={`text-xs font-semibold ${urgent ? "text-score-poor" : "text-foreground"}`}>{label}</span>
        <p className="text-[13px] text-muted-foreground leading-relaxed mt-0.5">{item.label}</p>
      </div>
      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold border ${
        urgent
          ? "bg-score-poor/10 text-score-poor border-score-poor/20"
          : "bg-primary/10 text-primary border-primary/15"
      }`}>
        {item.pointRange}
      </span>
    </div>
  );
}

/* ── Detail block (below summary cards) ── */
function DetailBlock({ axis, score }: { axis: AxisAnalysis; score: number }) {
  const [open, setOpen] = useState(false);
  const config = axisConfig[axis.label];
  const Icon = config.icon;
  const severity = getSeverity(score);
  const isCritical = severity === "critical";
  const isWarning = severity === "warning";

  const headerBorder = isCritical
    ? "border-score-poor/20"
    : isWarning
    ? "border-score-warning/15"
    : "border-border";

  return (
    <div className={`rounded-xl bg-card overflow-hidden ring-1 ${
      isCritical ? "ring-score-poor/20" : isWarning ? "ring-score-warning/15" : "ring-border"
    }`}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-4 border-b ${headerBorder} hover:bg-muted/30 transition-colors`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-5 h-5 ${config.accent}`} />
          <span className="text-sm font-bold text-foreground">{axis.label} 상세 분석</span>
          {isCritical && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-score-poor/10 text-score-poor border border-score-poor/20">
              우선 확인
            </span>
          )}
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Collapsible detail */}
      <div className={`${open ? "" : "hidden"}`}>
        {/* Issues — sorted by severity, framed as losses */}
        <div className={`px-5 py-4 space-y-2 ${isCritical ? "bg-score-poor/[0.02]" : ""}`}>
          <span className={`text-xs font-bold flex items-center gap-1.5 ${
            isCritical ? "text-score-poor" : "text-foreground"
          }`}>
            <AlertCircle className={`w-4 h-4 ${isCritical ? "text-score-poor" : "text-score-warning"}`} />
            핵심 이슈
            {isCritical && <span className="text-[10px] ml-1 text-score-poor/70">— 심각도 순</span>}
          </span>
          <ul className="space-y-2">
            {(axis.issues || []).map((item, i) => (
              <IssueRow key={i} text={item} severity={severity} index={i} />
            ))}
          </ul>
        </div>

        {/* Rationale */}
        <div className="border-t border-border px-5 py-4">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
            점수 사유
          </span>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{axis.scoreRationale}</p>
        </div>

        {/* Sub-signals */}
        <div className="border-t border-border px-5 py-4 space-y-1.5">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            하위 신호 점수
          </span>
          {(axis.subSignals || []).map((s, i) => (
            <SignalBar key={i} name={s.name} score={s.score} weight={s.weight} />
          ))}
        </div>

        {/* Strengths */}
        <div className="border-t border-border px-5 py-4 space-y-1.5">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-score-excellent" />
            잘된 점
          </span>
          <ul className="space-y-1 pl-5">
            {(axis.strengths || []).map((item, i) => (
              <li key={i} className="text-[13px] text-muted-foreground leading-relaxed list-disc">{item}</li>
            ))}
          </ul>
        </div>

        {/* Improvements — with point ranges */}
        <div className="border-t border-border px-5 py-4 space-y-3">
          <span className="text-xs font-bold text-foreground">개선 과제</span>
          {axis.priorityFix && (
            <ImprovementRow
              icon={<Zap className={`w-4 h-4 shrink-0 mt-0.5 ${isCritical ? "text-score-poor" : "text-score-warning"}`} />}
              label="🔥 가장 먼저 할 개선"
              item={axis.priorityFix}
              urgent={isCritical}
            />
          )}
          {axis.quickFix && (
            <ImprovementRow
              icon={<Wrench className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
              label="⚡ 빠르게 할 수 있는 개선"
              item={axis.quickFix}
            />
          )}
          {(axis.additionalFixes || []).map((fix, i) => (
            <ImprovementRow
              key={i}
              icon={<Plus className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
              label="추가 개선"
              item={fix}
            />
          ))}
        </div>
      </div>
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
  const axes: { axis: AxisAnalysis; score: number }[] = [
    { axis: result.seoAxis, score: result.seoScore },
    { axis: result.aeoAxis, score: result.aeoScore },
    { axis: result.geoAxis, score: result.geoScore },
  ];

  // Sort so critical scores come first
  const sortedAxes = [...axes].sort((a, b) => a.score - b.score);

  return (
    <div className="space-y-6">
      {/* 1. Top-level score summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {axes.map(({ axis, score }, i) => (
          <ScoreSummaryCard
            key={axis.label}
            axis={axis}
            score={score}
            delay={200 + i * 200}
          />
        ))}
      </div>

      {/* 2. Detail blocks — sorted by severity (worst first) */}
      <div className="space-y-4">
        {sortedAxes.map(({ axis, score }) => (
          <DetailBlock key={axis.label} axis={axis} score={score} />
        ))}
      </div>

      {/* 3. Inline CTA — right after the analysis */}
      <InlineCTA />
    </div>
  );
}
