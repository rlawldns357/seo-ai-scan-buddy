import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, BarChart3, Users, Zap, Clock, TrendingUp, Mail, Globe, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  recentConsultations: { name: string; email: string; site_url: string | null; budget: string | null; interests: string[] | null; concerns: string | null; status: string; created_at: string }[];
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
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<InsightsData | null>(null);
  const [days, setDays] = useState(30);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: res, error: err } = await supabase.functions.invoke("admin-auth", {
        body: { password },
      });
      if (err || res?.error) {
        setError("비밀번호가 틀렸습니다");
      } else {
        setAuthed(true);
        sessionStorage.setItem("admin_pw", password);
      }
    } catch {
      setError("서버 오류");
    }
    setLoading(false);
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
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (authed) fetchInsights(days);
  }, [authed, days]);

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-primary-foreground" />
            </div>
            <CardTitle className="text-lg">관리자 인증</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? "확인 중..." : "로그인"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-6">
        {/* Header */}
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
                  <CardTitle className="text-base">최근 리드</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
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
                          <div>
                            <span className="font-medium text-sm text-foreground">{c.name}</span>
                            <span className="text-muted-foreground text-xs ml-2">{c.email}</span>
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
