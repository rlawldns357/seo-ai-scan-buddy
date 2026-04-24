import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { Flame, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import JsonLd from "@/components/JsonLd";
import { renderMarkdown } from "@/lib/markdown";
import { calcDiscountPercent, formatSaleCountdown } from "@/lib/productPricing";

type Site = { id: string; title: string; site_slug: string };
type FaqItem = { q: string; a: string };
type ProductLink = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  price: string | null;
  image_url: string | null;
  compare_at_price?: string | null;
  sale_label?: string | null;
  sale_ends_at?: string | null;
  matched_keywords?: string[];
};
type Post = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  published_at: string | null;
  og_image: string | null;
  faq: FaqItem[] | null;
  product_links: ProductLink[] | null;
};

// (markdown 렌더링은 src/lib/markdown.ts의 renderMarkdown 사용 — 표/리스트/코드블록/인용 모두 지원)

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
        .select("id, title, excerpt, content, published_at, og_image, faq, product_links")
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
  const products: ProductLink[] = Array.isArray(post.product_links)
    ? post.product_links.filter((p) => p?.id && p?.title && p?.url)
    : [];

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
            className="mt-8 text-base leading-[1.8] text-foreground/90 [&>*:first-child]:mt-0"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(cleanBody) }}
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

          {/* 제품 CTA — 세일 강조 디자인. 모든 글 100% 노출 (전환 핵심) */}
          {products.length > 0 && (
            <section className="mt-12 pt-8 border-t" aria-label="이 글과 관련된 제품">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-destructive" aria-hidden />
                <h2 className="text-xl font-bold text-foreground">지금 진행 중인 특가</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                글 내용과 가장 잘 맞는 제품을 골라드렸어요.
              </p>
              <div className={`grid gap-3 ${products.length === 1 ? "grid-cols-1" : "sm:grid-cols-2"}`}>
                {products.map((p) => {
                  const discount = calcDiscountPercent(p.price, p.compare_at_price);
                  const countdown = formatSaleCountdown(p.sale_ends_at);
                  const hasSaleSignal = !!discount || !!p.sale_label || !!countdown;
                  const isHero = products.length === 1;
                  return (
                    <a
                      key={p.id}
                      href={p.url}
                      target="_blank"
                      rel="sponsored noopener"
                      onClick={() => {
                        void (supabase as any).rpc("increment_site_product_click", { _product_id: p.id });
                      }}
                      className={`group relative flex ${isHero ? "flex-col sm:flex-row gap-4 sm:gap-5 p-4 sm:p-5" : "gap-3 p-3"} rounded-xl border border-border bg-card hover:border-foreground/20 hover:shadow-sm transition no-underline`}
                    >
                      {/* 할인률 배지 — 이미지 좌상단 오버레이 (담백) */}
                      {discount && (
                        <span className={`absolute z-10 inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground font-bold tabular-nums ${
                          isHero
                            ? "top-3 left-3 px-2 py-1 text-sm"
                            : "top-2 left-2 px-1.5 py-0.5 text-xs"
                        }`}>
                          {discount}%
                        </span>
                      )}
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          loading="lazy"
                          className={`rounded-lg object-cover shrink-0 bg-muted ${
                            isHero ? "h-40 w-full sm:h-44 sm:w-44" : "h-20 w-20"
                          }`}
                        />
                      ) : (
                        <div className={`rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground/50 text-xs ${
                          isHero ? "h-40 w-full sm:h-44 sm:w-44" : "h-20 w-20"
                        }`}>
                          제품
                        </div>
                      )}
                      <div className="min-w-0 flex-1 flex flex-col">
                        {/* 세일 라벨 + 카운트다운 — 작은 텍스트 톤 */}
                        {(p.sale_label || countdown) && (
                          <div className={`flex items-center gap-2 flex-wrap text-xs text-muted-foreground ${isHero ? "mb-1.5" : "mb-1"}`}>
                            {p.sale_label && <span className="font-medium text-foreground/70">{p.sale_label}</span>}
                            {p.sale_label && countdown && <span className="text-border">·</span>}
                            {countdown && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" aria-hidden /> {countdown}
                              </span>
                            )}
                          </div>
                        )}
                        <p className={`font-semibold text-foreground group-hover:text-primary transition ${
                          isHero ? "text-base sm:text-lg line-clamp-2" : "text-sm line-clamp-2"
                        }`}>
                          {p.title}
                        </p>
                        {/* 가격: 원가 취소선 + 판매가 강조 */}
                        {p.price && (
                          <div className={`flex items-baseline gap-2 flex-wrap ${isHero ? "mt-2" : "mt-1.5"}`}>
                            {p.compare_at_price && discount && (
                              <span className={`text-muted-foreground line-through tabular-nums ${
                                isHero ? "text-sm" : "text-[11px]"
                              }`}>
                                {p.compare_at_price}
                              </span>
                            )}
                            <span
                              className={`font-bold tabular-nums ${
                                discount
                                  ? isHero ? "text-destructive text-xl" : "text-destructive text-base"
                                  : isHero ? "text-foreground text-lg" : "text-foreground text-sm"
                              }`}
                            >
                              {p.price}
                            </span>
                          </div>
                        )}
                        {p.description && (
                          <p className={`text-muted-foreground mt-1.5 ${
                            isHero ? "text-sm line-clamp-2" : "text-[11px] line-clamp-2 mt-1"
                          }`}>
                            {p.description}
                          </p>
                        )}
                        {isHero && (
                          <div className="mt-auto pt-3">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-foreground/20 text-foreground text-sm font-medium group-hover:bg-foreground group-hover:text-background transition">
                              자세히 보기 →
                            </span>
                          </div>
                        )}
                      </div>
                    </a>
                  );
                })}
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
