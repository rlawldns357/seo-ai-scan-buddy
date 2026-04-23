import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite, slugify } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import LockedFeature from "@/features/publish/LockedFeature";
import { useRequireAuthAction } from "@/features/auth/useRequireAuthAction";
import { emitWorkflowChanged } from "@/features/publish/workflowEvents";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Dice5, Loader2, Send } from "lucide-react";

const MAX_SEED_HISTORY = 12;

type Axis = "SEO" | "AEO" | "GEO";
type Idea = { id: string; topic: string; axis: Axis; reason: string; rolling?: boolean };

const axisColor: Record<Axis, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-warning/10 text-score-warning",
};

const AXES: Axis[] = ["SEO", "AEO", "GEO"];

const IDEA_BUILDERS: Record<Axis, (seed: string) => string> = {
  SEO: (seed) => `${seed} 검색 유입을 위한 핵심 가이드`,
  AEO: (seed) => `${seed} 관련 자주 묻는 질문 정리`,
  GEO: (seed) => `${seed} 선택 기준과 비교 포인트 정리`,
};

function buildIdeasFromSeed(seed: string, orderedAxes: Axis[]): Idea[] {
  const cleanSeed = seed.trim();
  if (!cleanSeed) return [];

  return orderedAxes.map((axis) => ({
    id: `${axis}-${cleanSeed}`,
    topic: IDEA_BUILDERS[axis](cleanSeed),
    axis,
    reason: `${cleanSeed} 중심 ${axis} 아이디어`,
  }));
}

export default function Recommendations() {
  const { site } = useUserSite();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const guard = useRequireAuthAction();
  const [seed, setSeed] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [creditTotal, setCreditTotal] = useState<number | null>(null);
  const [seedRolling, setSeedRolling] = useState(false);
  const [queueingIdeaId, setQueueingIdeaId] = useState<string | null>(null);
  const [seedHistory, setSeedHistory] = useState<string[]>([]);
  const [orderedAxes, setOrderedAxes] = useState<Axis[]>(AXES);
  const [queuedIdeaIds, setQueuedIdeaIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    setIdeas(buildIdeasFromSeed(seed, orderedAxes));
  }, [seed, orderedAxes]);

  // Load score order only; don't show generic recommendations without a real topic
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
      setOrderedAxes(orderedAxes);
      setLoading(false);
    })();
  }, [site]);

  const rollSeed = guard(async () => {
    if (!site) return;
    setSeedRolling(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-idea", {
        body: {
          mode: "seed",
          siteUrl: site.site_url,
          siteTitle: site.title,
          avoidSeeds: seedHistory,
        },
      });
      // 컨텍스트 부족(422) — 일반론 추천을 거부하고 사용자 입력 유도
      const insufficient = (data?.insufficient_context === true) ||
        (typeof error?.message === "string" && error.message.includes("422"));
      if (insufficient) {
        toast({
          title: "추천할 만한 주제가 없어요",
          description: data?.error ?? "사이트 내용이 부족합니다. 관심 주제를 직접 입력해주세요.",
        });
        return;
      }
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const next: string = data?.seed ?? "";
      if (!next) throw new Error("빈 응답");
      setSeed(next);
      setSeedHistory((h) => [next, ...h.filter((s) => s !== next)].slice(0, MAX_SEED_HISTORY));
      toast({ title: "🎲 관심 주제 추천 완료", description: next });
    } catch (e) {
      toast({
        title: "추천 실패",
        description: e instanceof Error ? e.message : "다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setSeedRolling(false);
    }
  });

  const sendToWorkflow = async (idea: Idea) => {
    if (authLoading) {
      toast({
        title: "로그인 상태 확인 중입니다",
        description: "잠시 후 다시 시도해주세요.",
      });
      return;
    }
    if (!user) {
      const next = encodeURIComponent("/dashboard#recommendations");
      toast({
        title: "로그인이 필요한 작업입니다",
        description: "이 작업을 계속하려면 먼저 로그인하세요.",
      });
      navigate(`/auth?next=${next}`);
      return;
    }
    if (!site) {
      toast({
        title: "사이트를 먼저 선택해주세요",
        description: "블로그 허브가 준비되면 워크플로우로 보낼 수 있어요.",
        variant: "destructive",
      });
      return;
    }

    setQueueingIdeaId(idea.id);
    try {
      const slug = `idea-${slugify(idea.topic).slice(0, 24)}-${Date.now().toString(36)}`;
      const { data, error } = await (supabase as any)
        .from("site_posts")
        .insert({
          site_id: site.id,
          slug,
          title: idea.topic,
          // RLS는 content 길이 ≥ 1을 요구함. 아이디어 단계에서는 placeholder를 채워두고
          // draft로 옮길 때 AI가 본문을 덮어씁니다.
          content: `# ${idea.topic}\n\n(아이디어 단계 — 초안으로 옮기면 AI가 본문을 생성합니다)`,
          status: "idea",
          source_axis: idea.axis,
        })
        .select("id")
        .single();

      if (error) throw error;

      emitWorkflowChanged({ siteId: site.id, postId: data?.id, source: "recommendations" });
      toast({ title: "워크플로우에 추가됐어요", description: "아이디어 칸으로 이동합니다." });
      document.getElementById("workflow")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      toast({
        title: "추가 실패",
        description: error instanceof Error ? error.message : "다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setQueueingIdeaId(null);
    }
  };

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
            <div className="mt-1 flex items-center gap-1.5">
              <Input
                id="seed-topic"
                placeholder="예: 친환경 패키징, 신규 방문자 유입"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="h-10 rounded-full flex-1"
                maxLength={120}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full h-10 px-3 gap-1 shrink-0"
                disabled={seedRolling}
                onClick={() => rollSeed()}
                title="사이트 컨텍스트로 관심 주제 추천 (무료)"
                aria-label="관심 주제 추천"
              >
                {seedRolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dice5 className="w-4 h-4" />}
                <span className="hidden sm:inline text-xs">추천</span>
              </Button>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1 shrink-0 pb-2 md:pb-3">
            <span>🎲</span>
            <span className="font-semibold text-foreground tabular-nums">{creditTotal ?? "-"}</span>
            <span>크레딧</span>
          </div>
        </div>
         <p className="text-[11px] text-muted-foreground mt-2">
           <span className="font-semibold text-foreground">🎲 주사위</span>로 사이트에 맞는 관심 주제를 먼저 받고, 직접 입력해도 아래 아이디어가 갱신됩니다.
        </p>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : ideas.length === 0 ? (
        <Card className="px-4 py-6 border-dashed border-border/60 bg-muted/20">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">아직 추천 아이디어가 없어요</p>
            <p className="text-sm text-muted-foreground break-keep">
              관심 주제를 직접 적거나 주사위로 추천받으면, 그 주제 기준으로만 아이디어를 보여드릴게요.
            </p>
          </div>
        </Card>
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
                    className="rounded-full h-8 text-xs gap-1"
                    disabled={queueingIdeaId === idea.id}
                    onClick={() => sendToWorkflow(idea)}
                  >
                    {queueingIdeaId === idea.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} 워크플로우로
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
