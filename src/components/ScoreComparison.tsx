import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, History, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type DemoResult } from "@/data/demoResults";

interface HistoryRecord {
  seo_score: number;
  aeo_score: number;
  geo_score: number;
  created_at: string;
}

interface ScoreComparisonProps {
  url: string;
  currentResult: DemoResult;
}

function ScoreDelta({ label, current, previous, color }: {
  label: string;
  current: number;
  previous: number;
  color: string;
}) {
  const diff = current - previous;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{previous}점</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-sm font-bold text-foreground">{current}점</span>
        {diff !== 0 ? (
          <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
            isUp ? "bg-score-excellent/10 text-score-excellent" : "bg-score-poor/10 text-score-poor"
          }`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? "+" : ""}{diff}
          </span>
        ) : (
          <span className="inline-flex items-center gap-0.5 text-xs font-medium text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
            <Minus className="w-3 h-3" />0
          </span>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });
}

export default function ScoreComparison({ url, currentResult }: ScoreComparisonProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      // Normalize URL for matching
      const normalizedUrl = url.replace(/\/+$/, "").toLowerCase();

      const { data } = await supabase
        .from("analysis_history")
        .select("seo_score, aeo_score, geo_score, created_at")
        .eq("url", normalizedUrl)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        // Exclude the most recent record (which is the current analysis)
        // by comparing scores and very recent timestamp (within 30s)
        const now = Date.now();
        const filtered = data.filter((r) => {
          const age = now - new Date(r.created_at).getTime();
          const sameScores =
            r.seo_score === currentResult.seoScore &&
            r.aeo_score === currentResult.aeoScore &&
            r.geo_score === currentResult.geoScore;
          return !(sameScores && age < 30_000);
        });
        setHistory(filtered);
      }
      setLoading(false);
    }
    fetchHistory();
  }, [url, currentResult]);

  if (loading || history.length === 0) return null;

  const prev = history[0];
  const totalDiff =
    (currentResult.seoScore - prev.seo_score) +
    (currentResult.aeoScore - prev.aeo_score) +
    (currentResult.geoScore - prev.geo_score);

  return (
    <div className="bg-card rounded-xl shadow-card p-5 animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">이전 분석과 비교</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" />
          {formatDate(prev.created_at)}
        </div>
      </div>

      <div className="divide-y divide-border">
        <ScoreDelta label="SEO" current={currentResult.seoScore} previous={prev.seo_score} color="bg-primary" />
        <ScoreDelta label="AEO" current={currentResult.aeoScore} previous={prev.aeo_score} color="bg-accent" />
        <ScoreDelta label="GEO" current={currentResult.geoScore} previous={prev.geo_score} color="bg-score-excellent" />
      </div>

      <div className={`mt-3 pt-3 border-t border-border flex items-center justify-center gap-2 text-sm font-semibold ${
        totalDiff > 0 ? "text-score-excellent" : totalDiff < 0 ? "text-score-poor" : "text-muted-foreground"
      }`}>
        {totalDiff > 0 ? (
          <><TrendingUp className="w-4 h-4" /> 전체 {totalDiff}점 상승 🎉</>
        ) : totalDiff < 0 ? (
          <><TrendingDown className="w-4 h-4" /> 전체 {Math.abs(totalDiff)}점 하락</>
        ) : (
          <><Minus className="w-4 h-4" /> 점수 변동 없음</>
        )}
      </div>

      {history.length > 1 && (
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          총 {history.length}회 분석 기록이 있습니다
        </p>
      )}
    </div>
  );
}

/** Save current analysis result to history */
export async function saveAnalysisHistory(url: string, result: DemoResult) {
  const normalizedUrl = url.replace(/\/+$/, "").toLowerCase();
  try {
    await supabase.from("analysis_history").insert({
      url: normalizedUrl,
      seo_score: result.seoScore,
      aeo_score: result.aeoScore,
      geo_score: result.geoScore,
      result_data: result as any,
    });
  } catch (e) {
    console.warn("Failed to save analysis history:", e);
  }
}
