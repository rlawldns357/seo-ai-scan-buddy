import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import { useRequireAuthAction } from "@/features/auth/useRequireAuthAction";
import LockedFeature from "@/features/publish/LockedFeature";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink, Eye, Trash2, FileText, Calendar, Dice5 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import DiceRoller from "@/components/DiceRoller";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  published_at: string | null;
  view_count: number;
  seo_score: number | null;
  aeo_score: number | null;
  geo_score: number | null;
  og_image: string | null;
};

export default function DashboardPosts() {
  const { user, loading: authLoading } = useAuth();
  const { site, loading: siteLoading } = useUserSite();
  const requireAuth = useRequireAuthAction();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [dicePost, setDicePost] = useState<Post | null>(null);

  const handleRollDice = requireAuth((post: Post) => {
    setDicePost(post);
  });

  const load = async () => {
    if (!site) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("site_posts")
      .select("id,title,slug,excerpt,published_at,view_count,seo_score,aeo_score,geo_score,og_image")
      .eq("site_id", site.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!siteLoading) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id, siteLoading]);

  const handleUnpublish = requireAuth(async (post: Post) => {
    if (!confirm(`"${post.title}"을(를) 발행 취소하시겠어요? 초안으로 돌아갑니다.`)) return;
    const { error } = await supabase
      .from("site_posts")
      .update({ status: "draft", published_at: null })
      .eq("id", post.id);
    if (error) {
      toast({ title: "발행 취소 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "발행 취소 완료", description: "초안 상태로 변경되었습니다." });
    load();
  });

  const handleDelete = requireAuth(async (post: Post) => {
    if (!confirm(`"${post.title}"을(를) 영구 삭제하시겠어요? 되돌릴 수 없습니다.`)) return;
    const { error } = await supabase.from("site_posts").delete().eq("id", post.id);
    if (error) {
      toast({ title: "삭제 실패", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "삭제 완료" });
    load();
  });

  // Guest / no-site state
  if (!authLoading && !user) {
    return (
      <LockedFeature
        title="발행된 글 관리"
        description="로그인하면 발행된 글 목록을 확인하고 관리할 수 있어요."
        ctaLabel="로그인"
        onCta={() => navigate(`/auth?next=${encodeURIComponent("/dashboard#posts")}`)}
      />
    );
  }
  if (!siteLoading && !site) {
    return (
      <LockedFeature
        title="사이트가 아직 없어요"
        description="대시보드에서 사이트를 먼저 등록하면 발행된 글이 여기 모입니다."
        ctaLabel="사이트 등록으로"
        onCta={() => {
          document.getElementById("overview")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {site && (
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs rounded-full">
            <Link to={`/sites/${site.site_slug}`} target="_blank">
              <ExternalLink className="h-3 w-3 mr-1" />라이브 보기
            </Link>
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">불러오는 중…</div>
      ) : posts.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
          <h3 className="font-semibold">아직 발행된 글이 없어요</h3>
          <p className="text-sm text-muted-foreground">
            글 작성 또는 자동 발행 큐에서 발행을 완료하면 여기 표시됩니다.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard/content">글 작성</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/dashboard/auto-publish">자동 발행 큐</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground px-1">총 {posts.length}편</div>
          {posts.map((p) => (
            <Card key={p.id} className="px-3 py-2.5 hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">발행됨</span>
                    {p.published_at && (
                      <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(p.published_at).toLocaleDateString("ko-KR")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Eye className="h-2.5 w-2.5" />
                      {p.view_count}
                    </span>
                    {(p.seo_score !== null || p.aeo_score !== null || p.geo_score !== null) && (
                      <span className="text-[10px] text-muted-foreground">
                        S {p.seo_score ?? "–"} · A {p.aeo_score ?? "–"} · G {p.geo_score ?? "–"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium leading-snug truncate">{p.title}</h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button asChild size="sm" variant="outline" className="h-8 w-8 p-0" title="보기">
                    <Link to={`/sites/${site!.site_slug}/${p.slug}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 text-xs rounded-full"
                    onClick={() => handleRollDice(p)}
                    title="주사위 굴려 다시 쓰기"
                  >
                    <Dice5 className="h-3.5 w-3.5" /> 🎲
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-muted-foreground"
                    onClick={() => handleUnpublish(p)}
                    title="발행 취소"
                  >
                    ↩
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(p)}
                    title="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {dicePost && (
        <DiceRoller
          open={!!dicePost}
          onOpenChange={(o) => !o && setDicePost(null)}
          postId={dicePost.id}
          postTitle={dicePost.title}
          onSuccess={() => {
            setDicePost(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function Header({ siteSlug }: { siteSlug?: string }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">발행된 글</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          라이브 사이트에 노출 중인 글을 관리하세요.
        </p>
      </div>
      {siteSlug && (
        <Button asChild variant="outline" size="sm" className="h-8 text-xs">
          <Link to={`/sites/${siteSlug}`} target="_blank">
            <ExternalLink className="h-3 w-3 mr-1" />라이브 보기
          </Link>
        </Button>
      )}
    </div>
  );
}
