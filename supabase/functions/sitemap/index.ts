import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=300",
};

const SITE_URL = "https://searchtuneos.com";

// Hard-coded static blog slugs (from blogPosts.ts)
const STATIC_SLUGS = [
  "what-is-aeo",
  "naver-search-advisor-guide",
  "naver-seo-optimization-tips",
  "naver-cue-geo-strategy",
  "cafe24-seo-optimization-guide",
  "imweb-seo-guide",
];

function ymd(value?: string | null) {
  if (!value) return new Date().toISOString().split("T")[0];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "all"; // "posts" | "pages" | "all"

    const today = new Date().toISOString().split("T")[0];
    const entries: { loc: string; lastmod: string; priority: string; changefreq: string }[] = [];

    if (type === "pages" || type === "all") {
      entries.push({ loc: `${SITE_URL}/`, lastmod: today, priority: "1.0", changefreq: "weekly" });
      entries.push({ loc: `${SITE_URL}/about`, lastmod: today, priority: "0.8", changefreq: "monthly" });
      entries.push({ loc: `${SITE_URL}/blog`, lastmod: today, priority: "0.9", changefreq: "daily" });
      entries.push({ loc: `${SITE_URL}/naver-store`, lastmod: today, priority: "0.8", changefreq: "weekly" });
    }

    if (type === "posts" || type === "all") {
      const { data: dbPosts } = await supabase
        .from("blog_posts")
        .select("slug, date, updated_at")
        .eq("published", true)
        .order("date", { ascending: false });

      const slugSet = new Set<string>();
      if (dbPosts) {
        for (const post of dbPosts) {
          if (!post?.slug || slugSet.has(post.slug)) continue;
          slugSet.add(post.slug);
          entries.push({
            loc: `${SITE_URL}/blog/${encodeURI(post.slug)}.html`,
            lastmod: ymd(post.updated_at || post.date),
            priority: "0.7",
            changefreq: "monthly",
          });
        }
      }
      for (const slug of STATIC_SLUGS) {
        if (slugSet.has(slug)) continue;
        slugSet.add(slug);
        entries.push({
          loc: `${SITE_URL}/blog/${slug}.html`,
          lastmod: today,
          priority: "0.7",
          changefreq: "monthly",
        });
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    return new Response(xml, { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>
</urlset>`,
      { status: 200, headers: corsHeaders }
    );
  }
});
