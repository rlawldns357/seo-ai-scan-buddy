import { useState } from "react";
import LeadModal from "@/components/LeadModal";
import { type DemoResult, type AxisAnalysis, type Improvement } from "@/data/demoResults";
import SemiCircleGauge, { getGradeLabel, getGradeColorClass } from "@/components/SemiCircleGauge";
import {
  Search, Bot, Sparkles,
  AlertTriangle, CheckCircle, Zap, Wrench, Plus, TrendingUp, AlertCircle,
  Lock, ShieldAlert, ChevronDown, ArrowRight,
} from "lucide-react";

interface ScoreDashboardProps {
  result: DemoResult;
  url?: string;
}

const axisConfig = {
  SEO: {
    icon: Search,
    accent: "text-primary",
    lossLabel: "검색 노출 손실 가능성",
    lossDesc: "지금 검색 노출 기회를 놓치고 있습니다",
    warnDesc: "검색 노출 효율을 더 높일 수 있습니다",
    ring: "ring-primary/30",
    shadow: "shadow-[0_4px_24px_-6px_hsl(230,80%,56%,0.12)]",
    headerBg: "bg-primary/5",
  },
  AEO: {
    icon: Bot,
    accent: "text-accent",
    lossLabel: "답변 채택 손실 가능성",
    lossDesc: "답변형 검색에서 선택될 가능성이 낮습니다",
    warnDesc: "AI 답변 채택률을 개선할 여지가 있습니다",
    ring: "ring-accent/30",
    shadow: "shadow-[0_4px_24px_-6px_hsl(268,70%,58%,0.12)]",
    headerBg: "bg-accent/5",
  },
  GEO: {
    icon: Sparkles,
    accent: "text-score-excellent",
    lossLabel: "인용 기회 손실 가능성",
    lossDesc: "생성형 검색 엔진이 신뢰 가능한 출처로 인식하기 어려운 상태입니다",
    warnDesc: "생성형 검색에서의 인용 가능성을 높일 수 있습니다",
    ring: "ring-score-excellent/30",
    shadow: "shadow-[0_4px_24px_-6px_hsl(142,72%,42%,0.12)]",
    headerBg: "bg-score-excellent/5",
  },
};

type Severity = "critical" | "warning" | "ok" | "good";
type AxisLabel = "SEO" | "AEO" | "GEO";

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

/* ── Sub-signal bar ── */
function SignalBar({ name, score, weight }: { name: string; score: number; weight: number }) {
  const color =
    score >= 75 ? "bg-score-excellent" :
    score >= 60 ? "bg-score-good" :
    score >= 40 ? "bg-score-warning" :
    "bg-score-poor";
  const isCritical = score < 40;
  return (
    <div className={`flex items-center gap-2.5 py-0.5 ${isCritical ? "px-2 -mx-2 rounded bg-score-poor/[0.06]" : ""}`}>
      <span className={`text-[11px] w-[120px] shrink-0 truncate ${isCritical ? "font-semibold text-score-poor" : "text-muted-foreground"}`}>{name}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[11px] font-semibold w-6 text-right tabular-nums ${isCritical ? "text-score-poor" : "text-foreground"}`}>{score}</span>
      <span className="text-[9px] text-muted-foreground/60 w-5 text-right">×{weight}</span>
    </div>
  );
}

/* ── Improvement row ── */
function ImprovementRow({ icon, label, item, urgent }: { icon: React.ReactNode; label: string; item: Improvement; urgent?: boolean }) {
  return (
    <div className={`flex items-start gap-2 ${urgent ? "px-3 py-2 -mx-1 rounded-lg bg-score-poor/[0.04] border border-score-poor/10" : ""}`}>
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

/* ── Summary card (clickable, no detail inside) ── */
function SummaryCard({
  axis, score, delay, selected, onClick,
}: {
  axis: AxisAnalysis; score: number; delay: number; selected: boolean; onClick: () => void;
}) {
  const config = axisConfig[axis.label];
  const Icon = config.icon;
  const severity = getSeverity(score);
  const isCritical = severity === "critical";
  const isWarning = severity === "warning";

  const cardRing = selected
    ? "ring-2 ring-primary/50 shadow-elevated"
    : isCritical
    ? "ring-2 ring-score-poor/30"
    : isWarning
    ? "ring-1 ring-score-warning/25"
    : "ring-1 ring-border";

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl overflow-hidden bg-card ${cardRing} animate-fade-up flex flex-col h-full text-center transition-all duration-200 hover:shadow-elevated`}
      style={{ animationDelay: `${delay / 1000}s` }}
    >
      <div className="flex flex-col items-center px-4 pt-5 pb-3 flex-1">
        {/* Title */}
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className={`w-4 h-4 ${config.accent}`} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">{axis.label}</span>
        </div>

        {/* Gauge */}
        <SemiCircleGauge score={score} size={140} delay={delay} />

        {/* Grade */}
        <span className={`text-sm font-bold ${getGradeColorClass(score)} -mt-1`}>
          {getGradeLabel(score)}
        </span>

        {/* Badge */}
        <div className="mt-2 min-h-[22px] flex items-center">{getSeverityBadge(severity)}</div>

        {/* Loss message */}
        <div className="min-h-[28px] flex items-center justify-center mt-1">
          {isCritical && (
            <p className="text-[11px] font-medium text-score-poor leading-snug">{config.lossDesc}</p>
          )}
          {isWarning && (
            <p className="text-[11px] text-score-warning leading-snug">{config.warnDesc}</p>
          )}
        </div>

        {/* Description */}
        <p className="text-[10px] text-muted-foreground/70 mt-1 leading-relaxed line-clamp-2">
          {axis.description}
        </p>

        {/* Score cap */}
        {axis.scoreCap && (
          <div className={`w-full mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] leading-snug text-left ${
            isCritical
              ? "bg-score-poor/6 border-score-poor/15 text-score-poor font-medium"
              : "bg-score-warning/6 border-score-warning/12 text-score-warning"
          }`}>
            <Lock className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{axis.scoreCap}</span>
          </div>
        )}
      </div>

      {/* Bottom hint */}
      <div className={`flex items-center justify-center gap-1 py-2.5 border-t border-border text-[11px] font-semibold ${
        selected ? `${config.accent} ${config.headerBg}` : "text-muted-foreground"
      }`}>
        {selected ? "원인 분석 보는 중" : "원인 분석 보기"}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${selected ? "" : "-rotate-90"}`} />
      </div>
    </button>
  );
}

/* ── Full-width detail panel ── */
function DetailPanel({ axis, score }: { axis: AxisAnalysis; score: number }) {
  const config = axisConfig[axis.label];
  const Icon = config.icon;
  const severity = getSeverity(score);
  const isCritical = severity === "critical";

  return (
    <div className={`rounded-2xl bg-card ring-1 ${config.ring} overflow-hidden animate-fade-up ${config.shadow}`}>
      {/* Header */}
      <div className={`flex items-center gap-2.5 px-6 py-4 border-b border-border ${config.headerBg}`}>
        <Icon className={`w-5 h-5 ${config.accent}`} />
        <span className="text-base font-bold text-foreground">{axis.label} — 원인 분석</span>
        {isCritical && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-score-poor/10 text-score-poor border border-score-poor/20">
            우선 확인
          </span>
        )}
      </div>

      {/* Content grid: 2 columns on desktop */}
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        {/* Left: Issues + Rationale + Strengths */}
        <div className="divide-y divide-border">
          {/* Issues */}
          <div className={`px-5 py-4 space-y-2 ${isCritical ? "bg-score-poor/[0.02]" : ""}`}>
            <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
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
          <div className="px-5 py-4">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3 text-muted-foreground" />
              점수 사유
            </span>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{axis.scoreRationale}</p>
          </div>

          {/* Strengths */}
          <div className="px-5 py-4 space-y-1">
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
        </div>

        {/* Right: Sub-signals + Improvements */}
        <div className="divide-y divide-border">
          {/* Sub-signals */}
          <div className="px-5 py-4 space-y-1">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-muted-foreground" />
              하위 신호
            </span>
            {(axis.subSignals || []).map((s, i) => (
              <SignalBar key={i} name={s.name} score={s.score} weight={s.weight} />
            ))}
          </div>

          {/* Improvements */}
          <div className="px-5 py-4 space-y-2.5">
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
      </div>
    </div>
  );
}

/* ── Inline CTA ── */
function InlineCTA({ avgScore, url }: { avgScore: number; url?: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");

  const openModal = (title: string) => {
    setModalTitle(title);
    setModalOpen(true);
  };

  // 점수 기반 팩트 퍼센트 (실제 점수 갭)
  const gapPercent = Math.max(5, 100 - avgScore);

  // 업계 통계 기반 이탈 수치 (Google/Backlinko 연구 기반 추정)
  const lostStat = avgScore < 40
    ? { visitors: "100명 이상", source: "Google, 2018" }
    : avgScore < 60
    ? { visitors: "50~100명", source: "Backlinko, 2023" }
    : { visitors: "20~50명", source: "Google, 2021" };

  return (
    <>
      <div id="inline-cta-section" className="rounded-2xl bg-gradient-to-br from-primary/8 via-primary/5 to-accent/5 border border-primary/15 p-6 sm:p-8 text-center space-y-5 animate-fade-up" style={{ animationDelay: "0.5s" }}>
        <div className="space-y-3">
          {url && (
            <p className="text-xs text-muted-foreground/60">
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a> 분석 결과 사이트 최적화 수준이 <span className="font-bold text-primary">{gapPercent}%</span> 부족한 상태예요.
            </p>
          )}
          <p className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
            매일 <span className="text-primary">{lostStat.visitors}</span>의 잠재고객이<br className="sm:hidden" /> 경쟁사로 가고 있습니다
          </p>
          <p className="text-xs text-muted-foreground/50">
            — 업계 평균 기반 추정 · {lostStat.source}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => openModal("점수 올리는 우선순위 받기")}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            점수 올리는 우선순위 보기
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => openModal("내 점수 깎는 핵심 원인 받기")}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/5 transition-colors"
          >
            내 점수 깎는 핵심 원인 보기
          </button>
        </div>
      </div>
      <LeadModal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} />
    </>
  );
}

/* ── One-line verdict helper ── */
function getVerdict(seo: number, aeo: number, geo: number): string {
  const avg = (seo + aeo + geo) / 3;
  if (avg >= 75) return "AI 검색 반영 가능성이 높아요. 현재 상태를 유지하세요!";
  if (avg >= 60) return "기본 SEO는 양호하지만 AEO·GEO 보강이 필요해요.";
  if (avg >= 40) return "검색 노출과 AI 답변 채택 모두 개선이 시급해요.";
  return "검색엔진과 AI가 이 사이트를 거의 인식하지 못하고 있어요.";
}

/* ── Issue count summary helper ── */
function countIssues(axes: { axis: AxisAnalysis; score: number }[]) {
  let critical = 0;
  let recommended = 0;
  for (const { axis, score } of axes) {
    const issues = axis.issues?.length || 0;
    if (score < 40) critical += issues;
    else if (score < 75) recommended += issues;
  }
  return { critical, recommended };
}

/* ── Main ── */
export default function ScoreDashboard({ result, url }: ScoreDashboardProps) {
  const axes: { axis: AxisAnalysis; score: number; key: AxisLabel }[] = [
    { axis: result.seoAxis, score: result.seoScore, key: "SEO" },
    { axis: result.aeoAxis, score: result.aeoScore, key: "AEO" },
    { axis: result.geoAxis, score: result.geoScore, key: "GEO" },
  ];

  // Default to the worst-scoring axis
  const worstKey = axes.reduce((prev, curr) => curr.score < prev.score ? curr : prev).key;
  const [selected, setSelected] = useState<AxisLabel | null>(worstKey);

  const selectedEntry = axes.find((a) => a.key === selected);
  const verdict = getVerdict(result.seoScore, result.aeoScore, result.geoScore);
  const { critical, recommended } = countIssues(axes);

  return (
    <div className="space-y-5">
      {/* One-line verdict */}
      <div className="rounded-xl bg-card shadow-card px-5 py-4 animate-fade-up text-center space-y-2" style={{ animationDelay: "0.1s" }}>
        <p className="text-base sm:text-lg font-bold text-foreground">{verdict}</p>
        {(critical > 0 || recommended > 0) && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {critical > 0 && (
              <button
                onClick={() => {
                  const criticalAxis = axes.find(a => a.score < 40);
                  if (criticalAxis) {
                    setSelected(criticalAxis.key);
                    setTimeout(() => document.getElementById(`detail-${criticalAxis.key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-score-poor/10 text-score-poor border border-score-poor/20 hover:bg-score-poor/20 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                긴급 수정 {critical}개
              </button>
            )}
            {recommended > 0 && (
              <button
                onClick={() => {
                  const recAxis = axes.find(a => a.score >= 40 && a.score < 75);
                  if (recAxis) {
                    setSelected(recAxis.key);
                    setTimeout(() => document.getElementById(`detail-${recAxis.key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-score-warning/10 text-score-warning border border-score-warning/20 hover:bg-score-warning/20 transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                권장 개선 {recommended}개
              </button>
            )}
            <button
              onClick={() => {
                document.getElementById("inline-cta-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              개선하기
            </button>
          </div>
        )}
      </div>

      {/* Mobile: card + inline detail for each axis */}
      <div className="sm:hidden space-y-4">
        {axes.map(({ axis, score, key }, i) => (
          <div key={key} className="space-y-2">
            <SummaryCard
              axis={axis}
              score={score}
              delay={200 + i * 200}
              selected={selected === key}
              onClick={() => setSelected(selected === key ? null : key)}
            />
            {selected === key && (
              <div id={`detail-${key}`}>
                <DetailPanel axis={axis} score={score} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: 3-column grid + shared detail panel */}
      <div className="hidden sm:block space-y-5">
        <div className="grid gap-4 sm:grid-cols-3 sm:items-stretch">
          {axes.map(({ axis, score, key }, i) => (
            <SummaryCard
              key={key}
              axis={axis}
              score={score}
              delay={200 + i * 200}
              selected={selected === key}
            onClick={() => setSelected(selected === key ? null : key)}
            />
          ))}
        </div>
        {selectedEntry && (
          <div id={`detail-${selected}`}>
            <DetailPanel axis={selectedEntry.axis} score={selectedEntry.score} />
          </div>
        )}
      </div>

      {/* CTA */}
      <InlineCTA avgScore={Math.round((result.seoScore + result.aeoScore + result.geoScore) / 3)} url={url} />
    </div>
  );
}
