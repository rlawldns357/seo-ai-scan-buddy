import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserSite, slugify } from "@/features/publish/useUserSite";
import { useAuth } from "@/features/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Sparkles, ExternalLink } from "lucide-react";
import MarketingLanding from "@/features/publish/landing/MarketingLanding";

export default function DashboardIndex() {
  const { site, refresh, loading } = useUserSite();
  const { user, loading: authLoading } = useAuth();

  // Guests see the marketing landing.
  if (!authLoading && !user) {
    return <MarketingLanding />;
  }
  const navigate = useNavigate();
  const [siteUrl, setSiteUrl] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      navigate("/dashboard/recommendations");
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

  if (loading) {
    return <div className="text-sm text-muted-foreground">불러오는 중…</div>;
  }

  return (
    <>
      <Helmet>
        <title>Auto Publish 대시보드 | SearchTune OS</title>
        <meta name="description" content="블로그 없이 콘텐츠를 자동 발행하세요. SearchTune OS Auto Publish." />
      </Helmet>

      <section className="text-center mb-8">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
          블로그 없이도 <span className="text-primary">콘텐츠 운영</span>을 바로 시작하세요
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-3 max-w-2xl mx-auto">
          복잡한 CMS 설정 없이, 내 사이트와 연결된 전용 콘텐츠 페이지를 만들고 필요한 글을 자동으로 발행합니다.
        </p>
      </section>

      {site ? (
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">내 콘텐츠 허브</p>
              <h2 className="text-xl font-semibold text-foreground mt-1">{site.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{site.site_url}</p>
              <a
                href={`/sites/${site.site_slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
              >
                /sites/{site.site_slug} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <Button onClick={() => navigate("/dashboard/recommendations")} className="rounded-full">
              <Sparkles className="w-4 h-4" /> 콘텐츠 추천 보기
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-1">사이트 연결</h2>
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
      )}
    </>
  );
}
