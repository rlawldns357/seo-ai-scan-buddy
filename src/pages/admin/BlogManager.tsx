import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Eye, EyeOff, AlertTriangle, RefreshCw, Send, Trash2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BlogPost { id: string; title: string; slug: string; published: boolean; date: string; category: string; inblog_post_id?: string | null; inblog_synced_at?: string | null; inblog_sync_error?: string | null }
interface FailedPost { id: string; title: string; slug: string; category: string; author: string; failure_reason: string; failure_attempts: number; created_at: string; contentLength: number }

export default function BlogManager() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [failedPosts, setFailedPosts] = useState<FailedPost[]>([]);
  const [failedActionId, setFailedActionId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryMsg, setRetryMsg] = useState<string>("");
  const [inblogId, setInblogId] = useState<string | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkCounts, setBulkCounts] = useState<{ pending: number; failed: number; synced: number; totalPublished?: number } | null>(null);

  const runBulkMirror = async (retryFailed = false, includeSynced = false) => {
    setBulkRunning(true);
    const t = toast.loading(includeSynced ? "Inblog 전체 재동기화 시작…" : "Inblog 일괄 이관 시작…");
    let totalProcessed = 0, totalOk = 0, totalFail = 0;
    let offset = 0;
    try {
      // Poll until done
      for (let i = 0; i < 200; i++) {
        const { data, error } = await supabase.functions.invoke("bulk-mirror-to-inblog", {
          body: { password: pw(), limit: 5, retryFailed, includeSynced, offset },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const d = data as any;
        totalProcessed += d.processed || 0;
        totalOk += (d.results || []).filter((r: any) => r.ok).length;
        totalFail += (d.results || []).filter((r: any) => !r.ok).length;
        setBulkCounts(d.counts);
        offset = d.nextOffset || 0;
        toast.loading(`${includeSynced ? "재동기화" : "이관"} 중… ${totalOk}건 성공 / ${totalFail}건 실패 · 남은 ${includeSynced ? Math.max(0, (d.counts.totalPublished || 0) - offset) : d.counts.pending}건`, { id: t });
        if (d.done) break;
      }
      toast.success(`${includeSynced ? "재동기화" : "이관"} 완료: ${totalOk}건 성공, ${totalFail}건 실패`, { id: t });
      fetchBlogPosts();
    } catch (e) {
      toast.error(`실패: ${(e as Error).message}`, { id: t });
    } finally {
      setBulkRunning(false);
    }
  };

  const publishToInblog = async (postId: string, title: string) => {
    setInblogId(postId);
    const t = toast.loading(`Inblog 이관: ${title}`);
    try {
      const { data, error } = await supabase.functions.invoke("publish-to-inblog", {
        body: { password: pw(), postId, publish: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const inblogPostId = (data as any)?.inblogPostId;
      const sub = (data as any)?.blogSubdomain;
      toast.success(`Inblog 발행 완료: #${inblogPostId}${sub ? ` (${sub})` : ""}`, { id: t });
      console.log("[publish-to-inblog]", data);
    } catch (e) {
      toast.error(`실패: ${(e as Error).message}`, { id: t });
    } finally {
      setInblogId(null);
    }
  };

  const pw = () => sessionStorage.getItem("admin_pw") || "";

  const fetchBlogPosts = async () => {
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw(), action: "listBlogPosts" },
    });
    if (res?.posts) setBlogPosts(res.posts);
  };

  const togglePublished = async (id: string, current: boolean) => {
    setTogglingId(id);
    await supabase.functions.invoke("admin-insights", {
      body: { password: pw(), action: "togglePublished", postId: id, published: !current },
    });
    setBlogPosts((prev) => prev.map((p) => (p.id === id ? { ...p, published: !current } : p)));
    setTogglingId(null);
  };

  const fetchFailedPosts = async () => {
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw(), action: "listFailedBlogPosts" },
    });
    if (res?.posts) setFailedPosts(res.posts);
  };

  const forcePublish = async (id: string) => {
    setFailedActionId(id);
    await supabase.functions.invoke("admin-insights", {
      body: { password: pw(), action: "forcePublishBlogPost", postId: id },
    });
    setFailedPosts((prev) => prev.filter((p) => p.id !== id));
    fetchBlogPosts();
    setFailedActionId(null);
  };

  const deleteFailed = async (id: string) => {
    if (!confirm("이 실패 글을 영구 삭제하시겠습니까?")) return;
    setFailedActionId(id);
    await supabase.functions.invoke("admin-insights", {
      body: { password: pw(), action: "deleteBlogPost", postId: id },
    });
    setFailedPosts((prev) => prev.filter((p) => p.id !== id));
    setFailedActionId(null);
  };

  const triggerRetryGeneration = async () => {
    setRetrying(true);
    setRetryMsg("");
    const { data: res } = await supabase.functions.invoke("admin-insights", {
      body: { password: pw(), action: "retryBlogGeneration" },
    });
    setRetryMsg(res?.message || "재생성 트리거 완료. 1~2분 후 새로고침하세요.");
    setRetrying(false);
  };

  useEffect(() => {
    fetchBlogPosts();
    fetchFailedPosts();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      <Helmet>
        <title>블로그 관리 – 서치튠OS 관리자</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div>
        <h1 className="text-lg md:text-2xl font-bold text-foreground">📰 블로그 관리 (자체)</h1>
        <p className="hidden md:block text-sm text-muted-foreground">searchtuneos.com/blog · 자동 생성 검증 큐 포함</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              발행 글
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {blogPosts.length}개
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {bulkCounts && (
                <span className="text-[11px] text-muted-foreground">
                  ✅ {bulkCounts.synced} · ⏳ {bulkCounts.pending} · ❌ {bulkCounts.failed}
                </span>
              )}
              <Button size="sm" variant="outline" onClick={() => runBulkMirror(false)} disabled={bulkRunning} className="gap-1.5">
                <Rocket className={`w-3.5 h-3.5 ${bulkRunning ? "animate-pulse" : ""}`} />
                {bulkRunning ? "이관 중…" : "Inblog 일괄 이관"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => runBulkMirror(false, true)} disabled={bulkRunning} className="gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${bulkRunning ? "animate-spin" : ""}`} />
                전체 재동기화
              </Button>
              <Button size="sm" variant="ghost" onClick={() => runBulkMirror(true)} disabled={bulkRunning} className="gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                실패 재시도
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            자동 생성 신규 글은 발행 즉시 Inblog로 미러됩니다. 과거 글은 위 버튼으로 일괄 이관하세요.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {blogPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">블로그 글 없음</p>
            ) : (
              blogPosts.map((post) => {
                const mirrored = !!post.inblog_post_id;
                const failed = !mirrored && !!post.inblog_sync_error;
                return (
                <div key={post.id} className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${post.published ? "bg-score-excellent/10 text-score-excellent" : "bg-muted text-muted-foreground"}`}>
                        {post.published ? "공개" : "비공개"}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">{post.category}</span>
                      {mirrored ? (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-score-excellent/10 text-score-excellent" title={`Inblog #${post.inblog_post_id}`}>
                          ✅ Inblog
                        </span>
                      ) : failed ? (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/10 text-destructive" title={post.inblog_sync_error || ""}>
                          ❌ 실패
                        </span>
                      ) : (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground">
                          ⏳ 대기
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate mt-0.5">{post.title}</p>
                    <p className="text-xs text-muted-foreground">{post.date}</p>
                    {failed && <p className="text-[10px] text-destructive truncate mt-0.5" title={post.inblog_sync_error || ""}>{post.inblog_sync_error}</p>}
                  </div>
                  <button
                    onClick={() => publishToInblog(post.id, post.title)}
                    disabled={inblogId === post.id}
                    className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                    title={mirrored ? "Inblog 재이관" : "Inblog으로 이관"}
                  >
                    <Rocket className={`w-4 h-4 ${inblogId === post.id ? "animate-pulse" : ""}`} />
                  </button>
                  <button
                    onClick={() => togglePublished(post.id, post.published)}
                    disabled={togglingId === post.id}
                    className={`shrink-0 p-2 rounded-lg transition-colors ${
                      post.published
                        ? "bg-score-excellent/10 text-score-excellent hover:bg-score-excellent/20"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    } disabled:opacity-50`}
                    title={post.published ? "비공개로 전환" : "공개로 전환"}
                  >
                    {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              )})
            )}
          </div>
        </CardContent>
      </Card>


      <Card className={failedPosts.length > 0 ? "border-destructive/40" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${failedPosts.length > 0 ? "text-destructive" : "text-muted-foreground"}`} />
              검증 실패 큐
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                failedPosts.length > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
              }`}>
                {failedPosts.length}건
              </span>
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={triggerRetryGeneration}
              disabled={retrying}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "트리거 중..." : "새 글 재생성"}
            </Button>
          </div>
          {retryMsg && <p className="text-xs text-muted-foreground mt-1">{retryMsg}</p>}
          <p className="text-xs text-muted-foreground">
            품질 검증을 통과하지 못한 자동 생성 글입니다. 검토 후 강제 게시하거나 삭제하세요.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {failedPosts.length === 0 ? (
              <p className="text-sm text-muted-foreground">실패 큐 없음 — 모든 자동 생성 글이 검증 통과했습니다 ✨</p>
            ) : (
              failedPosts.map((post) => (
                <div key={post.id} className="border border-destructive/20 bg-destructive/5 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold">
                          {post.failure_attempts}회 시도
                        </span>
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          {post.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{post.author}</span>
                        <span className="text-[10px] text-muted-foreground">· {post.contentLength}자</span>
                      </div>
                      <p className="text-sm font-medium text-foreground mt-1 break-words">{post.title}</p>
                      <p className="text-xs text-destructive mt-1 break-words">{post.failure_reason}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(post.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => forcePublish(post.id)}
                      disabled={failedActionId === post.id}
                      className="gap-1.5 h-8"
                    >
                      <Send className="w-3 h-3" />
                      강제 게시
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteFailed(post.id)}
                      disabled={failedActionId === post.id}
                      className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3 h-3" />
                      삭제
                    </Button>
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline self-center ml-auto"
                    >
                      미리보기 →
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
