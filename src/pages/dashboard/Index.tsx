import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserSite, slugify } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import { useRequireAuthAction } from "@/features/auth/useRequireAuthAction";
import OnboardingSteps from "@/features/publish/OnboardingSteps";
import FlowStepper from "@/features/publish/FlowStepper";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
  CheckCircle2,
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
  queue_position: number | null;
  is_auto_generated: boolean;
  view_count: number;
  last_viewed_at: string | null;
};

type SitePostView = {
  post_id: string;
  session_id: string;
  created_at: string;
};

const axisBadgeClass: Record<string, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-warning/10 text-score-warning",
};

const STARTER_AXES = ["SEO", "AEO", "GEO"] as const;

export default function DashboardIndex() {
  const { site, refresh, loading } = useUserSite();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const guard = useRequireAuthAction();
  const [siteUrl, setSiteUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [posts, setPosts] = useState<SitePost[]>([]);
  const [views, setViews] = useState<SitePostView[]>([]);
  const [queueing, setQueueing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadDashboard = async (siteId: string) => {
    const postsQuery = await (supabase as any)
      .from("site_posts")
      .select("id, slug, title, excerpt, content, status, source_axis, published_at, created_at, queue_position, is_auto_generated, view_count, last_viewed_at")
      .eq("site_id", siteId)
      .order("queue_position", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    const loadedPosts = ((postsQuery.data ?? []) as SitePost[]).sort((a, b) => {
      if (a.status === "queued" && b.status === "queued") {
        return (a.queue_position ?? 9999) - (b.queue_position ?? 9999);
      }
      if (a.status === "queued") return -1;
      if (b.status === "queued") return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    setPosts(loadedPosts);

    const publishedIds = loadedPosts.filter((post) => post.status === "published").map((post) => post.id);
    if (!publishedIds.length) {
      setViews([]);
      return;
    }

    const viewsQuery = await (supabase as any)
      .from("site_post_views")
      .select("post_id, session_id, created_at")
      .in("post_id", publishedIds)
      .order("created_at", { ascending: false });

    setViews((viewsQuery.data ?? []) as SitePostView[]);
  };

  useEffect(() => {
    if (!site) {
      setPosts([]);
      setViews([]);
      return;
    }

    loadDashboard(site.id);
  }, [site]);

  const queueCounts = useMemo(() => {
    const queued = posts.filter((post) => post.status === "queued");
    const published = posts.filter((post) => post.status === "published");
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const weeklyVisitors = new Set(
      views.filter((view) => new Date(view.created_at).getTime() >= weekAgo).map((view) => view.session_id),
    ).size;

    const byPost = new Map(
      published.map((post) => {
        const postViews = views.filter((view) => view.post_id === post.id);
        return [
          post.id,
          {
            views: post.view_count ?? postViews.length,
            unique: new Set(postViews.map((view) => view.session_id)).size,
            lastViewedAt: post.last_viewed_at ?? postViews[0]?.created_at ?? null,
          },
        ];
      }),
    );

    return {
      queued,
      published,
      totalViews: published.reduce((sum, post) => sum + (post.view_count ?? 0), 0),
      weeklyVisitors,
      byPost,
    };
  }, [posts, views]);

  const createQueuedDraft = async (siteRecord: { id: string; title: string; site_url: string }, index: number) => {
    const axis = STARTER_AXES[index % STARTER_AXES.length];
    const seedTopic = `${siteRecord.title} ${axis} 운영 가이드 ${index + 1}`;

    const { data, error } = await supabase.functions.invoke("generate-content-draft", {
      body: { topic: seedTopic, targetAxis: axis, siteUrl: siteRecord.site_url },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const slug = data?.slug || slugify(data?.title || seedTopic);
    const { error: insertError } = await (supabase as any).from("site_posts").insert({
      site_id: siteRecord.id,
      slug,
      title: data?.title || seedTopic,
      excerpt: data?.excerpt || `${siteRecord.title}용 자동 생성 콘텐츠입니다.`,
      content: data?.content || "생성된 초안이 여기에 들어갑니다.",
      status: "queued",
      source_axis: axis,
      queue_position: index + 1,
      is_auto_generated: true,
    });

    if (insertError) throw insertError;
  };

  const handleCreate = guard(async (e: React.FormEvent) => {
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

      const { data: createdSite, error } = await (supabase as any)
        .from("user_sites")
        .insert({
          owner_email: user.email!,
          site_url: normalizedUrl,
          site_slug: slug,
          title,
          user_id: user.id,
        })
        .select("id, title, site_url")
        .single();

      if (error) throw error;

      await Promise.all([0, 1, 2].map((index) => createQueuedDraft(createdSite, index)));
      await refresh();
      toast({ title: "사이트와 시작용 콘텐츠 3개가 생성되었습니다", description: `/sites/${slug}` });
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
  });

  const publishPost = guard(async (postId: string) => {
    setBusyId(postId);
    try {
      const { data, error } = await supabase.functions.invoke("publish-site-post", {
        body: { postId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "발행되었습니다" });
      if (site) await loadDashboard(site.id);
    } catch (error) {
      toast({
        title: "발행 실패",
        description: error instanceof Error ? error.message : "오류",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  });

  const archivePost = guard(async (postId: string) => {
    setBusyId(postId);
    try {
      const { error } = await (supabase as any)
        .from("site_posts")
        .update({ status: "archived" })
        .eq("id", postId);
      if (error) throw error;
      toast({ title: "큐에서 제외되었습니다" });
      if (site) await loadDashboard(site.id);
    } catch (error) {
      toast({
        title: "처리 실패",
        description: error instanceof Error ? error.message : "오류",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  });

  const generateQueuedDraft = guard(async () => {
    if (!site) return;
    setQueueing(true);
    try {
      await createQueuedDraft(site, queueCounts.queued.length);
      toast({ title: "새 발행 후보가 큐에 추가되었습니다" });
      await loadDashboard(site.id);
    } catch (error) {
      toast({
        title: "생성 실패",
        description: error instanceof Error ? error.message : "오류",
        variant: "destructive",
      });
    } finally {
      setQueueing(false);
    }
  });

  const goEdit = guard((post: SitePost) => {
    navigate(`/dashboard/content?topic=${encodeURIComponent(post.title)}&axis=${post.source_axis ?? "SEO"}`);
  });

  // No automatic redirect on page access. Guests can preview the dashboard
  // shell; auth is enforced only when they trigger an action via `guard(...)`.
  if (loading) return <div className="text-sm text-muted-foreground">불러오는 중…</div>;

  return (
    <>
      {!user ? (
        <div>
          <OnboardingSteps
            state="guest"
            primaryLabel="로그인하고 시작하기"
            onPrimary={() => navigate(`/auth?next=${encodeURIComponent("/dashboard")}`)}
            secondaryLabel="이미 계정이 있나요? 로그인"
            onSecondary={() => navigate(`/auth?next=${encodeURIComponent("/dashboard")}`)}
          />
        </div>
      ) : !site ? (
        <div className="space-y-6">
          <OnboardingSteps
            state="no-site"
            primaryLabel="페이지 만들러 가기"
            onPrimary={() => {
              const el = document.getElementById("siteUrl");
              el?.scrollIntoView({ behavior: "smooth", block: "center" });
              (el as HTMLInputElement | null)?.focus();
            }}
            secondaryLabel="먼저 무료 사이트 진단부터 보기"
            onSecondary={() => navigate("/")}
          />
          <Card className="p-6 rounded-2xl border-border/50 shadow-card">
            <h2 className="text-lg font-semibold text-foreground mb-1">내 콘텐츠 페이지 만들기</h2>
            <p className="text-sm text-muted-foreground mb-4">전용 콘텐츠 페이지를 만들고 자동 발행을 시작하세요. 생성 직후 시작용 콘텐츠 3개가 자동으로 준비됩니다.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="siteUrl">사이트 URL</Label>
                  <Input id="siteUrl" placeholder="example.com" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="title">콘텐츠 허브 제목</Label>
                  <Input id="title" placeholder="우리 브랜드 인사이트" value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">로그인된 계정: <span className="font-medium">{user?.email}</span></p>
              <Button type="submit" disabled={submitting} className="rounded-full w-full md:w-auto">
                {submitting ? "만드는 중..." : "페이지 만들기"}
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 사이트 요약 — 한 줄 */}
          <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-border/50 bg-card px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">콘텐츠 허브</p>
              <h2 className="text-base font-semibold text-foreground mt-0.5 truncate">{site.title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{site.site_url}</p>
            </div>
            <a
              href={`/sites/${site.site_slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
            >
              라이브 보기 <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* KPI — 한 줄 컴팩트 바 */}
          <Card className="rounded-2xl border-border/50 shadow-card divide-x divide-border/50 grid grid-cols-2 sm:grid-cols-4 overflow-hidden">
            {[
              { label: "발행 대기", value: queueCounts.queued.length },
              { label: "발행 완료", value: queueCounts.published.length },
              { label: "총 조회수", value: queueCounts.totalViews },
              { label: "이번 주 방문", value: queueCounts.weeklyVisitors },
            ].map((k) => (
              <div key={k.label} className="px-4 py-2.5 flex items-center justify-between sm:flex-col sm:items-start sm:justify-center sm:gap-0.5">
                <p className="text-[11px] text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{k.value}</p>
              </div>
            ))}
          </Card>

          {/* 다음 할 일 — 단일 CTA */}
          <Card className="p-5 rounded-2xl border-border/50 shadow-card bg-primary/5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary">다음 할 일</p>
                <h3 className="text-base font-semibold text-foreground mt-1">
                  {queueCounts.queued.length > 0
                    ? `대기 중인 ${queueCounts.queued.length}건 검토하고 발행하기`
                    : "콘텐츠 큐에 새 글 추가하기"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {queueCounts.queued.length > 0
                    ? "발행 큐 섹션에서 바로 검토할 수 있습니다."
                    : "추천 주제에서 고르거나 직접 주제를 입력해 시작하세요."}
                </p>
              </div>
              <Button
                className="rounded-full shrink-0"
                onClick={() => {
                  const target = queueCounts.queued.length > 0 ? "queue" : "recommendations";
                  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                {queueCounts.queued.length > 0 ? (
                  <><Send className="w-4 h-4" /> 큐로 이동</>
                ) : (
                  <><Plus className="w-4 h-4" /> 추천 보기</>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
