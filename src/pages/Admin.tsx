import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, Zap, Clock, TrendingUp, Mail, Globe, MessageSquare, FileText, Eye, EyeOff, Cpu, RefreshCw, AlertTriangle, Trash2, Send, Sparkles, Activity, ExternalLink, Search, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from "recharts";


interface Summary {
  totalSessions: number;
  totalAnalyses: number;
  totalCompleted: number;
  totalLeads: number;
  avgDurationSec: number;
  analysisConversion: number;
  leadConversion: number;
}

interface InsightsData {
  summary: Summary;
  eventCounts: Record<string, number>;
  dailyData: { date: string; sessions: number; analyses: number; leads: number }[];
  recentLeads: { email: string; source: string; created_at: string }[];
  recentUrls: { url: string; created_at: string }[];
  recentConsultations: { name: string; email: string; phone: string | null; company: string | null; job_title: string | null; site_url: string | null; budget: string | null; interests: string[] | null; concerns: string | null; status: string; created_at: string }[];
}

const chartConfig: ChartConfig = {
  sessions: { label: "세션", color: "hsl(230 80% 56%)" },
  analyses: { label: "분석", color: "hsl(268 70% 58%)" },
  leads: { label: "리드", color: "hsl(152 60% 46%)" },
};

function formatDuration(sec: number) {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${s}초`;
}

export default function Admin() {
  // Auth handled by AdminLayout — admin_pw is in sessionStorage when this renders.
  const password = "";
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightsData | null>(null);
  const [days, setDays] = useState(30);
  const [blogPosts, setBlogPosts] = useState<{ id: string; title: string; slug: string; published: boolean; date: string; category: string }[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [engineConfig, setEngineConfig] = useState<{ version: number; updated_at: string } | null>(null);
  const [engineLogs, setEngineLogs] = useState<{ version: number; changes_summary: string; trends_found: any; status: string; created_at: string }[]>([]);
  const [engineUpdating, setEngineUpdating] = useState(false);
  const [failedPosts, setFailedPosts] = useState<{ id: string; title: string; slug: string; category: string; author: string; failure_reason: string; failure_attempts: number; created_at: string; contentLength: number }[]>([]);
  const [failedActionId, setFailedActionId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string>("");
  const [clarity, setClarity] = useState<{ summary: Record<string, number>; numOfDays: number; fetchedAt: string } | null>(null);
  const [clarityErr, setClarityErr] = useState<string>("");
  const [clarityLoading, setClarityLoading] = useState(false);
  const [clarityDays, setClarityDays] = useState(1);
  const [serpKeywords, setSerpKeywords] = useState<{ id: string; keyword: string; category: string; target_url: string | null; priority: number; active: boolean }[]>([]);
  const [serpLatest, setSerpLatest] = useState<{ keyword: string; engine: string; our_exposed: boolean; our_rank: number | null; our_url: string | null; top_domains: string[]; checked_at: string; error: string | null }[]>([]);
  const [serpTriggering, setSerpTriggering] = useState(false);
  const [serpEngine, setSerpEngine] = useState<"all" | "naver" | "google">("all");
  const [usageStats, setUsageStats] = useState<{
    config: { free_limit: number; email_bonus: number; whitelisted_count: number; updated_at: string };
    today: { date: string; ipCount: number; emailUnlockedCount: number; totalAnalyses: number; atLimitCount: number };
    daily: { date: string; ips: number; analyses: number; unlocked: number }[];
    topIps: { ip: string; usage: number; cap: number; email_unlocked: boolean; updated_at: string }[];
  } | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const fetchUsageStats = async () => {
    setUsageLoading(true);
    const pw = sessionStorage.getItem("admin_pw") || password;
    try {
      const { data: res } = await supabase.functions.invoke("admin-insights", {
        body: { password: pw, action: "usageStats" },
      });
      if (res && !res.error) setUsageStats(res);
    } catch { /* ignore */ }
    setUsageLoading(false);
  };

  const fetchInsights = async (d: number) => {
    setLoading(true);
    const pw = sessionStorage.getItem("admin_pw") || password;
    try {
      const { data: res, error: err } = await supabase.functions.invoke("admin-insights", {
        body: { password: pw, days: d },
      });
      if (!err && !res?.error) {
        setData(res);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchBlogPosts = async () => {
    const pw = sessionStorage.getItem("admin_pw") || password;
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "listBlogPosts" },
    });
    if (res?.posts) setBlogPosts(res.posts);
  };

  const togglePublished = async (id: string, current: boolean) => {
    setTogglingId(id);
    const pw = sessionStorage.getItem("admin_pw") || password;
    await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "togglePublished", postId: id, published: !current },
    });
    setBlogPosts((prev) => prev.map((p) => (p.id === id ? { ...p, published: !current } : p)));
    setTogglingId(null);
  };

  const fetchEngineStatus = async () => {
    const pw = sessionStorage.getItem("admin_pw") || password;
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "engineStatus" },
    });
    if (res?.engineConfig) setEngineConfig(res.engineConfig);
    if (res?.engineLogs) setEngineLogs(res.engineLogs);
  };

  const triggerEngineUpdate = async () => {
    setEngineUpdating(true);
    try {
      const { data: res } = await supabase.functions.invoke("update-analysis-engine", {});
      if (res?.success) {
        await fetchEngineStatus();
      }
    } catch { /* ignore */ }
    setEngineUpdating(false);
  };

  const fetchFailedPosts = async () => {
    const pw = sessionStorage.getItem("admin_pw") || password;
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "listFailedBlogPosts" },
    });
    if (res?.posts) setFailedPosts(res.posts);
  };

  const forcePublish = async (id: string) => {
    setFailedActionId(id);
    const pw = sessionStorage.getItem("admin_pw") || password;
    await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "forcePublishBlogPost", postId: id },
    });
    setFailedPosts((prev) => prev.filter((p) => p.id !== id));
    fetchBlogPosts();
    setFailedActionId(null);
  };

  const deleteFailed = async (id: string) => {
    if (!confirm("이 실패 글을 영구 삭제하시겠습니까?")) return;
    setFailedActionId(id);
    const pw = sessionStorage.getItem("admin_pw") || password;
    await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "deleteBlogPost", postId: id },
    });
    setFailedPosts((prev) => prev.filter((p) => p.id !== id));
    setFailedActionId(null);
  };

  const triggerRetryGeneration = async () => {
    setRetrying(true);
    setRetryMsg("");
    const pw = sessionStorage.getItem("admin_pw") || password;
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "retryBlogGeneration" },
    });
    setRetryMsg(res?.message || "재생성 트리거 완료. 1~2분 후 새로고침하세요.");
    setRetrying(false);
  };

  const fetchClarity = async (n: number = clarityDays) => {
    setClarityLoading(true);
    setClarityErr("");
    const pw = sessionStorage.getItem("admin_pw") || password;
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "clarityInsights", numOfDays: n },
    });
    if (res?.error) {
      setClarityErr(res.error);
    } else if (res?.summary) {
      setClarity({ summary: res.summary, numOfDays: res.numOfDays, fetchedAt: res.fetchedAt });
    }
    setClarityLoading(false);
  };

  const fetchSerpTracking = async () => {
    const pw = sessionStorage.getItem("admin_pw") || password;
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "serpTracking" },
    });
    if (res?.keywords) setSerpKeywords(res.keywords);
    if (res?.latest) setSerpLatest(res.latest);
  };

  const triggerSerpTracking = async () => {
    setSerpTriggering(true);
    const pw = sessionStorage.getItem("admin_pw") || password;
    await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "triggerSerpTracking" },
    });
    setTimeout(() => { fetchSerpTracking(); setSerpTriggering(false); }, 3000);
  };

  // Critical first-paint: only insights. Stagger the rest after idle so the
  // page paints fast and admin-insights edge function isn't hit with 7
  // concurrent same-instance calls (which serialize on a cold isolate).
  // Clarity is intentionally NOT auto-fetched — it's the slowest external API.
  useEffect(() => {
    fetchInsights(days);
  }, [days]);

  useEffect(() => {
    const idle =
      (window as any).requestIdleCallback ||
      ((cb: () => void, opts?: { timeout?: number }) => setTimeout(cb, opts?.timeout ?? 1));
    const handles: any[] = [];
    handles.push(idle(() => fetchBlogPosts(), { timeout: 600 }));
    handles.push(idle(() => fetchEngineStatus(), { timeout: 900 }));
    handles.push(idle(() => fetchFailedPosts(), { timeout: 1200 }));
    handles.push(idle(() => fetchUsageStats(), { timeout: 1500 }));
    handles.push(idle(() => fetchSerpTracking(), { timeout: 1800 }));
    return () => {
      const cancel = (window as any).cancelIdleCallback || clearTimeout;
      handles.forEach((h) => cancel(h));
    };
  }, []);

  const s = data?.summary;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>인사이트 대시보드 – 서치튠OS 관리자</title>
        <meta name="description" content="서치튠OS 관리자 인사이트 대시보드 — 서비스 핵심 지표와 운영 현황을 확인합니다." />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://searchtuneos.com/admin" />
      </Helmet>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">📊 인사이트</h1>
            <p className="text-sm text-muted-foreground">서비스 핵심 지표 대시보드</p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <Button
                key={d}
                variant={days === d ? "default" : "outline"}
                size="sm"
                onClick={() => setDays(d)}
              >
                {d}일
              </Button>
            ))}
          </div>
        </div>

        {/* 별도 운영 화면 진입 */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">🧭 운영 콘솔 바로가기</p>
              <p className="text-xs text-muted-foreground">키워드 · 색인 · 성장 루프 · 크레딧 비용은 전용 화면에서 관리합니다.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href="/admin/credits"><Button size="sm">💰 크레딧 / 비용 →</Button></a>
              <a href="/admin/seo-monitor"><Button size="sm" variant="outline">SEO 모니터 →</Button></a>
              <a href="/admin/indexing-queue"><Button size="sm" variant="outline">색인 큐 →</Button></a>
              <a href="/admin/ai-growth-loop"><Button size="sm" variant="outline">AI 성장 루프 →</Button></a>
            </div>
          </CardContent>
        </Card>

        {loading && !data ? (
          <div className="text-center py-20 text-muted-foreground">로딩 중...</div>
        ) : data && s ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="총 세션" value={s.totalSessions} />
              <StatCard icon={Clock} label="평균 체류" value={formatDuration(s.avgDurationSec)} />
              <StatCard icon={Zap} label="분석 실행" value={s.totalAnalyses} sub={`완료율 ${s.analysisConversion}%`} />
              <StatCard icon={Mail} label="리드 수집" value={s.totalLeads} sub={`전환율 ${s.leadConversion}%`} />
            </div>

            {/* Daily Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">일별 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                  <BarChart data={data.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) => v.substring(5)}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="analyses" fill="var(--color-analyses)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="leads" fill="var(--color-leads)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Blog Posts Management */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  블로그 관리
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {blogPosts.length}개
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {blogPosts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">블로그 글 없음</p>
                  ) : (
                    blogPosts.map((post) => (
                      <div key={post.id} className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${post.published ? "bg-score-excellent/10 text-score-excellent" : "bg-muted text-muted-foreground"}`}>
                              {post.published ? "공개" : "비공개"}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">{post.category}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground truncate mt-0.5">{post.title}</p>
                          <p className="text-xs text-muted-foreground">{post.date}</p>
                        </div>
                        <button
                          onClick={() => togglePublished(post.id, post.published)}
                          disabled={togglingId === post.id}
                          className={`shrink-0 p-2 rounded-lg transition-colors ${
                            post.published
                              ? "bg-score-excellent/10 text-score-excellent hover:bg-score-excellent/20"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          } disabled:opacity-50`}
                          title={post.published ? "비공개로 전환" : "공개로 전환"}
                        >
                          {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Failed Blog Queue */}
            <Card className={failedPosts.length > 0 ? "border-destructive/40" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${failedPosts.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                    검증 실패 큐
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      failedPosts.length > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                    }`}>
                      {failedPosts.length}건
                    </span>
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={triggerRetryGeneration}
                    disabled={retrying}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
                    {retrying ? "트리거 중..." : "새 글 재생성"}
                  </Button>
                </div>
                {retryMsg && <p className="text-xs text-muted-foreground mt-1">{retryMsg}</p>}
                <p className="text-xs text-muted-foreground">
                  품질 검증을 통과하지 못한 자동 생성 글입니다. 검토 후 강제 게시하거나 삭제하세요.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {failedPosts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">실패 큐 없음 — 모든 자동 생성 글이 검증 통과했습니다 ✨</p>
                  ) : (
                    failedPosts.map((post) => (
                      <div key={post.id} className="border border-destructive/20 bg-destructive/5 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">
                                {post.failure_attempts}회 시도
                              </span>
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                                {post.category}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{post.author}</span>
                              <span className="text-[10px] text-muted-foreground">· {post.contentLength}자</span>
                            </div>
                            <p className="text-sm font-medium text-foreground mt-1 break-words">{post.title}</p>
                            <p className="text-xs text-destructive mt-1 break-words">{post.failure_reason}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(post.created_at).toLocaleString("ko-KR")}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => forcePublish(post.id)}
                            disabled={failedActionId === post.id}
                            className="gap-1.5 h-8"
                          >
                            <Send className="w-3 h-3" />
                            강제 게시
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteFailed(post.id)}
                            disabled={failedActionId === post.id}
                            className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                            삭제
                          </Button>
                          <a
                            href={`/blog/${post.slug}.html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline self-center ml-auto"
                          >
                            미리보기 →
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    분석 엔진 상태
                    {engineConfig && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                        v{engineConfig.version}
                      </span>
                    )}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={triggerEngineUpdate}
                    disabled={engineUpdating}
                    className="gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${engineUpdating ? "animate-spin" : ""}`} />
                    {engineUpdating ? "업데이트 중..." : "수동 업데이트"}
                  </Button>
                </div>
                {engineConfig && (
                  <p className="text-xs text-muted-foreground">
                    마지막 업데이트: {new Date(engineConfig.updated_at).toLocaleString("ko-KR")}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {engineLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">업데이트 이력 없음</p>
                  ) : (
                    engineLogs.map((log, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">v{log.version}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              log.status === "success"
                                ? "bg-score-excellent/10 text-score-excellent"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {log.status === "success" ? "업데이트됨" : "변경 없음"}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString("ko-KR")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{log.changes_summary}</p>
                        {Array.isArray(log.trends_found) && log.trends_found.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {(log.trends_found as string[]).map((trend, j) => {
                              const isUrl = /^https?:\/\//i.test(trend);
                              if (isUrl) {
                                let host = trend;
                                try { host = new URL(trend).hostname.replace(/^www\./, ""); } catch {}
                                return (
                                  <a
                                    key={j}
                                    href={trend}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 px-1.5 py-0.5 rounded font-mono underline-offset-2 hover:underline"
                                    title={trend}
                                  >
                                    {host}
                                  </a>
                                );
                              }
                              return (
                                <span key={j} className="text-[10px] bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                                  {trend}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Credit / rate-limit usage — mid-hierarchy operational signal */}
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-accent/5">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    크레딧 · 사용량 (오늘)
                    {usageStats?.config && (
                      <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                        무료 {usageStats.config.free_limit}회 + 이메일 +{usageStats.config.email_bonus} · 화이트리스트 {usageStats.config.whitelisted_count}
                      </span>
                    )}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs gap-1"
                    onClick={fetchUsageStats}
                    disabled={usageLoading}
                  >
                    <RefreshCw className={`w-3 h-3 ${usageLoading ? "animate-spin" : ""}`} />
                    새로고침
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!usageStats ? (
                  <p className="text-sm text-muted-foreground">불러오는 중...</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "총 분석", value: usageStats.today.totalAnalyses, accent: "text-primary" },
                        { label: "사용 IP", value: usageStats.today.ipCount, accent: "text-foreground" },
                        { label: "이메일 언락", value: usageStats.today.emailUnlockedCount, accent: "text-emerald-600" },
                        { label: "한도 도달", value: usageStats.today.atLimitCount, accent: "text-destructive" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border bg-card/50 p-3">
                          <div className="text-[11px] text-muted-foreground">{s.label}</div>
                          <div className={`text-2xl font-bold ${s.accent}`}>{s.value.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>

                    {usageStats.daily.length > 0 && (
                      <ChartContainer config={chartConfig} className="h-32 w-full">
                        <BarChart data={usageStats.daily} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="analyses" fill="hsl(230 80% 56%)" radius={[4, 4, 0, 0]} name="분석 수" />
                        </BarChart>
                      </ChartContainer>
                    )}

                    {usageStats.topIps.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-2">상위 사용 IP (오늘)</div>
                        <div className="space-y-1.5 max-h-64 overflow-auto">
                          {usageStats.topIps.map((r) => {
                            const pct = Math.min(100, Math.round((r.usage / r.cap) * 100));
                            const atLimit = r.usage >= r.cap;
                            return (
                              <div key={r.ip + r.updated_at} className="flex items-center gap-3 text-xs">
                                <span className="font-mono w-32 truncate">{r.ip}</span>
                                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full ${atLimit ? "bg-destructive" : "bg-primary"}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className={`font-mono tabular-nums w-16 text-right ${atLimit ? "text-destructive font-semibold" : ""}`}>
                                  {r.usage}/{r.cap}
                                </span>
                                {r.email_unlocked && (
                                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">📧</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Microsoft Clarity insights */}
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Clarity 행동 분석
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
                      최근 {clarity?.numOfDays ?? clarityDays}일
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((n) => (
                      <Button
                        key={n}
                        variant={clarityDays === n ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        onClick={() => { setClarityDays(n); fetchClarity(n); }}
                        disabled={clarityLoading}
                      >
                        {n}일
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs gap-1"
                      onClick={() => fetchClarity()}
                      disabled={clarityLoading}
                    >
                      <RefreshCw className={`w-3 h-3 ${clarityLoading ? "animate-spin" : ""}`} />
                      새로고침
                    </Button>
                    <a
                      href="https://clarity.microsoft.com/projects/view/wj4ish1rye"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2"
                    >
                      대시보드 <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                {clarity?.fetchedAt && (
                  <p className="text-xs text-muted-foreground">
                    조회: {new Date(clarity.fetchedAt).toLocaleString("ko-KR")} · 히트맵·세션 영상은 대시보드에서 확인
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {clarityErr ? (
                  <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                    {clarityErr}
                    {clarityErr.includes("429") && " — 무료 플랜은 하루 10회 호출 제한이 있어요."}
                  </div>
                ) : !clarity ? (
                  <p className="text-sm text-muted-foreground">불러오는 중...</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {[
                      { key: "totalSessions", label: "세션", fmt: (v: number) => v.toLocaleString() },
                      { key: "distinctUsers", label: "고유 사용자", fmt: (v: number) => v.toLocaleString() },
                      { key: "pagesPerSession", label: "세션당 페이지", fmt: (v: number) => v.toFixed(2) },
                      { key: "botSessions", label: "봇 세션", fmt: (v: number) => v.toLocaleString() },
                      { key: "deadClicks", label: "죽은 클릭", fmt: (v: number) => v.toLocaleString() },
                      { key: "rageClicks", label: "격분 클릭", fmt: (v: number) => v.toLocaleString() },
                      { key: "quickbackClicks", label: "퀵백 클릭", fmt: (v: number) => v.toLocaleString() },
                      { key: "scriptErrors", label: "스크립트 에러", fmt: (v: number) => v.toLocaleString() },
                    ].map(({ key, label, fmt }) => {
                      const v = clarity.summary[key];
                      const has = typeof v === "number" && !isNaN(v);
                      return (
                        <div key={key} className="border border-border rounded-lg p-3">
                          <div className="text-xs text-muted-foreground">{label}</div>
                          <div className="text-lg font-bold text-foreground mt-0.5">
                            {has ? fmt(v) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event breakdown & Recent leads */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">이벤트별 횟수</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(data.eventCounts)
                      .sort(([, a], [, b]) => b - a)
                      .map(([name, count]) => (
                        <div key={name} className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground font-mono text-xs">{name}</span>
                          <span className="font-semibold text-foreground">{count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>최근 리드</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      총 {data.summary.totalLeads.toLocaleString()}건
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                    {data.recentLeads.length === 0 ? (
                      <p className="text-sm text-muted-foreground">수집된 리드 없음</p>
                    ) : (
                      data.recentLeads.map((lead, i) => (
                        <div key={i} className="flex justify-between items-center text-sm">
                          <span className="text-foreground truncate max-w-[200px]">{lead.email}</span>
                          <span className="text-muted-foreground text-xs">
                            {new Date(lead.created_at).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recently Analyzed URLs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  최근 분석된 URL
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {(!data.recentUrls || data.recentUrls.length === 0) ? (
                    <p className="text-sm text-muted-foreground">분석 기록 없음</p>
                  ) : (
                    data.recentUrls.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-sm gap-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary truncate max-w-[300px] hover:underline font-mono text-xs"
                        >
                          {item.url}
                        </a>
                        <span className="text-muted-foreground text-xs shrink-0">
                          {new Date(item.created_at).toLocaleDateString("ko-KR")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Consultation Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  상담 신청 목록
                  {data.recentConsultations?.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {data.recentConsultations.length}건
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {(!data.recentConsultations || data.recentConsultations.length === 0) ? (
                    <p className="text-sm text-muted-foreground">상담 신청 없음</p>
                  ) : (
                    data.recentConsultations.map((c, i) => (
                      <div key={i} className="border border-border rounded-lg p-3 space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <div>
                              <span className="font-medium text-sm text-foreground">{c.name}</span>
                              {c.job_title && <span className="text-muted-foreground text-xs ml-1">· {c.job_title}</span>}
                              {c.company && <span className="text-muted-foreground text-xs ml-1">@ {c.company}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{c.email}</span>
                              {c.phone && <span>📞 {c.phone}</span>}
                            </div>
                          </div>
                          <span className="text-muted-foreground text-xs shrink-0">
                            {new Date(c.created_at).toLocaleDateString("ko-KR")}
                          </span>
                        </div>
                        {c.site_url && (
                          <a href={c.site_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-mono hover:underline block truncate">
                            {c.site_url}
                          </a>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {c.interests?.map((interest, j) => (
                            <span key={j} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {interest}
                            </span>
                          ))}
                          {c.budget && (
                            <span className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">
                              💰 {c.budget}
                            </span>
                          )}
                        </div>
                        {c.concerns && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{c.concerns}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* SERP 추적 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Search className="w-4 h-4" /> 🔎 SERP 추적 (Top 20 + 역키워드)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {(["all", "naver", "google"] as const).map((e) => (
                      <Button key={e} size="sm" variant={serpEngine === e ? "default" : "outline"} onClick={() => setSerpEngine(e)}>
                        {e === "all" ? "전체" : e === "naver" ? "네이버" : "구글"}
                      </Button>
                    ))}
                    <Button size="sm" variant="outline" onClick={fetchSerpTracking}>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> 새로고침
                    </Button>
                    <Button size="sm" onClick={triggerSerpTracking} disabled={serpTriggering}>
                      <Zap className="w-3.5 h-3.5 mr-1" /> {serpTriggering ? "실행 중..." : "지금 추적"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  매일 06:00 KST 자동 실행 · 등록 키워드 {serpKeywords.length}개 · 노출 {serpLatest.filter(r => r.our_exposed).length}/{serpLatest.length}건
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-muted-foreground border-b">
                      <tr className="text-left">
                        <th className="py-2 pr-3">키워드</th>
                        <th className="py-2 pr-3">엔진</th>
                        <th className="py-2 pr-3">우리 순위</th>
                        <th className="py-2 pr-3">매칭 URL</th>
                        <th className="py-2 pr-3">Top 도메인</th>
                        <th className="py-2 pr-3">시각</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serpLatest
                        .filter(r => serpEngine === "all" || r.engine === serpEngine)
                        .sort((a, b) => Number(a.our_exposed) - Number(b.our_exposed) || (a.our_rank ?? 999) - (b.our_rank ?? 999))
                        .map((r, i) => (
                          <tr key={i} className="border-b last:border-b-0">
                            <td className="py-2 pr-3 font-medium">{r.keyword}</td>
                            <td className="py-2 pr-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.engine === "naver" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                                {r.engine === "naver" ? "Naver" : "Google"}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              {r.error ? (
                                <span className="text-destructive" title={r.error}>오류</span>
                              ) : r.our_exposed ? (
                                <span className="font-bold text-primary">#{r.our_rank}</span>
                              ) : (
                                <span className="text-muted-foreground">미노출</span>
                              )}
                            </td>
                            <td className="py-2 pr-3">
                              {r.our_url ? (
                                <a href={r.our_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate inline-block max-w-[220px] align-middle">
                                  {r.our_url.replace(/^https?:\/\//, "")}
                                </a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-2 pr-3 max-w-[280px]">
                              <div className="flex flex-wrap gap-1">
                                {(r.top_domains || []).slice(0, 5).map((d, j) => (
                                  <span key={j} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{d}</span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                              {new Date(r.checked_at).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </td>
                          </tr>
                        ))}
                      {serpLatest.length === 0 && (
                        <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">아직 추적 데이터가 없습니다. "지금 추적"을 눌러주세요.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
