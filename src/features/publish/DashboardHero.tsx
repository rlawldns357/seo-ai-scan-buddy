import { Sparkles, Rocket, CheckCircle2, Send, BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Stage = "guest" | "no-site" | "ready";

type Props = {
  stage: Stage;
  // no-site form
  siteUrl?: string;
  setSiteUrl?: (v: string) => void;
  title?: string;
  setTitle?: (v: string) => void;
  submitting?: boolean;
  onSubmit?: (e: React.FormEvent) => void;
  // ready
  siteTitle?: string;
  siteHref?: string;
  queued?: number;
  publishedToday?: number;
  weeklyVisitors?: number;
  onPrimary?: () => void;
  primaryLabel?: string;
  // guest
  onLogin?: () => void;
};

/**
 * Hero placed at the very top of /dashboard.
 * Mirrors the public Auto-Blog landing hero (title + URL input + 3-step row),
 * but adapts to the user's lifecycle stage: guest / no-site / ready.
 */
export default function DashboardHero(props: Props) {
  const { stage } = props;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/5 via-background to-accent/5 px-5 py-6 sm:px-8 sm:py-8 mb-5">
      {/* subtle glow */}
      <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" aria-hidden />

      {/* Top badge */}
      <div className="relative flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1">
          <Sparkles className="w-3 h-3" /> Auto-Blog
        </span>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          검색 유입을 만드는 콘텐츠 시스템
        </span>
      </div>

      {/* Headline */}
      <h1 className="relative text-xl sm:text-2xl font-bold text-foreground leading-snug">
        {stage === "guest" && (
          <>광고는 끄면 멈춰요. <span className="text-primary">검색은 잠들어도 일합니다.</span></>
        )}
        {stage === "no-site" && (
          <>사이트 URL만 넣으면 <span className="text-primary">자동 콘텐츠 큐 30편</span>이 시작돼요.</>
        )}
        {stage === "ready" && (
          <>오늘도 큐가 <span className="text-primary">자동 발행</span>되고 있어요.</>
        )}
      </h1>
      <p className="relative text-sm text-muted-foreground mt-1.5">
        {stage === "guest" && "로그인하면 내 사이트의 콘텐츠 큐를 바로 시작할 수 있어요."}
        {stage === "no-site" && "URL과 표시 제목만 입력하면 시작용 SEO/AEO/GEO 콘텐츠 3편이 자동 생성돼요."}
        {stage === "ready" && "큐를 검토하고 발행하면 검색 유입이 누적되기 시작합니다."}
      </p>

      {/* Stage-specific body */}
      {stage === "guest" && (
        <div className="relative mt-5">
          <Button onClick={props.onLogin} className="rounded-full h-11 px-6">
            <Rocket className="w-4 h-4" /> 로그인하고 시작하기
          </Button>
        </div>
      )}

      {stage === "no-site" && (
        <form onSubmit={props.onSubmit} className="relative mt-5 flex flex-col sm:flex-row gap-2">
          <Input
            id="siteUrl"
            placeholder="https://my-brand-shop.com"
            value={props.siteUrl ?? ""}
            onChange={(e) => props.setSiteUrl?.(e.target.value)}
            required
            className="h-11 rounded-full sm:flex-1"
          />
          <Input
            placeholder="표시 제목 (예: 우리 브랜드 인사이트)"
            value={props.title ?? ""}
            onChange={(e) => props.setTitle?.(e.target.value)}
            required
            className="h-11 rounded-full sm:flex-1"
          />
          <Button type="submit" disabled={props.submitting} className="h-11 rounded-full px-6 shrink-0">
            {props.submitting ? "만드는 중..." : (<><Rocket className="w-4 h-4" /> 라이브 데모 시작</>)}
          </Button>
        </form>
      )}

      {stage === "ready" && (
        <div className="relative mt-5 flex flex-wrap items-center gap-2">
          {props.siteHref && (
            <span className="text-xs text-muted-foreground truncate max-w-[60%]">
              · {props.siteTitle}
            </span>
          )}
          <Button onClick={props.onPrimary} className="rounded-full h-10 px-5 ml-auto">
            {(props.queued ?? 0) > 0 ? (
              <><Send className="w-4 h-4" /> {props.primaryLabel ?? "큐로 이동"}</>
            ) : (
              <><Plus className="w-4 h-4" /> {props.primaryLabel ?? "추천 보기"}</>
            )}
          </Button>
        </div>
      )}

      {/* 3-step / KPI row */}
      <div className="relative mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {stage === "ready" ? (
          <>
            <KpiPill label="큐" value={props.queued ?? 0} suffix="편 대기" tone="primary" />
            <KpiPill label="오늘 발행" value={props.publishedToday ?? 0} suffix="편" tone="accent" />
            <KpiPill label="이번 주 방문" value={props.weeklyVisitors ?? 0} suffix="명" tone="warning" />
          </>
        ) : (
          <>
            <StepPill index={1} title="진단 & 기획" desc="구매 키워드 · 발행 캘린더" active />
            <StepPill index={2} title="자동 생성" desc="1시간마다 글쓰기 30편" active={stage === "no-site"} />
            <StepPill index={3} title="발행 검수" desc="조회 · 체류 · 유입 분석" />
          </>
        )}
      </div>
    </section>
  );
}

function StepPill({ index, title, desc, active }: { index: number; title: string; desc: string; active?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl border px-3 py-2.5 ${
        active ? "border-primary/30 bg-primary/5" : "border-border/50 bg-background/60"
      }`}
    >
      <div
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {active ? <CheckCircle2 className="w-4 h-4" /> : index}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">
          {index} · {title}
        </p>
        <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
      </div>
    </div>
  );
}

function KpiPill({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: number;
  suffix: string;
  tone: "primary" | "accent" | "warning";
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/30 bg-primary/5"
      : tone === "accent"
      ? "border-accent/30 bg-accent/5"
      : "border-score-warning/30 bg-score-warning/5";
  return (
    <div className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 ${toneClass}`}>
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs font-semibold text-foreground">{label}</p>
      </div>
      <p className="text-sm font-bold text-foreground tabular-nums">
        {value}
        <span className="text-[11px] font-normal text-muted-foreground ml-1">{suffix}</span>
      </p>
    </div>
  );
}
