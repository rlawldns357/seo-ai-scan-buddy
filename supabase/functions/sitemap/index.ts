import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/xml; charset=utf-8",
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch published blog posts from DB
    const { data: dbPosts } = await supabase
      .from("blog_posts")
      .select("slug, date")
      .eq("published", true)
      .order("date", { ascending: false });

    // Merge slugs (DB posts take priority)
    const slugSet = new Set<string>();
    const entries: { loc: string; lastmod: string; priority: string }[] = [];

    // Static pages
    entries.push({ loc: `${SITE_URL}/`, lastmod: new Date().toISOString().split("T")[0], priority: "1.0" });
    entries.push({ loc: `${SITE_URL}/about`, lastmod: new Date().toISOString().split("T")[0], priority: "0.8" });
    entries.push({ loc: `${SITE_URL}/blog`, lastmod: new Date().toISOString().split("T")[0], priority: "0.9" });

    // DB blog posts
    if (dbPosts) {
      for (const post of dbPosts) {
        if (!slugSet.has(post.slug)) {
          slugSet.add(post.slug);
          entries.push({
            loc: `${SITE_URL}/blog/${post.slug}.html`,
            lastmod: post.date,
            priority: "0.7",
          });
        }
      }
    }

    // Static blog posts (not already in DB)
    for (const slug of STATIC_SLUGS) {
      if (!slugSet.has(slug)) {
        slugSet.add(slug);
        entries.push({
          loc: `${SITE_URL}/blog/${slug}`,
          lastmod: new Date().toISOString().split("T")[0],
          priority: "0.7",
        });
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.priority === "1.0" ? "weekly" : "monthly"}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: corsHeaders,
    });
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
