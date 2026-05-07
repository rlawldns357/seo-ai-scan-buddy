import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Lock, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

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
}

const BRAND_META: Record<BrandKey, { name: string; short: string; gradient: string; ring: string; dot: string }> = {
  chatgpt:    { name: "ChatGPT",        short: "GP", gradient: "from-emerald-400 to-teal-500",   ring: "ring-emerald-500/20", dot: "bg-emerald-500" },
  claude:     { name: "Claude",         short: "CL", gradient: "from-orange-400 to-amber-500",   ring: "ring-orange-500/20",  dot: "bg-orange-500" },
  gemini:     { name: "Gemini",         short: "GE", gradient: "from-blue-400 to-indigo-500",    ring: "ring-blue-500/20",    dot: "bg-blue-500" },
  perplexity: { name: "Perplexity",     short: "PX", gradient: "from-cyan-400 to-sky-500",       ring: "ring-cyan-500/20",    dot: "bg-cyan-500" },
  bing:       { name: "Copilot (Bing)", short: "CO", gradient: "from-sky-300 to-blue-400",       ring: "ring-sky-400/20",     dot: "bg-sky-400" },
  naver:      { name: "Naver Cue:",     short: "NA", gradient: "from-green-400 to-emerald-500",  ring: "ring-green-500/20",   dot: "bg-green-500" },
};

const ORDER: BrandKey[] = ["chatgpt", "claude", "gemini", "perplexity", "bing", "naver"];

function AwarenessBadge({ b }: { b: BrandResult }) {
  if (b.status === "unsupported") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
        <Lock className="w-2.5 h-2.5" /> 곧 지원
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
  { label: "ChatGPT에 질문하는 중", emoji: "💬" },
  { label: "Claude에 질문하는 중", emoji: "🧠" },
  { label: "Gemini에 질문하는 중", emoji: "✨" },
  { label: "Perplexity에 질문하는 중", emoji: "🔎" },
  { label: "응답을 분석하는 중", emoji: "🧩" },
];

export default function AIPerceptionCard({ url, brand, category }: Props) {
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
                  "text-muted-foreground/50"
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

  // 헤드라인 메시지
  const measurable = summary.measurable || 0;
  const recommended = summary.recommended || 0;
  const headline = recommended === 0
    ? `측정된 ${measurable}개 AI 중 어디에서도 추천되지 않고 있어요`
    : `측정된 ${measurable}개 AI 중 ${recommended}곳에서만 추천돼요`;

  // 측정 가능 / 미지원 분리
  const supportedBrands = sortedBrands.filter((b) => b.status !== "unsupported");
  const unsupportedBrands = sortedBrands.filter((b) => b.status === "unsupported");
  const aware = summary.aware || 0;

  const tone =
    recommended === 0 ? "poor" : recommended < measurable ? "warning" : "excellent";
  const toneClasses = {
    poor:      { text: "text-score-poor",      bg: "bg-score-poor/10",      border: "border-score-poor/20",      glow: "from-score-poor/10" },
    warning:   { text: "text-score-warning",   bg: "bg-score-warning/10",   border: "border-score-warning/20",   glow: "from-score-warning/10" },
    excellent: { text: "text-score-excellent", bg: "bg-score-excellent/10", border: "border-score-excellent/20", glow: "from-score-excellent/10" },
  }[tone];

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden animate-fade-up shadow-card">
      {/* Header */}
      <div className={`relative px-5 sm:px-6 py-5 border-b border-border bg-gradient-to-br ${toneClasses.glow} via-transparent to-transparent`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-foreground leading-tight">
                지금 AI는 당신을 이렇게 봅니다
              </h3>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">실제 AI 4종에 동일 질문을 보낸 결과</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {data.cached && (
              <span className="text-[10px] text-muted-foreground/60 px-1.5 py-0.5 rounded-md bg-muted/40">24h 캐시</span>
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
          </div>
        </div>

        {/* KPI chips */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-card/60 backdrop-blur border border-border/60 px-3 py-2">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">측정</p>
            <p className="text-base sm:text-lg font-extrabold text-foreground tabular-nums">{measurable}<span className="text-[11px] font-medium text-muted-foreground">/4</span></p>
          </div>
          <div className={`rounded-xl bg-card/60 backdrop-blur border ${aware > 0 ? "border-score-excellent/30" : "border-border/60"} px-3 py-2`}>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">인지</p>
            <p className={`text-base sm:text-lg font-extrabold tabular-nums ${aware > 0 ? "text-score-excellent" : "text-muted-foreground"}`}>{aware}<span className="text-[11px] font-medium text-muted-foreground">/{measurable || 4}</span></p>
          </div>
          <div className={`rounded-xl bg-card/60 backdrop-blur border ${recommended > 0 ? toneClasses.border : "border-score-poor/20"} px-3 py-2`}>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">추천</p>
            <p className={`text-base sm:text-lg font-extrabold tabular-nums ${recommended > 0 ? toneClasses.text : "text-score-poor"}`}>{recommended}<span className="text-[11px] font-medium text-muted-foreground">/{measurable || 4}</span></p>
          </div>
        </div>

        <p className={`mt-3 text-[12px] sm:text-[13px] font-semibold ${toneClasses.text} flex items-center gap-1.5`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${toneClasses.text.replace("text-", "bg-")}`} />
          {headline}
        </p>
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
                className={`w-full px-4 sm:px-6 py-3.5 flex items-center gap-3 text-left ${canExpand ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"} transition-colors`}
              >
                {/* Avatar */}
                <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                  <span className="text-[11px] font-extrabold text-white tracking-tight">{meta.short}</span>
                  {b.status === "ok" && (
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card ${
                      isAware ? "bg-score-excellent" : "bg-score-poor"
                    }`} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[13px] sm:text-sm font-bold text-foreground">{meta.name}</span>
                    <AwarenessBadge b={b} />
                    {isRecommended ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-score-excellent/10 text-score-excellent border border-score-excellent/20">
                        ✓ 추천
                      </span>
                    ) : b.status === "ok" ? (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-muted/40 text-muted-foreground border border-border">
                        추천 미노출
                      </span>
                    ) : null}
                  </div>
                  {b.status === "ok" && b.awarenessAnswer && (
                    <p className="mt-1 text-[11px] sm:text-[12px] text-muted-foreground line-clamp-1 italic">
                      “{b.awarenessAnswer.replace(/\s+/g, " ").trim()}”
                    </p>
                  )}
                </div>

                {canExpand && (
                  <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground/60 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
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
                  {b.model && <p className="text-[10px] text-muted-foreground/60">모델: {b.model}</p>}
                </div>
              )}
            </div>
          );
        })}

        {/* Unsupported group */}
        {unsupportedBrands.length > 0 && (
          <div className="px-4 sm:px-6 py-3 bg-muted/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">측정 대기 중 · 공식 API 미공개</p>
            <div className="flex flex-wrap gap-2">
              {unsupportedBrands.map((b) => {
                const meta = BRAND_META[b.brand];
                return (
                  <div key={b.brand} className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-card border border-border/60">
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${meta.gradient} opacity-60 flex items-center justify-center`}>
                      <span className="text-[8px] font-extrabold text-white">{meta.short}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-muted-foreground">{meta.name}</span>
                    <Lock className="w-2.5 h-2.5 text-muted-foreground/60" />
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
