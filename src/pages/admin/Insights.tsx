import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Users, Clock, Mail, Globe, MessageSquare, Eye, RefreshCw, Activity, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface Summary {
  totalSessions: number;
  totalAnalyses: number;
  totalCompleted: number;
  totalLeads: number;
  avgDurationSec: number;
  analysisConversion: number;
  leadConversion: number;
  pageviews?: number;
  homePageViews?: number;
  uniqueSessions?: number;
  uniqueHomeSessions?: number;
  homeStartCount?: number;
  homeCompleteCount?: number;
  homeEmailCount?: number;
  homeToStartPct?: number;
  startToCompletePct?: number;
  completeToLeadPct?: number;
}

interface InsightsData {
  summary: Summary;
  eventCounts: Record<string, number>;
  dailyData: { date: string; sessions: number; pageviews?: number; homePageviews?: number; analyses: number; leads: number }[];
  recentLeads: { email: string; source: string; created_at: string }[];
  recentUrls: { url: string; created_at: string }[];
  recentConsultations: { name: string; email: string; phone: string | null; company: string | null; job_title: string | null; site_url: string | null; budget: string | null; interests: string[] | null; concerns: string | null; status: string; created_at: string }[];
}

const chartConfig: ChartConfig = {
  pageviews: { label: "페이지뷰", color: "hsl(220 70% 50%)" },
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

export default function Insights() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightsData | null>(null);
  const [days, setDays] = useState(30);
  const [clarity, setClarity] = useState<{ summary: Record<string, number>; numOfDays: number; fetchedAt: string } | null>(null);
  const [clarityErr, setClarityErr] = useState<string>("");
  const [clarityLoading, setClarityLoading] = useState(false);
  const [clarityDays, setClarityDays] = useState(1);

  const fetchInsights = async (d: number) => {
    setLoading(true);
    const pw = sessionStorage.getItem("admin_pw") || "";
    try {
      const { data: res, error: err } = await supabase.functions.invoke("admin-insights", {
        body: { password: pw, days: d },
      });
      if (!err && !res?.error) setData(res);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchClarity = async (n: number = clarityDays) => {
    setClarityLoading(true);
    setClarityErr("");
    const pw = sessionStorage.getItem("admin_pw") || "";
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw, action: "clarityInsights", numOfDays: n },
    });
    if (res?.error) setClarityErr(res.error);
    else if (res?.summary) setClarity({ summary: res.summary, numOfDays: res.numOfDays, fetchedAt: res.fetchedAt });
    setClarityLoading(false);
  };

  useEffect(() => { fetchInsights(days); }, [days]);

  const s = data?.summary;

  return (
    <div className="space-y-3 md:space-y-6">
      <Helmet>
        <title>인사이트 – 서치튠OS 관리자</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-foreground">📊 인사이트</h1>
          <p className="hidden md:block text-sm text-muted-foreground">방문·퍼널·리드·상담 신청</p>
        </div>
        <div className="flex gap-1 md:gap-2 shrink-0">
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              className="h-8 px-2.5 text-xs md:h-9 md:px-3 md:text-sm"
              onClick={() => setDays(d)}
            >
              {d}일
            </Button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="text-center py-20 text-muted-foreground">로딩 중...</div>
      ) : data && s ? (
        <>
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm md:text-base font-bold text-foreground">방문 지표</h3>
              <p className="text-[10px] md:text-xs text-muted-foreground">page_view 기반 · 세션=동일 브라우저 탭</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <StatCard icon={Eye} label="페이지뷰" value={(s.pageviews ?? 0).toLocaleString()} sub={`홈 ${(s.homePageViews ?? 0).toLocaleString()}`} />
              <StatCard icon={Users} label="고유 세션" value={(s.uniqueSessions ?? s.totalSessions).toLocaleString()} sub={`홈 진입 ${(s.uniqueHomeSessions ?? 0).toLocaleString()}`} />
              <StatCard icon={Clock} label="평균 체류" value={formatDuration(s.avgDurationSec)} />
              <StatCard icon={Mail} label="리드 수집" value={s.totalLeads} />
            </div>
          </div>

          <Card>
            <CardHeader className="p-3 md:p-6 md:pb-2">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                홈 진입 퍼널
                <span className="text-[10px] md:text-xs font-normal text-muted-foreground">홈을 본 세션만 계산</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 md:pt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <FunnelStep label="홈 진입" value={s.uniqueHomeSessions ?? 0} pct={100} tone="base" />
                <FunnelStep label="분석 시작" value={s.homeStartCount ?? 0} pct={s.homeToStartPct ?? 0} tone="good" />
                <FunnelStep label="분석 완료" value={s.homeCompleteCount ?? 0} pct={s.startToCompletePct ?? 0} suffix="(시작 대비)" tone="good" />
                <FunnelStep label="이메일 리드" value={s.homeEmailCount ?? 0} pct={s.completeToLeadPct ?? 0} suffix="(완료 대비)" tone="warn" />
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-3">
                ※ 전체 세션 기준: 분석 {s.analysisConversion}% · 리드 {s.leadConversion}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 md:p-6 md:pb-2">
              <CardTitle className="text-sm md:text-base">일별 추이</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-6 md:pt-0">
              <ChartContainer config={chartConfig} className="h-[200px] md:h-[280px] w-full">
                <BarChart data={data.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.substring(5)} className="text-xs" />
                  <YAxis className="text-xs" width={28} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="pageviews" fill="var(--color-pageviews)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sessions" fill="var(--color-sessions)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="analyses" fill="var(--color-analyses)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="leads" fill="var(--color-leads)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

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
                    불러오기
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
            </CardHeader>
            <CardContent>
              {clarityErr ? (
                <div className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                  {clarityErr}
                  {clarityErr.includes("429") && " — 무료 플랜은 하루 10회 호출 제한이 있어요."}
                </div>
              ) : !clarity ? (
                <p className="text-sm text-muted-foreground">"불러오기"를 눌러 Clarity 데이터를 조회하세요. (외부 API · 지연 발생)</p>
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

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">이벤트별 횟수</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
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
        </>
      ) : null}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-3 md:pt-5 md:pb-4 md:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-base md:text-xl font-bold text-foreground leading-tight">{value}</p>
            {sub && <p className="text-[10px] md:text-xs text-muted-foreground truncate">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelStep({ label, value, pct, suffix, tone = "base" }: { label: string; value: number; pct: number; suffix?: string; tone?: "base" | "good" | "warn" | "bad" }) {
  const toneCls =
    tone === "good" ? "text-emerald-600 bg-emerald-500/10"
    : tone === "warn" ? "text-amber-600 bg-amber-500/10"
    : tone === "bad" ? "text-rose-600 bg-rose-500/10"
    : "text-foreground bg-muted";
  return (
    <div className="border border-border rounded-lg p-2.5 md:p-3">
      <div className="text-[10px] md:text-xs text-muted-foreground truncate">{label}</div>
      <div className="text-base md:text-xl font-bold text-foreground leading-tight mt-0.5">
        {value.toLocaleString()}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className={`text-[10px] md:text-xs font-semibold px-1.5 py-0.5 rounded ${toneCls}`}>
          {pct}%
        </span>
        {suffix && <span className="text-[10px] text-muted-foreground truncate">{suffix}</span>}
      </div>
    </div>
  );
}
