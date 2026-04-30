import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import { blogPosts, type BlogPost } from "@/data/blogPosts";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { detectBrand, getBrandStyle, hasExplicitBrand, BRAND_STYLES } from "@/lib/brandMatching";


const categoryColor: Record<string, string> = {
  SEO: "bg-primary/10 text-primary",
  AEO: "bg-accent/10 text-accent",
  GEO: "bg-score-excellent/10 text-score-excellent",
  가이드: "bg-score-warning/10 text-score-warning",
  뉴스: "bg-muted text-muted-foreground",
};

/**
 * 브랜드 워드마크 비주얼.
 * 슬러그/제목/카테고리에서 brand-matching 모듈로 감지된 브랜드를
 * 해당 브랜드의 시그니처 폰트/컬러로 렌더한다.
 *
 * Google처럼 멀티컬러 워드마크는 글자별 색상을 별도로 그린다.
 * 일반 브랜드는 BRAND_STYLES의 wordmark/fontFamily/fontWeight/color 사용.
 */
function BrandWordmark({ slug, title, category, size = "md" }: { slug: string; title?: string; category?: string; size?: "md" | "lg" }) {
  const key = detectBrand(slug, title, category);
  const brand = BRAND_STYLES[key];
  const isLg = size === "lg";

  // Google 멀티컬러
  if (key === "google" || key === "google-ai-overview") {
    const letters = "Google".split("");
    const colors = ["#4285F4", "#EA4335", "#FBBC05", "#4285F4", "#34A853", "#EA4335"];
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span
          className={isLg ? "text-5xl tracking-tight" : "text-3xl tracking-tight"}
          style={{ fontFamily: brand.fontFamily, fontWeight: brand.fontWeight }}
        >
          {letters.map((ch, i) => (
            <span key={i} style={{ color: colors[i] }}>{ch}</span>
          ))}
        </span>
        <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/60">
          {brand.subtitle}
        </span>
      </div>
    );
  }

  // ChatGPT vs Gemini (정확히 둘 다 언급된 비교 글)
  if ((slug.toLowerCase().includes("chatgpt") || (title || "").toLowerCase().includes("chatgpt")) &&
      (slug.toLowerCase().includes("gemini") || (title || "").toLowerCase().includes("gemini"))) {
    return (
      <div className="flex items-center gap-3">
        <span className={isLg ? "text-3xl font-semibold" : "text-xl font-semibold"} style={{ fontFamily: BRAND_STYLES.chatgpt.fontFamily, color: BRAND_STYLES.chatgpt.color }}>ChatGPT</span>
        <span className="text-xs font-bold text-muted-foreground/40">VS</span>
        <span className={isLg ? "text-3xl font-semibold" : "text-xl font-semibold"} style={{ fontFamily: BRAND_STYLES.gemini.fontFamily, color: BRAND_STYLES.gemini.color }}>Gemini</span>
      </div>
    );
  }

  // 일반 브랜드: 단일 워드마크 + 부제
  const wordmarkClass = isLg
    ? "text-5xl tracking-tight"
    : (brand.wordmark.length > 7 ? "text-2xl tracking-tight" : "text-3xl tracking-tight");

  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className={wordmarkClass}
        style={{
          fontFamily: brand.fontFamily,
          fontWeight: brand.fontWeight,
          color: brand.color,
          letterSpacing: "-0.02em",
        }}
      >
        {brand.wordmark}
      </span>
      <span className="text-[10px] font-medium tracking-wider uppercase text-muted-foreground/60">
        {brand.subtitle}
      </span>
    </div>
  );
}

/**
 * SearchTune 기본 폴백 비주얼 (브랜드 미감지 글).
 */
function SearchTuneBadge({ category, size = "md" }: { category: string; size?: "md" | "lg" }) {
  const isLg = size === "lg";
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className={`${isLg ? "text-3xl" : "text-xl"} font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent tracking-tight leading-none`}>
        SearchTune
      </span>
      <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground/70">
        OS · {category}
      </span>
    </div>
  );
}

/** 카드 좌측에 표시할 비주얼: 브랜드가 명확하면 워드마크, 아니면 SearchTune 폴백 */
function CardVisual({ slug, title, category, size = "md" }: { slug: string; title?: string; category?: string; size?: "md" | "lg" }) {
  if (hasExplicitBrand(slug, title)) {
    return <BrandWordmark slug={slug} title={title} category={category} size={size} />;
  }
  return <SearchTuneBadge category={category || "SEO"} size={size} />;
}

function formatDate(d: string) {
  const date = new Date(d);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function HeroPost({ post }: { post: BlogPost }) {
  return (
    <article className="group relative grid md:grid-cols-2 gap-4 md:gap-6 rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-[2/1] md:aspect-auto bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 flex items-center justify-center md:min-h-[220px] relative">
        <div className="text-center p-6 md:p-8">
          <span className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            AEO
          </span>
          <p className="text-sm text-muted-foreground mt-2">Answer Engine Optimization</p>
        </div>
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-background/80 backdrop-blur text-foreground border border-border">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          최신
        </span>
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

  // 항상 최신 글이 Hero (밀어내기 형식)
  const sorted = [...allPosts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const hero = sorted[0];
  const rest = sorted.slice(1);

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
      <main className="container pt-14 pb-28 md:pt-20 md:pb-32">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">블로그</h1>
          <p className="mt-2 text-muted-foreground">
            SEO · AEO · GEO에 대해 알아야 할 모든 것. 실전 가이드와 인사이트를 공유합니다.
          </p>
        </div>
        {hero && (
          <div className="mb-12">
            <Link to={`/blog/${hero.slug}`}>
              <HeroPost post={hero} />
            </Link>
          </div>
        )}

        {rest.length > 0 && (
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-lg md:text-xl font-bold text-foreground">이전 글</h2>
            <span className="text-xs text-muted-foreground">{rest.length}개</span>
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
