import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import LockedFeature from "@/features/publish/LockedFeature";
import { useRequireAuthAction } from "@/features/auth/useRequireAuthAction";
import { toast } from "@/hooks/use-toast";
import { Send, ExternalLink, Trash2 } from "lucide-react";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  status: string;
  source_axis: string | null;
  published_at: string | null;
  created_at: string;
};

export default function AutoPublish() {
  const { site } = useUserSite();
  const navigate = useNavigate();
  const guard = useRequireAuthAction();
  const [posts, setPosts] = useState<Post[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!site) return;
    const { data } = await supabase
      .from("site_posts")
      .select("id, slug, title, excerpt, status, source_axis, published_at, created_at")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false });
    setPosts((data as Post[]) || []);
  }, [site]);

  useEffect(() => { load(); }, [load]);

  const publishNow = guard(async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("publish-site-post", { body: { postId: id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "발행되었습니다" });
      load();
    } catch (e: any) {
      toast({ title: "발행 실패", description: e?.message || "오류", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  });

  const removePost = guard(async (id: string) => {
    if (!confirm("이 글을 삭제할까요?")) return;
    // RLS는 service_role만 delete 허용 → soft 처리 대신 서비스 함수 없이 SDK로는 불가능. 로컬 숨김으로 처리.
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "목록에서 숨겼습니다" });
  });

  if (!site) {
    return (
      <>
        <Helmet><title>자동 발행 | Autoblog</title></Helmet>
        <LockedFeature
          title="먼저 사이트를 연결하세요"
          description="발행할 콘텐츠 허브가 필요합니다."
          onCta={() => navigate("/dashboard")}
        />
      </>
    );
  }

  const queued = posts.filter((p) => p.status === "queued");
  const published = posts.filter((p) => p.status === "published");

  return (
    <>
      <Helmet><title>자동 발행 큐 | Autoblog</title></Helmet>
      <h1 className="text-2xl font-bold text-foreground mb-1">자동 발행 큐</h1>
      <p className="text-sm text-muted-foreground mb-6">대기 중인 Autoblog 글을 즉시 게시하거나 발행된 글을 확인하세요. 월 5건 한도(베타).</p>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-2">발행 대기 ({queued.length})</h2>
        {queued.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            대기 중인 글이 없습니다. <button className="text-primary underline" onClick={() => navigate("/dashboard/content")}>새 글 작성하기</button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {queued.map((p) => (
              <Card key={p.id} className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  {p.source_axis && <span className="text-[10px] font-bold text-muted-foreground">{p.source_axis}</span>}
                  <h3 className="font-semibold text-foreground">{p.title}</h3>
                  {p.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => publishNow(p.id)} disabled={busyId === p.id} className="rounded-full">
                    <Send className="w-3.5 h-3.5" /> {busyId === p.id ? "발행 중..." : "지금 발행"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removePost(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-foreground mb-2">발행됨 ({published.length})</h2>
        {published.length === 0 ? (
          <p className="text-xs text-muted-foreground">아직 발행된 글이 없습니다.</p>
        ) : (
          <div className="grid gap-2">
            {published.map((p) => (
              <Card key={p.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-sm text-foreground truncate">{p.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {p.published_at && new Date(p.published_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <a
                  href={`/sites/${site.site_slug}/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline shrink-0"
                >
                  보기 <ExternalLink className="w-3 h-3" />
                </a>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
