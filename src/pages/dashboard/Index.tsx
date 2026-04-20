import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserSite, slugify } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import MarketingLanding from "@/features/publish/landing/MarketingLanding";
import {
  Sparkles,
  ExternalLink,
  Send,
  FileText,
  Eye,
  Users,
  Clock3,
  Plus,
  BarChart3,
  MoreHorizontal,
} from "lucide-react";

type SitePost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  status: string;
  source_axis: string | null;
  published_at: string | null;
  created_at: string;
};

type ViewRow = {
  post_id: string;
  session_id: string;
  created_at: string;
};

const axisBadgeClass: Record<string, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-warning/10 text-score-warning",
};

export default function DashboardIndex() {
  const { site, refresh, loading } = useUserSite();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [siteUrl, setSiteUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [posts, setPosts] = useState<SitePost[]>([]);
  const [views, setViews] = useState<ViewRow[]>([]);
  const [queueing, setQueueing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!authLoading && !user) {
    return <MarketingLanding />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl || !title || !user) return;
    setSubmitting(true);
    try {
      const normalizedUrl = siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`;
      const baseSlug = slugify(siteUrl);
      let slug = baseSlug;
      const { data: existing } = await supabase
        .from("user_sites")
        .select("id")
        .eq("site_slug", slug)
        .maybeSingle();
      if (existing) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      const { error } = await supabase.from("user_sites").insert({
        owner_email: user.email!,
        site_url: normalizedUrl,
        site_slug: slug,
        title,
        user_id: user.id,
      });

      if (error) throw error;
      await refresh();
      toast({ title: "사이트가 생성되었습니다", description: `/sites/${slug}` });
      navigate("/dashboard");
    } catch (err) {
      toast({
        title: "오류",
        description: err instanceof Error ? err.message : "생성 실패",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!site) {
      setPosts([]);
      setViews([]);
      return;
    }

    (async () => {
      const [postsRes, viewsRes] = await Promise.all([
        supabase
          .from("site_posts")
          .select("id, slug, title, excerpt, content, status, source_axis, published_at, created_at")
          .eq("site_id", site.id)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false }),
        supabase
          .from("site_post_views")
          .select("post_id, session_id, created_at")
          .in(
            "post_id",
            ["pending"]
          ),
      ]);

      const loadedPosts = (postsRes.data as SitePost[]) || [];
      setPosts(loadedPosts);

      if (loadedPosts.length === 0) {
        setViews([]);
        return;
      }

      const { data: loadedViews } = await supabase
        .from("site_post_views")
        .select("post_id, session_id, created_at")
        .in(
          "post_id",
          loadedPosts.map((post) => post.id),
        );

      setViews((loadedViews as ViewRow[]) || []);
    })();
  }, [site]);

  const reloadDashboard = async () => {
    if (!site) return;
    const { data: loadedPosts } = await supabase
      .from("site_posts")
      .select("id, slug, title, excerpt, content, status, source_axis, published_at, created_at")
      .eq("site_id", site.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    const nextPosts = (loadedPosts as SitePost[]) || [];
    setPosts(nextPosts);

    if (!nextPosts.length) {
      setViews([]);
      return;
    }

    const { data: loadedViews } = await supabase
      .from("site_post_views")
      .select("post_id, session_id, created_at")
      .in(
        "post_id",
        nextPosts.map((post) => post.id),
      );
    setViews((loadedViews as ViewRow[]) || []);
  };

  const queueCounts = useMemo(() => {
    const queued = posts.filter((post) => post.status === "queued");
    const published = posts.filter((post) => post.status === "published");
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyVisitors = new Set(
      views
        .filter((view) => new Date(view.created_at).getTime() >= weekAgo)
        .map((view) => view.session_id),
    ).size;

    const byPost = new Map<string, { views: number; unique: number; lastViewedAt: string | null }>();

    posts.forEach((post) => {
      const postViews = views.filter((view) => view.post_id === post.id);
      byPost.set(post.id, {
        views: postViews.length,
        unique: new Set(postViews.map((view) => view.session_id)).size,
        lastViewedAt: postViews.length ? postViews[postViews.length - 1].created_at : null,
      });
    });

    return {
      queued,
      published,
      totalViews: views.length,
      weeklyVisitors,
      byPost,
    };
  }, [posts, views]);

  const publishPost = async (postId: string) => {
    setBusyId(postId);
    try {
      const { error } = await supabase
        .from("site_posts")
        .update({ status: "published", published_at: new Date().toISOString() })
        .eq("id", postId);

      if (error) throw error;
      toast({ title: "발행되었습니다" });
      await reloadDashboard();
    } catch (error) {
      toast({
        title: "발행 실패",
        description: error instanceof Error ? error.message : "오류",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const archivePost = async (postId: string) => {
    setBusyId(postId);
    try {
      const { error } = await supabase
        .from("site_posts")
        .update({ status: "archived" })
        .eq("id", postId);

      if (error) throw error;
      toast({ title: "큐에서 제외되었습니다" });
      await reloadDashboard();
    } catch (error) {
      toast({
        title: "처리 실패",
        description: error instanceof Error ? error.message : "오류",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const generateQueuedDraft = async () => {
    if (!site) return;
    setQueueing(true);
    try {
      const seedTopic = `${site.title} 고객이 자주 묻는 질문과 ${queueCounts.queued.length + 1}번째 운영 가이드`;
      const axis = (["SEO", "AEO", "GEO"] as const)[queueCounts.queued.length % 3];

      const { data, error } = await supabase.functions.invoke("generate-content-draft", {
        body: { topic: seedTopic, targetAxis: axis, siteUrl: site.site_url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const slug = data?.slug || slugify(data?.title || seedTopic);
      const { error: insertError } = await supabase.from("site_posts").insert({
        site_id: site.id,
        slug,
        title: data?.title || seedTopic,
        excerpt: data?.excerpt || `${site.title}에 맞춰 자동 생성된 발행 후보 콘텐츠입니다.`,
        content: data?.content || "",
        status: "queued",
        source_axis: axis,
      });
      if (insertError) throw insertError;

      toast({ title: "새 발행 후보가 큐에 추가되었습니다" });
      await reloadDashboard();
    } catch (error) {
      toast({
        title: "생성 실패",
        description: error instanceof Error ? error.message : "오류",
        variant: "destructive",
      });
    } finally {
      setQueueing(false);
    }
  };

  if (loading || authLoading) {
    return <div className="text-sm text-muted-foreground">불러오는 중…</div>;
  }

  return (
    <>
      <Helmet>
        <title>Auto Publish 대시보드 | SearchTune OS</title>
        <meta name="description" content="자동 발행 큐와 발행 성과를 한 번에 관리하세요." />
      </Helmet>

      {!site ? (
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-foreground mb-1">사이트 연결</h1>
          <p className="text-sm text-muted-foreground mb-4">
            콘텐츠 허브를 발급받고 자동 발행을 시작하세요. (베타: 한 계정당 1개)
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="siteUrl">사이트 URL</Label>
                <Input
                  id="siteUrl"
                  placeholder="example.com"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="title">콘텐츠 허브 제목</Label>
                <Input
                  id="title"
                  placeholder="우리 브랜드 인사이트"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              로그인된 계정: <span className="font-medium">{user?.email}</span>
            </p>
            <Button type="submit" disabled={submitting} className="rounded-full w-full md:w-auto">
              {submitting ? "생성 중..." : "허브 발급받고 시작하기"}
            </Button>
          </form>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="flex items-start justify-between gap-4 flex-wrap rounded-3xl border border-border/50 bg-card p-6 shadow-card">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">자동 발행 메인</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-score-excellent/10 px-2.5 py-1 text-[11px] font-semibold text-[hsl(var(--score-excellent))]">
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--score-excellent))]" /> 로그인됨
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                AI가 미리 준비한 콘텐츠 큐를 검토하고, 선택해서 발행하세요. 발행 이후에는 조회와 유입 흐름도 함께 확인할 수 있습니다.
              </p>
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">내 콘텐츠 허브</p>
                <h2 className="text-lg font-semibold text-foreground mt-1">{site.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{site.site_url}</p>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <a
                    href={`/sites/${site.site_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    /sites/{site.site_slug} <ExternalLink className="w-3 h-3" />
                  </a>
                  <span className="text-[11px] text-muted-foreground">계정: {user?.email}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => navigate("/dashboard/recommendations")}>
                <Sparkles className="w-4 h-4" /> 추천 보기
              </Button>
              <Button className="rounded-full" onClick={generateQueuedDraft} disabled={queueing}>
                <Plus className="w-4 h-4" /> {queueing ? "생성 중..." : "새 큐 생성"}
              </Button>
            </div>
          </section>

          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <Card className="p-4 rounded-2xl border-border/50 shadow-card">
              <p className="text-xs text-muted-foreground">발행 대기 중</p>
              <p className="text-2xl font-bold text-foreground mt-2">{queueCounts.queued.length}</p>
              <p className="text-[11px] text-muted-foreground mt-1">선택 후 바로 발행 가능</p>
            </Card>
            <Card className="p-4 rounded-2xl border-border/50 shadow-card">
              <p className="text-xs text-muted-foreground">발행 완료</p>
              <p className="text-2xl font-bold text-foreground mt-2">{queueCounts.published.length}</p>
              <p className="text-[11px] text-muted-foreground mt-1">현재 허브에 공개 중인 글</p>
            </Card>
            <Card className="p-4 rounded-2xl border-border/50 shadow-card">
              <p className="text-xs text-muted-foreground">총 조회수</p>
              <p className="text-2xl font-bold text-foreground mt-2">{queueCounts.totalViews}</p>
              <p className="text-[11px] text-muted-foreground mt-1">발행된 글 전체 페이지뷰</p>
            </Card>
            <Card className="p-4 rounded-2xl border-border/50 shadow-card">
              <p className="text-xs text-muted-foreground">이번 주 방문 세션</p>
              <p className="text-2xl font-bold text-foreground mt-2">{queueCounts.weeklyVisitors}</p>
              <p className="text-[11px] text-muted-foreground mt-1">최근 7일 기준</p>
            </Card>
          </section>

          <section className="grid xl:grid-cols-[1.35fr_0.9fr] gap-6 items-start">
            <Card className="p-6 rounded-3xl border-border/50 shadow-card">
              <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">🪄 발행 대기 중인 콘텐츠</h2>
                  <p className="text-sm text-muted-foreground mt-1">AI가 미리 준비한 콘텐츠입니다. 검토 후 원하는 글만 선택해서 발행하세요.</p>
                </div>
                <Button variant="outline" className="rounded-full shrink-0" onClick={() => navigate("/dashboard/content")}>
                  <FileText className="w-4 h-4" /> 직접 작성
                </Button>
              </div>

              {queueCounts.queued.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                  <p className="text-sm font-medium text-foreground">아직 발행 대기 중인 콘텐츠가 없습니다</p>
                  <p className="text-xs text-muted-foreground mt-2">큐가 비어있어요. 새 콘텐츠를 생성해 먼저 후보를 채워보세요.</p>
                  <Button className="rounded-full mt-4" onClick={generateQueuedDraft} disabled={queueing}>
                    <Plus className="w-4 h-4" /> {queueing ? "생성 중..." : "새 콘텐츠 생성하기"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {queueCounts.queued.map((post) => (
                    <div key={post.id} className="rounded-2xl border border-border/50 bg-muted/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {post.source_axis && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${axisBadgeClass[post.source_axis] ?? "bg-secondary text-secondary-foreground"}`}>
                                {post.source_axis}
                              </span>
                            )}
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                              <Clock3 className="w-3 h-3" /> {Math.max(1, Math.round(post.content.length / 700))}분 읽기
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-foreground">{post.title}</h3>
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {post.excerpt || "발행 전 검토가 필요한 자동 생성 콘텐츠입니다."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end shrink-0">
                          <Button className="rounded-full" size="sm" onClick={() => publishPost(post.id)} disabled={busyId === post.id}>
                            <Send className="w-3.5 h-3.5" /> {busyId === post.id ? "발행 중..." : "발행"}
                          </Button>
                          <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate(`/dashboard/content?topic=${encodeURIComponent(post.title)}&axis=${post.source_axis ?? "SEO"}`)}>
                            편집
                          </Button>
                          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => archivePost(post.id)}>
                            버리기
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 rounded-3xl border-border/50 shadow-card">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">발행된 콘텐츠 성과</h2>
                  <p className="text-sm text-muted-foreground mt-1">어떤 글이 실제로 읽히고 있는지 빠르게 확인하세요.</p>
                </div>
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>

              {queueCounts.published.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center">아직 발행된 글이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {queueCounts.published.slice(0, 6).map((post) => {
                    const stats = queueCounts.byPost.get(post.id) ?? { views: 0, unique: 0, lastViewedAt: null };
                    const maxViews = Math.max(1, ...queueCounts.published.map((item) => queueCounts.byPost.get(item.id)?.views ?? 0));
                    const width = `${Math.max(8, Math.round((stats.views / maxViews) * 100))}%`;

                    return (
                      <div key={post.id} className="rounded-2xl border border-border/50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{post.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {post.published_at ? new Date(post.published_at).toLocaleDateString("ko-KR") : "미발행"}
                            </p>
                          </div>
                          <Link to={`/sites/${site.site_slug}/${post.slug}`} target="_blank" className="text-xs text-primary hover:underline shrink-0">
                            보기
                          </Link>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4 text-[11px]">
                          <div className="rounded-xl bg-muted/50 px-3 py-2">
                            <span className="text-muted-foreground inline-flex items-center gap-1"><Eye className="w-3 h-3" /> 조회</span>
                            <p className="text-sm font-semibold text-foreground mt-1">{stats.views}</p>
                          </div>
                          <div className="rounded-xl bg-muted/50 px-3 py-2">
                            <span className="text-muted-foreground inline-flex items-center gap-1"><Users className="w-3 h-3" /> 방문</span>
                            <p className="text-sm font-semibold text-foreground mt-1">{stats.unique}</p>
                          </div>
                          <div className="rounded-xl bg-muted/50 px-3 py-2">
                            <span className="text-muted-foreground inline-flex items-center gap-1"><MoreHorizontal className="w-3 h-3" /> 최근</span>
                            <p className="text-sm font-semibold text-foreground mt-1">
                              {stats.lastViewedAt ? new Date(stats.lastViewedAt).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "-"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
