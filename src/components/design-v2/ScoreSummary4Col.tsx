import { Smartphone, Monitor, ArrowRight } from "lucide-react";
import SemiCircleGauge from "@/components/SemiCircleGauge";
import { type DemoResult } from "@/data/demoResults";
import { type PsiResult } from "@/lib/psi";

interface Props {
  result: DemoResult;
  mobile: PsiResult | null;
  desktop: PsiResult | null;
}

function severityBadge(score: number) {
  if (score >= 75) return { text: "우수", cls: "bg-score-excellent/10 text-score-excellent border-score-excellent/20" };
  if (score >= 60) return { text: "양호", cls: "bg-score-good/10 text-score-good border-score-good/20" };
  if (score >= 40) return { text: "기회 있음", cls: "bg-score-warning/10 text-score-warning border-score-warning/20" };
  return { text: "우선 개선", cls: "bg-score-poor/10 text-score-poor border-score-poor/20" };
}

function getTotalColor(score: number) {
  if (score >= 75) return "text-score-excellent";
  if (score >= 60) return "text-score-good";
  if (score >= 40) return "text-score-warning";
  return "text-score-poor";
}

function avgScore(psi: PsiResult) {
  return Math.round((psi.performance + psi.accessibility + psi.bestPractices + psi.seo) / 4);
}

function ScoreCard({
  label, score, desc, delay,
}: { label: string; score: number; desc: string; delay: number }) {
  const badge = severityBadge(score);
  return (
    <div
      className="rounded-2xl bg-card border border-border shadow-card px-3 py-4 flex flex-col items-center text-center animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">{label}</p>
      <div className="-my-1">
        <SemiCircleGauge score={score} size={130} delay={delay} />
      </div>
      <p className="text-[10px] text-muted-foreground tabular-nums -mt-1">/ 100</p>
      <span className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.cls}`}>
        {badge.text}
      </span>
      <p className="mt-2 text-[11px] text-muted-foreground leading-snug line-clamp-2 min-h-[28px]">{desc}</p>
    </div>
  );
}

export default function ScoreSummary4Col({ result, mobile, desktop }: Props) {
  const total = Math.round((result.seoScore + result.aeoScore + result.geoScore) / 3);
  const totalColor = getTotalColor(total);

  const lighthouseMobile = mobile ? avgScore(mobile) : null;
  const lighthouseDesktop = desktop ? avgScore(desktop) : null;

  return (
    <section className="rounded-3xl bg-card border border-border shadow-card p-4 sm:p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[15px] font-extrabold text-foreground">핵심 진단 요약</h2>
        <span className="text-[10px] font-medium text-muted-foreground">SEO · AEO · GEO + Lighthouse</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <ScoreCard label="SEO" score={result.seoScore} desc="기술/콘텐츠 최적화 여지가 있습니다." delay={50} />
        <ScoreCard label="AEO" score={result.aeoScore} desc="AI 답변 출현 가능성이 있습니다." delay={100} />
        <ScoreCard label="GEO" score={result.geoScore} desc="브랜드 언급 및 인지 신호가 부족합니다." delay={150} />

        {/* 4th cell: 전체 점수 + Lighthouse mini */}
        <div
          className="rounded-2xl bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-primary/20 shadow-card px-3 py-4 flex flex-col items-center text-center animate-fade-up"
          style={{ animationDelay: "200ms" }}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground">전체 점수</p>
          <div className="relative my-2 w-[110px] h-[110px] flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" width="110" height="110" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="48" fill="none" stroke="hsl(var(--border))" strokeWidth="7" />
              <circle
                cx="55" cy="55" r="48" fill="none" strokeWidth="7" strokeLinecap="round"
                stroke={`hsl(var(--${total >= 75 ? "score-excellent" : total >= 60 ? "score-good" : total >= 40 ? "score-warning" : "score-poor"}))`}
                strokeDasharray={2 * Math.PI * 48}
                strokeDashoffset={2 * Math.PI * 48 * (1 - total / 100)}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            </svg>
            <div className="flex flex-col items-center leading-none">
              <span className={`text-[28px] font-black tabular-nums ${totalColor}`}>{total}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">/100</span>
            </div>
          </div>

          {(lighthouseMobile !== null || lighthouseDesktop !== null) && (
            <div className="w-full mt-1 pt-2 border-t border-border/60">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Lighthouse
              </p>
              <div className="flex items-center justify-center gap-3">
                {lighthouseDesktop !== null && (
                  <div className="flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-muted-foreground" />
                    <span className={`text-[12px] font-bold tabular-nums ${getTotalColor(lighthouseDesktop)}`}>
                      {lighthouseDesktop}
                    </span>
                  </div>
                )}
                {lighthouseMobile !== null && (
                  <div className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-muted-foreground" />
                    <span className={`text-[12px] font-bold tabular-nums ${getTotalColor(lighthouseMobile)}`}>
                      {lighthouseMobile}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            상세 결과 보기 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
