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
        title="먼저 내 콘텐츠 페이지를 만들어주세요"
        description="페이지에 발행된 글의 성과를 추적합니다."
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
      {/* 카드 헤더: 좌측 액센트 점 + 타이틀 + 우측 미니 메타 */}
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-score-excellent" />
          <h2 className="text-sm font-semibold text-foreground">분석 점수 추이</h2>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
          <span><span className="text-foreground font-semibold">{publishedCount}</span> 발행</span>
          <span><span className="text-foreground font-semibold">{queuedCount}</span> 대기</span>
          <span><span className="text-foreground font-semibold">{history.length}</span> 분석</span>
        </div>
      </div>
      <div className="p-5">
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
      </div>
    </Card>
  );
}
