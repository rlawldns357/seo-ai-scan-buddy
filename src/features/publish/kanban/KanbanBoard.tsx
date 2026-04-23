import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import { useRequireAuthAction } from "@/features/auth/useRequireAuthAction";
import LockedFeature from "@/features/publish/LockedFeature";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles, Archive } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import PostDetailPanel from "./PostDetailPanel";
import { COLUMN_META, COLUMN_ORDER, KanbanPost, KanbanStatus, PUBLISHED_VISIBLE_LIMIT } from "./types";

const NEXT_STATUS: Record<KanbanStatus, KanbanStatus | null> = {
  idea: "draft",
  draft: "scheduled",
  scheduled: "published",
  published: null,
  archived: null,
};

export default function KanbanBoard() {
  const { user, loading: authLoading } = useAuth();
  const { site, loading: siteLoading } = useUserSite();
  const navigate = useNavigate();
  const requireAuth = useRequireAuthAction();
  const isMobile = useIsMobile();

  const [posts, setPosts] = useState<KanbanPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [openPost, setOpenPost] = useState<KanbanPost | null>(null);
  
  const [activeTab, setActiveTab] = useState<KanbanStatus>("idea");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const load = useCallback(async () => {
    if (!site) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("site_posts")
      .select("id,site_id,slug,title,excerpt,content,status,source_axis,published_at,created_at,updated_at,view_count,seo_score,aeo_score,geo_score,keywords")
      .eq("site_id", site.id)
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    }
    setPosts(((data as KanbanPost[]) ?? []));
    setLoading(false);
  }, [site]);

  useEffect(() => {
    if (!siteLoading) load();
  }, [siteLoading, load]);

  const grouped = useMemo(() => {
    const out: Record<KanbanStatus, KanbanPost[]> = { idea: [], draft: [], scheduled: [], published: [], archived: [] };
    for (const p of posts) {
      if (out[p.status]) out[p.status].push(p);
    }
    return out;
  }, [posts]);

  const archivedCount = grouped.archived.length;
  const totalPublishedHistory = grouped.published.length + archivedCount;

  /** Apply optimistic status change, returning a rollback function. */
  const optimisticMove = (id: string, to: KanbanStatus) => {
    const prev = posts;
    setPosts((cur) => cur.map((p) => (p.id === id ? { ...p, status: to } : p)));
    return () => setPosts(prev);
  };

  const performTransition = useCallback(
    async (post: KanbanPost, to: KanbanStatus) => {
      if (post.status === to) return;
      setBusyId(post.id);
      const rollback = optimisticMove(post.id, to);
      try {
        if (to === "draft" && post.status === "idea") {
          // Generate body via AI, then update row
          const { data, error } = await supabase.functions.invoke("generate-content-draft", {
            body: { topic: post.title, targetAxis: post.source_axis || "SEO", siteUrl: site?.site_url },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          const { error: upErr } = await supabase
            .from("site_posts")
            .update({
              status: "draft",
              title: data.title || post.title,
              excerpt: data.excerpt || post.excerpt,
              content: data.content || post.content || "",
              keywords: Array.isArray(data.keywords) ? data.keywords : (post.keywords ?? []),
              faq: Array.isArray(data.faq) ? data.faq : [],
            } as any)
            .eq("id", post.id);
          if (upErr) throw upErr;
          toast({ title: "AI가 초안을 생성했어요" });
        } else if (to === "published") {
          const { data, error } = await supabase.functions.invoke("publish-site-post", {
            body: { postId: post.id },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          toast({ title: "발행되었습니다" });
        } else if (to === "draft" && post.status === "published") {
          const { error } = await supabase
            .from("site_posts")
            .update({ status: "draft", published_at: null })
            .eq("id", post.id);
          if (error) throw error;
          toast({ title: "발행 취소 — 초안으로 이동" });
        } else {
          // Generic status update (draft <-> scheduled, etc.)
          const patch: { status: KanbanStatus; published_at?: string | null } = { status: to };
          if (to === "scheduled" || to === "idea") patch.published_at = null;
          const { error } = await supabase.from("site_posts").update(patch).eq("id", post.id);
          if (error) throw error;
          toast({ title: `${COLUMN_META[to].label}(으)로 이동` });
        }
        await load();
      } catch (e: any) {
        rollback();
        toast({
          title: "이동 실패",
          description: e?.message || "다시 시도해주세요",
          variant: "destructive",
        });
      } finally {
        setBusyId(null);
      }
    },
    [load, posts, site?.site_url],
  );

  const onDragStart = (e: DragStartEvent) => setActiveDragId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveDragId(null);
    const id = String(e.active.id);
    const post = posts.find((p) => p.id === id);
    const to = e.over?.id as KanbanStatus | undefined;
    if (!post || !to || !COLUMN_ORDER.includes(to)) return;
    if (post.status === to) return;
    performTransition(post, to);
  };

  const handleSave = async (id: string, patch: { title: string; excerpt: string; content: string }) => {
    const { error } = await supabase
      .from("site_posts")
      .update({ title: patch.title, excerpt: patch.excerpt, content: patch.content })
      .eq("id", id);
    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "저장되었습니다" });
    await load();
    setOpenPost(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("site_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "삭제 완료" });
    setOpenPost(null);
    setPosts((cur) => cur.filter((p) => p.id !== id));
  };

  const handleArchive = async (id: string, archive: boolean) => {
    const { error } = await supabase
      .from("site_posts")
      .update({ status: archive ? "archived" : "published" } as any)
      .eq("id", id);
    if (error) {
      toast({ title: archive ? "보관 실패" : "복원 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: archive ? "보관됨 — 칸반에서 숨겨졌어요" : "복원됨 — 발행됨으로 이동" });
    setOpenPost(null);
    await load();
  };

  const createIdea = requireAuth(async () => {
    if (!site) return;
    const title = window.prompt("새 아이디어 제목을 입력하세요");
    if (!title?.trim()) return;
    const slug = `idea-${Date.now().toString(36)}`;
    const { error } = await supabase.from("site_posts").insert({
      site_id: site.id,
      slug,
      title: title.trim(),
      content: "",
      status: "idea",
    } as any);
    if (error) {
      toast({ title: "추가 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "아이디어 추가됨" });
    load();
  });

  // Guards
  if (!authLoading && !user) {
    return (
      <LockedFeature
        title="워크플로우 보드"
        description="로그인하면 추천부터 발행까지 한 화면에서 관리할 수 있어요."
        ctaLabel="로그인"
        onCta={() => navigate(`/auth?next=${encodeURIComponent("/dashboard#workflow")}`)}
      />
    );
  }
  if (!siteLoading && !site) {
    return (
      <LockedFeature
        title="사이트가 아직 없어요"
        description="대시보드 상단에서 사이트를 먼저 등록해주세요."
        ctaLabel="사이트 등록으로"
        onCta={() => document.getElementById("overview")?.scrollIntoView({ behavior: "smooth" })}
      />
    );
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground py-12 text-center">불러오는 중…</div>;
  }

  const activePost = activeDragId ? posts.find((p) => p.id === activeDragId) : null;

  const renderCard = (p: KanbanPost) => (
    <KanbanCard
      key={p.id}
      post={p}
      busy={busyId === p.id}
      onOpen={setOpenPost}
      onAdvance={(post) => {
        const next = NEXT_STATUS[post.status];
        if (next) performTransition(post, next);
      }}
      nextStatus={NEXT_STATUS[p.status]}
    />
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="text-[11px] text-muted-foreground">
          작업 큐 <span className="text-foreground font-semibold tabular-nums">{posts.length - archivedCount}</span>편
          {COLUMN_ORDER.map((s) => (
            <span key={s}>
              {" · "}
              {COLUMN_META[s].label}{" "}
              <span className="font-semibold text-foreground tabular-nums">{grouped[s].length}</span>
            </span>
          ))}
          {archivedCount > 0 && (
            <span> · 보관 <span className="font-semibold text-foreground tabular-nums">{archivedCount}</span></span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {archivedCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full h-8 text-xs"
              onClick={() => document.getElementById("archive")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Archive className="h-3 w-3" /> 보관함 {archivedCount}
            </Button>
          )}
          <Button size="sm" variant="outline" className="rounded-full h-8 text-xs" onClick={createIdea}>
            <Plus className="h-3 w-3" /> 아이디어
          </Button>
          <Button
            size="sm"
            className="rounded-full h-8 text-xs"
            onClick={() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth" })}
          >
            <Sparkles className="h-3 w-3" /> 추천에서 가져오기
          </Button>
        </div>
      </div>

      {isMobile ? (
        // Mobile: tabs (no drag UX on small screens)
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as KanbanStatus)}>
          <TabsList className="grid grid-cols-4 w-full">
            {COLUMN_ORDER.map((s) => (
              <TabsTrigger key={s} value={s} className="text-[11px]">
                {COLUMN_META[s].emoji} {grouped[s].length}
              </TabsTrigger>
            ))}
          </TabsList>
          {COLUMN_ORDER.map((s) => (
            <TabsContent key={s} value={s} className="mt-3 space-y-2">
              <p className="text-[11px] text-muted-foreground px-1">{COLUMN_META[s].description}</p>
              {grouped[s].length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-10 border border-dashed rounded-2xl">
                  비어 있음
                </div>
              ) : (
                grouped[s].map(renderCard)
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-4 gap-3">
            {COLUMN_ORDER.map((s) => (
              <KanbanColumn key={s} status={s} count={grouped[s].length}>
                {grouped[s].length === 0 ? (
                  <div className="text-[11px] text-muted-foreground text-center py-8 border border-dashed border-border/40 rounded-xl">
                    여기로 드롭
                  </div>
                ) : (
                  grouped[s].map(renderCard)
                )}
              </KanbanColumn>
            ))}
          </div>
          <DragOverlay>
            {activePost ? (
              <div className="opacity-90 rotate-1">
                <KanbanCard
                  post={activePost}
                  onOpen={() => {}}
                  nextStatus={NEXT_STATUS[activePost.status]}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <PostDetailPanel
        post={openPost}
        siteSlug={site?.site_slug}
        onClose={() => setOpenPost(null)}
        onSave={(patch) => openPost ? handleSave(openPost.id, patch) : Promise.resolve()}
        onDelete={() => openPost ? handleDelete(openPost.id) : Promise.resolve()}
      />

    </>
  );
}
