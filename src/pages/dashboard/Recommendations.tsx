import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite, slugify } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import { useAutopublishSettings } from "@/features/publish/useAutopublishSettings";
import LockedFeature from "@/features/publish/LockedFeature";
import { emitWorkflowChanged } from "@/features/publish/workflowEvents";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Loader2, Send, Plus, Trash2, Sparkles, Search } from "lucide-react";

type Axis = "SEO" | "AEO" | "GEO";
type IdeaRow = {
  id: string;
  title: string;
  excerpt: string | null;
  source_axis: string | null;
  created_at: string;
};

const axisColor: Record<string, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-warning/10 text-score-warning",
};

export default function Recommendations() {
  const { site } = useUserSite();
  const { user, loading: authLoading } = useAuth();
  const { settings: autopubSettings } = useAutopublishSettings(site?.id);
  const navigate = useNavigate();

  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);
  const [filterSeed, setFilterSeed] = useState("");
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Realtime: load idea queue + subscribe to changes
  const loadIdeas = useCallback(async () => {
    if (!site) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("site_posts")
      .select("id, title, excerpt, source_axis, created_at")
      .eq("site_id", site.id)
      .eq("status", "idea")
      .order("created_at", { ascending: false })
      .limit(50);
    setIdeas((data ?? []) as IdeaRow[]);
    setLoading(false);
  }, [site]);

  useEffect(() => {
    void loadIdeas();
  }, [loadIdeas]);

  // Filtered view (selective seed filter)
  const visibleIdeas = useMemo(() => {
    const q = filterSeed.trim().toLowerCase();
    if (!q) return ideas;
    return ideas.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.excerpt ?? "").toLowerCase().includes(q),
    );
  }, [ideas, filterSeed]);

  const topup = async (target: number) => {
    if (!site) return;
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent("/dashboard/recommendations")}`);
      return;
    }
    setTopupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-idea", {
        body: {
          mode: "topup",
          siteId: site.id,
          target,
          seed: filterSeed.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const inserted = Number(data?.inserted ?? 0);
      const depth = Number(data?.depth ?? stockCount);
      const targetDepth = Number(data?.target ?? target);
      if (inserted > 0) {
        toast({ title: `✨ 블로그 ${inserted}개 추가`, description: "재고에 쌓아뒀어요." });
      } else if (depth >= targetDepth) {
        toast({ title: "이미 충분해요", description: "블로그 재고가 목표치에 도달했어요." });
      } else {
        toast({
          title: "이번엔 못 채웠어요",
          description: "추천이 겹쳐서 새 재고를 못 넣었어요. 한 번 더 눌러주세요.",
          variant: "destructive",
        });
      }
      await loadIdeas();
    } catch (e) {
      toast({
        title: "보충 실패",
        description: e instanceof Error ? e.message : "다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setTopupLoading(false);
    }
  };

  const promoteIdea = async (idea: IdeaRow) => {
    if (authLoading) return;
    if (!user || !site) return;
    if (promotingId) return;
    setPromotingId(idea.id);
    try {
      const axis = (idea.source_axis as Axis) || "SEO";
      const { data: gen, error: genErr } = await supabase.functions.invoke(
        "generate-content-draft",
        { body: { topic: idea.title, targetAxis: axis, siteUrl: site.site_url } },
      );
      if (genErr) throw genErr;
      if (gen?.error) throw new Error(gen.error);
      if (!gen?.content || gen.content.length < 200) {
        throw new Error("AI가 본문을 만들지 못했어요. 잠시 후 다시 시도해주세요.");
      }

      const rand = Math.random().toString(36).slice(2, 6);
      const slug = gen?.slug
        ? `${gen.slug}-${Date.now().toString(36)}`
        : `idea-${slugify(idea.title).slice(0, 24)}-${Date.now().toString(36)}-${rand}`;

      // Update the existing idea row → promote to scheduled with full content
      const { error } = await (supabase as any)
        .from("site_posts")
        .update({
          slug,
          title: gen?.title || idea.title,
          excerpt: gen?.excerpt ?? idea.excerpt,
          content: gen.content,
          status: "scheduled",
          source_axis: axis,
          keywords: Array.isArray(gen?.keywords) ? gen.keywords : [],
          faq: Array.isArray(gen?.faq) ? gen.faq : [],
        })
        .eq("id", idea.id);
      if (error) throw error;

      emitWorkflowChanged({ siteId: site.id, postId: idea.id, source: "recommendations" });
      toast({ title: "✨ 본문 생성 완료", description: "발행 대기 칸으로 이동합니다." });
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
    } catch (e) {
      toast({
        title: "본문 생성 실패",
        description: e instanceof Error ? e.message : "다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setPromotingId(null);
    }
  };

  const deleteIdea = async (idea: IdeaRow) => {
    if (deletingId) return;
    setDeletingId(idea.id);
    try {
      const { error } = await (supabase as any)
        .from("site_posts")
        .delete()
        .eq("id", idea.id);
      if (error) throw error;
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
    } catch (e) {
      toast({
        title: "삭제 실패",
        description: e instanceof Error ? e.message : "다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (!site) {
    return (
      <LockedFeature
        title="먼저 블로그 허브를 만들어주세요"
        description="블로그 허브를 만들면 사이트에 맞는 글 아이디어를 자동으로 쌓아드려요."
        ctaLabel="블로그 허브 만들기"
        onCta={() => navigate("/dashboard")}
      />
    );
  }

  const stockCount = ideas.length;
  const targetStock = Math.max(autopubSettings?.min_queue ?? 10, 10);
  const isFull = stockCount >= targetStock;
  const stockPct = Math.min(100, Math.round((stockCount / targetStock) * 100));
  const stockTone =
    stockCount === 0
      ? "bg-destructive"
      : stockCount < targetStock
        ? "bg-score-warning"
        : "bg-score-good";

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="p-4 rounded-2xl border-border/50 shadow-card bg-card">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground">블로그 재고</h2>
              <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80 text-xs font-semibold tabular-nums">
                {stockCount} / {targetStock}
              </span>
              {isFull && (
                <span className="px-2 py-0.5 rounded-full bg-score-good/10 text-score-good text-[10px] font-bold uppercase tracking-wider">
                  충분
                </span>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground mt-0.5 break-keep">
              {isFull
                ? "재고가 목표치를 채웠어요. 발행 대기로 보내면 본문이 생성돼요."
                : `목표까지 ${targetStock - stockCount}개 남았어요. 발행 대기로 보내면 본문이 생성돼요.`}
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full ${stockTone} transition-all`}
                style={{ width: `${stockPct}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full h-9 px-3 gap-1.5"
              disabled={topupLoading || isFull}
              onClick={() => topup(stockCount + 1)}
              title={isFull ? "재고가 충분해요" : "1개만 받기"}
            >
              {topupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="text-xs font-semibold">+1</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="rounded-full h-9 px-3 gap-1.5"
              disabled={topupLoading || isFull}
              onClick={() => topup(stockCount + 5)}
              title={isFull ? "재고가 충분해요" : undefined}
            >
              {topupLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span className="text-xs font-semibold">
                {isFull ? "재고 충분" : "블로그 5개 더 받기"}
              </span>
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 px-3 h-10 rounded-full bg-muted/40 border border-border/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">URL</span>
          <span className="text-sm text-foreground/80 truncate flex-1">{site.site_url}</span>
          <a
            href={site.site_url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-primary shrink-0"
            aria-label="새 탭"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="mt-2 flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="키워드로 재고 필터링 (선택)"
              value={filterSeed}
              onChange={(e) => setFilterSeed(e.target.value)}
              className="h-9 rounded-full pl-9 text-sm"
              maxLength={120}
            />
          </div>
          {filterSeed && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full h-9 px-3 text-xs"
              onClick={() => setFilterSeed("")}
            >
              초기화
            </Button>
          )}
        </div>
      </Card>

      {/* Idea stock list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      ) : visibleIdeas.length === 0 ? (
        <Card className="px-4 py-8 border-dashed border-border/60 bg-muted/20 text-center">
          <Sparkles className="w-6 h-6 text-muted-foreground/60 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground">
            {ideas.length === 0 ? "아직 재고가 없어요" : "필터에 맞는 블로그가 없어요"}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1 break-keep">
            {ideas.length === 0
              ? "위 ‘블로그 10개 더 받기’를 눌러 재고를 채워보세요."
              : "키워드를 비우거나 더 받아보세요."}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visibleIdeas.map((idea) => {
            const isPromoting = promotingId === idea.id;
            const isDeleting = deletingId === idea.id;
            const axis = (idea.source_axis as Axis) || "SEO";
            return (
              <Card
                key={idea.id}
                className={`px-3 py-3 transition-colors ${
                  isPromoting || isDeleting ? "opacity-60" : "hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        axisColor[axis] ?? "bg-muted text-foreground"
                      }`}
                    >
                      {axis}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-foreground line-clamp-1 break-keep">
                        {idea.title}
                      </h3>
                      {idea.excerpt && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 break-keep">
                          {idea.excerpt}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="default"
                      className="rounded-full h-8 text-xs gap-1"
                      disabled={isPromoting || !!promotingId}
                      onClick={() => promoteIdea(idea)}
                    >
                      {isPromoting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      발행 대기로
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      disabled={isDeleting}
                      onClick={() => deleteIdea(idea)}
                      aria-label="아이디어 삭제"
                    >
                      {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
