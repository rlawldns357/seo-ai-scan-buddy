import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { blogPosts, type BlogPost as BlogPostType, type FAQ } from "@/data/blogPosts";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ArrowLeft, User, ChevronDown } from "lucide-react";
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

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<(BlogPostType & { faqs?: FAQ[] }) | null | undefined>(undefined);

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
        // Try to extract FAQs from content if they exist in a structured format
        let faqs: FAQ[] | undefined;
        const content = data.content;

        // Check if content has FAQ section with Q:/A: format
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* FAQ JSON-LD for SEO */}
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

          <div className="mt-8 rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 flex items-center justify-center aspect-[2/1] md:aspect-[3/1]">
            <span className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {post.category}
            </span>
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

          {/* CTA */}
          <div className="mt-14 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-primary/5 via-accent/5 to-transparent border border-border">
            <h3 className="text-lg font-bold text-foreground">내 웹사이트도 분석해 보세요</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              SearchTune OS에서 SEO · AEO · GEO 점수를 무료로 확인할 수 있습니다.
            </p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              무료 분석 시작하기
            </Link>
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
