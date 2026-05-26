import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, RefreshCw, Copy, Check, AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CostData {
  today_krw: number; last7_krw: number; month_krw: number; month_usd: number;
  by_provider: { provider: string; cost_krw: number; cost_usd: number; requests: number; tokens_in: number; tokens_out: number }[];
  by_function: { function_name: string; cost_krw: number; requests: number }[];
  by_model: { model: string; cost_krw: number; requests: number }[];
  daily: { date: string; cost_krw: number }[];
  budgets: { provider: string; notes: string | null; monthly_budget_krw: number; spent_krw: number; remaining_krw: number; used_pct: number; alert_threshold_pct: number; alert: boolean }[];
  generated_at: string;
}

interface BalanceSnapshot {
  id: string; provider: string; label: string | null;
  used_usd: number; limit_usd: number | null;
  topup_used_usd: number; topup_balance_usd: number;
  period_resets_at: string | null; notes: string | null; snapshot_at: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  lovable_ai: "Lovable AI (Gemini/GPT)",
  perplexity: "Perplexity", firecrawl: "Firecrawl",
  psi: "PageSpeed Insights", anthropic: "Anthropic Claude",
  clova: "Naver CLOVA Studio", naver: "Naver Search API", other: "기타",
};

const PRESET_PROVIDERS = [
  { key: "lovable_cloud", label: "Lovable Cloud (Supabase)" },
  { key: "lovable_ai", label: "Lovable AI Gateway" },
  { key: "lovable_topup", label: "Lovable Top-up Balance" },
];

const won = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;
const usd = (n: number) => `$${n.toFixed(2)}`;

export default function CostDashboard() {
  const [data, setData] = useState<CostData | null>(null);
  const [balances, setBalances] = useState<BalanceSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    provider: "lovable_cloud", label: "", used_usd: "", limit_usd: "",
    topup_used_usd: "", topup_balance_usd: "", notes: "",
  });

  const fetchAll = async () => {
    setLoading(true);
    const pw = sessionStorage.getItem("admin_pw") || "";
    try {
      const [{ data: cost }, { data: bal }] = await Promise.all([
        supabase.functions.invoke("admin-insights", { body: { password: pw, action: "costInsights" } }),
        supabase.functions.invoke("admin-insights", { body: { password: pw, action: "getExternalBalances" } }),
      ]);
      if (cost && !cost.error) setData(cost as CostData);
      if (bal && !bal.error) setBalances(bal.latest as BalanceSnapshot[]);
    } catch (e) { console.warn("[CostDashboard]", e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveSnapshot = async () => {
    const pw = sessionStorage.getItem("admin_pw") || "";
    const preset = PRESET_PROVIDERS.find((p) => p.key === form.provider);
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: {
        password: pw, action: "saveExternalBalance",
        snapshot: { ...form, label: form.label || preset?.label },
      },
    });
    if (res?.success) {
      setShowForm(false);
      setForm({ provider: "lovable_cloud", label: "", used_usd: "", limit_usd: "", topup_used_usd: "", topup_balance_usd: "", notes: "" });
      fetchAll();
    } else {
      alert(`저장 실패: ${res?.error || "unknown"}`);
    }
  };

  // 보수적 최댓값: 정밀 추적(KRW) + 모든 외부 스냅샷(무료 used + 충전 used) 합산
  const totals = useMemo(() => {
    const krwPerUsd = data && data.month_usd > 0 ? data.month_krw / data.month_usd : 1380;
    const snapshotFreeUsd = balances.reduce((s, b) => s + (Number(b.used_usd) || 0), 0);
    const snapshotTopupUsd = balances.reduce((s, b) => s + (Number(b.topup_used_usd) || 0), 0);
    const snapshotUsedUsd = snapshotFreeUsd + snapshotTopupUsd;
    const snapshotUsedKrw = snapshotUsedUsd * krwPerUsd;
    const preciseKrw = data?.month_krw || 0;
    const preciseUsd = data?.month_usd || 0;
    return {
      krwPerUsd,
      snapshotFreeUsd,
      snapshotTopupUsd,
      snapshotUsedUsd,
      snapshotUsedKrw,
      preciseKrw,
      preciseUsd,
      totalKrw: preciseKrw + snapshotUsedKrw,
      totalUsd: preciseUsd + snapshotUsedUsd,
    };
  }, [data, balances]);

  const kakaoText = useMemo(() => {
    if (!data) return "";
    const now = new Date();
    const monthStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    const lines: string[] = [];
    const t = totals;

    lines.push(`📊 SearchTune OS API 비용 리포트`);
    lines.push(`(${now.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })})`);
    lines.push("");
    lines.push(`💸 ${monthStr} 총 사용액 (보수적 최댓값): ${won(t.totalKrw)}  (≈ $${t.totalUsd.toFixed(2)})`);
    lines.push(`├ 정밀 추적(API): ${won(t.preciseKrw)}  (≈ $${t.preciseUsd.toFixed(2)})`);
    if (t.snapshotUsedUsd > 0) {
      lines.push(`└ 외부 스냅샷: $${t.snapshotUsedUsd.toFixed(2)} (≈ ${won(t.snapshotUsedKrw)})`);
      lines.push(`   ├ 무료 한도 사용: $${t.snapshotFreeUsd.toFixed(2)}`);
      lines.push(`   └ 충전 잔액 사용: $${t.snapshotTopupUsd.toFixed(2)}`);
    } else {
      lines.push(`└ 외부 스냅샷: 없음`);
    }
    lines.push("");
    lines.push(`✅ 정밀 추적 (api_cost_log)`);
    lines.push(`💰 ${monthStr} 누적: ${won(data.month_krw)}  (≈ $${data.month_usd.toFixed(2)})`);
    lines.push(`├ 오늘: ${won(data.today_krw)}`);
    lines.push(`└ 최근 7일: ${won(data.last7_krw)}`);
    lines.push("");
    if (balances.length > 0) {
      lines.push(`📦 외부 잔액 스냅샷 (수동 입력)`);
      for (const b of balances) {
        const lim = b.limit_usd ? `${usd(b.used_usd)}/${usd(b.limit_usd)}` : usd(b.used_usd);
        const topUsed = b.topup_used_usd > 0 ? ` · 충전사용 ${usd(b.topup_used_usd)}` : "";
        const topBal = b.topup_balance_usd > 0 ? ` · 충전잔액 ${usd(b.topup_balance_usd)}` : "";
        lines.push(`• ${b.label || b.provider}: 무료 ${lim}${topUsed}${topBal}`);
      }
      lines.push(`(스냅샷 시각: ${new Date(balances[0].snapshot_at).toLocaleString("ko-KR")})`);
      lines.push("");
    }
    lines.push(`🏢 공급자별 (이번달)`);
    for (const p of data.by_provider) {
      lines.push(`• ${PROVIDER_LABEL[p.provider] || p.provider}: ${won(p.cost_krw)} (${p.requests.toLocaleString()}회)`);
    }
    return lines.join("\n");
  }, [data, balances, totals]);


  const copyKakao = async () => {
    if (!kakaoText) return;
    try { await navigator.clipboard.writeText(kakaoText); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = kakaoText; document.body.appendChild(ta);
      ta.select(); document.execCommand("copy"); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* === 외부 잔액 (수동 스냅샷, 오차 0 보장) === */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            외부 잔액 스냅샷
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">확정값 · 수동</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-3 h-3 mr-1" /> 새 스냅샷
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Lovable Cloud / Lovable AI 잔액은 공식 API가 없어서, 대시보드(<code>/projects/.../settings/usage</code>)에서 본 숫자를 직접 입력해요. 가장 최근 스냅샷 = 진실.
          </p>

          {balances.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">스냅샷이 아직 없어요. "새 스냅샷"으로 입력하세요.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {balances.map((b) => {
                const usedPct = b.limit_usd ? Math.round((b.used_usd / b.limit_usd) * 100) : null;
                const alert = usedPct != null && usedPct >= 80;
                return (
                  <div key={b.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                        {alert ? <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {b.label || b.provider}
                      </p>
                    </div>
                    {b.limit_usd != null && (
                      <>
                        <p className="text-lg font-bold text-foreground tabular-nums">
                          {usd(b.used_usd)} <span className="text-xs text-muted-foreground font-normal">/ {usd(b.limit_usd)}</span>
                        </p>
                        <Progress value={Math.min(usedPct ?? 0, 100)} className="h-1.5 mt-1" />
                      </>
                    )}
                    {b.topup_balance_usd > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        충전 잔액 <span className="font-semibold text-foreground">{usd(b.topup_balance_usd)}</span>
                        {b.topup_used_usd > 0 && <> · 사용 {usd(b.topup_used_usd)}</>}
                      </p>
                    )}
                    {b.notes && <p className="text-xs text-muted-foreground mt-1.5">📝 {b.notes}</p>}
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {new Date(b.snapshot_at).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {showForm && (
            <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
              <p className="text-sm font-semibold">새 스냅샷 입력</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">공급자</Label>
                  <select className="w-full mt-1 h-9 rounded-md border bg-background px-2 text-sm" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
                    {PRESET_PROVIDERS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                    <option value="custom">기타 (커스텀)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">표시 이름 (선택)</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="예: Cloud + AI" className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">사용액 USD (예: 20.33)</Label>
                  <Input type="number" step="0.01" value={form.used_usd} onChange={(e) => setForm({ ...form, used_usd: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">월 한도 USD (예: 25)</Label>
                  <Input type="number" step="0.01" value={form.limit_usd} onChange={(e) => setForm({ ...form, limit_usd: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">충전 사용액 USD</Label>
                  <Input type="number" step="0.01" value={form.topup_used_usd} onChange={(e) => setForm({ ...form, topup_used_usd: e.target.value })} className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs">충전 잔액 USD</Label>
                  <Input type="number" step="0.01" value={form.topup_balance_usd} onChange={(e) => setForm({ ...form, topup_balance_usd: e.target.value })} className="mt-1 h-9" />
                </div>
              </div>
              <div>
                <Label className="text-xs">메모 (선택)</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 h-9" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={saveSnapshot}>저장</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === 정밀 추적 (api_cost_log) === */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            API 호출 정밀 추적
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">확정값 · 자동</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />새로고침
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data ? (
            <p className="text-sm text-muted-foreground">{loading ? "로딩 중..." : "데이터 없음"}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                모든 외부 API 호출에 <code>logApiCost()</code> 적용 — analyze-site, generate-blog-post, update-analysis-engine, analyze-naver-store, probe-ai-perception, track-serp-keywords, psi-proxy 전부 포함.
              </p>
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

              {data.budgets.length > 0 && (
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
                        {b.monthly_budget_krw > 0 && <Progress value={Math.min(b.used_pct, 100)} className="h-1.5" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

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

              <div>
                <p className="text-sm font-semibold mb-2 text-foreground">함수별 (이번 달)</p>
                <div className="text-xs">
                  {data.by_function.slice(0, 10).map((f) => (
                    <div key={f.function_name} className="grid grid-cols-12 gap-2 px-2 py-1.5 border-b last:border-b-0">
                      <div className="col-span-7 text-foreground font-mono">{f.function_name}</div>
                      <div className="col-span-3 text-right tabular-nums text-foreground">{won(f.cost_krw)}</div>
                      <div className="col-span-2 text-right tabular-nums text-muted-foreground">{f.requests}회</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">📋 카톡 복사용 요약</p>
                  <Button size="sm" onClick={copyKakao} variant={copied ? "default" : "outline"}>
                    {copied ? <><Check className="w-3 h-3 mr-1" /> 복사됨</> : <><Copy className="w-3 h-3 mr-1" /> 복사하기</>}
                  </Button>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono bg-background rounded p-3 text-foreground max-h-80 overflow-y-auto leading-relaxed">{kakaoText}</pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
