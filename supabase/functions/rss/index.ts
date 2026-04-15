import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_URL = "https://searchtuneos.com";

const STATIC_SLUGS = [
  { slug: "what-is-aeo", title: "AEO란? AI 답변 엔진에 내 콘텐츠를 인용시키는 전략", excerpt: "ChatGPT, Perplexity, 뤼튼 같은 AI가 내 콘텐츠를 직접 답변으로 인용하도록 최적화하는 AEO의 핵심 개념과 실전 전략.", date: "2026-04-01", author: "서치튠 블로거", category: "AEO" },
  { slug: "naver-search-advisor-guide", title: "네이버 서치어드바이저 완벽 가이드 2026", excerpt: "네이버 서치어드바이저 등록부터 사이트맵 제출, 크롤링 최적화까지 실전 설정 가이드.", date: "2026-03-28", author: "서치튠 블로거", category: "가이드" },
  { slug: "naver-seo-optimization-tips", title: "네이버 SEO 최적화 핵심 팁 7가지", excerpt: "네이버 검색에서 상위 노출되기 위한 핵심 SEO 최적화 전략 7가지.", date: "2026-03-25", author: "서치튠 블로거", category: "SEO" },
  { slug: "naver-cue-geo-strategy", title: "네이버 Cue: 시대의 GEO 전략", excerpt: "네이버 Cue: AI 검색에서 브랜드와 콘텐츠가 인용되도록 준비하는 GEO 전략.", date: "2026-03-22", author: "서치튠 블로거", category: "GEO" },
  { slug: "cafe24-seo-optimization-guide", title: "카페24 SEO 최적화 완벽 가이드 2026", excerpt: "카페24 쇼핑몰의 SEO를 극대화하는 실전 가이드.", date: "2026-03-19", author: "서치튠 블로거", category: "가이드" },
  { slug: "imweb-seo-guide", title: "아임웹 SEO 완벽 가이드 2026", excerpt: "아임웹 사이트의 검색 노출을 극대화하는 SEO 최적화 가이드.", date: "2026-03-16", author: "서치튠 블로거", category: "가이드" },
];

function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: dbPosts } = await supabase
      .from("blog_posts")
      .select("slug, title, excerpt, date, author, category")
      .eq("published", true)
      .order("date", { ascending: false })
      .limit(50);

    const slugSet = new Set<string>();
    const items: { slug: string; title: string; excerpt: string; date: string; author: string; category: string }[] = [];

    if (dbPosts) {
      for (const p of dbPosts) {
        if (!slugSet.has(p.slug)) {
          slugSet.add(p.slug);
          items.push(p);
        }
      }
    }

    for (const p of STATIC_SLUGS) {
      if (!slugSet.has(p.slug)) {
        slugSet.add(p.slug);
        items.push(p);
      }
    }

    const now = new Date().toUTCString();
    const latestDate = items.length > 0 ? new Date(items[0].date).toUTCString() : now;

    const rssItems = items.map((p) => {
      const link = `${SITE_URL}/blog/${encodeURIComponent(p.slug)}`;
      return `    <item>
      <title>${escXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escXml(p.excerpt)}</description>
      <author>${escXml(p.author)}</author>
      <category>${escXml(p.category)}</category>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    </item>`;
    }).join("\n");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>서치튠OS 블로그 – SEO·AEO·GEO 실전 가이드</title>
    <link>${SITE_URL}/blog</link>
    <description>AI 검색 시대의 SEO·AEO·GEO 최적화 전략과 실전 가이드를 제공합니다.</description>
    <language>ko</language>
    <lastBuildDate>${latestDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_URL}/og-image.png</url>
      <title>서치튠OS 블로그</title>
      <link>${SITE_URL}/blog</link>
    </image>
${rssItems}
  </channel>
</rss>`;

    return new Response(rss, {
      status: 200,
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("RSS generation error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>서치튠OS 블로그</title><link>${SITE_URL}/blog</link></channel></rss>`,
      { status: 200, headers: { "Content-Type": "application/rss+xml; charset=utf-8" } }
    );
  }
});
