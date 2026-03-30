import { useState, useEffect, useRef } from "react";
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
    border: "border-primary/60",
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
    border: "border-accent/60",
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
    border: "border-score-excellent/60",
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
  axis, score, delay, selected, onClick, compact,
}: {
  axis: AxisAnalysis; score: number; delay: number; selected: boolean; onClick: () => void; compact?: boolean;
}) {
  const config = axisConfig[axis.label];
  const Icon = config.icon;
  const severity = getSeverity(score);
  const isCritical = severity === "critical";
  const isWarning = severity === "warning";

  const cardRing = selected
    ? `border-2 ${config.border} ring-2 ${config.ring.replace("/30", "/60")} shadow-elevated`
    : isCritical
    ? "border border-score-poor/30 ring-2 ring-score-poor/30"
    : isWarning
    ? "border border-score-warning/25 ring-1 ring-score-warning/25"
    : "border border-border ring-1 ring-border";

  /* ── Compact horizontal layout for mobile ── */
   if (compact) {
    return (
      <div
        className={`rounded-xl bg-card ${cardRing} animate-fade-up w-full text-left transition-all duration-200`}
        style={{ animationDelay: `${delay / 1000}s` }}
      >
        <button onClick={onClick} className="w-full text-left">
          <div className="flex items-center gap-2 px-3 pt-3 pb-1">
            <div className="shrink-0 -mb-3">
              <SemiCircleGauge score={score} size={120} delay={delay} />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-center gap-1">
                <Icon className={`w-3 h-3 ${config.accent}`} />
                <span className="text-[11px] font-extrabold text-foreground tracking-wide">{axis.label}</span>
              </div>
              {getSeverityBadge(severity)}
              {isCritical && <p className="text-[10px] font-medium text-score-poor leading-tight line-clamp-2 mt-0.5">{config.lossDesc}</p>}
              {isWarning && <p className="text-[10px] text-score-warning leading-tight line-clamp-2 mt-0.5">{config.warnDesc}</p>}
              {!isCritical && !isWarning && <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">{axis.description}</p>}
            </div>
          </div>
          <div className="flex items-center justify-center gap-1 py-1.5 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground/70 font-medium">{selected ? "접기" : "자세히 보기"}</span>
            <ChevronDown className={`w-3 h-3 text-muted-foreground/70 transition-transform duration-200 ${selected ? "rotate-180" : ""}`} />
          </div>
        </button>
        {selected && (
          <div className={`border-t ${config.border}`}>
            <DetailPanel axis={axis} score={score} inline />
            <button
              onClick={onClick}
              className="flex items-center justify-center gap-1 w-full py-2 border-t border-border/50"
            >
              <span className="text-[10px] text-muted-foreground/70 font-medium">접기</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground/70 rotate-180" />
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── Desktop vertical layout (unchanged) ── */
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl overflow-hidden bg-card ${cardRing} animate-fade-up flex flex-col h-full text-center transition-all duration-200 hover:shadow-elevated`}
      style={{ animationDelay: `${delay / 1000}s` }}
    >
      <div className="flex flex-col items-center px-4 pt-5 pb-3 flex-1">
        <div className="flex items-center gap-1.5 mb-1">
          <Icon className={`w-4 h-4 ${config.accent}`} />
          <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">{axis.label}</span>
        </div>
        <div className="relative">
          <div className="absolute inset-0 rounded-full blur-2xl opacity-20" style={{ background: `hsl(var(--primary) / 0.3)` }} />
          <SemiCircleGauge score={score} size={150} delay={delay} />
        </div>
        <span className={`text-sm font-bold ${getGradeColorClass(score)} -mt-1`}>{getGradeLabel(score)}</span>
        <div className="mt-2 min-h-[22px] flex items-center">{getSeverityBadge(severity)}</div>
        <div className="min-h-[28px] flex items-center justify-center mt-1">
          {isCritical && <p className="text-[11px] font-medium text-score-poor leading-snug">{config.lossDesc}</p>}
          {isWarning && <p className="text-[11px] text-score-warning leading-snug">{config.warnDesc}</p>}
        </div>
        <p className="text-[10px] text-muted-foreground/70 mt-1 leading-relaxed line-clamp-2">{axis.description}</p>
        {axis.scoreCap && (
          <div className={`w-full mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] leading-snug text-left ${
            isCritical ? "bg-score-poor/6 border-score-poor/15 text-score-poor font-medium" : "bg-score-warning/6 border-score-warning/12 text-score-warning"
          }`}>
            <Lock className="w-3 h-3 shrink-0 mt-0.5" />
            <span>{axis.scoreCap}</span>
          </div>
        )}
      </div>
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
function DetailPanel({ axis, score, inline }: { axis: AxisAnalysis; score: number; inline?: boolean }) {
  const config = axisConfig[axis.label];
  const Icon = config.icon;
  const severity = getSeverity(score);
  const isCritical = severity === "critical";

  return (
    <div className={`${inline ? "animate-fade-up" : `rounded-2xl bg-card ring-1 ${config.ring} overflow-hidden animate-fade-up ${config.shadow}`}`}>
      {/* Header - hidden when inline (already shown in summary card) */}
      {!inline && (
        <div className={`flex items-center gap-2.5 px-6 py-4 border-b border-border ${config.headerBg}`}>
          <Icon className={`w-5 h-5 ${config.accent}`} />
          <span className="text-base font-bold text-foreground">{axis.label} — 원인 분석</span>
          {isCritical && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-score-poor/10 text-score-poor border border-score-poor/20">
              우선 확인
            </span>
          )}
        </div>
      )}

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
/* ── Animated number hook ── */
function useAnimatedNumber(target: number, duration = 400) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>();
  const startRef = useRef({ value: target, time: 0 });

  useEffect(() => {
    const start = display;
    const startTime = performance.now();
    startRef.current = { value: start, time: startTime };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(Math.round(start + (target - start) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

function InlineCTA({ avgScore, url, result }: { avgScore: number; url?: string; result?: DemoResult }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [dailyVisitors, setDailyVisitors] = useState(3000);

  const openModal = (title: string) => {
    setModalTitle(title);
    setModalOpen(true);
  };

  const gapPercent = Math.max(5, 100 - avgScore);
  const tier = avgScore >= 75 ? "good" : avgScore >= 60 ? "decent" : avgScore >= 40 ? "warning" : "critical";

  const lossRate = tier === "critical" ? 0.73 : tier === "warning" ? 0.60 : tier === "decent" ? 0.35 : 0;
  const lostVisitors = Math.round(dailyVisitors * lossRate);

  const animatedLost = useAnimatedNumber(lostVisitors);

  const tierConfig = {
    critical: { lossPct: "73%", source: "zero-click 검색 73% · KEO Marketing, 2025", statusLabel: "위험" },
    warning: { lossPct: "60%", source: "zero-click 검색 60% · SparkToro & Datos, 2025", statusLabel: "개선 필요" },
    decent: { lossPct: "35%", source: "AI 검색 미반영 트래픽 추정 35% · 업계 평균, 2025", statusLabel: "양호" },
    good: { lossPct: "", source: "", statusLabel: "우수" },
  };

  const t = tierConfig[tier];
  const isGoodScore = tier === "good";

  const sliderStops = [100, 500, 1000, 3000, 5000, 10000, 30000, 50000, 100000];
  const sliderIndex = sliderStops.findIndex((s) => s >= dailyVisitors);
  const handleSlider = (val: number) => setDailyVisitors(sliderStops[val] || 3000);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <>
      <div id="inline-cta-section" className={`relative rounded-2xl sm:rounded-2xl border p-4 sm:p-8 text-center space-y-4 sm:space-y-5 animate-fade-up overflow-hidden
        sm:static sticky bottom-0 z-30 rounded-b-none sm:rounded-b-2xl ${
        isGoodScore ? "border-primary/15"
        : tier === "critical" ? "border-destructive/20"
        : tier === "warning" ? "border-destructive/12"
        : "border-score-warning/12"
      }`} style={{
        animationDelay: "0.5s",
        background: isGoodScore
          ? "hsl(var(--card) / 0.85)"
          : tier === "critical"
          ? "hsl(var(--card) / 0.88)"
          : tier === "warning"
          ? "hsl(var(--card) / 0.88)"
          : "hsl(var(--card) / 0.88)",
        backdropFilter: "blur(16px)",
        boxShadow: isGoodScore
          ? "0 1px 20px -4px hsl(var(--primary) / 0.08)"
          : tier === "critical"
          ? "inset 0 0 60px -20px hsl(var(--destructive) / 0.06), 0 1px 20px -4px hsl(var(--destructive) / 0.06)"
          : "0 1px 20px -4px hsl(var(--destructive) / 0.04)",
      }}>
        <div className="space-y-3">
          {url && (
            <p className="text-sm font-medium text-muted-foreground">
              <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground transition-colors">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a> 최적화{" "}
              <span className={`font-bold ${isGoodScore ? "text-primary" : "text-destructive"}`}>{isGoodScore ? `${avgScore}점` : `${gapPercent}% 부족`}</span>
              {" "}— {t.statusLabel}
            </p>
          )}
          {isGoodScore ? (
            <p className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
              🎉 <span className="text-primary">잘 하고 있어요!</span> AI 검색 반영 가능성이 높습니다
            </p>
          ) : (
            <p className="text-lg sm:text-xl font-extrabold text-foreground leading-snug">
              하루 <span className="text-destructive tabular-nums">{animatedLost.toLocaleString()}명</span>의 잠재고객이 <span className="text-destructive">경쟁사로 이탈</span>하고 있습니다
            </p>
          )}
          {!isGoodScore && (
            <div className="hidden sm:block max-w-xs mx-auto pt-2">
              <input
                type="range"
                min={0}
                max={sliderStops.length - 1}
                value={sliderIndex >= 0 ? sliderIndex : 3}
                onChange={(e) => handleSlider(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
                <span>100명</span>
                <span className="text-muted-foreground font-medium">하루 방문자가 {dailyVisitors.toLocaleString()}명이라면?</span>
                <span>100,000명</span>
              </div>
            </div>
          )}
          {isGoodScore && (
            <p className="text-xs text-muted-foreground/50">현재 상태를 유지하면서 세부 항목을 더 강화해 보세요</p>
          )}
        </div>
        {/* Desktop: always visible */}
        <div className="hidden sm:flex flex-row gap-3 justify-center">
          <button
            onClick={() => openModal(isGoodScore ? "더 높은 점수를 위한 개선 포인트 받기" : "점수 올리는 우선순위 받기")}
            className="inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            {isGoodScore ? "개선 포인트 보기" : "우선순위 보기"}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => openModal(isGoodScore ? "내 점수 세부 분석 받기" : "내 점수 깎는 핵심 원인 받기")}
            className="inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-xl border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/5 transition-colors"
          >
            {isGoodScore ? "세부 분석 보기" : "핵심 원인 보기"}
          </button>
        </div>
        {!isGoodScore && (
          <p className="hidden sm:block text-[10px] text-muted-foreground/40">
            {dailyVisitors.toLocaleString()}명 × {t.lossPct} = {lostVisitors.toLocaleString()}명/일 · 출처: {t.source}
          </p>
        )}

        {/* Mobile: collapsible details */}
        <div className="sm:hidden">
          {!mobileExpanded ? (
            <button
              onClick={() => setMobileExpanded(true)}
              className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
            >
              자세히 보기
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="space-y-3 animate-fade-up">
              {!isGoodScore && (
                <div className="max-w-xs mx-auto">
                  <input
                    type="range"
                    min={0}
                    max={sliderStops.length - 1}
                    value={sliderIndex >= 0 ? sliderIndex : 3}
                    onChange={(e) => handleSlider(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/50 mt-1">
                    <span>100명</span>
                    <span className="text-muted-foreground font-medium">하루 방문자가 {dailyVisitors.toLocaleString()}명이라면?</span>
                    <span>100,000명</span>
                  </div>
                </div>
              )}
              <div className="flex flex-row gap-2 justify-center">
                <button
                  onClick={() => openModal(isGoodScore ? "더 높은 점수를 위한 개선 포인트 받기" : "점수 올리는 우선순위 받기")}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-[13px] hover:bg-primary/90 transition-colors flex-1"
                >
                  {isGoodScore ? "개선 포인트 보기" : "우선순위 보기"}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openModal(isGoodScore ? "내 점수 세부 분석 받기" : "내 점수 깎는 핵심 원인 받기")}
                  className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl border border-primary/20 text-primary font-semibold text-[13px] hover:bg-primary/5 transition-colors flex-1"
                >
                  {isGoodScore ? "세부 분석 보기" : "핵심 원인 보기"}
                </button>
              </div>
              {!isGoodScore && (
                <p className="text-[10px] text-muted-foreground/40">
                  {dailyVisitors.toLocaleString()}명 × {t.lossPct} = {lostVisitors.toLocaleString()}명/일 · 출처: {t.source}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <LeadModal open={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle} result={result} url={url} />
    </>
  );
}
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
      <div className="sm:hidden space-y-2">
         {axes.map(({ axis, score, key }, i) => (
            <SummaryCard
              key={key}
              axis={axis}
              score={score}
              delay={200 + i * 200}
              selected={selected === key}
              onClick={() => setSelected(selected === key ? null : key)}
              compact
            />
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
      <InlineCTA avgScore={Math.round((result.seoScore + result.aeoScore + result.geoScore) / 3)} url={url} result={result} />
    </div>
  );
}
