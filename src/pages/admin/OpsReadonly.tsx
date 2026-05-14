import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

type Task = {
  type: "naver_submit" | "google_check" | "content_fix" | "monitor" | "deploy_issue";
  priority: "high" | "medium" | "low";
  title: string;
  url?: string;
  canonical_url?: string;
  reason: string;
  recommended_action: string;
};

type OpsData = {
  generated_at: string;
  opsScore: {
    overall: number; seoMonitor: number; indexingQueue: number; aiGrowthLoop: number;
    risks: string[];
  };
  todayTasks: Task[];
  seoMonitor: {
    total_keywords: number;
    exposed_keywords: number; missing_keywords: number;
    partial_keywords: number; untracked_keywords: number;
    needs_fix: number; indexing_pending: number;
    total_engine_results: number;
    exposed_results: number; missing_results: number;
    rising_results: number; falling_results: number;
    last_serp_run: { checked_at: string; ok: boolean } | null;
  };
  indexingQueue: {
    total: number;
    counts: Record<string, number>;
    stale_pending: number;
    stale_requested: number;
    recent: Array<{
      url_path: string; canonical_url: string | null;
      status: string; engine: string; priority: number;
      target_keyword: string | null; created_at: string; updated_at: string;
      requested_at: string | null;
    }>;
  };
  aiGrowthLoop: {
    total: number;
    counts: Record<string, number>;
    recent: Array<{
      page_url: string; target_keyword: string | null; action_type: string;
      result: string; ai_judgement: string | null; next_action: string | null;
      created_at: string; updated_at: string;
    }>;
  };
};

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ops-readonly`;

export default function OpsReadonly() {
  const [params, setParams] = useSearchParams();
  const initialToken = params.get("token") || "";
  const [token, setToken] = useState(initialToken);
  const [data, setData] = useState<OpsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async (t: string) => {
    if (!t) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(FN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-ops-token": t },
        body: JSON.stringify({ token: t }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j?.error || `HTTP ${res.status}`); setData(null); }
      else setData(j as OpsData);
    } catch (e: any) {
      setError(e?.message || "fetch error");
    }
    setLoading(false);
  };

  useEffect(() => { if (initialToken) load(initialToken); /* eslint-disable-next-line */ }, []);

  const seo = data?.seoMonitor;
  const queue = data?.indexingQueue;
  const loop = data?.aiGrowthLoop;

  const fmtTime = (s?: string | null) => s ? new Date(s).toLocaleString("ko-KR") : "—";

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Ops Read-only Summary</h1>
        <p className="text-xs text-muted-foreground">
          자동 점검 전용 · 읽기 전용 · 수정 불가
        </p>
      </header>

      {!data && (
        <div className="mb-6 flex gap-2">
          <input
            type="password"
            placeholder="OPS_READONLY_TOKEN"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm"
          />
          <button
            onClick={() => { setParams({ token }); load(token); }}
            disabled={loading || !token}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
      )}

      {error && <p className="mb-4 text-sm text-destructive">에러: {error}</p>}

      {data && (
        <>
          <p className="text-xs text-muted-foreground mb-6">
            generated_at: {fmtTime(data.generated_at)}
          </p>

          <Section title={`Ops Score · overall ${data.opsScore.overall}/100`}>
            <KV k="SEO Monitor" v={`${data.opsScore.seoMonitor}/100`} />
            <KV k="Indexing Queue" v={`${data.opsScore.indexingQueue}/100`} />
            <KV k="AI Growth Loop" v={`${data.opsScore.aiGrowthLoop}/100`} />
            <KV k="Risks" v={data.opsScore.risks.length ? data.opsScore.risks.join(" · ") : "없음"} />
          </Section>

          <Section title={`Today Tasks (${data.todayTasks.length})`}>
            <div className="col-span-full">
              {data.todayTasks.length === 0 ? (
                <p className="text-xs text-muted-foreground">오늘 처리할 태스크가 없습니다.</p>
              ) : (
                <Table
                  headers={["우선순위", "유형", "제목", "URL", "사유", "권장 액션"]}
                  rows={data.todayTasks.map(t => [
                    t.priority, t.type, t.title, t.url ?? "—", t.reason, t.recommended_action,
                  ])}
                />
              )}
            </div>
          </Section>

          <Section title="SEO Monitor">
            <KV k="총 키워드" v={seo!.total_keywords} />
            <KV k="노출중" v={seo!.exposed} />
            <KV k="미노출" v={seo!.missing} />
            <KV k="상승" v={seo!.rising} />
            <KV k="하락" v={seo!.falling} />
            <KV k="수정필요" v={seo!.needs_fix} />
            <KV k="색인대기" v={seo!.indexing_pending} />
            <KV k="마지막 SERP 실행" v={`${fmtTime(seo!.last_serp_run?.checked_at)} (${seo!.last_serp_run?.ok ? "OK" : "FAIL/없음"})`} />
          </Section>

          <Section title={`Indexing Queue (총 ${queue!.total})`}>
            {Object.entries(queue!.counts).map(([k, v]) => <KV key={k} k={k} v={v} />)}
            <div className="col-span-full mt-3">
              <Table
                headers={["URL", "상태", "엔진", "우선순위", "키워드", "업데이트"]}
                rows={queue!.recent.map(r => [
                  r.url, r.status, r.engine, String(r.priority),
                  r.target_keyword ?? "—", fmtTime(r.updated_at),
                ])}
              />
            </div>
          </Section>

          <Section title={`AI Growth Loop (총 ${loop!.total})`}>
            {Object.entries(loop!.counts).map(([k, v]) => <KV key={k} k={k} v={v} />)}
            <div className="col-span-full mt-3">
              <Table
                headers={["페이지", "키워드", "액션", "결과", "AI 판단", "업데이트"]}
                rows={loop!.recent.map(a => [
                  a.page_url, a.target_keyword ?? "—", a.action_type,
                  a.result, a.ai_judgement ?? "—", fmtTime(a.updated_at),
                ])}
              />
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 border border-border rounded-lg p-4">
      <h2 className="text-sm font-semibold mb-3">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{children}</div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="text-xs">
      <div className="text-muted-foreground">{k}</div>
      <div className="font-mono text-sm text-foreground">{v}</div>
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border">
            {headers.map(h => <th key={h} className="text-left py-1.5 px-2 text-muted-foreground font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50">
              {row.map((c, j) => (
                <td key={j} className="py-1.5 px-2 align-top break-all">{c}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} className="py-3 text-center text-muted-foreground">데이터 없음</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
