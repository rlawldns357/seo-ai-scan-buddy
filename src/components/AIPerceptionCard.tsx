import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Lock, Loader2, AlertCircle, Sparkles, Zap, AlertTriangle, MehIcon, HelpCircle, Trophy } from "lucide-react";
import { SiClaude, SiGooglegemini, SiPerplexity, SiNaver } from "@icons-pack/react-simple-icons";
import { trackEvent } from "@/lib/analytics";

// Official brand logos (inline SVG for OpenAI/Copilot — not in simple-icons free set)
const OpenAIMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365 2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
  </svg>
);

const CopilotMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M22.788 11.946c.005-.123.014-.246.014-.37C22.802 5.288 17.515 0 11.226 0 4.937 0 0 4.937 0 11.226c0 6.288 5.287 11.226 11.576 11.226 1.165 0 2.292-.179 3.353-.51a11.165 11.165 0 0 0 4.347 1.058c2.504 0 4.535-2.03 4.535-4.535 0-2.392-1.853-4.351-4.21-4.524.748-.66 1.208-1.598 1.187-2.62v-.375zM11.576 19.94c-4.812 0-8.715-3.903-8.715-8.715s3.903-8.714 8.715-8.714c4.811 0 8.714 3.902 8.714 8.714 0 1.182-.235 2.31-.661 3.34a4.516 4.516 0 0 0-2.158-.55c-2.504 0-4.535 2.031-4.535 4.535 0 .553.099 1.083.281 1.572-.531.13-1.082.197-1.641.197z"/>
  </svg>
);


type BrandKey = "chatgpt" | "claude" | "gemini" | "perplexity" | "bing" | "naver";

interface BrandResult {
  brand: BrandKey;
  status: "ok" | "unknown" | "unsupported" | "error";
  awareness: "yes" | "partial" | "no" | null;
  awarenessAnswer?: string;
  recommendation: { mentioned: boolean; rank?: number; total?: number; competitors?: string[] };
  recommendationAnswer?: string;
  model?: string;
  citations?: string[];
  errorMessage?: string;
}

interface ProbeResult {
  url: string;
  brand: string;
  category: string;
  generated_at: string;
  cached: boolean;
  brands: BrandResult[];
  summary: { measurable: number; aware: number; recommended: number };
}

interface Props {
  url?: string;
  brand?: string;
  category?: string;
  onAnswerShareClick?: () => void;
}


const BRAND_META: Record<BrandKey, { name: string; Logo: React.ComponentType<{ className?: string }>; brandColor: string }> = {
  chatgpt:    { name: "ChatGPT",        Logo: OpenAIMark,    brandColor: "#000000" },
  claude:     { name: "Claude",         Logo: SiClaude,      brandColor: "#D97757" },
  gemini:     { name: "Gemini",         Logo: SiGooglegemini, brandColor: "#1C69FF" },
  perplexity: { name: "Perplexity",     Logo: SiPerplexity,  brandColor: "#20808D" },
  bing:       { name: "Copilot (Bing)", Logo: CopilotMark,   brandColor: "#0078D4" },
  naver:      { name: "네이버 (HyperCLOVA X)", Logo: SiNaver, brandColor: "#03C75A" },
};

const ORDER: BrandKey[] = ["chatgpt", "claude", "gemini", "perplexity", "bing", "naver"];

function AwarenessBadge({ b }: { b: BrandResult }) {
  if (b.status === "unsupported") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
        <Lock className="w-2.5 h-2.5" /> 준비 중
      </span>
    );
  }
  if (b.status === "error") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted/60 text-muted-foreground border border-border">
        측정 실패
      </span>
    );
  }
  if (b.awareness === "yes") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-score-excellent/10 text-score-excellent border border-score-excellent/20">✅ 인지함</span>;
  }
  if (b.awareness === "partial") {
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-score-warning/10 text-score-warning border border-score-warning/20">△ 부분 인지</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-score-poor/10 text-score-poor border border-score-poor/20">❌ 모름</span>;
}

function RecBadge({ b }: { b: BrandResult }) {
  if (b.status !== "ok") return null;
  if (b.recommendation.mentioned) {
    return <span className="text-[11px] font-semibold text-score-excellent">✅ 추천 노출</span>;
  }
  return <span className="text-[11px] font-medium text-score-poor">❌ 추천 미노출</span>;
}

const LOADING_STEPS = [
  { label: "AI들을 불러모으는 중", emoji: "📡" },
  { label: "ChatGPT에 직접 물어보는 중", emoji: "💬" },
  { label: "Claude에 직접 물어보는 중", emoji: "🧠" },
  { label: "Gemini에 직접 물어보는 중", emoji: "✨" },
  { label: "Perplexity에 직접 물어보는 중", emoji: "🔎" },
  { label: "네이버 HyperCLOVA X에 직접 물어보는 중", emoji: "🟢" },
  { label: "응답을 분석하는 중", emoji: "🧩" },
];

export default function AIPerceptionCard({ url, brand, category, onAnswerShareClick }: Props) {

  const [data, setData] = useState<ProbeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBrand, setExpandedBrand] = useState<BrandKey | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const isAdmin = typeof sessionStorage !== "undefined" && sessionStorage.getItem("admin_pw") !== null;

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setStepIdx(0);

    (async () => {
      try {
        const adminPw = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("admin_pw") : null;
        const purge = reloadKey > 0 && !!adminPw;
        const { data: resp, error: invErr } = await supabase.functions.invoke("probe-ai-perception", {
          body: { url, brand, category, ...(purge ? { purge: true, adminPassword: adminPw } : {}) },
        });
        if (cancelled) return;
        if (invErr) throw invErr;
        if (resp?.error) throw new Error(resp.error);
        setData(resp as ProbeResult);
        trackEvent("ai_perception_shown", {
          url,
          measurable: resp?.summary?.measurable,
          aware: resp?.summary?.aware,
          recommended: resp?.summary?.recommended,
        });
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [url, brand, category, reloadKey]);

  // Loading step ticker (advance every ~2.2s, hold on last)
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [loading]);

  // ── Loading state
  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm sm:text-base font-bold text-foreground">🤖 지금 AI는 당신을 이렇게 봅니다</h3>
        </div>
        <ul className="space-y-2 py-2">
          {LOADING_STEPS.map((s, i) => {
            const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
            return (
              <li
                key={s.label}
                className={`flex items-center gap-3 text-sm transition-all ${
                  state === "done" ? "text-muted-foreground" :
                  state === "active" ? "text-foreground font-medium" :
                  "text-muted-foreground"
                }`}
              >
                <span className="w-5 flex items-center justify-center">
                  {state === "done" ? (
                    <span className="text-score-good">✓</span>
                  ) : state === "active" ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <span className="text-base opacity-60">{s.emoji}</span>
                  )}
                </span>
                <span>{s.label}{state === "active" ? "…" : ""}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">AI 인식 미리보기</h3>
        </div>
        <p className="text-xs text-muted-foreground">측정에 실패했어요. 잠시 후 다시 시도해 주세요.</p>
      </div>
    );
  }

  const { summary, brands } = data;
  const sortedBrands = ORDER.map((k) => brands.find((b) => b.brand === k)!).filter(Boolean);

  // 헤드라인 메시지 — 인지(aware)를 메인 점수로, 추천(recommended)은 +α 보너스
  const measurable = summary.measurable || 0;
  const recommended = summary.recommended || 0;
  const aware = summary.aware || 0;
  const headline = aware === 0
    ? `측정된 ${measurable}개 AI 중 어디에서도 인지되지 않고 있어요`
    : aware < measurable
    ? `측정된 ${measurable}개 AI 중 ${aware}곳이 우리 사이트를 알고 있어요`
    : `측정된 ${measurable}개 AI 모두가 우리 사이트를 인지하고 있어요`;

  // 측정 가능 / 미지원 분리
  const supportedBrands = sortedBrands.filter((b) => b.status !== "unsupported");
  const unsupportedBrands = sortedBrands.filter((b) => b.status === "unsupported");

  // 톤은 인지율 기준으로 결정 (추천은 보너스)
  const tone =
    measurable === 0 ? "poor"
    : aware === 0 ? "poor"
    : aware < measurable ? "warning"
    : "excellent";

  // 한 줄 임팩트 메시지 + 톤 아이콘 — 인지 우선, 추천은 +α
  const heroMessage =
    measurable === 0
      ? { Icon: HelpCircle, title: "아직 측정할 수 없어요", sub: "AI에서 인식되려면 기본 SEO부터 정비가 필요해요" }
      : aware === 0
      ? { Icon: AlertTriangle, title: "AI가 아직 당신을 모릅니다", sub: `측정한 ${measurable}개 AI 모두 인지조차 못 하고 있어요` }
      : aware < measurable && recommended === 0
      ? { Icon: MehIcon, title: `${aware}개 AI는 알고 있어요`, sub: `남은 ${measurable - aware}곳도 알리면 추천 노출 기반이 생겨요` }
      : aware === measurable && recommended === 0
      ? { Icon: Zap, title: "모든 AI가 인지하고 있어요", sub: `이제 추천 노출(+α)을 노릴 차례예요 — 현재 추천 0/${measurable}` }
      : recommended < measurable
      ? { Icon: Zap, title: `인지 ${aware}/${measurable} · 추천 +${recommended}`, sub: `${recommended}곳에서 이미 추천돼요. 남은 ${measurable - recommended}곳도 잡으면 노출이 크게 늘어요` }
      : { Icon: Trophy, title: "모든 AI가 추천까지 하고 있어요!", sub: "잘하고 있어요 — 이 상태를 유지·확장하세요" };

  const toneClasses = {
    poor:      { text: "text-score-poor",      bg: "bg-score-poor/10",      border: "border-score-poor/20",      glow: "from-score-poor/10" },
    warning:   { text: "text-score-warning",   bg: "bg-score-warning/10",   border: "border-score-warning/20",   glow: "from-score-warning/10" },
    excellent: { text: "text-score-excellent", bg: "bg-score-excellent/10", border: "border-score-excellent/20", glow: "from-score-excellent/10" },
  }[tone];

  const ratioPct = measurable > 0 ? Math.round((aware / measurable) * 100) : 0;

  return (
    <div className="rounded-3xl bg-card border border-border overflow-hidden animate-fade-up shadow-card">
      <div className="relative px-5 sm:px-8 pt-6 pb-7 sm:pt-8 sm:pb-9 border-b border-border bg-muted/30 overflow-hidden">
        <div className={`absolute top-0 left-0 right-0 h-[3px] ${toneClasses.text.replace("text-", "bg-")}`} />

        <div className="relative flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="inline-flex items-center gap-2.5 pl-2.5 pr-3.5 py-1.5 rounded-full bg-white dark:bg-card border border-askai/20 shadow-sm">
            <span
              className="relative group/live inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-askai/10 cursor-help"
              tabIndex={0}
              role="button"
              aria-label="실시간으로 신호를 요약한 데모 표시"
            >
              <span className="relative flex w-1.5 h-1.5 items-center justify-center">
                <span className="absolute inline-flex w-full h-full rounded-full bg-askai animate-live-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-askai animate-live-pulse" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-askai">LIVE</span>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 whitespace-nowrap rounded-lg bg-foreground text-background text-[11px] font-medium px-2.5 py-1.5 shadow-lg opacity-0 group-hover/live:opacity-100 group-focus/live:opacity-100 transition-opacity duration-150"
              >
                실시간으로 신호를 요약한 데모 표시
                <span className="absolute left-1/2 -translate-x-1/2 -top-1 w-2 h-2 rotate-45 bg-foreground" />
              </span>
            </span>
            <span className="text-[13px] sm:text-sm font-semibold tracking-tight text-foreground">
              <span className="font-black bg-gradient-to-br from-askai to-askai-deep bg-clip-text text-transparent">Ask AI</span> · AI에게 직접 질문했어요 · <span className="font-black text-askai">{measurable}모델 동시 수집</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {data.cached && (
              <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md bg-muted/40">24h 캐시</span>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-score-excellent/10 text-score-excellent border border-score-excellent/20 hover:bg-score-excellent/20 transition-colors"
                title="캐시 비우고 재측정 (Admin)"
              >
                ↻ 캐시 비우기
              </button>
            )}
        {/* Hero — 숫자 + 메시지만 */}
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                <span className={`text-[44px] sm:text-[56px] leading-none font-black tabular-nums tracking-tighter ${toneClasses.text}`}>
                  {aware}
                </span>
                <span className="text-[18px] sm:text-[22px] font-bold text-muted-foreground tabular-nums">
                  / {measurable}
                </span>
                <span className="ml-1 text-[11px] sm:text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  AI가 인지
                </span>
                {recommended > 0 && (
                  <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-score-excellent/10 text-score-excellent border border-score-excellent/20 text-[10px] sm:text-[11px] font-bold tabular-nums">
                    +{recommended} 추천
                  </span>
                )}
              </div>
              <h3 className={`text-[18px] sm:text-[22px] leading-[1.25] font-extrabold tracking-tight ${toneClasses.text}`}>
                {heroMessage.title}
              </h3>
              <p className="text-[12px] sm:text-sm text-muted-foreground mt-1.5 leading-snug max-w-md">
                {heroMessage.sub}
              </p>
            </div>
            {onAnswerShareClick && (
              <button
                type="button"
                onClick={onAnswerShareClick}
                className="hidden sm:inline-flex shrink-0 flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all border border-primary/20 group"
                aria-label="AI 응답 점유율 측정"
              >
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  NEW · 무료
                </span>
                <span className="text-[13px] font-bold leading-tight whitespace-nowrap">
                  응답 점유율
                </span>
                <span className="text-[11px] font-semibold leading-tight whitespace-nowrap opacity-90">
                  측정하기 →
                </span>
              </button>
            )}
          </div>
          {onAnswerShareClick && (
            <button
              type="button"
              onClick={onAnswerShareClick}
              className="sm:hidden mt-4 w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-gradient-to-r from-primary to-primary/85 text-primary-foreground text-sm font-bold shadow-md active:scale-[0.98] transition-transform"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/20">NEW</span>
              AI 응답 점유율 측정하기
            </button>
          )}
        </div>
      </div>


      {/* Brand rows */}
      <div className="divide-y divide-border/60">
        {supportedBrands.map((b) => {
          const meta = BRAND_META[b.brand];
          const isExpanded = expandedBrand === b.brand;
          const canExpand = b.status === "ok" && (b.awarenessAnswer || b.recommendationAnswer);
          const isAware = b.awareness === "yes";
          const isRecommended = b.recommendation?.mentioned;

          return (
            <div key={b.brand}>
              <button
                type="button"
                onClick={() => {
                  if (!canExpand) return;
                  setExpandedBrand(isExpanded ? null : b.brand);
                  if (!isExpanded) trackEvent("ai_perception_brand_clicked", { brand: b.brand });
                }}
                className={`w-full px-4 sm:px-6 py-4 flex items-center gap-3.5 text-left ${canExpand ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"} transition-colors`}
              >
                {/* Official brand logo */}
                <div
                  className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-card border border-border flex items-center justify-center shrink-0 shadow-sm"
                  style={{ color: meta.brandColor }}
                >
                  <meta.Logo className="w-6 h-6 sm:w-[26px] sm:h-[26px]" />
                  {b.status === "ok" && (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-card ${
                      isAware ? "bg-score-excellent" : "bg-score-poor"
                    }`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm sm:text-[15px] font-bold text-foreground">{meta.name}</span>
                    <AwarenessBadge b={b} />
                    {isRecommended ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-score-excellent/10 text-score-excellent border border-score-excellent/20">
                        ✓ 추천
                      </span>
                    ) : b.status === "ok" ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-muted/40 text-muted-foreground border border-border">
                        추천 미노출
                      </span>
                    ) : null}
                  </div>
                  {b.status === "ok" && b.awarenessAnswer && (
                    <p className="mt-1 text-[12px] sm:text-[13px] text-muted-foreground line-clamp-1 italic">
                      “{b.awarenessAnswer.replace(/\s+/g, " ").trim()}”
                    </p>
                  )}
                </div>

                {canExpand && (
                  <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                )}
              </button>

              {isExpanded && b.status === "ok" && (
                <div className="px-4 sm:px-6 pb-4 pt-1 space-y-3 bg-muted/20 animate-fade-up border-t border-border/40">
                  {b.awarenessAnswer && (
                    <div className="rounded-lg bg-card/60 p-3 border border-border/40">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">인지도 응답</p>
                      <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-line">{b.awarenessAnswer}</p>
                    </div>
                  )}
                  {b.recommendationAnswer && (
                    <div className="rounded-lg bg-card/60 p-3 border border-border/40">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">추천 질의 응답</p>
                      <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-line">{b.recommendationAnswer}</p>
                    </div>
                  )}
                  {b.citations && b.citations.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">인용 출처</p>
                      <ul className="space-y-0.5">
                        {b.citations.slice(0, 5).map((c, i) => (
                          <li key={i} className="text-[11px] text-primary truncate">
                            <a href={c} target="_blank" rel="noopener noreferrer" className="hover:underline">{c}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {b.model && <p className="text-[10px] text-muted-foreground">모델: {b.model}</p>}
                </div>
              )}
            </div>
          );
        })}

        {/* Unsupported group */}
        {unsupportedBrands.length > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-muted/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">측정 대기 중 · 공식 API 미공개</p>
            <div className="flex flex-wrap gap-2">
              {unsupportedBrands.map((b) => {
                const meta = BRAND_META[b.brand];
                return (
                  <div key={b.brand} className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-card border border-border/60">
                    <div
                      className="w-5 h-5 rounded-full bg-card border border-border/60 flex items-center justify-center opacity-70"
                      style={{ color: meta.brandColor }}
                    >
                      <meta.Logo className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground">{meta.name}</span>
                    <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-6 py-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground flex items-center gap-1.5">
        <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground/40" />
        실제 AI에 같은 질문을 보내 받은 답변이에요. 24시간마다 캐시 갱신.
      </div>
    </div>
  );
}
