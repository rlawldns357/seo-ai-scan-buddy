import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { blogPosts, type BlogPost as BlogPostType, type FAQ } from "@/data/blogPosts";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ArrowLeft, ArrowRight, User } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import FunnelCTAs from "@/components/FunnelCTAs";


const categoryColor: Record<string, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-excellent/10 text-score-excellent",
  가이드: "bg-score-warning/10 text-score-warning",
  뉴스: "bg-muted text-muted-foreground",
};

const NAVER_SLUGS = ["naver-search-advisor-guide", "naver-seo-optimization-tips", "naver-cue-geo-strategy"];

function isNaverPost(slug: string) {
  return NAVER_SLUGS.includes(slug) || slug.toLowerCase().includes("naver");
}

function isCafe24Post(slug: string) {
  return slug.toLowerCase().includes("cafe24");
}

function isImwebPost(slug: string) {
  return slug.toLowerCase().includes("imweb");
}

function getBrandThumbnail(slug: string, category: string, large = false) {
  const size = large ? "text-4xl md:text-5xl" : "text-3xl";
  if (isNaverPost(slug)) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className={`${size} font-black`} style={{ color: "#03C75A" }}>NAVER</span>
        <span className="text-sm font-semibold text-muted-foreground">Naver SEO</span>
      </div>
    );
  }
  if (isCafe24Post(slug)) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className={`${size} font-black tracking-tight`} style={{ letterSpacing: "-0.02em" }}>
          <span style={{ color: "#1B1B1B" }}>CAFE</span>
          <span style={{ color: "#0066BE" }}>24</span>
        </span>
        <span className="text-sm font-semibold text-muted-foreground">Cafe24 SEO</span>
      </div>
    );
  }
  if (isImwebPost(slug)) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className={`${size} font-black tracking-tight`} style={{ color: "#1A1A1A" }}>imweb</span>
        <span className="text-sm font-semibold text-muted-foreground">아임웹 SEO</span>
      </div>
    );
  }
  return (
    <span className={`${size} font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent`}>
      {category}
    </span>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

/** Escape HTML for safe rendering inside code blocks */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Minimal markdown→HTML supporting headings, ul/ol, tables, code blocks, blockquotes, hr */
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const html: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeBuf: string[] = [];
  let codeLang = "";
  let tableBuf: string[] = [];

  const closeLists = () => {
    if (inUl) { html.push("</ul>"); inUl = false; }
    if (inOl) { html.push("</ol>"); inOl = false; }
  };

  const flushTable = () => {
    if (tableBuf.length === 0) return;
    const rows = tableBuf.map((l) =>
      l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
    );
    // detect alignment row
    let headerRow = rows[0];
    let bodyRows = rows.slice(1);
    if (bodyRows.length > 0 && bodyRows[0].every((c) => /^:?-{2,}:?$/.test(c))) {
      bodyRows = bodyRows.slice(1);
    }
    const thead = `<thead><tr>${headerRow.map((c) => `<th class="border border-border px-3 py-2 text-left text-sm font-semibold text-foreground bg-muted/50">${inline(c)}</th>`).join("")}</tr></thead>`;
    const tbody = `<tbody>${bodyRows.map((r) => `<tr>${r.map((c) => `<td class="border border-border px-3 py-2 text-sm text-muted-foreground align-top">${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    html.push(`<div class="my-6 overflow-x-auto"><table class="w-full border-collapse">${thead}${tbody}</table></div>`);
    tableBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    // code fence
    if (/^```/.test(line.trim())) {
      if (!inCode) {
        closeLists();
        flushTable();
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeBuf = [];
      } else {
        const langLabel = codeLang ? `<div class="px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/60 border-b border-border">${escapeHtml(codeLang)}</div>` : "";
        html.push(`<div class="my-6 rounded-lg border border-border overflow-hidden bg-muted/30">${langLabel}<pre class="p-4 overflow-x-auto text-sm font-mono text-foreground"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre></div>`);
        inCode = false;
        codeBuf = [];
        codeLang = "";
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    // table row
    if (line.startsWith("|") && line.endsWith("|")) {
      closeLists();
      tableBuf.push(line);
      continue;
    } else if (tableBuf.length > 0) {
      flushTable();
    }

    if (line.trim() === "") {
      closeLists();
      continue;
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      closeLists();
      html.push('<hr class="my-8 border-border" />');
      continue;
    }

    if (line.startsWith("#### ")) {
      closeLists();
      html.push(`<h4 class="text-base font-bold text-foreground mt-6 mb-2">${inline(line.slice(5))}</h4>`);
      continue;
    }
    if (line.startsWith("### ")) {
      closeLists();
      html.push(`<h3 class="text-lg font-bold text-foreground mt-8 mb-3">${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      closeLists();
      html.push(`<h2 class="text-xl font-bold text-foreground mt-10 mb-4">${inline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      closeLists();
      html.push(`<h2 class="text-2xl font-bold text-foreground mt-10 mb-4">${inline(line.slice(2))}</h2>`);
      continue;
    }

    if (line.startsWith("> ")) {
      closeLists();
      html.push(`<blockquote class="border-l-4 border-primary/30 pl-4 my-6 text-muted-foreground italic">${inline(line.slice(2))}</blockquote>`);
      continue;
    }

    // ordered list: "1. ", "12) "
    const olMatch = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (olMatch) {
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (!inOl) { html.push('<ol class="list-decimal pl-6 space-y-1.5 my-4 text-muted-foreground">'); inOl = true; }
      html.push(`<li>${inline(olMatch[2])}</li>`);
      continue;
    }

    // unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      if (inOl) { html.push("</ol>"); inOl = false; }
      if (!inUl) { html.push('<ul class="list-disc pl-6 space-y-1.5 my-4 text-muted-foreground">'); inUl = true; }
      html.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ""))}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p class="text-muted-foreground leading-relaxed my-4">${inline(line)}</p>`);
  }

  if (inCode) {
    html.push(`<pre class="my-6 p-4 rounded-lg bg-muted/30 border border-border overflow-x-auto text-sm font-mono text-foreground"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }
  flushTable();
  closeLists();
  return html.join("\n");
}

/** Naver Rulebook: derive meaningful alt from image src filename */
function deriveAltFromSrc(src: string): string {
  try {
    const path = src.split("?")[0].split("#")[0];
    const filename = path.substring(path.lastIndexOf("/") + 1);
    const stem = filename.replace(/\.(png|jpe?g|gif|webp|svg|avif)$/i, "");
    const cleaned = stem.replace(/[-_+]+/g, " ").replace(/\s+/g, " ").trim();
    return cleaned || "본문 이미지";
  } catch {
    return "본문 이미지";
  }
}

/** Naver Rulebook: detect meaningless anchor text and enrich for context */
const MEANINGLESS_ANCHORS = /^(여기|이곳|클릭|더보기|링크|here|click here|click|read more|more|link)$/i;
function enrichAnchorText(text: string, url: string): string {
  if (!MEANINGLESS_ANCHORS.test(text.trim())) return text;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    return `${text} (${host})`;
  } catch {
    return text;
  }
}

function inline(text: string) {
  // images ![alt](src) — alt fallback from filename (Naver rule)
  let s = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_m, alt: string, src: string) => {
      const safeAlt = (alt && alt.trim()) ? alt : deriveAltFromSrc(src);
      const escaped = safeAlt.replace(/"/g, "&quot;");
      return `<img src="${src}" alt="${escaped}" class="inline-block max-w-full rounded my-2" loading="lazy" decoding="async" />`;
    });
  // links [text](url) — meaningless anchor enrichment (Naver rule)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
    (_m, label: string, url: string) => {
      const enriched = enrichAnchorText(label, url);
      return `<a href="${url}" class="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">${enriched}</a>`;
    });
  // bold + italic
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  // inline code
  s = s.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">$1</code>');
  return s;
}

/** Generate FAQ JSON-LD for SEO */
function FaqJsonLd({ faqs, title }: { faqs: FAQ[]; title: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: title,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/** Generate Article JSON-LD for SEO */
function ArticleJsonLd({ post }: { post: BlogPostType }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "SearchTune OS",
      url: "https://searchtuneos.com",
    },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://searchtuneos.com/blog/${post.slug}`,
    },
    image: post.thumbnail !== "/placeholder.svg"
      ? post.thumbnail
      : "https://searchtuneos.com/og-image.png",
    articleSection: post.category,
    inLanguage: "ko",
    wordCount: post.content?.length ? Math.round(post.content.length / 3.5) : undefined,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/** Prev / Next post navigation card */
function PostNavCard({ post, direction }: { post: BlogPostType; direction: "prev" | "next" }) {
  const brandLabel = isNaverPost(post.slug)
    ? <span className="shrink-0 text-xs font-black" style={{ color: "#03C75A" }}>NAVER</span>
    : isCafe24Post(post.slug)
    ? <span className="shrink-0 text-xs font-black tracking-tight"><span style={{ color: "#1B1B1B" }}>CAFE</span><span style={{ color: "#0066BE" }}>24</span></span>
    : isImwebPost(post.slug)
    ? <span className="shrink-0 text-xs font-black tracking-tight" style={{ color: "#1A1A1A" }}>imweb</span>
    : <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${categoryColor[post.category]}`}>{post.category}</span>;

  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group flex-1 flex flex-col gap-1 py-3 px-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all ${direction === "next" ? "items-end text-right" : "items-start"}`}
    >
      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {direction === "prev" && <ArrowLeft className="w-3 h-3" />}
        {direction === "prev" ? "이전글" : "다음글"}
        {direction === "next" && <ArrowRight className="w-3 h-3" />}
      </span>
      <span className="text-sm text-foreground line-clamp-1">{post.title}</span>
    </Link>
  );
}

type FaqShort = { q: string; a: string };

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<(BlogPostType & { faqs?: FAQ[]; faqShort?: FaqShort[] }) | null | undefined>(undefined);
  const [allPosts, setAllPosts] = useState<BlogPostType[]>(blogPosts);

  // Fetch DB posts for nav
  useEffect(() => {
    async function fetchDbPosts() {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, category, author, date, thumbnail, featured, read_time, content")
        .eq("published", true);

      if (data && data.length > 0) {
        const dbPosts: BlogPostType[] = data.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          category: p.category as BlogPostType["category"],
          author: p.author,
          date: p.date,
          thumbnail: p.thumbnail,
          featured: p.featured,
          readTime: p.read_time,
          content: p.content,
        }));

        const slugSet = new Set<string>();
        const merged: BlogPostType[] = [];
        for (const p of [...dbPosts, ...blogPosts]) {
          if (!slugSet.has(p.slug)) {
            slugSet.add(p.slug);
            merged.push(p);
          }
        }
        merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllPosts(merged);
      }
    }
    fetchDbPosts();
  }, []);

  useEffect(() => {
    const staticPost = blogPosts.find((p) => p.slug === slug);
    if (staticPost) {
      setPost(staticPost);
      return;
    }

    async function fetchFromDb() {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, category, author, date, thumbnail, featured, read_time, content, og_image, faq_short")
        .eq("slug", slug!)
        .eq("published", true)
        .single();

      if (data) {
        let faqs: FAQ[] | undefined;
        let content = data.content;
        const faqMatch = content.match(/##\s+(?:자주 묻는 질문|FAQ)[\s\S]*$/);
        if (faqMatch) {
          const faqSection = faqMatch[0];
          const qaPairs: FAQ[] = [];
          const blocks = faqSection
            .replace(/^##\s+(?:자주 묻는 질문|FAQ)\s*/m, "")
            .split(/(?=(?:^|\n)\s*(?:###?\s*)?(?:Q[.:]\s*|❓\s*))/g)
            .map((b) => b.trim())
            .filter(Boolean);

          for (const block of blocks) {
            const m = block.match(/^(?:###?\s*)?(?:Q[.:]?\s*|❓\s*)([\s\S]+?)[\n\r]+(?:A[.:]?\s*|💡\s*)([\s\S]+)$/);
            if (m) {
              qaPairs.push({ question: m[1].trim(), answer: m[2].trim() });
            }
          }
          if (qaPairs.length > 0) {
            faqs = qaPairs;
            // Keep FAQ inside content for SEO body matching (Naver D.I.A.)
            // — body markdown FAQ stays visible AS-IS
          }
        }

        // Parse faq_short (JSONB) — friendly-tone accordion below body
        const rawFaqShort = (data as any).faq_short;
        let faqShort: FaqShort[] | undefined;
        if (Array.isArray(rawFaqShort)) {
          faqShort = rawFaqShort
            .filter((x: any) => x && typeof x.q === "string" && typeof x.a === "string")
            .map((x: any) => ({ q: x.q, a: x.a }));
          if (faqShort.length === 0) faqShort = undefined;
        }

        setPost({
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt,
          category: data.category as BlogPostType["category"],
          author: data.author,
          date: data.date,
          thumbnail: data.thumbnail,
          featured: data.featured,
          readTime: data.read_time,
          content: content,
          faqs,
          faqShort,
          ogImage: (data as any).og_image || undefined,
        });
      } else {
        setPost(null);
      }
    }
    fetchFromDb();
  }, [slug]);

  // Compute prev/next
  const { prevPost, nextPost } = useMemo(() => {
    const idx = allPosts.findIndex((p) => p.slug === slug);
    return {
      prevPost: idx > 0 ? allPosts[idx - 1] : null,
      nextPost: idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null,
    };
  }, [allPosts, slug]);

  // Compute related posts (same category + keyword overlap)
  const relatedPosts = useMemo(() => {
    if (!post || !allPosts.length) return [];
    const titleWords = new Set(
      post.title.split(/[\s,·\-—:!?()[\]{}]+/).filter((w) => w.length >= 2)
    );
    return allPosts
      .filter((p) => p.slug !== post.slug)
      .map((p) => {
        let score = 0;
        if (p.category === post.category) score += 3;
        const pWords = p.title.split(/[\s,·\-—:!?()[\]{}]+/).filter((w) => w.length >= 2);
        for (const w of pWords) {
          if (titleWords.has(w)) score += 2;
        }
        return { ...p, score };
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [allPosts, post, slug]);

  if (post === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-16 text-center">
          <div className="animate-pulse text-muted-foreground">불러오는 중...</div>
        </main>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground">글을 찾을 수 없습니다</h1>
          <Link to="/blog" className="mt-4 inline-flex items-center gap-1 text-primary font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" /> 블로그로 돌아가기
          </Link>
        </main>
      </div>
    );
  }

  const faqs = post.faqs;
  const faqShort = post.faqShort;
  const naver = isNaverPost(post.slug);

  const postUrl = `https://searchtuneos.com/blog/${post.slug}`;
  const postTitle = `${post.title} – 서치튠OS 블로그`;
  const ogImage = post.ogImage
    || (post.thumbnail !== "/placeholder.svg" ? post.thumbnail : undefined)
    || "https://searchtuneos.com/og-image.png";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{postTitle}</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={postUrl} />
        {/* Naver-specific meta */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
        <meta name="date" content={post.date} />
        <meta name="author" content={post.author} />
        <meta property="og:title" content={postTitle} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:url" content={postUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="서치튠OS" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="article:published_time" content={post.date} />
        <meta property="article:modified_time" content={post.date} />
        <meta property="article:author" content={post.author} />
        <meta property="article:section" content={post.category} />
        <meta property="article:tag" content={`${post.category},SEO,AEO,GEO,검색최적화,서치튠OS`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={postTitle} />
        <meta name="twitter:description" content={post.excerpt} />
        <meta name="twitter:image" content={ogImage} />
        <link rel="alternate" type="application/rss+xml" title="서치튠OS 블로그 RSS" href="https://searchtuneos.com/rss.xml" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: "https://searchtuneos.com/" },
            { "@type": "ListItem", position: 2, name: "블로그", item: "https://searchtuneos.com/blog" },
            { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
          ],
        })}</script>
      </Helmet>
      <Navbar />

      {faqs && faqs.length > 0 && <FaqJsonLd faqs={faqs} title={post.title} />}
      <ArticleJsonLd post={post} />

      <main className="container py-8 md:py-14">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> 블로그
        </Link>

        <article className="max-w-3xl mx-auto">
          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold ${categoryColor[post.category]}`}>
            {post.category}
          </span>

          <h1 className="mt-4 text-2xl md:text-3xl lg:text-4xl font-extrabold text-foreground leading-tight">
            {post.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {post.readTime} 읽기
            </span>
          </div>

          {/* Thumbnail */}
          <div className="mt-8 rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 flex items-center justify-center aspect-[2/1] md:aspect-[3/1]">
            {getBrandThumbnail(post.slug, post.category, true)}
          </div>

          {post.content ? (
            <div
              className="mt-8 text-base leading-[1.8] text-foreground/90 [&>*:first-child]:mt-0 [&_p]:!text-foreground/85 [&_li]:!text-foreground/85"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />
          ) : (
            <p className="mt-10 text-muted-foreground">{post.excerpt}</p>
          )}

          {/* Friendly-tone FAQ Accordion (faq_short) — separate from body FAQ */}
          {faqShort && faqShort.length > 0 && (
            <section className="mt-14">
              <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                💬 빠른 답변
              </h2>
              <p className="text-xs text-muted-foreground mb-5">
                바쁘신 분들을 위한 핵심만 쏙쏙
              </p>
              <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
                <Accordion type="single" collapsible className="w-full">
                  {faqShort.map((faq, i) => (
                    <AccordionItem key={i} value={`faqshort-${i}`} className="border-border px-5">
                      <AccordionTrigger className="text-left text-sm md:text-base font-medium text-foreground hover:no-underline">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                        <span dangerouslySetInnerHTML={{ __html: inline(faq.a) }} />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>
          )}

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <section className="mt-14">
              <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                📌 관련 글 추천
              </h2>
              <div className="grid gap-3">
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.slug}
                    to={`/blog/${rp.slug}`}
                    className="group flex items-start gap-3 p-3 rounded-xl border border-border/50 hover:border-border hover:bg-muted/30 transition-all"
                  >
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 flex items-center justify-center">
                      <span className="text-xs font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        {rp.category}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {rp.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{rp.excerpt}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{rp.readTime}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Prev / Next Navigation */}
          {(prevPost || nextPost) && (
            <nav className="mt-14 flex flex-col sm:flex-row gap-4" aria-label="블로그 글 이동">
              {prevPost ? <PostNavCard post={prevPost} direction="prev" /> : <div className="flex-1" />}
              {nextPost ? <PostNavCard post={nextPost} direction="next" /> : <div className="flex-1" />}
            </nav>
          )}

          {/* Primary CTA */}
          <div className="mt-10 flex flex-col items-center text-center">
            <p className="text-sm text-muted-foreground mb-3">지금 바로 내 사이트를 점검해 보세요</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2.5 h-14 w-full sm:w-auto px-10 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-lg hover:opacity-90 hover:shadow-xl transition-all"
            >
              🚀 서치튠OS 무료로 분석하기
            </Link>
          </div>

          {/* Funnel CTAs */}
          <div className="mt-8">
            <FunnelCTAs />
          </div>

          {/* Feedback links */}
          <div className="mt-10 flex items-center justify-center gap-3 text-[11px] text-muted-foreground/50">
            <a
              href={`mailto:contact@searchtune.co?subject=수정 요청: ${encodeURIComponent(post.title)}&body=글 제목: ${encodeURIComponent(post.title)}%0A수정 내용:%0A`}
              className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
            >
              수정 요청
            </a>
            <span>·</span>
            <a
              href={`mailto:contact@searchtune.co?subject=버그 신고: ${encodeURIComponent(post.title)}&body=글 제목: ${encodeURIComponent(post.title)}%0A버그 내용:%0A`}
              className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
            >
              버그 신고
            </a>
          </div>
        </article>
      </main>

      <footer className="border-t border-border py-10 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SearchTune OS. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
