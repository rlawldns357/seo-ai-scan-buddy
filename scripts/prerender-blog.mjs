/**
 * Post-build script: generates static HTML for each blog post
 * so that search engine crawlers (especially Naver Yeti) can
 * index content without executing JavaScript.
 *
 * Runs after `vite build` and writes files to dist/blog/{slug}/index.html
 */

import fs from "fs";
import path from "path";

const DIST = path.resolve("dist");
const SITE = "https://searchtuneos.com";

// ── 1. Read env vars from .env ──────────────────────────────────────
function loadEnv() {
  try {
    const envFile = fs.readFileSync(path.resolve(".env"), "utf-8");
    const vars = {};
    for (const line of envFile.split("\n")) {
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

// ── 2. Fetch blog posts from Supabase ───────────────────────────────
async function fetchPosts() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("[prerender] No Supabase env vars found, skipping DB fetch");
    return [];
  }

  const url = `${SUPABASE_URL}/rest/v1/blog_posts?published=eq.true&select=slug,title,excerpt,category,author,date,read_time,content,featured,og_image&order=date.desc`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (!res.ok) {
      console.warn("[prerender] DB fetch failed:", res.status);
      return [];
    }
    return await res.json();
  } catch (e) {
    console.warn("[prerender] DB fetch error:", e.message);
    return [];
  }
}

// ── 3. Static blog posts (fallback if DB is empty) ──────────────────
const STATIC_POSTS = [
  { slug: "what-is-aeo", title: "AEO란? AI 답변 엔진에 내 콘텐츠를 인용시키는 전략", excerpt: "ChatGPT, Perplexity, 뤼튼 같은 AI가 내 콘텐츠를 직접 답변으로 인용하도록 최적화하는 AEO의 핵심 개념과 실전 전략.", category: "AEO", author: "서치튠 블로거", date: "2026-04-01" },
  { slug: "naver-search-advisor-guide", title: "네이버 서치어드바이저 완벽 가이드 2026", excerpt: "네이버 서치어드바이저 등록부터 사이트맵 제출, 크롤링 최적화까지 실전 설정 가이드.", category: "가이드", author: "서치튠 블로거", date: "2026-03-28" },
  { slug: "naver-seo-optimization-tips", title: "네이버 SEO 최적화 핵심 팁 7가지", excerpt: "네이버 검색에서 상위 노출되기 위한 핵심 SEO 최적화 전략 7가지.", category: "SEO", author: "서치튠 블로거", date: "2026-03-25" },
  { slug: "naver-cue-geo-strategy", title: "네이버 Cue: 시대의 GEO 전략", excerpt: "네이버 Cue: AI 검색에서 브랜드와 콘텐츠가 인용되도록 준비하는 GEO 전략.", category: "GEO", author: "서치튠 블로거", date: "2026-03-22" },
  { slug: "cafe24-seo-optimization-guide", title: "카페24 SEO 최적화 완벽 가이드 2026", excerpt: "카페24 쇼핑몰의 SEO를 극대화하는 실전 가이드.", category: "가이드", author: "서치튠 블로거", date: "2026-03-19" },
  { slug: "imweb-seo-guide", title: "아임웹 SEO 완벽 가이드 2026", excerpt: "아임웹 사이트의 검색 노출을 극대화하는 SEO 최적화 가이드.", category: "가이드", author: "서치튠 블로거", date: "2026-03-16" },
];

// ── 4. Simple markdown → HTML ───────────────────────────────────────
function mdToHtml(md) {
  if (!md) return "";
  const lines = md.split("\n");
  const out = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      if (inList) { out.push("</ul>"); inList = false; }
      continue;
    }
    if (line.startsWith("### ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h3>${esc(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<h2>${esc(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("> ")) {
      if (inList) { out.push("</ul>"); inList = false; }
      out.push(`<blockquote>${esc(line.slice(2))}</blockquote>`);
      continue;
    }
    if (line.startsWith("- ")) {
      if (!inList) { out.push("<ul>"); inList = true; }
      out.push(`<li>${inlineF(line.slice(2))}</li>`);
      continue;
    }
    if (inList) { out.push("</ul>"); inList = false; }
    out.push(`<p>${inlineF(line)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineF(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

// ── 5. Read dist/index.html to extract asset tags ───────────────────
function getAssetTags() {
  const indexHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf-8");
  // Extract all <link rel="stylesheet" ...> and <script ...> from <head> and <body>
  const cssLinks = [...indexHtml.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(m => m[0]);
  const moduleScripts = [...indexHtml.matchAll(/<script[^>]+type="module"[^>]*>[^<]*<\/script>/g)].map(m => m[0]);
  const preloads = [...indexHtml.matchAll(/<link[^>]+rel="modulepreload"[^>]*>/g)].map(m => m[0]);
  return { cssLinks, moduleScripts, preloads };
}

// ── 6. Generate HTML for a post ─────────────────────────────────────
function generateHtml(post, assets) {
  const postUrl = `${SITE}/blog/${post.slug}`;
  const title = `${post.title} – 서치튠OS 블로그`;
  const ogImage = post.og_image || `${SITE}/og-image.png`;
  const contentHtml = mdToHtml(post.content || "");

  const articleJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    author: { "@type": "Person", name: post.author },
    publisher: { "@type": "Organization", name: "SearchTune OS", url: SITE },
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
    image: ogImage,
    articleSection: post.category,
    inLanguage: "ko",
  });

  const breadcrumbJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "블로그", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
    ],
  });

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(post.excerpt)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta name="date" content="${post.date}" />
  <meta name="author" content="${esc(post.author)}" />
  <link rel="canonical" href="${postUrl}" />
  <link rel="alternate" type="application/rss+xml" title="서치튠OS 블로그 RSS" href="${SITE}/rss.xml" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(post.excerpt)}" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="서치튠OS" />
  <meta property="og:locale" content="ko_KR" />
  <meta property="article:published_time" content="${post.date}" />
  <meta property="article:modified_time" content="${post.date}" />
  <meta property="article:author" content="${esc(post.author)}" />
  <meta property="article:section" content="${esc(post.category)}" />
  <meta property="article:tag" content="${esc(post.category)},SEO,AEO,GEO,검색최적화,서치튠OS" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(post.excerpt)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta name="google-site-verification" content="MEMyH-PWuk7VIwn_C-PigFKHJRuwjuq65k6HYnDOehs" />
  <meta name="naver-site-verification" content="d6a9e174a1839bf56c1ab85d7ba0c3241c0eda31" />
  <link rel="preload" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" /></noscript>
  <script type="application/ld+json">${articleJsonLd}</script>
  <script type="application/ld+json">${breadcrumbJsonLd}</script>
  ${assets.cssLinks.join("\n  ")}
  ${assets.preloads.join("\n  ")}
</head>
<body>
  <div id="root">
    <div style="max-width:720px;margin:2rem auto;padding:1rem;font-family:sans-serif;color:#222">
      <nav style="margin-bottom:1.5rem"><a href="/blog" style="color:#666;text-decoration:none">← 블로그</a></nav>
      <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:bold;background:#f0f0f5;color:#555;margin-bottom:8px">${esc(post.category)}</span>
      <h1 style="font-size:1.8rem;font-weight:800;line-height:1.3;margin-bottom:0.5rem">${esc(post.title)}</h1>
      <p style="color:#666;font-size:0.9rem;margin-bottom:1.5rem">${esc(post.author)} · ${post.date}${post.read_time ? ` · ${post.read_time} 읽기` : ""}</p>
      <article>${contentHtml || `<p>${esc(post.excerpt)}</p>`}</article>
    </div>
  </div>
  ${assets.moduleScripts.join("\n  ")}
</body>
</html>`;
}

// ── 7. Main ─────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(DIST)) {
    console.warn("[prerender] dist/ not found, skipping");
    return;
  }

  const assets = getAssetTags();
  
  // Fetch DB posts, merge with static fallbacks
  const dbPosts = await fetchPosts();
  const slugSet = new Set();
  const allPosts = [];

  for (const p of dbPosts) {
    if (!slugSet.has(p.slug)) {
      slugSet.add(p.slug);
      allPosts.push(p);
    }
  }
  for (const p of STATIC_POSTS) {
    if (!slugSet.has(p.slug)) {
      slugSet.add(p.slug);
      allPosts.push(p);
    }
  }

  console.log(`[prerender] Generating ${allPosts.length} blog HTML files...`);

  for (const post of allPosts) {
    const dir = path.join(DIST, "blog", post.slug);
    fs.mkdirSync(dir, { recursive: true });
    const html = generateHtml(post, assets);
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf-8");
  }

  // Also generate /blog/index.html (listing page)
  const blogListDir = path.join(DIST, "blog");
  if (!fs.existsSync(path.join(blogListDir, "index.html"))) {
    const listHtml = generateBlogListHtml(allPosts, assets);
    fs.writeFileSync(path.join(blogListDir, "index.html"), listHtml, "utf-8");
  }

  // Generate /rss.xml
  const rssXml = generateRssXml(allPosts);
  fs.writeFileSync(path.join(DIST, "rss.xml"), rssXml, "utf-8");
  console.log("[prerender] rss.xml generated");

  console.log(`[prerender] Done! ${allPosts.length} pages generated.`);
}

function generateBlogListHtml(posts, assets) {
  const title = "블로그 – 서치튠OS | SEO·AEO·GEO 실전 가이드";
  const desc = "SEO·AEO·GEO에 대해 알아야 할 모든 것. 서치튠OS가 제공하는 실전 가이드와 인사이트를 확인하세요.";

  const listItems = posts
    .map(p => `<li><a href="/blog/${p.slug}">${esc(p.title)}</a> <span style="color:#999">(${p.date})</span><br/><span style="color:#666;font-size:0.9rem">${esc(p.excerpt)}</span></li>`)
    .join("\n      ");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${SITE}/blog" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${SITE}/blog" />
  <meta property="og:type" content="website" />
  <meta name="google-site-verification" content="MEMyH-PWuk7VIwn_C-PigFKHJRuwjuq65k6HYnDOehs" />
  <meta name="naver-site-verification" content="d6a9e174a1839bf56c1ab85d7ba0c3241c0eda31" />
  <link rel="preload" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  ${assets.cssLinks.join("\n  ")}
  ${assets.preloads.join("\n  ")}
</head>
<body>
  <div id="root">
    <div style="max-width:720px;margin:2rem auto;padding:1rem;font-family:sans-serif;color:#222">
      <h1 style="font-size:1.8rem;font-weight:800">블로그</h1>
      <p style="color:#666;margin-bottom:1.5rem">SEO · AEO · GEO에 대해 알아야 할 모든 것.</p>
      <ul style="list-style:none;padding:0">
      ${listItems}
      </ul>
    </div>
  </div>
  ${assets.moduleScripts.join("\n  ")}
</body>
</html>`;
}

main().catch(console.error);

// ── 8. RSS XML generator ───────────────────────────────────────────
function generateRssXml(posts) {
  const items = posts.map(p => {
    const url = `${SITE}/blog/${p.slug}`;
    const pubDate = new Date(p.date).toUTCString();
    return `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${p.excerpt}]]></description>
      <category>${p.category || "SEO"}</category>
      <author>${p.author || "서치튠 블로거"}</author>
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>서치튠OS 블로그 – SEO·AEO·GEO 실전 가이드</title>
    <link>${SITE}/blog</link>
    <description>SEO, AEO, GEO에 대해 알아야 할 모든 것. 서치튠OS가 제공하는 실전 가이드와 인사이트.</description>
    <language>ko</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;
}
