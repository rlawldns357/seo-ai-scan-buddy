/**
 * Post-build script: regenerates dist/sitemap.xml (and public/sitemap.xml as
 * the source of truth) from the live database so that `lastmod` is always
 * fresh. Replaces the legacy static file that had a frozen 2026-04-15 date
 * across every entry.
 *
 * Runs after `vite build` (and after prerender-blog) so that dist/ contains
 * the latest sitemap that is shipped to the CDN.
 */

import fs from "fs";
import path from "path";

const SITE = "https://searchtuneos.com";
const PUBLIC_PATH = path.resolve("public/sitemap.xml");
const DIST_PATH = path.resolve("dist/sitemap.xml");

// Static blog slugs hard-coded in src/data/blogPosts.ts (ASCII-only).
const STATIC_SLUGS = [
  "what-is-aeo",
  "naver-search-advisor-guide",
  "naver-seo-optimization-tips",
  "naver-cue-geo-strategy",
  "cafe24-seo-optimization-guide",
  "imweb-seo-guide",
];

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

function buildXml(entries) {
  const today = new Date().toISOString().split("T")[0];
  const rows = entries
    .map(
      (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${e.lastmod || today}</lastmod>
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

async function main() {
  const today = new Date().toISOString().split("T")[0];
  const posts = await fetchPosts();
  const seen = new Set();
  const entries = [
    { loc: `${SITE}/`, lastmod: today, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE}/about`, lastmod: today, changefreq: "monthly", priority: "0.8" },
    { loc: `${SITE}/blog`, lastmod: today, changefreq: "daily", priority: "0.9" },
    { loc: `${SITE}/naver-store`, lastmod: today, changefreq: "weekly", priority: "0.8" },
  ];

  for (const p of posts) {
    if (!p?.slug || seen.has(p.slug)) continue;
    seen.add(p.slug);
    entries.push({
      loc: `${SITE}/blog/${encodeURI(p.slug)}/index.html`,
      lastmod: ymd(p.updated_at || p.date),
      changefreq: "monthly",
      priority: "0.7",
    });
  }

  for (const slug of STATIC_SLUGS) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    entries.push({
      loc: `${SITE}/blog/${slug}/index.html`,
      lastmod: today,
      changefreq: "monthly",
      priority: "0.7",
    });
  }

  const xml = buildXml(entries);

  fs.writeFileSync(PUBLIC_PATH, xml, "utf-8");
  console.log(`[sitemap] wrote ${PUBLIC_PATH} (${entries.length} urls)`);

  if (fs.existsSync(path.resolve("dist"))) {
    fs.writeFileSync(DIST_PATH, xml, "utf-8");
    console.log(`[sitemap] wrote ${DIST_PATH}`);
  }
}

main().catch((e) => {
  console.error("[sitemap] fatal:", e);
  process.exit(0); // never break the build
});
