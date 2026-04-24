import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import JsonLd from "@/components/JsonLd";

type Site = { id: string; title: string; site_slug: string };
type FaqItem = { q: string; a: string };
type Post = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  published_at: string | null;
  og_image: string | null;
  faq: FaqItem[] | null;
};

function mdToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, (_m, text, url) => {
      const isExternal = /^https?:\/\//.test(url);
      const rel = isExternal ? ' target="_blank" rel="noreferrer"' : "";
      return `<a href="${url}"${rel}>${text}</a>`;
    })
    .replace(/\n\n/g, "</p><p>")
    .replace(/^/, "<p>").concat("</p>");
}

/**
 * 본문에서 ## FAQ 섹션 이후를 잘라내 깔끔한 본문만 반환.
 * (FAQ는 별도 컴포넌트로 렌더링 — 디자인·SEO 분리)
 */
function stripFaqSection(md: string): string {
  const m = md.match(/^##\s*FAQ\b/im);
  if (!m || m.index === undefined) return md;
  return md.slice(0, m.index).trimEnd();
}

function getSessionId() {
  const key = "site-post-session-id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

export default function SitePost() {
  const { siteSlug, postSlug } = useParams<{ siteSlug: string; postSlug: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [post, setPost] = useState<Post | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!siteSlug || !postSlug) return;
    (async () => {
      const { data: s } = await supabase.from("user_sites").select("id, title, site_slug").eq("site_slug", siteSlug).maybeSingle();
      if (!s) {
        setNotFound(true);
        return;
      }

      setSite(s as Site);

      const { data: p } = await (supabase as any)
        .from("site_posts")
        .select("id, title, excerpt, content, published_at, og_image, faq")
        .eq("site_id", s.id)
        .eq("slug", postSlug)
        .eq("status", "published")
        .maybeSingle();

      if (!p) {
        setNotFound(true);
        return;
      }

      setPost(p as Post);

      await (supabase as any).rpc("log_site_post_view", {
        _post_id: p.id,
        _session_id: getSessionId(),
        _referrer: typeof document !== "undefined" ? document.referrer || null : null,
      });
    })();
  }, [siteSlug, postSlug]);

  if (notFound) {
    return (
      <main className="container max-w-2xl py-16 px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground">글을 찾을 수 없습니다</h1>
        <Link to="/" className="text-primary underline mt-4 inline-block">홈으로</Link>
      </main>
    );
  }

  if (!site || !post) return null;

  const url = `https://searchtuneos.com/sites/${site.site_slug}/${postSlug}`;
  const faqItems: FaqItem[] = Array.isArray(post.faq) ? post.faq.filter((f) => f?.q && f?.a) : [];

  // BlogPosting JSON-LD (보강: author/dateModified/image/wordCount)
  const wordCount = post.content.replace(/\s+/g, " ").trim().split(" ").length;
  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at,
    dateModified: post.published_at,
    url,
    mainEntityOfPage: url,
    wordCount,
    inLanguage: "ko-KR",
    author: { "@type": "Organization", name: site.title },
    publisher: { "@type": "Organization", name: "SearchTune OS" },
    ...(post.og_image ? { image: post.og_image } : {}),
  };

  // FAQPage JSON-LD (AEO 핵심)
  const faqJsonLd = faqItems.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  const cleanBody = stripFaqSection(post.content);

  return (
    <>
      <Helmet>
        <title>{post.title} | {site.title}</title>
        <meta name="description" content={post.excerpt || post.title} />
        <link rel="canonical" href={url} />
        {post.og_image && <meta property="og:image" content={post.og_image} />}
      </Helmet>
      <JsonLd data={blogJsonLd} />
      {faqJsonLd && <JsonLd data={faqJsonLd} />}

      <main className="container max-w-2xl py-12 px-4">
        <Link to={`/sites/${site.site_slug}`} className="text-xs text-muted-foreground hover:text-foreground">← {site.title}</Link>
        <article className="mt-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">{post.title}</h1>
          {post.published_at && <p className="text-xs text-muted-foreground mt-2">{new Date(post.published_at).toLocaleDateString("ko-KR")}</p>}
          <div
            className="prose prose-sm md:prose-base max-w-none mt-8 text-foreground [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-semibold [&_h3]:mt-6 [&_p]:my-3 [&_p]:leading-relaxed [&_a]:text-primary [&_a]:underline [&_table]:my-4 [&_table]:w-full [&_table]:text-sm [&_th]:text-left [&_th]:font-semibold [&_th]:p-2 [&_th]:border-b [&_td]:p-2 [&_td]:border-b [&_td]:border-border/60"
            dangerouslySetInnerHTML={{ __html: mdToHtml(cleanBody) }}
          />

          {/* FAQ 섹션 — AEO 강화 */}
          {faqItems.length > 0 && (
            <section className="mt-12 pt-8 border-t" aria-label="자주 묻는 질문">
              <h2 className="text-xl font-bold text-foreground mb-4">자주 묻는 질문</h2>
              <div className="space-y-3">
                {faqItems.map((f, i) => (
                  <details
                    key={i}
                    className="group rounded-lg border border-border bg-card px-4 py-3 [&_summary::-webkit-details-marker]:hidden"
                    {...(i === 0 ? { open: true } : {})}
                  >
                    <summary className="cursor-pointer font-semibold text-sm text-foreground flex items-start justify-between gap-3">
                      <span className="flex-1">Q. {f.q}</span>
                      <span className="text-muted-foreground text-xs shrink-0 transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <p className="mt-3 text-sm text-foreground/80 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </article>

        <footer className="mt-16 pt-6 border-t text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">Powered by SearchTune OS</Link>
        </footer>
      </main>
    </>
  );
}
