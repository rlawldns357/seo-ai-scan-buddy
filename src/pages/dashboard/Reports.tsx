import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import LockedFeature from "@/features/publish/LockedFeature";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type HistoryRow = { created_at: string; seo_score: number; aeo_score: number; geo_score: number };

export default function Reports() {
  const { site } = useUserSite();
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [publishedCount, setPublishedCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    if (!site) return;
    (async () => {
      const [h, pubC, queC] = await Promise.all([
        supabase.from("analysis_history")
          .select("created_at, seo_score, aeo_score, geo_score")
          .eq("url", site.site_url).order("created_at", { ascending: true }).limit(20),
        supabase.from("site_posts").select("id", { count: "exact", head: true })
          .eq("site_id", site.id).eq("status", "published"),
        supabase.from("site_posts").select("id", { count: "exact", head: true })
          .eq("site_id", site.id).eq("status", "queued"),
      ]);
      setHistory((h.data as HistoryRow[]) || []);
      setPublishedCount(pubC.count || 0);
      setQueuedCount(queC.count || 0);
    })();
  }, [site]);

  if (!site) {
    return (
      <>
        <Helmet><title>리포트 | AutoBlog</title></Helmet>
        <LockedFeature
          title="먼저 사이트를 연결하세요"
          description="허브에 발행된 글의 성과를 추적합니다."
          onCta={() => navigate("/dashboard")}
        />
      </>
    );
  }

  const chartData = history.map((h) => ({
    date: new Date(h.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    SEO: h.seo_score, AEO: h.aeo_score, GEO: h.geo_score,
  }));

  return (
    <>
      <Helmet><title>리포트 | AutoBlog</title></Helmet>
      <h1 className="text-2xl font-bold text-foreground mb-1">리포트</h1>
      <p className="text-sm text-muted-foreground mb-6">{site.site_url} 의 분석 점수 추이와 발행 현황입니다.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card className="p-4"><p className="text-xs text-muted-foreground">발행됨</p><p className="text-2xl font-bold text-foreground">{publishedCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">대기 중</p><p className="text-2xl font-bold text-foreground">{queuedCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">분석 횟수</p><p className="text-2xl font-bold text-foreground">{history.length}</p></Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">분석 점수 추이</h2>
        {chartData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-12">분석 기록이 없습니다. 메인에서 사이트를 분석해보세요.</p>
        ) : (
          <div className="w-full h-64">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="SEO" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="AEO" stroke="hsl(var(--accent))" strokeWidth={2} />
                <Line type="monotone" dataKey="GEO" stroke="hsl(var(--score-warning))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </>
  );
}
