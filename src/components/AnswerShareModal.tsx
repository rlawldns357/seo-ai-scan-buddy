import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, BarChart3, Quote, Trophy, Users, AlertCircle } from "lucide-react";
import { measureAnswerShare, type AnswerShareData } from "@/lib/answerShare";
import { trackEvent } from "@/lib/analytics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string;
  brand?: string;
  category?: string;
}

const LOADING_STEPS = [
  { label: "사이트 컨텍스트 분석", emoji: "🔍" },
  { label: "측정용 질문 5개 자동 생성", emoji: "✍️" },
  { label: "ChatGPT·Perplexity·Gemini·Claude 동시 질의", emoji: "🤖" },
  { label: "응답에서 브랜드 인용 분석", emoji: "🧩" },
  { label: "응답 점유율 계산", emoji: "📊" },
];

const ENGINE_NAME: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  gemini: "Gemini",
  claude: "Claude",
};

function ScoreBar({ label, value, Icon, color }: { label: string; value: number; Icon: any; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span className={`text-lg font-black tabular-nums ${color}`}>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color.replace("text-", "bg-")}`}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

// 세션 내 캐시 — 같은 URL/브랜드/카테고리 조합은 모달을 다시 열어도 재측정하지 않음
const sessionCache = new Map<string, AnswerShareData>();
const cacheKey = (url?: string, brand?: string, category?: string) =>
  `${url ?? ""}|${brand ?? ""}|${category ?? ""}`;

export default function AnswerShareModal({ open, onOpenChange, url, brand, category }: Props) {
  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnswerShareData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !url) return;
    const key = cacheKey(url, brand, category);

    // 캐시 히트 — 즉시 표시, 네트워크 호출 없음
    const cached = sessionCache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);
    setStepIdx(0);

    trackEvent("answer_share_measure_start", { url });

    (async () => {
      const { data: res, error: err } = await measureAnswerShare({ url, brand, category });
      if (cancelled) return;
      if (err || !res) {
        setError(err || "측정에 실패했어요.");
        setLoading(false);
        trackEvent("answer_share_measure_error", { url, error: err });
        return;
      }
      sessionCache.set(key, res);
      setData(res);
      setLoading(false);
      trackEvent("answer_share_measure_done", {
        url,
        response_share: res.responseShare,
        citation_share: res.citationShare,
        first_mention_share: res.firstMentionShare,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [open, url, brand, category]);

  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
    }, 8000);
    return () => clearInterval(id);
  }, [loading]);

  // 경쟁사 + 본인 정렬용
  const competitorRows = data
    ? Object.entries(data.competitorShare)
        .map(([name, share]) => ({ name, share, isUs: false }))
        .concat([{ name: data.brand, share: data.responseShare, isUs: true }])
        .sort((a, b) => b.share - a.share)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
            AI 응답 점유율 측정
          </DialogTitle>
          <DialogDescription>
            ChatGPT·Perplexity·Gemini·Claude가 카테고리 질문에 답할 때 우리 브랜드를 얼마나 추천하는지
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-4 py-4">
            <ul className="space-y-2">
              {LOADING_STEPS.map((s, i) => {
                const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
                return (
                  <li
                    key={s.label}
                    className={`flex items-center gap-3 text-sm transition-all ${
                      state === "active" ? "text-foreground font-medium" : "text-muted-foreground"
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
                    <span>
                      {s.label}
                      {state === "active" ? "…" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground text-center pt-2">
              30~60초 정도 걸려요. 잠시만 기다려 주세요.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 p-4 rounded-lg bg-score-poor/10 border border-score-poor/20">
            <AlertCircle className="w-4 h-4 text-score-poor shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">{error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-5">
            {/* 헤드라인 */}
            <div className="rounded-2xl bg-muted/30 border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">
                <span className="font-semibold text-foreground">{data.brand}</span> · {data.category} · 질문 {data.queries.length}개 × 엔진 4개 = 응답 {data.totalResponses}개
              </p>
              <h3 className="text-base font-bold text-foreground">
                {data.responseShare === 0
                  ? "AI 답변에 거의 등장하지 않아요"
                  : data.responseShare < 30
                  ? `AI 답변의 ${data.responseShare}%에만 등장해요`
                  : data.responseShare < 60
                  ? `AI 답변의 ${data.responseShare}%에 등장해요 — 키울 여지 있음`
                  : `AI 답변의 ${data.responseShare}%에 등장 — 잘하고 있어요`}
              </h3>
            </div>

            {/* 4대 지표 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ScoreBar label="응답 점유율" value={data.responseShare} Icon={BarChart3} color="text-primary" />
              <ScoreBar label="1순위 점유율" value={data.firstMentionShare} Icon={Trophy} color="text-score-excellent" />
              <ScoreBar label="인용 점유율" value={data.citationShare} Icon={Quote} color="text-accent" />
              <ScoreBar
                label={data.avgBrandPosition ? `평균 순위 ${data.avgBrandPosition}위` : "평균 순위 N/A"}
                value={data.avgBrandPosition ? Math.max(0, 100 - data.avgBrandPosition * 10) : 0}
                Icon={Users}
                color="text-score-good"
              />
            </div>

            {/* 경쟁사 비교 */}
            {competitorRows.length > 1 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> 경쟁사 대비 점유율
                </h4>
                <div className="space-y-1.5">
                  {competitorRows.map((row) => (
                    <div key={row.name} className="flex items-center gap-2">
                      <span className={`text-xs w-24 truncate ${row.isUs ? "font-bold text-primary" : "text-foreground"}`}>
                        {row.isUs ? `${row.name} (당신)` : row.name}
                      </span>
                      <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.isUs ? "bg-primary" : "bg-muted-foreground/40"}`}
                          style={{ width: `${Math.min(100, row.share)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums w-10 text-right">{row.share}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 엔진별 */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground">엔진별 점유율</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(data.byEngine).map(([eng, v]) => (
                  <div key={eng} className="rounded-lg border border-border p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                      {ENGINE_NAME[eng] ?? eng}
                    </div>
                    <div className="text-base font-bold tabular-nums text-foreground mt-0.5">
                      {v.share}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {v.mentioned}/{v.total}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 미노출 질문 */}
            {data.missedQueries.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-foreground">
                  미노출 질문 ({data.missedQueries.length}개)
                </h4>
                <p className="text-xs text-muted-foreground">
                  어떤 AI에서도 우리 브랜드가 등장하지 않은 질문이에요. 콘텐츠 개선 우선순위로 활용하세요.
                </p>
                <ul className="space-y-1">
                  {data.missedQueries.map((q) => (
                    <li key={q} className="text-sm text-foreground bg-muted/30 px-3 py-2 rounded-lg">
                      · {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 사용된 질문 (전체) */}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                사용된 측정 질문 보기 ({data.queries.length}개)
              </summary>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {data.queries.map((q) => (
                  <li key={q}>· {q}</li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
