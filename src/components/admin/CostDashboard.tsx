import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, Copy, Check, AlertTriangle } from "lucide-react";
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
    <div className="space-y-5">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4" />
          <span className="br-label">API COST · PRECISE TRACKING</span>
        </div>
        <button className="br-btn-ghost" onClick={fetchCosts} disabled={loading}>
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {!data ? (
        <div className="br-card-flat p-6 text-center">
          <p className="br-label">{loading ? "// LOADING..." : "// NO DATA"}</p>
        </div>
      ) : (
        <>
          {/* Top KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="br-card p-4">
              <p className="br-label">Today</p>
              <p className="br-num text-2xl mt-2">{won(data.today_krw)}</p>
            </div>
            <div className="br-card p-4">
              <p className="br-label">Last 7 Days</p>
              <p className="br-num text-2xl mt-2">{won(data.last7_krw)}</p>
            </div>
            <div className="br-card-accent p-4">
              <p className="br-label">This Month</p>
              <p className="br-num text-2xl mt-2">{won(data.month_krw)}</p>
            </div>
            <div className="br-card-ink p-4">
              <p className="br-label" style={{ color: "#fff", opacity: 0.6 }}>USD</p>
              <p className="br-num text-2xl mt-2">${data.month_usd.toFixed(2)}</p>
            </div>
          </div>

          {/* Budgets */}
          <div className="br-card-flat">
            <div className="border-b-2 border-black px-4 py-2.5 flex items-center justify-between bg-black text-white">
              <span className="br-label" style={{ color: "#fff" }}>// MONTHLY BUDGET</span>
              <span className="br-tag-accent">REMAINING</span>
            </div>
            <div className="p-4 space-y-3">
              {data.budgets.map((b) => (
                <div key={b.provider} className={`border-2 border-black p-3 ${b.alert ? "bg-[#ffe600]" : "bg-white"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider">
                      {b.alert && <AlertTriangle className="w-3.5 h-3.5" />}
                      {PROVIDER_LABEL[b.provider] || b.provider}
                    </span>
                    <span className="br-num text-xs">
                      {won(b.spent_krw)} / {won(b.monthly_budget_krw)}{" "}
                      <span className={b.alert ? "font-black" : ""}>({b.used_pct}%)</span>
                    </span>
                  </div>
                  {b.monthly_budget_krw > 0 && (
                    <div className="h-2 border-2 border-black bg-white relative overflow-hidden">
                      <div className="h-full bg-black" style={{ width: `${Math.min(b.used_pct, 100)}%` }} />
                    </div>
                  )}
                  <p className="br-label mt-2">
                    REMAINING · {won(b.remaining_krw)}
                    {b.notes && <span className="ml-2 normal-case tracking-normal">· {b.notes}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* By provider */}
          <div className="br-card-flat">
            <div className="border-b-2 border-black px-4 py-2.5 bg-black text-white">
              <span className="br-label" style={{ color: "#fff" }}>// BY PROVIDER (THIS MONTH)</span>
            </div>
            <div className="text-xs">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 font-bold uppercase tracking-wider border-b-2 border-black bg-[#fafaf7]">
                <div className="col-span-4">Provider</div>
                <div className="col-span-3 text-right">Cost</div>
                <div className="col-span-2 text-right">Reqs</div>
                <div className="col-span-3 text-right">Tokens (in/out)</div>
              </div>
              {data.by_provider.map((p, i) => (
                <div key={p.provider} className={`grid grid-cols-12 gap-2 px-4 py-2.5 border-b-2 border-black last:border-b-0 ${i % 2 ? "bg-[#fafaf7]" : "bg-white"}`}>
                  <div className="col-span-4 font-bold">{PROVIDER_LABEL[p.provider] || p.provider}</div>
                  <div className="col-span-3 text-right br-num">{won(p.cost_krw)}</div>
                  <div className="col-span-2 text-right br-num opacity-60">{p.requests.toLocaleString()}</div>
                  <div className="col-span-3 text-right br-num opacity-60">
                    {(p.tokens_in / 1000).toFixed(1)}k / {(p.tokens_out / 1000).toFixed(1)}k
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By function */}
          <div className="br-card-flat">
            <div className="border-b-2 border-black px-4 py-2.5 bg-black text-white">
              <span className="br-label" style={{ color: "#fff" }}>// BY FUNCTION (THIS MONTH)</span>
            </div>
            <div className="text-xs">
              {data.by_function.map((f, i) => (
                <div key={f.function_name} className={`grid grid-cols-12 gap-2 px-4 py-2.5 border-b-2 border-black last:border-b-0 ${i % 2 ? "bg-[#fafaf7]" : "bg-white"}`}>
                  <div className="col-span-7 font-mono font-bold truncate">{f.function_name}</div>
                  <div className="col-span-3 text-right br-num">{won(f.cost_krw)}</div>
                  <div className="col-span-2 text-right br-num opacity-60">{f.requests}x</div>
                </div>
              ))}
            </div>
          </div>

          {/* Kakao copy */}
          <div className="br-card-accent p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="br-tag">// KAKAO REPORT</span>
              <button className="br-btn" onClick={copyKakao}>
                {copied ? (<><Check className="w-3 h-3" /> COPIED</>) : (<><Copy className="w-3 h-3" /> COPY</>)}
              </button>
            </div>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-white border-2 border-black p-3 max-h-80 overflow-y-auto leading-relaxed">
{kakaoText}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
