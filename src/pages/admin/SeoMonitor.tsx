import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Copy, ExternalLink, Inbox, Wrench, Check, RefreshCw, TrendingUp, TrendingDown, Search } from "lucide-react";
import { adminInvoke, copyToClipboard } from "./_lib";
import { toast } from "@/components/ui/sonner";

type Engine = "all" | "naver" | "google";
type Status = "all" | "exposed" | "missing" | "rising" | "falling" | "monitoring" | "indexing_pending" | "needs_fix";
type Group = "all" | "brand" | "core" | "platform" | "competitor" | "reverse" | "problem";

const SITE_ORIGIN = "https://searchtuneos.com";
function toAbsoluteUrl(target: string | null | undefined): string {
  if (!target) return SITE_ORIGIN + "/";
  const t = target.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("/")) return SITE_ORIGIN + t;
  return `${SITE_ORIGIN}/${t}`;
}

interface Row {
  keyword_id: string;
  keyword: string;
  group: string;
  engine: "google" | "naver";
  status: Status;
  current_rank: number | null;
  previous_rank: number | null;
  rank_delta: number | null;
  target_url: string | null;
  actual_url: string | null;
  top_domains: string[];
  checked_at: string | null;
  last_action_at: string | null;
  next_action: string;
  is_seed?: boolean;
}

interface Summary {
  total: number;
  exposed: number;
  missing: number;
  rising: number;
  falling: number;
  indexing_pending: number;
  needs_fix: number;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  exposed: { label: "노출중", cls: "bg-score-excellent/15 text-score-excellent" },
  rising: { label: "상승", cls: "bg-primary/15 text-primary" },
  falling: { label: "하락", cls: "bg-destructive/15 text-destructive" },
  missing: { label: "미노출", cls: "bg-destructive/10 text-destructive" },
  indexing_pending: { label: "색인 대기", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  needs_fix: { label: "수정 필요", cls: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
  monitoring: { label: "확인 필요", cls: "bg-muted text-muted-foreground" },
};

const GROUP_LABEL: Record<string, string> = {
  brand: "브랜드",
  core: "핵심",
  problem: "문제·니즈",
  platform: "플랫폼",
  competitor: "경쟁",
  reverse: "역키워드",
};

interface GscCoverageItem {
  url: string;
  slug: string | null;
  verdict: string | null;
  coverage_state: string | null;
  indexing_state: string | null;
  last_crawl_time: string | null;
  inspected_at: string | null;
}
interface GscCoverageSummary {
  total: number; pass: number; partial: number; fail: number; neutral: number;
  discovered_not_indexed: number; crawled_not_indexed: number;
}

export default function SeoMonitor() {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [engine, setEngine] = useState<Engine>("all");
  const [status, setStatus] = useState<Status>("all");
  const [group, setGroup] = useState<Group>("all");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [gscSummary, setGscSummary] = useState<GscCoverageSummary | null>(null);
  const [gscItems, setGscItems] = useState<GscCoverageItem[]>([]);
  const [gscRunning, setGscRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminInvoke<{ rows: Row[]; summary: Summary }>("seoMonitor", { engine, status, group, days });
    if (res) { setRows(res.rows); setSummary(res.summary); }
    setLoading(false);
  }, [engine, status, group, days]);

  const loadGsc = useCallback(async () => {
    const res = await adminInvoke<{ items: GscCoverageItem[]; summary: GscCoverageSummary }>("gscIndexCoverageSummary");
    if (res) { setGscItems(res.items || []); setGscSummary(res.summary); }
  }, []);

  useEffect(() => { load(); loadGsc(); }, [load, loadGsc]);

  const runGscAudit = async (mode: "auto" | "all" | "unindexed") => {
    setGscRunning(true);
    toast.info("GSC 색인 진단 시작 — 글당 약 0.8초, 80건 기준 약 1분");
    const res = await adminInvoke<{ success: boolean; inspected: number; unindexed: number; indexnow_pinged: number; queued_for_indexing: number; error?: string }>(
      "runGscIndexAudit", { mode, limit: 120, autoFix: true }
    );
    setGscRunning(false);
    if (res?.success) {
      toast.success(`진단 ${res.inspected}건 · 미색인 ${res.unindexed}건 · IndexNow ${res.indexnow_pinged}건 · 큐 ${res.queued_for_indexing}건`);
      loadGsc();
    } else {
      toast.error(res?.error || "진단 실패 — GSC 연결을 확인하세요");
    }
  };


  const trigger = async () => {
    setTriggering(true);
    await adminInvoke("triggerSerpTracking");
    toast.success("SERP 추적 시작 — 약 2~3분 후 새로고침");
    setTimeout(() => { load(); setTriggering(false); }, 4000);
  };

  const syncKeywords = async () => {
    setSyncing(true);
    const res = await adminInvoke<{ success: boolean; inserted: number; deactivated: number; totalActive: number; trackingTriggered: boolean; error?: string }>(
      "syncBlogKeywords",
      { runTracking: true }
    );
    if (res?.success) {
      toast.success(`동기화 완료 — 신규/갱신 ${res.inserted}건 · 비활성 ${res.deactivated}건 · 활성 총 ${res.totalActive}개${res.trackingTriggered ? " · SERP 추적 시작" : ""}`);
      setTimeout(load, 4000);
    } else {
      toast.error(res?.error || "동기화 실패");
    }
    setSyncing(false);
  };


  const addToIndexing = async (r: Row) => {
    const absUrl = toAbsoluteUrl(r.target_url);
    if (!absUrl || absUrl.length < 10) { toast.error("매칭 URL이 비어있어 색인 큐에 추가할 수 없습니다."); return; }
    const res = await adminInvoke<{ success: boolean; error?: string }>("addIndexingItem", {
      url: absUrl,
      target_keyword: r.keyword,
      engine: r.engine,
      reason: `${r.status} (rank=${r.current_rank ?? "-"})`,
      priority: r.status === "missing" || r.status === "needs_fix" ? 8 : 5,
    });
    if (res?.success) toast.success(`색인 큐에 추가됨 — ${absUrl}`); else toast.error(res?.error || "실패");
  };

  const createAction = async (r: Row) => {
    const res = await adminInvoke<{ success: boolean; error?: string }>("createSeoAction", {
      page_url: r.target_url || `https://www.searchtuneos.com/?kw=${encodeURIComponent(r.keyword)}`,
      target_keyword: r.keyword,
      action_type: "title 수정",
      before_state: { rank: r.current_rank, exposed: r.status !== "missing" },
      next_action: r.next_action,
    });
    if (res?.success) toast.success("수정 액션 생성 — Growth Loop에서 결과 추적"); else toast.error(res?.error || "실패");
  };

  const markDone = async (r: Row) => {
    await adminInvoke("updateKeywordStatus", { keywordId: r.keyword_id, status: "monitoring" });
    toast.success("모니터링 완료 처리"); load();
  };

  const searchUrl = (r: Row) =>
    r.engine === "naver"
      ? `https://search.naver.com/search.naver?query=${encodeURIComponent(r.keyword)}`
      : `https://www.google.com/search?q=${encodeURIComponent(r.keyword)}&hl=ko&gl=kr`;

  const filteredRows = useMemo(() => rows, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Search className="w-6 h-6" /> SEO 모니터</h1>
          <p className="text-sm text-muted-foreground">키워드별 노출/순위 추적 · 매일 05:55 KST 블로그 자동 동기화 → 06:00 KST 추적</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> 새로고침
          </Button>
          <Button variant="outline" size="sm" onClick={syncKeywords} disabled={syncing}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} />
            블로그 키워드 동기화
          </Button>
          <Button size="sm" onClick={trigger} disabled={triggering}>
            지금 추적 실행
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <Kpi label="추적 (현 필터)" value={summary?.total ?? 0} />
        <Kpi label="노출 중" value={summary?.exposed ?? 0} tone="good" />
        <Kpi label="미노출" value={summary?.missing ?? 0} tone="bad" />
        <Kpi label="색인 대기" value={summary?.indexing_pending ?? 0} tone="warn" />
        <Kpi label="수정 필요" value={summary?.needs_fix ?? 0} tone="warn" />
        <Kpi label="상승" value={summary?.rising ?? 0} icon={<TrendingUp className="w-3 h-3" />} tone="good" />
        <Kpi label="하락" value={summary?.falling ?? 0} icon={<TrendingDown className="w-3 h-3" />} tone="bad" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4 flex flex-wrap gap-2 items-center text-xs">
          <FilterGroup label="엔진" value={engine} onChange={(v) => setEngine(v as Engine)}
            options={[["all", "전체"], ["google", "Google"], ["naver", "Naver"]]} />
          <FilterGroup label="상태" value={status} onChange={(v) => setStatus(v as Status)}
            options={[["all", "전체"], ["exposed", "노출중"], ["missing", "미노출"], ["indexing_pending", "색인 대기"], ["needs_fix", "수정 필요"], ["rising", "상승"], ["falling", "하락"], ["monitoring", "확인 필요"]]} />
          <FilterGroup label="그룹" value={group} onChange={(v) => setGroup(v as Group)}
            options={[["all", "전체"], ["brand", "브랜드"], ["core", "핵심"], ["problem", "문제·니즈"], ["platform", "플랫폼"], ["competitor", "경쟁"], ["reverse", "역키워드"]]} />
          <FilterGroup label="기간" value={String(days)} onChange={(v) => setDays(Number(v))}
            options={[["1", "1일"], ["7", "7일"], ["14", "14일"], ["30", "30일"]]} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">키워드 추적 결과 ({filteredRows.length}건)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b sticky top-0 bg-card">
                <tr className="text-left">
                  <th className="py-2 pr-2">키워드</th>
                  <th className="py-2 pr-2">그룹</th>
                  <th className="py-2 pr-2">엔진</th>
                  <th className="py-2 pr-2">상태</th>
                  <th className="py-2 pr-2 text-right">현재</th>
                  <th className="py-2 pr-2 text-right">전일</th>
                  <th className="py-2 pr-2 text-right">Δ</th>
                  <th className="py-2 pr-2">매칭 URL</th>
                  <th className="py-2 pr-2">노출 URL</th>
                  <th className="py-2 pr-2">확인</th>
                  <th className="py-2 pr-2">다음 액션</th>
                  <th className="py-2 pr-2 text-right">수행</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 && (
                  <tr><td colSpan={12} className="py-8 text-center text-muted-foreground">데이터 없음 — 추적 실행을 눌러주세요.</td></tr>
                )}
                {filteredRows.map((r, i) => {
                  const sb = STATUS_BADGE[r.status] ?? STATUS_BADGE.monitoring;
                  return (
                    <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="py-2 pr-2 font-medium">{r.keyword}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{GROUP_LABEL[r.group] ?? r.group}</td>
                      <td className="py-2 pr-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.engine === "naver" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                          {r.engine === "naver" ? "Naver" : "Google"}
                        </span>
                      </td>
                      <td className="py-2 pr-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${sb.cls}`}>{sb.label}</span>
                      </td>
                      <td className="py-2 pr-2 text-right font-mono">{r.current_rank ?? "—"}</td>
                      <td className="py-2 pr-2 text-right font-mono text-muted-foreground">{r.previous_rank ?? "—"}</td>
                      <td className="py-2 pr-2 text-right font-mono">
                        {r.rank_delta == null ? "—" :
                          r.rank_delta > 0 ? <span className="text-score-excellent">+{r.rank_delta}</span> :
                          r.rank_delta < 0 ? <span className="text-destructive">{r.rank_delta}</span> :
                          <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="py-2 pr-2 max-w-[180px]">
                        {r.target_url ? <a href={r.target_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">{r.target_url.replace(/^https?:\/\//, "")}</a> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 pr-2 max-w-[180px]">
                        {r.actual_url ? <a href={r.actual_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">{r.actual_url.replace(/^https?:\/\//, "")}</a> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 pr-2 text-muted-foreground whitespace-nowrap">{r.checked_at ? new Date(r.checked_at).toLocaleDateString("ko-KR") : "—"}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{r.next_action}</td>
                      <td className="py-2 pr-2">
                        <div className="flex gap-1 justify-end">
                          {r.target_url && <IconBtn title="URL 복사" onClick={() => { copyToClipboard(r.target_url!); toast.success("복사됨"); }}><Copy className="w-3 h-3" /></IconBtn>}
                          <a href={searchUrl(r)} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-muted" title="검색 결과 확인"><ExternalLink className="w-3 h-3" /></a>
                          <IconBtn title="색인 큐에 추가" onClick={() => addToIndexing(r)}><Inbox className="w-3 h-3" /></IconBtn>
                          <IconBtn title="수정 액션 생성" onClick={() => createAction(r)}><Wrench className="w-3 h-3" /></IconBtn>
                          <IconBtn title="모니터링 완료" onClick={() => markDone(r)}><Check className="w-3 h-3" /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone, icon }: { label: string; value: number; tone?: "good" | "bad" | "warn"; icon?: React.ReactNode }) {
  const cls = tone === "good" ? "text-score-excellent" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-accent" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1">{icon}{label}</div>
        <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function FilterGroup({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground mr-1">{label}:</span>
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={`px-2 py-0.5 rounded ${value === v ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return <button title={title} onClick={onClick} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground">{children}</button>;
}
