import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, Copy, Check, AlertTriangle, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CostData {
  today_krw: number;
  last7_krw: number;
  month_krw: number;
  month_usd: number;
  by_provider: { provider: string; cost_krw: number; cost_usd: number; requests: number; tokens_in: number; tokens_out: number }[];
  by_function: { function_name: string; cost_krw: number; requests: number }[];
  by_model: { model: string; cost_krw: number; requests: number }[];
  daily: { date: string; cost_krw: number }[];
  budgets: { provider: string; notes: string | null; monthly_budget_krw: number; spent_krw: number; remaining_krw: number; used_pct: number; alert_threshold_pct: number; alert: boolean }[];
  generated_at: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  lovable_ai: "Lovable AI (Gemini/GPT)",
  perplexity: "Perplexity",
  firecrawl: "Firecrawl",
  psi: "PageSpeed Insights",
  other: "기타",
};

function won(n: number) {
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

export default function CostDashboard() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchCosts = async () => {
    setLoading(true);
    const pw = sessionStorage.getItem("admin_pw") || "";
    try {
      const { data: res } = await supabase.functions.invoke("admin-insights", {
        body: { password: pw, action: "costInsights" },
      });
      if (res && !res.error) setData(res as CostData);
    } catch (e) {
      console.warn("[CostDashboard]", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCosts(); }, []);

  const kakaoText = useMemo(() => {
    if (!data) return "";
    const now = new Date();
    const monthStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    const lines: string[] = [];
    lines.push(`📊 SearchTune OS API 비용 리포트`);
    lines.push(`(${now.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })})`);
    lines.push("");
    lines.push(`💰 ${monthStr} 누적: ${won(data.month_krw)}  (≈ $${data.month_usd.toFixed(2)})`);
    lines.push(`├ 오늘: ${won(data.today_krw)}`);
    lines.push(`└ 최근 7일: ${won(data.last7_krw)}`);
    lines.push("");
    lines.push(`🏢 공급자별 (이번달)`);
    for (const p of data.by_provider) {
      lines.push(`• ${PROVIDER_LABEL[p.provider] || p.provider}: ${won(p.cost_krw)} (${p.requests.toLocaleString()}회)`);
    }
    lines.push("");
    lines.push(`🪙 남은 예산`);
    for (const b of data.budgets) {
      const flag = b.alert ? "⚠️ " : "";
      const budget = b.monthly_budget_krw > 0 ? ` / ${won(b.monthly_budget_krw)}` : "";
      lines.push(`${flag}${PROVIDER_LABEL[b.provider] || b.provider}: ${won(b.remaining_krw)} 남음 (${b.used_pct}%${budget ? " 사용" + budget : ""})`);
    }
    lines.push("");
    lines.push(`🔧 함수별 TOP3`);
    for (const f of data.by_function.slice(0, 3)) {
      lines.push(`• ${f.function_name}: ${won(f.cost_krw)} (${f.requests}회)`);
    }
    lines.push("");
    lines.push(`⏳ 임시(추정) 추적 — 위 합계 미포함`);
    lines.push(`• analyze-naver-store, probe-ai-perception, track-serp-keywords`);
    lines.push(`  → 정밀 계측 적용 전, 실제 청구액 ±10~20% 더 클 수 있음`);
    return lines.join("\n");
  }, [data]);

  const copyKakao = async () => {
    if (!kakaoText) return;
    try {
      await navigator.clipboard.writeText(kakaoText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = kakaoText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          API 비용 / 크레딧 (정밀 추적)
        </CardTitle>
        <Button size="sm" variant="outline" onClick={fetchCosts} disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          새로고침
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!data ? (
          <p className="text-sm text-muted-foreground">{loading ? "로딩 중..." : "데이터 없음"}</p>
        ) : (
          <>
            {/* Top KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">오늘</p>
                <p className="text-lg font-bold text-foreground">{won(data.today_krw)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">최근 7일</p>
                <p className="text-lg font-bold text-foreground">{won(data.last7_krw)}</p>
              </div>
              <div className="rounded-lg border bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">이번 달 누적</p>
                <p className="text-lg font-bold text-primary">{won(data.month_krw)}</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">USD 환산</p>
                <p className="text-lg font-bold text-foreground">${data.month_usd.toFixed(2)}</p>
              </div>
            </div>

            {/* Budgets / remaining */}
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">남은 예산 (월)</p>
              <div className="space-y-2">
                {data.budgets.map((b) => (
                  <div key={b.provider} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium flex items-center gap-1.5 text-foreground">
                        {b.alert && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                        {PROVIDER_LABEL[b.provider] || b.provider}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {won(b.spent_krw)} / {won(b.monthly_budget_krw)}{" "}
                        <span className={b.alert ? "text-destructive font-bold" : ""}>({b.used_pct}%)</span>
                      </span>
                    </div>
                    {b.monthly_budget_krw > 0 && (
                      <Progress value={Math.min(b.used_pct, 100)} className="h-1.5" />
                    )}
                    <p className="text-xs mt-1 text-muted-foreground">
                      잔여 {won(b.remaining_krw)}
                      {b.notes && <span className="ml-2">· {b.notes}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* By provider table */}
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">공급자별 (이번 달)</p>
              <div className="text-xs">
                <div className="grid grid-cols-12 gap-2 px-2 py-1.5 font-medium text-muted-foreground border-b">
                  <div className="col-span-4">공급자</div>
                  <div className="col-span-3 text-right">비용</div>
                  <div className="col-span-2 text-right">요청수</div>
                  <div className="col-span-3 text-right">토큰 (입/출)</div>
                </div>
                {data.by_provider.map((p) => (
                  <div key={p.provider} className="grid grid-cols-12 gap-2 px-2 py-1.5 border-b last:border-b-0">
                    <div className="col-span-4 text-foreground">{PROVIDER_LABEL[p.provider] || p.provider}</div>
                    <div className="col-span-3 text-right tabular-nums text-foreground">{won(p.cost_krw)}</div>
                    <div className="col-span-2 text-right tabular-nums text-muted-foreground">{p.requests.toLocaleString()}</div>
                    <div className="col-span-3 text-right tabular-nums text-muted-foreground">
                      {(p.tokens_in / 1000).toFixed(1)}k / {(p.tokens_out / 1000).toFixed(1)}k
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* By function */}
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">함수별 (이번 달)</p>
              <div className="text-xs">
                {data.by_function.map((f) => (
                  <div key={f.function_name} className="grid grid-cols-12 gap-2 px-2 py-1.5 border-b last:border-b-0">
                    <div className="col-span-7 text-foreground font-mono">{f.function_name}</div>
                    <div className="col-span-3 text-right tabular-nums text-foreground">{won(f.cost_krw)}</div>
                    <div className="col-span-2 text-right tabular-nums text-muted-foreground">{f.requests}회</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estimated / temporary tracking notice */}
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1.5 text-foreground">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    ⏳ 일부 함수는 아직 <span className="underline">임시(추정)</span> 추적입니다
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    아래 함수들은 정밀 토큰 계측이 아직 적용되지 않아 위 표/예산에서 <b>제외</b>됐어요.
                    실제 청구액은 ±10~20% 더 클 수 있어요.
                  </p>
                  <ul className="text-muted-foreground space-y-0.5 ml-1 mt-1">
                    <li>• <code className="font-mono text-foreground">analyze-naver-store</code> <span className="text-amber-600">(임시)</span> — Firecrawl + Gemini 사용, 호출당 약 ₩10~15 추정</li>
                    <li>• <code className="font-mono text-foreground">probe-ai-perception</code> <span className="text-amber-600">(임시)</span> — Gemini + Perplexity + Claude 호출, 캐시 갱신 시 ₩20~40 추정</li>
                    <li>• <code className="font-mono text-foreground">psi-proxy</code> <span className="text-amber-600">(임시·무료)</span> — Google 무료 쿼터(25k/일), 비용 ₩0</li>
                    <li>• <code className="font-mono text-foreground">track-serp-keywords</code> <span className="text-amber-600">(임시)</span> — 매일 06:00 SERP, Firecrawl 호출당 ₩7 추정</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Kakao copy section */}
            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">📋 카톡 복사용 요약</p>
                <Button size="sm" onClick={copyKakao} variant={copied ? "default" : "outline"}>
                  {copied ? (
                    <><Check className="w-3 h-3 mr-1" /> 복사됨</>
                  ) : (
                    <><Copy className="w-3 h-3 mr-1" /> 복사하기</>
                  )}
                </Button>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-mono bg-background rounded p-3 text-foreground max-h-80 overflow-y-auto leading-relaxed">
{kakaoText}
              </pre>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
