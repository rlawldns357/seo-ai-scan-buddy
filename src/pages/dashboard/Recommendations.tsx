import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite, slugify } from "@/features/publish/useUserSite";
import LockedFeature from "@/features/publish/LockedFeature";
import { useRequireAuthAction } from "@/features/auth/useRequireAuthAction";
import { toast } from "@/hooks/use-toast";
import { Sparkles, ExternalLink, Dice5, Loader2, Send } from "lucide-react";

const MAX_SEED_HISTORY = 12;

type Axis = "SEO" | "AEO" | "GEO";
type Idea = { id: string; topic: string; axis: Axis; reason: string; rolling?: boolean };

const axisColor: Record<Axis, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-warning/10 text-score-warning",
};

const STARTER_TEMPLATES: Record<Axis, string[]> = {
  SEO: ["검색 노출을 끌어올리는 핵심 키워드 가이드", "메타 태그 최적화 실전 체크리스트"],
  AEO: ["AI 검색에 인용되는 답변형 콘텐츠 작성법", "FAQ 스키마로 답변 채택률 높이기"],
  GEO: ["ChatGPT·Perplexity가 우리 브랜드를 인용하게 만드는 법", "엔티티 강화로 AI 가시성 확보하기"],
};

const AXES: Axis[] = ["SEO", "AEO", "GEO"];
const newId = () => Math.random().toString(36).slice(2, 9);

export default function Recommendations() {
  const { site } = useUserSite();
  const navigate = useNavigate();
  const guard = useRequireAuthAction();
  const [seed, setSeed] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [creditTotal, setCreditTotal] = useState<number | null>(null);
  const [seedRolling, setSeedRolling] = useState(false);
  const [seedHistory, setSeedHistory] = useState<string[]>([]);

  const loadCredits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("regeneration_credits")
      .select("balance, addon_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setCreditTotal((data?.balance ?? 0) + (data?.addon_balance ?? 0));
  }, []);

  useEffect(() => {
    void loadCredits();
  }, [loadCredits]);

  // Seed initial recommendations from latest analysis (no AI cost)
  useEffect(() => {
    if (!site) return;
    setLoading(true);
    (async () => {
      const { data: history } = await supabase
        .from("analysis_history")
        .select("seo_score, aeo_score, geo_score")
        .eq("url", site.site_url)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let orderedAxes: Axis[] = [...AXES];
      if (history) {
        const map: Record<Axis, number> = {
          SEO: history.seo_score, AEO: history.aeo_score, GEO: history.geo_score,
        };
        orderedAxes.sort((a, b) => map[a] - map[b]); // worst first
      }
      // Pick one topic per axis (3 cards) — round-robin order from axes
      const seeds: Idea[] = orderedAxes.map((ax) => ({
        id: newId(),
        topic: STARTER_TEMPLATES[ax][0],
        axis: ax,
        reason: history ? `${ax} 점수 보강` : "기본 추천",
      }));
      setIdeas(seeds);
      setLoading(false);
    })();
  }, [site]);

  const rollIdea = guard(async (idea: Idea) => {
    if (!site) return;
    if (creditTotal !== null && creditTotal < 1) {
      toast({ title: "🎲 크레딧이 부족해요", description: "이번 달 재생성 크레딧을 모두 사용했어요.", variant: "destructive" });
      return;
    }
    setIdeas((cur) => cur.map((i) => (i.id === idea.id ? { ...i, rolling: true } : i)));
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-idea", {
        body: {
          siteUrl: site.site_url,
          siteTitle: site.title,
          axis: idea.axis,
          seed,
          currentTopic: idea.topic,
          avoidTopics: ideas.map((i) => i.topic),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setIdeas((cur) =>
        cur.map((i) =>
          i.id === idea.id
            ? { ...i, topic: data.topic, reason: data.reason || `${i.axis} 보강 추천`, rolling: false }
            : i,
        ),
      );
      setCreditTotal((data.newBalance ?? 0) + (data.newAddon ?? 0));
      toast({ title: "🎲 새 주제 나왔어요!" });
    } catch (e) {
      setIdeas((cur) => cur.map((i) => (i.id === idea.id ? { ...i, rolling: false } : i)));
      toast({
        title: "재생성 실패",
        description: e instanceof Error ? e.message : "다시 시도해주세요",
        variant: "destructive",
      });
    }
  });

  const sendToWorkflow = guard(async (idea: Idea) => {
    if (!site) return;
    const slug = `idea-${slugify(idea.topic).slice(0, 24)}-${Date.now().toString(36)}`;
    const { error } = await (supabase as any).from("site_posts").insert({
      site_id: site.id,
      slug,
      title: idea.topic,
      content: "",
      status: "idea",
      source_axis: idea.axis,
    });
    if (error) {
      toast({ title: "추가 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "워크플로우에 추가됐어요", description: "아이디어 칸으로 이동" });
    document.getElementById("workflow")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  if (!site) {
    return (
      <LockedFeature
        title="먼저 블로그 허브를 만들어주세요"
        description="블로그 허브를 만들면 분석 결과를 바탕으로 글 아이디어를 추천해드려요."
        ctaLabel="블로그 허브 만들기"
        onCta={() => navigate("/dashboard#overview")}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Site URL + topic seed input */}
      <Card className="p-4 rounded-2xl border-border/50 shadow-card bg-card">
        <div className="grid md:grid-cols-[1fr_1.2fr_auto] gap-2 items-end">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">분석 대상 URL</label>
            <div className="mt-1 flex items-center gap-1.5 px-3 h-10 rounded-full bg-muted/50 border border-border/40">
              <span className="text-sm text-foreground truncate flex-1">{site.site_url}</span>
              <a href={site.site_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary shrink-0" aria-label="새 탭">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <div>
            <label htmlFor="seed-topic" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">관심 주제 (선택)</label>
            <Input
              id="seed-topic"
              placeholder="예: 친환경 패키징, 신규 방문자 유입"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              className="mt-1 h-10 rounded-full"
              maxLength={120}
            />
          </div>
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 shrink-0 pb-2 md:pb-3">
            <span>🎲</span>
            <span className="font-semibold text-foreground tabular-nums">{creditTotal ?? "-"}</span>
            <span>크레딧</span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          마음에 들지 않는 추천은 <span className="font-semibold text-foreground">🎲 주사위</span>로 다시 굴려보세요. (1회 = 1크레딧)
        </p>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : (
        <div className="space-y-2">
          {ideas.map((idea) => (
            <Card key={idea.id} className={`px-3 py-3 transition-colors ${idea.rolling ? "opacity-60" : "hover:border-primary/50"}`}>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${axisColor[idea.axis]}`}>{idea.axis}</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground line-clamp-1 break-keep">{idea.topic}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 break-keep">{idea.reason}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full h-8 text-xs gap-1"
                    disabled={idea.rolling}
                    onClick={() => rollIdea(idea)}
                    title="주사위 굴려 다른 주제 받기 (1 크레딧)"
                  >
                    {idea.rolling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Dice5 className="w-3 h-3" />}
                    {idea.rolling ? "굴리는 중" : "다시 굴리기"}
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full h-8 text-xs gap-1"
                    disabled={idea.rolling}
                    onClick={() => sendToWorkflow(idea)}
                  >
                    <Send className="w-3 h-3" /> 워크플로우로
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
