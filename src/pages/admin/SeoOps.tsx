import { useState, useEffect, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { copyToClipboard } from "./_lib";
import { toast } from "@/components/ui/sonner";

const SITE_ORIGIN = "https://searchtuneos.com";

/** Canonical blog URL is always /blog/{slug}.html */
function canonicalBlogUrl(slug: string): string {
  const s = String(slug || "").trim().replace(/^\/+|\/+$/g, "");
  const bare = s.startsWith("blog/") ? s.slice(5) : s;
  const noExt = bare.replace(/\.html$/i, "");
  return `${SITE_ORIGIN}/blog/${noExt}.html`;
}
function cleanUrl(slug: string): string {
  const s = String(slug || "").trim().replace(/^\/+|\/+$/g, "");
  const bare = s.startsWith("blog/") ? s.slice(5) : s;
  const noExt = bare.replace(/\.html$/i, "");
  return `${SITE_ORIGIN}/blog/${noExt}`;
}

interface Row {
  slug: string;
  title: string;
  published: boolean;
  date: string;
  canonical: string;
  inSitemap: boolean | null;
  inRss: boolean | null;
  inQueue: { engine: string; status: string; url: string }[];
  hasCleanUrlInQueue: boolean;
  problems: string[];
}

interface QueueRow {
  id: string;
  url: string;
  engine: string;
  status: string;
}

interface GscPage {
  slug: string;
  canonicalClicks: number; canonicalImpressions: number; canonicalPosition: number;
  cleanClicks: number; cleanImpressions: number; cleanPosition: number;
  totalClicks: number; totalImpressions: number;
  mismatch: boolean;
}
interface GscQuery { query: string; clicks: number; impressions: number; ctr: number; position: number }
interface GscData {
  range: { start: string; end: string; days: number };
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  blogPages: GscPage[];
  topQueries: GscQuery[];
}

export default function SeoOps() {
  const [rows, setRows] = useState<Row[]>([]);
  const [queueAll, setQueueAll] = useState<QueueRow[]>([]);
  const [sitemapUrls, setSitemapUrls] = useState<Set<string>>(new Set());
  const [rssUrls, setRssUrls] = useState<Set<string>>(new Set());
  const [gsc, setGsc] = useState<GscData | null>(null);
  const [gscError, setGscError] = useState<string | null>(null);
  const [gscDays, setGscDays] = useState(28);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [postsRes, queueRes, sitemapTxt, rssTxt] = await Promise.all([
        supabase.from("blog_posts").select("slug,title,published,date").order("date", { ascending: false }).limit(50),
        supabase.from("indexing_queue").select("id,url,engine,status").order("created_at", { ascending: false }).limit(500),
        // Live dynamic sitemap (DB-backed edge function) — static /sitemap-posts.xml is a stale fallback
        fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sitemap?type=posts`, { cache: "no-store" })
          .then(r => r.ok ? r.text() : "").catch(() => ""),
        fetch(`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/rss`, { cache: "no-store" })
          .then(r => r.ok ? r.text() : "").catch(() => ""),
      ]);

      const posts = postsRes.data || [];
      const queue = (queueRes.data || []) as QueueRow[];
      setQueueAll(queue);

      const smSet = new Set<string>();
      [...sitemapTxt.matchAll(/<loc>([^<]+)<\/loc>/g)].forEach(m => smSet.add(m[1].trim()));
      setSitemapUrls(smSet);

      const rssSet = new Set<string>();
      [...rssTxt.matchAll(/<link>([^<]+)<\/link>/g)].forEach(m => rssSet.add(m[1].trim()));
      setRssUrls(rssSet);

      const out: Row[] = posts.map((p: any) => {
        const canonical = canonicalBlogUrl(p.slug);
        const clean = cleanUrl(p.slug);
        const matchedQueue = queue.filter(q => q.url === canonical || q.url === clean || q.url.includes(`/blog/${p.slug}`));
        const hasCleanUrlInQueue = matchedQueue.some(q => !/\.html(\?|#|$)/i.test(q.url));
        const inSitemap = smSet.has(canonical);
        const inRss = rssSet.size > 0 ? rssSet.has(canonical) : null;
        const problems: string[] = [];
        if (!p.published) problems.push("미발행");
        if (!inSitemap) problems.push("sitemap 누락");
        if (inRss === false) problems.push("RSS 누락");
        if (hasCleanUrlInQueue) problems.push("큐에 clean URL 잔존");
        return {
          slug: p.slug,
          title: p.title,
          published: p.published,
          date: p.date,
          canonical,
          inSitemap,
          inRss,
          inQueue: matchedQueue.map(q => ({ engine: q.engine, status: q.status, url: q.url })),
          hasCleanUrlInQueue,
          problems,
        };
      });
      setRows(out);
    } catch (e) {
      console.warn("SeoOps load failed:", e);
      toast.error("데이터 로딩 실패");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadGsc = useCallback(async (days: number) => {
    setGscError(null);
    setGsc(null);
    try {
      const r = await fetch(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/gsc-blog-metrics?days=${days}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        },
      );
      const j = await r.json();
      if (!j.success) throw new Error(j.error || "GSC fetch failed");
      setGsc(j as GscData);
    } catch (e: any) {
      setGscError(String(e?.message || e));
    }
  }, []);

  useEffect(() => { loadGsc(gscDays); }, [loadGsc, gscDays]);



  const submitIndexNow = async (url: string) => {
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("submit-indexnow", { body: { urls: [url] } });
    if (error || !data?.success) toast.error(`IndexNow 제출 실패: ${error?.message || data?.response || "unknown"}`);
    else toast.success("IndexNow 제출 완료");
    setSubmitting(false);
  };

  const autoFixAll = async () => {
    const targets = rows.filter(r => r.published && r.problems.some(p => p === "sitemap 누락" || p === "RSS 누락"));
    if (targets.length === 0) {
      toast.info("자동 수정 대상 없음 (sitemap/RSS 누락 글 없음)");
      return;
    }
    setSubmitting(true);
    const urls = targets.map(r => r.canonical);
    try {
      const { data, error } = await supabase.functions.invoke("submit-indexnow", { body: { urls } });
      if (error || !data?.success) {
        toast.error(`자동 수정 실패: ${error?.message || data?.response || "unknown"}`);
      } else {
        toast.success(`${urls.length}건 IndexNow 일괄 제출 완료`);
        await load();
      }
    } catch (e: any) {
      toast.error(`자동 수정 오류: ${e?.message || e}`);
    }
    setSubmitting(false);
  };

  const summary = useMemo(() => {
    const total = rows.length;
    const sitemapOk = rows.filter(r => r.inSitemap).length;
    const rssOk = rows.filter(r => r.inRss).length;
    const withProblems = rows.filter(r => r.problems.length > 0).length;
    const cleanUrlIssues = rows.filter(r => r.hasCleanUrlInQueue).length;
    const queueByEngine: Record<string, number> = {};
    queueAll.forEach(q => { queueByEngine[q.engine] = (queueByEngine[q.engine] ?? 0) + 1; });
    return { total, sitemapOk, rssOk, withProblems, cleanUrlIssues, queueByEngine };
  }, [rows, queueAll]);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>SEO Ops Center – 서치튠OS 관리자</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6" /> SEO Ops Center</h1>
          <p className="text-sm text-muted-foreground">
            블로그 canonical · sitemap · RSS · 색인 큐를 한 화면에서 검증. 모든 URL은 <code className="px-1 bg-muted rounded">/blog/{`{slug}`}.html</code> 기준.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> 새로고침
        </Button>
        <Button variant="default" size="sm" onClick={autoFixAll} disabled={submitting || loading}>
          문제 글 자동 수정 (IndexNow 일괄)
        </Button>
      </div>


      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="블로그 글" value={summary.total} />
        <Kpi label="Sitemap 정상" value={summary.sitemapOk} tone="good" />
        <Kpi label="RSS 정상" value={summary.rssOk} tone="good" />
        <Kpi label="문제 있는 글" value={summary.withProblems} tone={summary.withProblems > 0 ? "warn" : "good"} />
        <Kpi label="Clean URL 잔존" value={summary.cleanUrlIssues} tone={summary.cleanUrlIssues > 0 ? "bad" : "good"} />
        <Kpi label="큐 총건수" value={queueAll.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">엔진별 색인 큐 분포</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(summary.queueByEngine).map(([eng, cnt]) => (
              <span key={eng} className="px-2 py-1 rounded-md bg-muted font-mono">
                {eng}: <strong>{cnt}</strong>
              </span>
            ))}
            {Object.keys(summary.queueByEngine).length === 0 && <span className="text-muted-foreground">큐 비어있음</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <strong>indexnow</strong> = 자동 제출 (Bing/Naver/Yandex), <strong>google</strong> = Search Console 수동 확인 후보,
            <strong> naver</strong> = 서치어드바이저 수동 제출, <strong>both</strong> = 양쪽 수동.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Google Search Console 실측 (최근 {gscDays}일)</CardTitle>
          <div className="flex gap-1">
            {[7, 28, 90].map(d => (
              <Button key={d} size="sm" variant={gscDays === d ? "default" : "outline"} className="h-7 text-xs px-2"
                onClick={() => setGscDays(d)}>{d}d</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {gscError && (
            <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
              GSC 로딩 실패: {gscError}
            </div>
          )}
          {!gsc && !gscError && <div className="text-xs text-muted-foreground">불러오는 중…</div>}
          {gsc && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi label="총 클릭" value={gsc.totals.clicks} tone={gsc.totals.clicks > 0 ? "good" : "warn"} />
                <Kpi label="총 노출" value={gsc.totals.impressions} />
                <Kpi label="평균 CTR" value={Math.round(gsc.totals.ctr * 1000) / 10} />
                <Kpi label="평균 순위" value={Math.round(gsc.totals.position * 10) / 10} />
              </div>

              <div>
                <div className="text-xs font-semibold mb-2 flex items-center gap-2 flex-wrap">
                  블로그 페이지별 노출 ({gsc.blogPages.length}건)
                  {gsc.blogPages.filter(p => p.mismatch).length > 0 && (
                    <>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/15 text-destructive">
                        ⚠ canonical mismatch {gsc.blogPages.filter(p => p.mismatch).length}건
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        disabled={submitting}
                        onClick={async () => {
                          const urls = gsc.blogPages.filter(p => p.mismatch).map(p => canonicalBlogUrl(p.slug));
                          if (urls.length === 0) return;
                          setSubmitting(true);
                          const { data, error } = await supabase.functions.invoke("submit-indexnow", { body: { urls } });
                          if (error || !data?.success) toast.error(`재제출 실패: ${error?.message || data?.response || "unknown"}`);
                          else toast.success(`${urls.length}건 .html canonical IndexNow 재제출 완료. Google 재크롤까지 3~14일.`);
                          setSubmitting(false);
                        }}
                      >
                        mismatch .html 일괄 재제출
                      </Button>
                    </>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground border-b">
                      <tr className="text-left">
                        <th className="py-1.5 pr-2">slug</th>
                        <th className="py-1.5 pr-2 text-right">.html 노출</th>
                        <th className="py-1.5 pr-2 text-right">clean 노출</th>
                        <th className="py-1.5 pr-2 text-right">총 클릭</th>
                        <th className="py-1.5 pr-2 text-right">평균 순위</th>
                        <th className="py-1.5 pr-2">상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gsc.blogPages.slice(0, 30).map(p => {
                        const avgPos = p.canonicalImpressions >= p.cleanImpressions ? p.canonicalPosition : p.cleanPosition;
                        return (
                          <tr key={p.slug} className={`border-b last:border-b-0 ${p.mismatch ? "bg-destructive/[0.04]" : ""}`}>
                            <td className="py-1.5 pr-2 font-mono text-[11px] truncate max-w-[260px]" title={p.slug}>{p.slug}</td>
                            <td className="py-1.5 pr-2 text-right font-mono">{p.canonicalImpressions}</td>
                            <td className={`py-1.5 pr-2 text-right font-mono ${p.cleanImpressions > 0 ? "text-destructive font-semibold" : ""}`}>{p.cleanImpressions}</td>
                            <td className="py-1.5 pr-2 text-right font-mono">{p.totalClicks}</td>
                            <td className="py-1.5 pr-2 text-right font-mono">{avgPos > 0 ? avgPos.toFixed(1) : "—"}</td>
                            <td className="py-1.5 pr-2">
                              {p.mismatch ? (
                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/15 text-destructive">canonical mismatch</span>
                              ) : p.totalImpressions === 0 ? (
                                <span className="text-muted-foreground text-[10px]">노출 없음</span>
                              ) : (
                                <span className="text-score-excellent text-[10px]">OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  <strong>canonical mismatch</strong> = clean URL(/blog/slug)로 색인·노출되는데 우리 canonical은 /blog/slug.html. Google이 정규형을 통합해주길 기다리거나, GSC에서 URL 검사 → 색인 요청으로 .html을 강제 색인시킬 것.
                </p>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2">상위 검색 쿼리 (블로그 진입)</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground border-b">
                      <tr className="text-left">
                        <th className="py-1.5 pr-2">쿼리</th>
                        <th className="py-1.5 pr-2 text-right">클릭</th>
                        <th className="py-1.5 pr-2 text-right">노출</th>
                        <th className="py-1.5 pr-2 text-right">CTR</th>
                        <th className="py-1.5 pr-2 text-right">순위</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gsc.topQueries.slice(0, 20).map((q, i) => (
                        <tr key={i} className="border-b last:border-b-0">
                          <td className="py-1.5 pr-2 truncate max-w-[280px]" title={q.query}>{q.query}</td>
                          <td className="py-1.5 pr-2 text-right font-mono">{q.clicks}</td>
                          <td className="py-1.5 pr-2 text-right font-mono">{q.impressions}</td>
                          <td className="py-1.5 pr-2 text-right font-mono">{(q.ctr * 100).toFixed(1)}%</td>
                          <td className="py-1.5 pr-2 text-right font-mono">{q.position.toFixed(1)}</td>
                        </tr>
                      ))}
                      {gsc.topQueries.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">데이터 없음</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 블로그 글 ({rows.length}건)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="py-2 pr-2">제목 / 날짜</th>
                  <th className="py-2 pr-2">Canonical URL</th>
                  <th className="py-2 pr-2 text-center">Sitemap</th>
                  <th className="py-2 pr-2 text-center">RSS</th>
                  <th className="py-2 pr-2">색인 큐</th>
                  <th className="py-2 pr-2">문제</th>
                  <th className="py-2 pr-2 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">데이터 없음</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.slug} className={`border-b last:border-b-0 hover:bg-muted/30 ${r.problems.length > 0 ? "bg-destructive/[0.03]" : ""}`}>
                    <td className="py-2 pr-2 max-w-[260px]">
                      <div className="truncate font-medium" title={r.title}>{r.title}</div>
                      <div className="text-[10px] text-muted-foreground">{r.date} {r.published ? "" : "· 미발행"}</div>
                    </td>
                    <td className="py-2 pr-2 max-w-[280px]">
                      <a href={r.canonical} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block font-mono text-[11px]">{r.canonical.replace(SITE_ORIGIN, "")}</a>
                    </td>
                    <td className="py-2 pr-2 text-center">
                      {r.inSitemap ? <CheckCircle2 className="w-4 h-4 text-score-excellent inline" /> : <AlertTriangle className="w-4 h-4 text-destructive inline" />}
                    </td>
                    <td className="py-2 pr-2 text-center">
                      {r.inRss === null ? <span className="text-muted-foreground">?</span> :
                       r.inRss ? <CheckCircle2 className="w-4 h-4 text-score-excellent inline" /> : <AlertTriangle className="w-4 h-4 text-destructive inline" />}
                    </td>
                    <td className="py-2 pr-2">
                      {r.inQueue.length === 0 ? <span className="text-muted-foreground">—</span> : (
                        <div className="flex flex-wrap gap-1">
                          {r.inQueue.map((q, i) => (
                            <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${/\.html/.test(q.url) ? "bg-muted" : "bg-destructive/15 text-destructive"}`} title={q.url}>
                              {q.engine}:{q.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      {r.problems.length === 0 ? <span className="text-score-excellent text-[10px]">OK</span> : (
                        <div className="flex flex-wrap gap-1">
                          {r.problems.map((p, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/10 text-destructive">{p}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" className="h-7 text-xs px-2"
                          onClick={() => { copyToClipboard(r.canonical); toast.success("복사됨"); }}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <a href={r.canonical} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </a>
                        <Button size="sm" variant="default" className="h-7 text-xs px-2"
                          disabled={submitting} onClick={() => submitIndexNow(r.canonical)}>
                          IndexNow
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" | "warn" }) {
  const cls = tone === "good" ? "text-score-excellent" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-accent" : "text-foreground";
  return (
    <Card><CardContent className="pt-4 pb-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
    </CardContent></Card>
  );
}
