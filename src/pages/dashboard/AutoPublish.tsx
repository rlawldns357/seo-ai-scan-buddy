import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useUserSite } from "@/features/publish/useUserSite";
import LockedFeature from "@/features/publish/LockedFeature";
import FlowStepper from "@/features/publish/FlowStepper";
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
    if (!confirm("이 글을 큐에서 삭제할까요?")) return;
    try {
      const { error } = await supabase.from("site_posts").delete().eq("id", id);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "큐에서 삭제했습니다" });
    } catch (e: any) {
      toast({ title: "삭제 실패", description: e?.message || "오류", variant: "destructive" });
    }
  });

  if (!site) {
    return (
      <LockedFeature
        title="먼저 내 콘텐츠 페이지를 만들어주세요"
        description="발행할 전용 콘텐츠 페이지가 필요합니다."
        ctaLabel="페이지 만들러 가기"
        onCta={() => navigate("/dashboard#overview")}
      />
    );
  }

  const queued = posts.filter((p) => p.status === "queued");
  const published = posts.filter((p) => p.status === "published");

  return (
    <>
      <div className="flex justify-end gap-2 mb-3">
        <Button variant="outline" size="sm" className="rounded-full" onClick={() => {
          document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}>
          추천 더 보기
        </Button>
        <Button size="sm" className="rounded-full" onClick={() => {
          document.getElementById("content")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}>
          새 글 작성
        </Button>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-foreground mb-2">발행 대기 ({queued.length})</h2>
        {queued.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
            대기 중인 글이 없습니다. <button className="text-primary underline" onClick={() => {
              document.getElementById("content")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}>새 글 작성하기</button>
          </Card>
        ) : (
          <div className="space-y-2">
            {queued.map((p) => (
              <Card key={p.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  {p.source_axis && <span className="text-[10px] font-bold text-muted-foreground shrink-0">{p.source_axis}</span>}
                  <h3 className="text-sm font-medium text-foreground truncate">{p.title}</h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" onClick={() => publishNow(p.id)} disabled={busyId === p.id} className="rounded-full h-8 text-xs">
                    <Send className="w-3 h-3" /> {busyId === p.id ? "발행 중..." : "발행"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removePost(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
