import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import LockedFeature from "@/features/publish/LockedFeature";
import { useRequireAuthAction } from "@/features/auth/useRequireAuthAction";
import { Sparkles, ArrowRight, TrendingDown } from "lucide-react";

type Idea = { topic: string; axis: "SEO" | "AEO" | "GEO"; reason: string };

const axisColor: Record<string, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-warning/10 text-score-warning",
};

export default function Recommendations() {
  const { site } = useUserSite();
  const navigate = useNavigate();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!site) return;
    setLoading(true);
    (async () => {
      const { data: history } = await supabase
        .from("analysis_history")
        .select("seo_score, aeo_score, geo_score, result_data, url")
        .eq("url", site.site_url)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // generate naive ideas from scores (no extra AI call yet)
      const seeds: Idea[] = [];
      if (history) {
        const axes: ("SEO" | "AEO" | "GEO")[] = ["SEO", "AEO", "GEO"];
        axes.sort((a, b) => {
          const map: Record<string, number> = { SEO: history.seo_score, AEO: history.aeo_score, GEO: history.geo_score };
          return map[a] - map[b];
        });
        const tpl: Record<string, string[]> = {
          SEO: ["검색 노출을 끌어올리는 핵심 키워드 가이드", "메타 태그 최적화 실전 체크리스트"],
          AEO: ["AI 검색에 인용되는 답변형 콘텐츠 작성법", "FAQ 스키마로 답변 채택률 높이기"],
          GEO: ["ChatGPT·Perplexity가 우리 브랜드를 인용하게 만드는 법", "엔티티 강화로 AI 가시성 확보하기"],
        };
        axes.forEach((ax) => {
          tpl[ax].forEach((topic) => seeds.push({ topic, axis: ax, reason: `${ax} 점수 보강` }));
        });
      } else {
        ["검색 노출 강화 콘텐츠", "AI 답변에 인용되는 글", "브랜드 엔티티 정의 페이지"].forEach((t, i) =>
          seeds.push({ topic: t, axis: (["SEO", "AEO", "GEO"] as const)[i], reason: "기본 추천" }),
        );
      }
      setIdeas(seeds.slice(0, 5));
      setLoading(false);
    })();
  }, [site]);

  if (!site) {
    return (
      <>
        <Helmet><title>콘텐츠 추천 | Auto Publish</title></Helmet>
        <LockedFeature
          title="먼저 사이트를 연결하세요"
          description="콘텐츠 허브를 만들면 분석 결과를 바탕으로 글 아이디어를 추천해드려요."
          onCta={() => navigate("/dashboard")}
        />
      </>
    );
  }

  return (
    <>
      <Helmet><title>콘텐츠 추천 | Auto Publish</title></Helmet>
      <h1 className="text-2xl font-bold text-foreground mb-1">콘텐츠 추천</h1>
      <p className="text-sm text-muted-foreground mb-6">{site.site_url} 분석 결과를 바탕으로 추천된 글 주제입니다.</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <div className="grid gap-3">
          {ideas.map((idea, i) => (
            <Card key={i} className="p-4 flex items-start justify-between gap-4 hover:border-primary/50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${axisColor[idea.axis]}`}>{idea.axis}</span>
                  <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> {idea.reason}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground">{idea.topic}</h3>
              </div>
              <Button
                size="sm"
                className="rounded-full shrink-0"
                onClick={() => goCreate(idea)}
              >
                <Sparkles className="w-3.5 h-3.5" /> 글로 만들기 <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
