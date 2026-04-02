import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { blogPosts, type BlogPost } from "@/data/blogPosts";
import { Calendar, Clock, ArrowRight } from "lucide-react";

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
      <div className="aspect-[16/9] bg-gradient-to-br from-muted to-secondary flex items-center justify-center">
        <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent opacity-60">
          {post.category}
        </span>
      </div>
      <div className="flex flex-col flex-1 p-5">
        <span className={`self-start px-2 py-0.5 rounded text-[11px] font-bold ${categoryColor[post.category]}`}>
          {post.category}
        </span>
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
  const featured = blogPosts.find((p) => p.featured);
  const rest = blogPosts.filter((p) => !p.featured);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container py-10 md:py-16">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">블로그</h1>
          <p className="mt-2 text-muted-foreground">
            SEO · AEO · GEO에 대해 알아야 할 모든 것. 실전 가이드와 인사이트를 공유합니다.
          </p>
        </div>

        {/* Featured */}
        {featured && (
          <div className="mb-12">
            <Link to={`/blog/${featured.slug}`}>
              <FeaturedPost post={featured} />
            </Link>
          </div>
        )}

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((post) => (
            <Link key={post.slug} to={`/blog/${post.slug}`} className="flex">
              <PostCard post={post} />
            </Link>
          ))}
        </div>
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
