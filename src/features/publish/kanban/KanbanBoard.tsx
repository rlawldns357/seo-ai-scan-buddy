import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import { useRequireAuthAction } from "@/features/auth/useRequireAuthAction";
import LockedFeature from "@/features/publish/LockedFeature";
import { onWorkflowChanged } from "@/features/publish/workflowEvents";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Archive } from "lucide-react";

import KanbanCard from "./KanbanCard";
import PostDetailPanel from "./PostDetailPanel";
import AutopublishControl from "@/features/publish/AutopublishControl";
import { COLUMN_META, COLUMN_ORDER, KanbanPost, KanbanStatus, PUBLISHED_VISIBLE_LIMIT } from "./types";
import { sortScheduledColumn } from "./scheduleUtils";

const NEXT_STATUS: Record<KanbanStatus, KanbanStatus | null> = {
  idea: "scheduled", // legacy rows
  draft: "scheduled", // legacy rows — treat as scheduled
  scheduled: "published",
  published: null,
  archived: null,
};

/** Normalize legacy 'idea'/'draft' rows to 'scheduled' for grouping/UI. */
function normalizeStatus(s: KanbanStatus): KanbanStatus {
  return s === "idea" || s === "draft" ? "scheduled" : s;
}

export default function KanbanBoard() {
  const { user, loading: authLoading } = useAuth();
  const { site, loading: siteLoading } = useUserSite();
  const navigate = useNavigate();
  const requireAuth = useRequireAuthAction();

  const [posts, setPosts] = useState<KanbanPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openPost, setOpenPost] = useState<KanbanPost | null>(null);

  const [activeTab, setActiveTab] = useState<KanbanStatus>("scheduled");

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

  useEffect(() => {
    if (!site) return;

    return onWorkflowChanged((detail) => {
      if (detail.siteId !== site.id) return;
      setActiveTab("scheduled");
      void load();
    });
  }, [site, load]);

  const grouped = useMemo(() => {
    const out: Record<KanbanStatus, KanbanPost[]> = { idea: [], draft: [], scheduled: [], published: [], archived: [] };
    for (const p of posts) {
      const key = normalizeStatus(p.status);
      if (out[key]) out[key].push(p);
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

      // Hard auth check — publishing/AI calls require a logged-in owner.
      if (!user) {
        toast({
          title: "로그인이 필요해요",
          description: "다시 로그인 후 시도해주세요.",
          variant: "destructive",
        });
        navigate(`/auth?next=${encodeURIComponent("/dashboard#workflow")}`);
        return;
      }
      setBusyId(post.id);
      const rollback = optimisticMove(post.id, to);
      try {
        if (to === "published") {
          if (!post.content || post.content.trim().length < 30) {
            throw new Error("본문이 비어 있어 발행할 수 없어요. 카드를 열어 ‘AI로 본문 생성’ 후 다시 시도해주세요.");
          }
          const { data, error } = await supabase.functions.invoke("publish-site-post", {
            body: { postId: post.id },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          toast({
            title: "✅ 발행되었습니다",
            description: site?.site_slug ? `/sites/${site.site_slug}/${post.slug} 에서 확인하세요` : undefined,
          });
        } else if (to === "scheduled" && post.status === "published") {
          // Unpublish → back to scheduled queue
          const { error } = await supabase
            .from("site_posts")
            .update({ status: "scheduled", published_at: null })
            .eq("id", post.id);
          if (error) throw error;
          toast({ title: "발행 취소 — 발행 대기로 이동" });
        } else {
          const patch: { status: KanbanStatus; published_at?: string | null } = { status: to };
          if (to === "scheduled") patch.published_at = null;
          const { error } = await supabase.from("site_posts").update(patch).eq("id", post.id);
          if (error) throw error;
          toast({ title: `${COLUMN_META[to].label}(으)로 이동` });
        }
        await load();
      } catch (e: any) {
        rollback();
        toast({
          title: "실행 실패",
          description: e?.message || "다시 시도해주세요",
          variant: "destructive",
        });
      } finally {
        setBusyId(null);
      }
    },
    [load, posts, site?.site_url, site?.site_slug, user, navigate],
  );

  // (Drag-and-drop removed — board is now a simple 2-tab list.)

  const handleSave = async (
    id: string,
    patch: { title: string; excerpt: string; content: string; published_at?: string | null },
  ) => {
    const current = posts.find((p) => p.id === id);
    const update: Record<string, unknown> = {
      title: patch.title,
      excerpt: patch.excerpt,
      content: patch.content,
    };

    // Schedule handling: only meaningful for scheduled rows.
    if (current && current.status === "scheduled") {
      if (patch.published_at !== undefined) {
        update.published_at = patch.published_at; // null clears it (manual publish)
      }
    }

    const { error } = await supabase.from("site_posts").update(update as any).eq("id", id);
    if (error) {
      toast({ title: "저장 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: update.published_at
        ? "예약되었습니다 — 시각이 되면 자동 발행됩니다"
        : "저장되었습니다",
    });
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

  const createDraft = requireAuth(async () => {
    if (!site) return;
    const title = window.prompt("새 글의 주제(제목)를 입력하세요");
    if (!title?.trim()) return;
    const slug = `post-${Date.now().toString(36)}`;
    const trimmed = title.trim();

    setLoading(true);
    try {
      // Run the AI engine, then insert directly into the 발행 대기 column.
      const { data, error } = await supabase.functions.invoke("generate-content-draft", {
        body: { topic: trimmed, targetAxis: "SEO", siteUrl: site.site_url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { error: insertErr } = await supabase.from("site_posts").insert({
        site_id: site.id,
        slug,
        title: data?.title || trimmed,
        excerpt: data?.excerpt ?? null,
        content: data?.content || "",
        status: "scheduled",
        published_at: null,
        keywords: Array.isArray(data?.keywords) ? data.keywords : [],
        faq: Array.isArray(data?.faq) ? data.faq : [],
      } as any);
      if (insertErr) throw insertErr;
      toast({ title: "✨ 발행 대기에 새 글이 추가되었어요" });
    } catch (e: any) {
      toast({
        title: "생성 실패",
        description: e?.message || "잠시 후 다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      load();
    }
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

  // (drag overlay removed)

  const handleSetSchedule = async (post: KanbanPost, iso: string) => {
    const isChange = !!post.published_at;
    const { error } = await supabase
      .from("site_posts")
      .update({ status: "scheduled", published_at: iso } as any)
      .eq("id", post.id);
    if (error) {
      toast({ title: "예약 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: isChange ? "예약 발행 시간이 변경되었어요" : "예약 발행이 설정되었어요" });
    await load();
  };

  const handleCancelSchedule = async (post: KanbanPost) => {
    const { error } = await supabase
      .from("site_posts")
      .update({ status: "scheduled", published_at: null } as any)
      .eq("id", post.id);
    if (error) {
      toast({ title: "취소 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "예약 발행이 취소되었어요 — 수동 발행 대기" });
    await load();
  };

  const handlePublishNow = (post: KanbanPost) => {
    toast({ title: "지금 바로 발행을 시작해요" });
    void performTransition(post, "published");
  };

  const scheduledList = posts
    .filter((p) => p.status === "scheduled" && p.published_at)
    .map((p) => ({ id: p.id, title: p.title, iso: p.published_at as string }));

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
      onSchedule={handleSetSchedule}
      onCancelSchedule={handleCancelSchedule}
      onPublishNow={handlePublishNow}
      onDelete={(post) => handleDelete(post.id)}
      scheduledSiblings={scheduledList}
    />
  );

  /** For published column we cap the visible items and show a "전체 보기" link. */
  const renderColumnContent = (s: KanbanStatus) => {
    if (grouped[s].length === 0) return null;
    const list = s === "scheduled" ? sortScheduledColumn(grouped[s]) : grouped[s];
    if (s === "published" && list.length > PUBLISHED_VISIBLE_LIMIT) {
      const visible = list.slice(0, PUBLISHED_VISIBLE_LIMIT);
      const hidden = list.length - visible.length;
      return (
        <>
          {visible.map(renderCard)}
          <button
            onClick={() => document.getElementById("archive")?.scrollIntoView({ behavior: "smooth" })}
            className="w-full text-[11px] text-muted-foreground hover:text-foreground border border-dashed border-border/40 rounded-xl py-2.5 transition-colors"
          >
            +{hidden}편 더보기 → 보관함으로 정리하기
          </button>
        </>
      );
    }
    return list.map(renderCard);
  };
  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <div className="text-[12px] text-muted-foreground">
          발행 대기 <span className="text-foreground font-semibold tabular-nums">{grouped.scheduled.length}</span>편
          {" · "}발행됨 <span className="text-foreground font-semibold tabular-nums">{totalPublishedHistory}</span>편
          {archivedCount > 0 && (
            <span className="text-muted-foreground/70"> (보관 {archivedCount})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <AutopublishControl siteId={site?.id} />
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
          <Button size="sm" className="rounded-full h-8 text-xs" onClick={createDraft}>
            <Plus className="h-3 w-3" /> AI로 새 글 추가
          </Button>
        </div>
      </div>

      {/* Unified 2-tab layout (예약 / 발행됨) */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as KanbanStatus)}>
        <TabsList className="inline-flex h-9">
          {COLUMN_ORDER.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs px-4">
              {COLUMN_META[s].label}
              <span className="ml-1.5 text-[11px] font-mono text-muted-foreground tabular-nums">
                {s === "published" ? totalPublishedHistory : grouped[s].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {COLUMN_ORDER.map((s) => (
          <TabsContent key={s} value={s} className="mt-3 space-y-2">
            {grouped[s].length === 0 ? (
              <div className="text-[12px] text-muted-foreground text-center py-12 border border-dashed border-border/40 rounded-xl">
                {s === "scheduled"
                  ? "‘AI로 새 글 추가’를 눌러 발행 대기 큐를 채우세요"
                  : "아직 발행된 글이 없어요"}
              </div>
            ) : (
              renderColumnContent(s)
            )}
          </TabsContent>
        ))}
      </Tabs>

      <PostDetailPanel
        post={openPost}
        siteSlug={site?.site_slug}
        onClose={() => setOpenPost(null)}
        onSave={(patch) => openPost ? handleSave(openPost.id, patch) : Promise.resolve()}
        onDelete={() => openPost ? handleDelete(openPost.id) : Promise.resolve()}
        onArchive={(archive) => openPost ? handleArchive(openPost.id, archive) : Promise.resolve()}
        onGenerateBody={async (title) => {
          if (!openPost) return;
          const { data, error } = await supabase.functions.invoke("generate-content-draft", {
            body: { topic: title, targetAxis: openPost.source_axis || "SEO", siteUrl: site?.site_url },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          await supabase
            .from("site_posts")
            .update({
              title: data.title || title,
              excerpt: data.excerpt || openPost.excerpt,
              content: data.content || "",
              keywords: Array.isArray(data.keywords) ? data.keywords : (openPost.keywords ?? []),
              faq: Array.isArray(data.faq) ? data.faq : [],
            } as any)
            .eq("id", openPost.id);
          toast({ title: "AI가 본문을 생성했어요" });
          await load();
          return { title: data.title, excerpt: data.excerpt, content: data.content };
        }}
      />

    </>
  );
}
