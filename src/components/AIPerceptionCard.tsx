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

const BRAND_META: Record<BrandKey, { name: string; color: string; ring: string }> = {
  chatgpt:    { name: "ChatGPT",    color: "text-emerald-600", ring: "ring-emerald-500/30" },
  claude:     { name: "Claude",     color: "text-orange-600",  ring: "ring-orange-500/30" },
  gemini:     { name: "Gemini",     color: "text-blue-600",    ring: "ring-blue-500/30" },
  perplexity: { name: "Perplexity", color: "text-cyan-600",    ring: "ring-cyan-500/30" },
  bing:       { name: "Copilot (Bing)", color: "text-sky-600", ring: "ring-sky-500/30" },
  naver:      { name: "Naver Cue:", color: "text-green-600",   ring: "ring-green-500/30" },
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

export default function AIPerceptionCard({ url, brand, category }: Props) {
  const [data, setData] = useState<ProbeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedBrand, setExpandedBrand] = useState<BrandKey | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data: resp, error: invErr } = await supabase.functions.invoke("probe-ai-perception", {
          body: { url, brand, category },
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
  }, [url, brand, category]);

  // ── Loading state
  if (loading) {
    return (
      <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm sm:text-base font-bold text-foreground">🤖 지금 AI는 당신을 이렇게 봅니다</h3>
        </div>
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          ChatGPT · Claude · Gemini · Perplexity에 직접 물어보는 중…
        </div>
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

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden animate-fade-up shadow-card">
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              🤖 지금 AI는 당신을 이렇게 봅니다
            </h3>
          </div>
          {data.cached && (
            <span className="text-[10px] text-muted-foreground/60">24h 캐시</span>
          )}
        </div>
        <p className={`mt-1 text-[12px] sm:text-[13px] font-semibold ${
          recommended === 0 ? "text-score-poor" : recommended < measurable ? "text-score-warning" : "text-score-excellent"
        }`}>
          → {headline}
        </p>
      </div>

      {/* Brand rows */}
      <div className="divide-y divide-border">
        {sortedBrands.map((b) => {
          const meta = BRAND_META[b.brand];
          const isExpanded = expandedBrand === b.brand;
          const canExpand = b.status === "ok" && (b.awarenessAnswer || b.recommendationAnswer);
          const isUnsupported = b.status === "unsupported";

          return (
            <div key={b.brand} className={isUnsupported ? "opacity-60" : ""}>
              <button
                type="button"
                onClick={() => {
                  if (!canExpand) return;
                  setExpandedBrand(isExpanded ? null : b.brand);
                  if (!isExpanded) trackEvent("ai_perception_brand_clicked", { brand: b.brand });
                }}
                className={`w-full px-5 sm:px-6 py-3 flex items-center gap-3 text-left ${canExpand ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"} transition-colors`}
              >
                <div className={`w-8 h-8 rounded-full bg-card ring-2 ${meta.ring} flex items-center justify-center shrink-0`}>
                  <span className={`text-[10px] font-extrabold ${meta.color}`}>{meta.name.slice(0, 2)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] sm:text-sm font-bold text-foreground">{meta.name}</span>
                    <AwarenessBadge b={b} />
                    <RecBadge b={b} />
                  </div>
                  {b.status === "ok" && b.awarenessAnswer && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                      “{b.awarenessAnswer.replace(/\s+/g, " ").trim()}”
                    </p>
                  )}
                  {isUnsupported && (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">공식 API가 미공개라 측정 대기 중이에요</p>
                  )}
                </div>
                {canExpand && (
                  <ChevronDown className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                )}
              </button>

              {isExpanded && b.status === "ok" && (
                <div className="px-5 sm:px-6 pb-4 space-y-3 bg-muted/10 animate-fade-up">
                  {b.awarenessAnswer && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">인지도 응답</p>
                      <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-line">{b.awarenessAnswer}</p>
                    </div>
                  )}
                  {b.recommendationAnswer && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">추천 질의 응답</p>
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
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-6 py-3 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
        실제 AI에 같은 질문을 보내 받은 답변이에요. 24시간마다 캐시 갱신.
      </div>
    </div>
  );
}
