import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import LockedFeature from "@/features/publish/LockedFeature";
import SectionCardHeader from "@/features/publish/ui/SectionCardHeader";
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
          .eq("site_id", site.id).eq("status", "scheduled"),
      ]);
      setHistory((h.data as HistoryRow[]) || []);
      setPublishedCount(pubC.count || 0);
      setQueuedCount(queC.count || 0);
    })();
  }, [site]);

  if (!site) {
    return (
      <LockedFeature
        title="먼저 블로그 허브를 만들어주세요"
        description="블로그 허브에 발행된 글의 성과를 추적합니다."
        ctaLabel="블로그 허브 만들기"
        onCta={() => {
          document.getElementById("overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
    );
  }

  const chartData = history.map((h) => ({
    date: new Date(h.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    SEO: h.seo_score, AEO: h.aeo_score, GEO: h.geo_score,
  }));

  return (
    <Card className="rounded-2xl border-border/60 overflow-hidden">
      <SectionCardHeader
        tone="success"
        title="분석 점수 추이"
        meta={
          <>
            <span><span className="text-foreground font-semibold">{publishedCount}</span> 발행</span>
            <span><span className="text-foreground font-semibold">{queuedCount}</span> 대기</span>
            <span><span className="text-foreground font-semibold">{history.length}</span> 분석</span>
          </>
        }
      />
      <div className="p-3 sm:p-5">
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-xs text-muted-foreground text-center">
              아직 분석 기록이 없어요. 무료 진단을 실행하면 점수 추이가 여기에 쌓입니다.
            </p>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background text-xs font-semibold px-4 py-2 hover:bg-foreground/90 transition"
            >
              무료 진단 실행하러 가기 →
            </button>
          </div>
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
      </div>
    </Card>
  );
}
