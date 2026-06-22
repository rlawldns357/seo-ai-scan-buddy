import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Sparkles, Send, Layers } from "lucide-react";

type SitePost = {
  id: string;
  title: string | null;
  slug: string | null;
  status: string;
  site_id: string | null;
  published_at: string | null;
  created_at: string;
  view_count: number | null;
  seo_score: number | null;
  aeo_score: number | null;
  geo_score: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  idea: "아이디어",
  draft: "초안",
  scheduled: "예약",
  published: "발행",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  published: "default",
  scheduled: "secondary",
  draft: "outline",
  idea: "outline",
};

export default function Content() {
  const [posts, setPosts] = useState<SitePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("site_posts")
        .select("id,title,slug,status,site_id,published_at,created_at,view_count,seo_score,aeo_score,geo_score")
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = (data ?? []) as SitePost[];
      setPosts(rows);
      const c: Record<string, number> = {};
      rows.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
      setCounts(c);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            콘텐츠 (AutoBlog)
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            site_posts · 호스팅 페이지(/sites/&#123;slug&#125;) 재고 · 자동 발행 · 점수
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          전체 {posts.length}개
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {(["published", "scheduled", "draft", "idea"] as const).map((s) => (
          <Card key={s}>
            <CardContent className="p-3 md:p-4">
              <p className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</p>
              <p className="text-2xl font-bold mt-1">{counts[s] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="inventory">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory" className="gap-1">
            <FileText className="w-3.5 h-3.5" /> 재고
          </TabsTrigger>
          <TabsTrigger value="scoring" className="gap-1">
            <Sparkles className="w-3.5 h-3.5" /> 점수
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-1">
            <Send className="w-3.5 h-3.5" /> 소셜
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">최근 site_posts</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">불러오는 중…</p>
              ) : posts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">아직 콘텐츠가 없습니다.</p>
              ) : (
                <div className="divide-y divide-border">
                  {posts.map((p) => (
                    <div key={p.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={STATUS_VARIANT[p.status] ?? "outline"} className="text-[10px]">
                            {STATUS_LABEL[p.status] ?? p.status}
                          </Badge>
                          {typeof p.view_count === "number" && p.view_count > 0 && (
                            <span className="text-[11px] text-muted-foreground">조회 {p.view_count}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{p.title || "(제목 없음)"}</p>
                        <p className="text-[11px] text-muted-foreground truncate">/sites/{p.slug ?? "—"}</p>
                      </div>
                      <div className="text-right shrink-0 text-[11px] text-muted-foreground space-y-0.5">
                        <div className="flex gap-1.5">
                          <span>S {p.seo_score ?? "–"}</span>
                          <span>A {p.aeo_score ?? "–"}</span>
                          <span>G {p.geo_score ?? "–"}</span>
                        </div>
                        <div>{(p.published_at ?? p.created_at).slice(0, 10)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scoring" className="mt-4">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              SEO/AEO/GEO 3축 점수 모니터링 — 다음 단계에서 추가
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="mt-4">
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground space-y-2">
              <p>Threads/소셜 발행 — 기존 페이지에서 흡수 예정</p>
              <Link to="/admin/threads-legacy" className="text-xs text-primary underline">
                구 Threads 페이지 열기
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
