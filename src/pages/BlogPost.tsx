import { useParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { blogPosts } from "@/data/blogPosts";
import { Calendar, Clock, ArrowLeft, User } from "lucide-react";

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

/** Minimal markdown→HTML: headings, bold, lists, blockquotes, inline code, paragraphs */
function renderMarkdown(md: string) {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    // blank line
    if (line.trim() === "") {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    }

    // headings
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

    // blockquote
    if (line.startsWith("> ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<blockquote class="border-l-4 border-primary/30 pl-4 my-6 text-muted-foreground italic">${inline(line.slice(2))}</blockquote>`);
      continue;
    }

    // unordered list
    if (line.startsWith("- ")) {
      if (!inList) { html.push('<ul class="list-disc pl-6 space-y-1.5 my-4 text-muted-foreground">'); inList = true; }
      html.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }

    // table row (simple skip for now — render as text)
    if (line.startsWith("|")) {
      if (inList) { html.push("</ul>"); inList = false; }
      // skip table separators
      if (/^\|[\s-|]+\|$/.test(line)) continue;
      const cells = line.split("|").filter(Boolean).map(c => c.trim());
      html.push(`<div class="flex gap-6 text-sm text-muted-foreground my-1">${cells.map(c => `<span class="flex-1">${inline(c)}</span>`).join("")}</div>`);
      continue;
    }

    // paragraph
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

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = blogPosts.find((p) => p.slug === slug);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-8 md:py-14">
        {/* Back link */}
        <Link
          to="/blog"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> 블로그
        </Link>

        {/* Header */}
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

          {/* Hero gradient */}
          <div className="mt-8 rounded-2xl bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 flex items-center justify-center aspect-[2/1] md:aspect-[3/1]">
            <span className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              {post.category}
            </span>
          </div>

          {/* Content */}
          {post.content ? (
            <div
              className="mt-10 text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
            />
          ) : (
            <p className="mt-10 text-muted-foreground">{post.excerpt}</p>
          )}

          {/* Bottom CTA */}
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

      {/* Footer */}
      <footer className="border-t border-border py-10 mt-16">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SearchTune OS. All rights reserved.
        </div>
      </footer>
    </div>
  );
}