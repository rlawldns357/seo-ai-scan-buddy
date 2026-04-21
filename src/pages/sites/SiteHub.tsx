import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import JsonLd from "@/components/JsonLd";
import { Card } from "@/components/ui/card";

type Site = { id: string; title: string; site_url: string; site_slug: string };
type Post = { slug: string; title: string; excerpt: string | null; published_at: string | null };

export default function SiteHub() {
  const { siteSlug } = useParams<{ siteSlug: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!siteSlug) return;
    (async () => {
      const { data: s } = await supabase
        .from("user_sites").select("id, title, site_url, site_slug")
        .eq("site_slug", siteSlug).maybeSingle();
      if (!s) { setNotFound(true); return; }
      setSite(s as Site);
      const { data: p } = await supabase
        .from("site_posts").select("slug, title, excerpt, published_at")
        .eq("site_id", s.id).eq("status", "published")
        .order("published_at", { ascending: false });
      setPosts((p as Post[]) || []);
    })();
  }, [siteSlug]);

  if (notFound) {
    return (
      <main className="container max-w-3xl py-16 px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">사이트를 찾을 수 없습니다</h1>
        <Link to="/" className="text-primary underline mt-4 inline-block">홈으로</Link>
      </main>
    );
  }
  if (!site) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: site.title,
    url: `https://searchtuneos.com/sites/${site.site_slug}`,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `https://searchtuneos.com/sites/${site.site_slug}/${p.slug}`,
      datePublished: p.published_at,
    })),
  };

  return (
    <>
      <Helmet>
        <title>{site.title} | SearchTune OS</title>
        <meta name="description" content={`${site.title} 콘텐츠 허브 - SearchTune OS Autoblog로 발행됨`} />
        <link rel="canonical" href={`https://searchtuneos.com/sites/${site.site_slug}`} />
      </Helmet>
      <JsonLd data={jsonLd} />

      <main className="container max-w-3xl py-12 px-4">
        <header className="mb-10">
          <p className="text-xs text-muted-foreground">
            <a href={site.site_url} target="_blank" rel="noreferrer" className="hover:underline">{site.site_url}</a>
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mt-1">{site.title}</h1>
          <p className="text-sm text-muted-foreground mt-2">SearchTune OS Autoblog로 운영되는 콘텐츠 허브</p>
        </header>

        {posts.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
            아직 발행된 글이 없습니다.
          </Card>
        ) : (
          <div className="grid gap-4">
            {posts.map((p) => (
              <Link key={p.slug} to={`/sites/${site.site_slug}/${p.slug}`}>
                <Card className="p-5 hover:border-primary/50 transition-colors">
                  <h2 className="text-lg font-semibold text-foreground">{p.title}</h2>
                  {p.excerpt && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>}
                  {p.published_at && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {new Date(p.published_at).toLocaleDateString("ko-KR")}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}

        <footer className="mt-16 pt-6 border-t text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            Powered by SearchTune OS
          </Link>
        </footer>
      </main>
    </>
  );
}
