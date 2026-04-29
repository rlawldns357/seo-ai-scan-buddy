import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { blogPosts, type BlogPost } from "@/data/blogPosts";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import BlogScanDemo from "@/components/blog/BlogScanDemo";


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

function isGooglePost(slug: string) {
  return slug.toLowerCase().includes("google") || slug.toLowerCase().includes("core-web-vitals") || slug.toLowerCase().includes("search-console");
}

function isChatGPTPost(slug: string) {
  return slug.toLowerCase().includes("chatgpt") || slug.toLowerCase().includes("searchgpt") || slug.toLowerCase().includes("openai");
}

function isPerplexityPost(slug: string) {
  return slug.toLowerCase().includes("perplexity");
}

function isClaudePost(slug: string) {
  return slug.toLowerCase().includes("claude");
}

function isWrtnPost(slug: string) {
  return slug.toLowerCase().includes("wrtn") || slug.toLowerCase().includes("뤼튼");
}

function getBrandThumbnail(slug: string, category: string) {
  // ChatGPT vs Gemini → dual text
  if (slug.includes("chatgpt") && slug.includes("gemini")) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xl font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#1A1A1A" }}>ChatGPT</span>
        <span className="text-xs font-bold text-muted-foreground/40">VS</span>
        <span className="text-xl font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#4285F4" }}>Gemini</span>
      </div>
    );
  }
  // OpenAI / ChatGPT
  if (isChatGPTPost(slug)) {
    return (
      <span className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "'Inter', sans-serif", color: "#1A1A1A" }}>ChatGPT</span>
    );
  }
  // Perplexity
  if (isPerplexityPost(slug)) {
    return (
      <span className="text-3xl tracking-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500, color: "#1B1B1B", letterSpacing: "-0.03em" }}>perplexity</span>
    );
  }
  // Claude
  if (isClaudePost(slug)) {
    return (
      <span className="text-[32px]" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, color: "#CC785C", letterSpacing: "-0.01em" }}>claude</span>
    );
  }
  // 뤼튼 / Wrtn
  if (isWrtnPost(slug)) {
    return (
      <span className="text-3xl font-black tracking-tight" style={{ fontFamily: "'Inter', sans-serif", color: "#FF6B00", letterSpacing: "-0.02em" }}>wrtn.</span>
    );
  }
  // Google AI Overview
  if (slug.includes("ai-overview")) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-2xl tracking-tight" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
          <span style={{ color: "#4285F4" }}>G</span><span style={{ color: "#EA4335" }}>o</span><span style={{ color: "#FBBC05" }}>o</span><span style={{ color: "#4285F4" }}>g</span><span style={{ color: "#34A853" }}>l</span><span style={{ color: "#EA4335" }}>e</span>
        </span>
        <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/60">AI Overview</span>
      </div>
    );
  }
  // Google
  if (isGooglePost(slug)) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-3xl tracking-tight" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>
          <span style={{ color: "#4285F4" }}>G</span><span style={{ color: "#EA4335" }}>o</span><span style={{ color: "#FBBC05" }}>o</span><span style={{ color: "#4285F4" }}>g</span><span style={{ color: "#34A853" }}>l</span><span style={{ color: "#EA4335" }}>e</span>
        </span>
        <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/60">Google SEO</span>
      </div>
    );
  }
  // Naver
  if (isNaverPost(slug)) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight" style={{ color: "#03C75A" }}>NAVER</span>
        <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/60">Naver SEO</span>
      </div>
    );
  }
  // Cafe24
  if (isCafe24Post(slug)) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-3xl font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>
          <span style={{ color: "#1B1B1B" }}>cafe</span><span style={{ color: "#0066BE" }}>24</span>
        </span>
        <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/60">Cafe24 SEO</span>
      </div>
    );
  }
  // imweb
  if (isImwebPost(slug)) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-3xl font-bold tracking-tight" style={{ color: "#1A1A1A" }}>imweb</span>
        <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/60">아임웹 SEO</span>
      </div>
    );
  }
  // Default: SearchTune OS
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent tracking-tight leading-none">
        SearchTune
      </span>
      <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
        OS · {category}
      </span>
    </div>
  );
}

function formatDate(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function FeaturedPost({ post }: { post: BlogPost }) {
  return (
    <article className="group relative grid md:grid-cols-2 gap-4 md:gap-6 rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[2/1] md:aspect-auto bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex items-center justify-center md:min-h-[220px]">
        <div className="text-center p-6 md:p-8">
          <span className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            AEO
          </span>
          <p className="text-sm text-muted-foreground mt-2">Answer Engine Optimization</p>
        </div>
      </div>
      <div className="flex flex-col justify-center px-4 pb-5 md:p-8">
        <span className={`self-start px-2.5 py-1 rounded-md text-xs font-bold ${categoryColor[post.category]}`}>
          {post.category}
        </span>
        <h2 className="mt-3 text-lg md:text-2xl font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
          {post.title}
        </h2>
        <p className="mt-2 md:mt-3 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {post.excerpt}
        </p>
        <div className="mt-3 md:mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(post.date)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{post.readTime} 읽기</span>
        </div>
        <div className="mt-4 md:mt-5">
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
            자세히 보기 <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </article>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[16/9] bg-gradient-to-br from-muted to-secondary flex items-center justify-center relative">
        {getBrandThumbnail(post.slug, post.category)}
      </div>
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${categoryColor[post.category]}`}>
            {post.category}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            {post.readTime}
          </span>
        </div>
        <h3 className="mt-2 text-base font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2 leading-relaxed flex-1">
          {post.excerpt}
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{post.author}</span>
          <span>·</span>
          <span>{formatDate(post.date)}</span>
        </div>
      </div>
    </article>
  );
}

export default function Blog() {
  const [allPosts, setAllPosts] = useState<BlogPost[]>(blogPosts);

  useEffect(() => {
    async function fetchDbPosts() {
      const { data } = await supabase
        .from("blog_posts")
        .select("slug, title, excerpt, category, author, date, thumbnail, featured, read_time, content")
        .eq("published", true)
        .order("date", { ascending: false });

      if (data && data.length > 0) {
        const dbPosts: BlogPost[] = data.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          category: p.category as BlogPost["category"],
          author: p.author,
          date: p.date,
          thumbnail: p.thumbnail,
          featured: p.featured,
          readTime: p.read_time,
          content: p.content,
        }));

        const slugSet = new Set<string>();
        const merged: BlogPost[] = [];
        for (const post of [...dbPosts, ...blogPosts]) {
          if (!slugSet.has(post.slug)) {
            slugSet.add(post.slug);
            merged.push(post);
          }
        }
        merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllPosts(merged);
      }
    }
    fetchDbPosts();
  }, []);

  const featured = allPosts.find((p) => p.featured);
  const rest = allPosts.filter((p) => !p.featured);

  const blogTitle = "블로그 – 서치튠OS | SEO·AEO·GEO 실전 가이드";
  const blogDesc = "SEO·AEO·GEO에 대해 알아야 할 모든 것. 서치튠OS가 제공하는 실전 가이드와 인사이트를 확인하세요.";
  const blogUrl = "https://searchtuneos.com/blog";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{blogTitle}</title>
        <meta name="description" content={blogDesc} />
        <link rel="canonical" href={blogUrl} />
        <meta property="og:title" content={blogTitle} />
        <meta property="og:description" content={blogDesc} />
        <meta property="og:url" content={blogUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={blogTitle} />
        <meta name="twitter:description" content={blogDesc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "서치튠OS 블로그",
          description: blogDesc,
          url: blogUrl,
          inLanguage: "ko",
          isPartOf: { "@type": "WebSite", name: "서치튠OS", url: "https://searchtuneos.com" },
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "홈", item: "https://searchtuneos.com/" },
            { "@type": "ListItem", position: 2, name: "블로그", item: blogUrl },
          ],
        })}</script>
      </Helmet>
      <Navbar />
      <main className="container py-10 md:py-16">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">블로그</h1>
          <p className="mt-2 text-muted-foreground">
            SEO · AEO · GEO에 대해 알아야 할 모든 것. 실전 가이드와 인사이트를 공유합니다.
          </p>
        </div>

        {featured && (
          <div className="mb-12">
            <Link to={`/blog/${featured.slug}`}>
              <FeaturedPost post={featured} />
            </Link>
          </div>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="flex">
              <PostCard post={post} />
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-10 mt-16">
        <div className="container text-center text-sm text-muted-foreground space-y-2">
          <div className="flex items-center justify-center gap-4">
            <Link to="/privacy" className="hover:text-foreground transition-colors">개인정보처리방침</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">이용약관</Link>
            <span>·</span>
            <Link to="/about" className="hover:text-foreground transition-colors">소개</Link>
          </div>
          <p>© {new Date().getFullYear()} SearchTune OS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
