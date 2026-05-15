/**
 * Post-build script: regenerates sitemap files from the live database so that
 * `lastmod` is always fresh. Produces a sitemap index + split children:
 *   - /sitemap.xml         → sitemap index
 *   - /sitemap-pages.xml   → static pages
 *   - /sitemap-posts.xml   → blog posts
 *
 * Writes to public/ (source of truth) and dist/ (shipped to CDN).
 */

import fs from "fs";
import path from "path";

const SITE = "https://searchtuneos.com";
const PUBLIC_DIR = path.resolve("public");
const DIST_DIR = path.resolve("dist");

// Auto-parsed from src/data/blogPosts.ts so all client-side legacy slugs
// also appear in the sitemap with /blog/{slug}.html canonical URLs.
function loadStaticSlugs() {
  try {
    const src = fs.readFileSync(path.resolve("src/data/blogPosts.ts"), "utf-8");
    const slugs = [];
    const re = /slug:\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(src))) slugs.push(m[1]);
    return [...new Set(slugs)];
  } catch {
    return ["what-is-aeo"];
  }
}
const STATIC_SLUGS = loadStaticSlugs();

function loadEnv() {
  try {
    const raw = fs.readFileSync(path.resolve(".env"), "utf-8");
    const vars = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.+)$/);
      if (m) vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
    return vars;
  } catch {
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchPosts() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[sitemap] No Supabase env vars; falling back to static slugs only");
    return [];
  }
  const url = `${SUPABASE_URL}/rest/v1/blog_posts?published=eq.true&select=slug,date,updated_at&order=date.desc`;
  try {
    const res = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) {
      console.warn("[sitemap] DB fetch failed:", res.status);
      return [];
    }
    return await res.json();
  } catch (e) {
    console.warn("[sitemap] DB fetch error:", e.message);
    return [];
  }
}

function ymd(value) {
  if (!value) return new Date().toISOString().split("T")[0];
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
  return d.toISOString().split("T")[0];
}

function buildUrlset(entries) {
  const rows = entries
    .map(
      (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</urlset>
`;
}

function buildIndex(children) {
  const rows = children
    .map(
      (c) => `  <sitemap>
    <loc>${c.loc}</loc>
    <lastmod>${c.lastmod}</lastmod>
  </sitemap>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rows}
</sitemapindex>
`;
}

function writeBoth(filename, content) {
  fs.writeFileSync(path.join(PUBLIC_DIR, filename), content, "utf-8");
  console.log(`[sitemap] wrote public/${filename}`);
  if (fs.existsSync(DIST_DIR)) {
    fs.writeFileSync(path.join(DIST_DIR, filename), content, "utf-8");
    console.log(`[sitemap] wrote dist/${filename}`);
  }
}

async function main() {
  const today = new Date().toISOString().split("T")[0];
  const posts = await fetchPosts();

  const pages = [
    { loc: `${SITE}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE}/about`, lastmod: today, changefreq: "monthly", priority: "0.8" },
    { loc: `${SITE}/blog`, lastmod: today, changefreq: "daily", priority: "0.9" },
    { loc: `${SITE}/naver-store`, lastmod: today, changefreq: "weekly", priority: "0.8" },
  ];

  const seen = new Set();
  const postEntries = [];
  for (const p of posts) {
    if (!p?.slug || seen.has(p.slug)) continue;
    seen.add(p.slug);
    postEntries.push({
      loc: `${SITE}/blog/${encodeURI(p.slug)}.html`,
      lastmod: ymd(p.updated_at || p.date),
      changefreq: "monthly",
      priority: "0.7",
    });
  }
  for (const slug of STATIC_SLUGS) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    postEntries.push({
      loc: `${SITE}/blog/${slug}.html`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.7",
    });
  }

  writeBoth("sitemap-pages.xml", buildUrlset(pages));
  writeBoth("sitemap-posts.xml", buildUrlset(postEntries));
  writeBoth(
    "sitemap.xml",
    buildIndex([
      { loc: `${SITE}/sitemap-pages.xml`, lastmod: today },
      { loc: `${SITE}/sitemap-posts.xml`, lastmod: today },
    ]),
  );
}

main().catch((e) => {
  console.error("[sitemap] fatal:", e);
  process.exit(0);
});
