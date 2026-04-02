import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
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

/** Minimal markdown→HTML */
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    }

    if (line.startsWith("### ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3 class="text-lg font-bold text-foreground mt-8 mb-3">${inline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h2 class="text-xl font-bold text-foreground mt-10 mb-4">${inline(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith("> ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<blockquote class="border-l-4 border-primary/30 pl-4 my-6 text-muted-foreground italic">${inline(line.slice(2))}</blockquote>`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) { html.push('<ul class="list-disc pl-6 space-y-1.5 my-4 text-muted-foreground">'); inList = true; }
      html.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    if (line.startsWith("|")) {
      if (inList) { html.push("</ul>"); inList = false; }
      if (/^\|[\s-|]+\|$/.test(line)) continue;
      const cells = line.split("|").filter(Boolean).map(c => c.trim());
      html.push(`<div class="flex gap-6 text-sm text-muted-foreground my-1">${cells.map(c => `<span class="flex-1">${inline(c)}</span>`).join("")}</div>`);
      continue;
    }

    if (inList) { html.push("</ul>"); inList = false; }
    html.push(`<p class="text-muted-foreground leading-relaxed my-4">${inline(line)}</p>`);
  }

  if (inList) html.push("</ul>");
  return html.join("\n");
}

function inline(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
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
      className="group flex-1 flex flex-col gap-2 p-4 md:p-5 rounded-2xl border border-border bg-card hover:shadow-md transition-shadow"
    >
      <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
        {direction === "prev" ? (
          <><ArrowLeft className="w-3 h-3" /> 이전 글</>
        ) : (
          <>다음 글 <ArrowRight className="w-3 h-3" /></>
        )}
      </span>
      <div className="flex items-center gap-3">
        {brandLabel}
        <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h4>
      </div>
      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Clock className="w-3 h-3" /> {post.readTime} 읽기
      </span>
    </Link>
  );
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<(BlogPostType & { faqs?: FAQ[] }) | null | undefined>(undefined);
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
        .select("slug, title, excerpt, category, author, date, thumbnail, featured, read_time, content")
        .eq("slug", slug!)
        .eq("published", true)
        .single();

      if (data) {
        let faqs: FAQ[] | undefined;
        const content = data.content;
        const faqMatch = content.match(/## (?:자주 묻는 질문|FAQ)[\s\S]*$/);
        if (faqMatch) {
          const faqSection = faqMatch[0];
          const qaPairs: FAQ[] = [];
          const qaRegex = /(?:###?\s*)?(?:Q[.:]?\s*|❓\s*)(.+?)[\n\r]+(?:A[.:]?\s*|💡\s*)(.+?)(?=(?:###?\s*)?(?:Q[.:]?\s*|❓)|$)/gs;
          let match;
          while ((match = qaRegex.exec(faqSection)) !== null) {
            qaPairs.push({ question: match[1].trim(), answer: match[2].trim() });
          }
          if (qaPairs.length > 0) faqs = qaPairs;
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
          content: data.content,
          faqs,
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
  const naver = isNaverPost(post.slug);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {faqs && faqs.length > 0 && <FaqJsonLd faqs={faqs} title={post.title} />}

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
              {formatDate(post.date)}
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
              className="mt-10 text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />
          ) : (
            <p className="mt-10 text-muted-foreground">{post.excerpt}</p>
          )}

          {/* FAQ Section */}
          {faqs && faqs.length > 0 && (
            <section className="mt-14">
              <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                💬 자주 묻는 질문
              </h2>
              <div className="rounded-2xl border border-border bg-card/50 overflow-hidden">
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border-border px-5">
                      <AccordionTrigger className="text-left text-sm md:text-base font-medium text-foreground hover:no-underline">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
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

          {/* Funnel CTAs */}
          <div className="mt-8">
            <FunnelCTAs />
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
