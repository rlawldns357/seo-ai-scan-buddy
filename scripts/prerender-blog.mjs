/**
 * Post-build script: generates static HTML for each blog post
 * so that search engine crawlers (especially Naver Yeti) can
 * index content without executing JavaScript.
 *
 * Runs after `vite build` and writes:
 *   - dist/blog/{slug}.html       → canonical full article (Lovable serves directly)
 *   - dist/blog/{slug}/index.html → redirect stub → /blog/{slug}.html
 * Canonical/share URLs use .html because Lovable hosting's SPA fallback
 * returns the homepage HTML for any extensionless deep path, which breaks
 * per-route SEO. .html files are served as-is.
 */

import fs from "fs";
import path from "path";
import vm from "vm";
import ts from "typescript";

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
// Auto-parsed from src/data/blogPosts.ts so legacy client-side slugs
// (e.g. seo-vs-aeo-vs-geo) also get a canonical .html file generated.
function loadStaticPostsFromSource() {
  try {
    const src = fs.readFileSync(path.resolve("src/data/blogPosts.ts"), "utf-8");
    const js = ts.transpileModule(src, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    const sandbox = { exports: {}, module: { exports: {} }, console };
    sandbox.module.exports = sandbox.exports;
    vm.runInNewContext(js, sandbox, { timeout: 2000, filename: "blogPosts.ts" });
    const posts = sandbox.exports.blogPosts || sandbox.module.exports.blogPosts || [];

    return posts.map((post) => ({
      ...post,
      read_time: post.read_time || post.readTime,
      og_image: post.og_image || post.ogImage,
    }));
  } catch (e) {
    console.warn("[prerender] Failed to parse blogPosts.ts:", e.message);
    return [];
  }
}
const STATIC_POSTS = loadStaticPostsFromSource();
console.log(`[prerender] Loaded ${STATIC_POSTS.length} static posts from blogPosts.ts`);

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
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineF(s) {
  return esc(s)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
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
// og:image는 반드시 PNG여야 카카오톡 미리보기가 뜸 (SVG는 카톡 미지원).
// post.og_image가 .svg로 끝나거나 비어있으면 og-svg edge function의 PNG 폴백 사용.
function resolveOgImage(post) {
  const supaProj = (env.VITE_SUPABASE_PROJECT_ID || "").trim();
  const fnBase = supaProj
    ? `https://${supaProj}.supabase.co/functions/v1/og-svg`
    : `${SITE}/og-image.png`;
  const fallback = `${fnBase}?slug=${encodeURIComponent(post.slug)}&title=${encodeURIComponent(post.title || "SearchTune OS")}&category=${encodeURIComponent(post.category || "가이드")}`;
  if (!post.og_image) return fallback;
  // .svg URL은 카톡 미리보기에서 안 뜨므로 PNG endpoint로 강제 치환
  if (/\.svg(\?|$)/i.test(post.og_image)) return fallback;
  return post.og_image;
}

// Canonical URL form: /blog/{slug}.html. Lovable host serves .html files
// directly, but clean URLs (/blog/{slug}) fall back to root /index.html
// (homepage HTML), which breaks per-route SEO. So .html is the canonical
// shipping format. We also emit dist/blog/{slug}/index.html as a redirect
// stub so any crawler that reaches the clean URL ends up on the canonical.
function blogHtmlPath(slug) {
  return `/blog/${slug}.html`;
}

function blogHtmlUrl(slug) {
  return `${SITE}${blogHtmlPath(slug)}`;
}

function generateHtml(post, assets, related = []) {
  const postUrl = blogHtmlUrl(post.slug);
  const title = `${post.title} – 서치튠OS 블로그`;
  const ogImage = resolveOgImage(post);
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
      ${related.length ? `<aside style="margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid #eee">
        <h2 style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem">관련 글</h2>
        <ul style="list-style:none;padding:0;margin:0">
          ${related.map(r => `<li style="margin-bottom:0.5rem"><a href="${blogHtmlPath(r.slug)}" style="color:#3056d3;text-decoration:none">${esc(r.title)}</a></li>`).join("\n          ")}
        </ul>
      </aside>` : ""}
      <footer style="margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:0.85rem;color:#888">
        <a href="/" style="color:#666;margin-right:1rem">홈</a>
        <a href="/blog" style="color:#666;margin-right:1rem">블로그 전체</a>
        <a href="/about" style="color:#666">서치튠OS 소개</a>
      </footer>
    </div>
  </div>
  ${assets.moduleScripts.join("\n  ")}
</body>
</html>`;
}

// ── 6b. Redirect stub for /blog/{slug}/index.html ───────────────────
// Goal: zero duplicate body. Crawlers see canonical → .html only.
// Browsers get http-equiv refresh + JS replace fallback.
function generateRedirectStub(post) {
  const postUrl = blogHtmlUrl(post.slug);
  const postPath = blogHtmlPath(post.slug);
  const title = `${post.title} – 서치튠OS 블로그`;
  const ogImage = resolveOgImage(post);
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(post.excerpt)}" />
  <link rel="canonical" href="${postUrl}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(post.excerpt)}" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:type" content="article" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:site_name" content="서치튠OS" />
  <meta property="og:locale" content="ko_KR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(post.excerpt)}" />
  <meta name="twitter:image" content="${ogImage}" />
  <meta http-equiv="refresh" content="0; url=${postPath}" />
  <script>location.replace(${JSON.stringify(postPath)});</script>
</head>
<body>
  <a href="${postPath}">canonical article로 이동</a>
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

  // Static posts from src/data/blogPosts.ts are the source of truth for
  // curated legacy slugs. DB posts are appended only when a slug is absent.
  for (const p of STATIC_POSTS) {
    if (!slugSet.has(p.slug)) {
      slugSet.add(p.slug);
      allPosts.push(p);
    }
  }
  for (const p of dbPosts) {
    if (!slugSet.has(p.slug)) {
      slugSet.add(p.slug);
      allPosts.push(p);
    }
  }

  console.log(`[prerender] Generating ${allPosts.length} blog HTML files...`);

  // Build a "related posts" pool (latest 5 excluding current)
  const relatedPool = allPosts.slice(0, 20);

  const blogDir = path.join(DIST, "blog");
  fs.mkdirSync(blogDir, { recursive: true });

  for (const post of allPosts) {
    const related = relatedPool.filter(p => p.slug !== post.slug).slice(0, 5);
    const html = generateHtml(post, assets, related);

    // CANONICAL: /blog/{slug}.html holds the full article body + canonical
    // meta. Lovable host serves .html files directly.
    fs.writeFileSync(path.join(blogDir, `${post.slug}.html`), html, "utf-8");

    // REDIRECT STUB: /blog/{slug}/index.html — if a crawler/user reaches
    // the clean URL form, redirect to canonical .html via meta-refresh + JS.
    const slugDir = path.join(blogDir, post.slug);
    fs.mkdirSync(slugDir, { recursive: true });
    fs.writeFileSync(path.join(slugDir, "index.html"), generateRedirectStub(post), "utf-8");
  }

  // Always regenerate /blog/index.html (listing page) so it stays fresh
  const listHtml = generateBlogListHtml(allPosts, assets);
  fs.writeFileSync(path.join(blogDir, "index.html"), listHtml, "utf-8");

  // Generate static /about/index.html with key copy + sitemap-style internal links
  const aboutHtml = generateAboutHtml(allPosts.slice(0, 6), assets);
  const aboutDir = path.join(DIST, "about");
  fs.mkdirSync(aboutDir, { recursive: true });
  fs.writeFileSync(path.join(aboutDir, "index.html"), aboutHtml, "utf-8");
  console.log("[prerender] /about/index.html generated");

  // Generate static /naver-store/index.html so crawlers see page-specific meta
  const naverHtml = generateNaverStoreHtml(assets);
  const naverDir = path.join(DIST, "naver-store");
  fs.mkdirSync(naverDir, { recursive: true });
  fs.writeFileSync(path.join(naverDir, "index.html"), naverHtml, "utf-8");
  console.log("[prerender] /naver-store/index.html generated");

  // Inject internal "최신 블로그" links into root index.html noscript area for crawlers
  injectHomeLinks(allPosts.slice(0, 8));

  // Generate /rss.xml
  const rssXml = generateRssXml(allPosts);
  fs.writeFileSync(path.join(DIST, "rss.xml"), rssXml, "utf-8");
  console.log("[prerender] rss.xml generated");

  console.log(`[prerender] Done! ${allPosts.length} pages generated.`);
}

function generateBlogListHtml(posts, assets) {
  const title = "서치튠OS 블로그 – SEO·AEO·GEO 실전 가이드";
  const desc = "SEO, AEO, GEO에 대해 알아야 할 모든 것. 서치튠OS가 제공하는 실전 가이드와 인사이트를 확인하세요.";

  const listItems = posts
    .map(p => `<li><a href="${blogHtmlPath(p.slug)}">${esc(p.title)}</a> <span style="color:#999">(${p.date})</span><br/><span style="color:#666;font-size:0.9rem">${esc(p.excerpt)}</span></li>`)
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
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="google-site-verification" content="MEMyH-PWuk7VIwn_C-PigFKHJRuwjuq65k6HYnDOehs" />
  <meta name="naver-site-verification" content="d6a9e174a1839bf56c1ab85d7ba0c3241c0eda31" />
  <link rel="preload" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
  ${assets.cssLinks.join("\n  ")}
  ${assets.preloads.join("\n  ")}
</head>
<body>
  <div id="root">
    <div style="max-width:720px;margin:2rem auto;padding:1rem;font-family:sans-serif;color:#222">
      <h1 style="font-size:1.8rem;font-weight:800">서치튠OS 블로그</h1>
      <p style="color:#666;margin-bottom:1.5rem">SEO · AEO · GEO에 대해 알아야 할 모든 것. 실전 가이드와 인사이트를 공유합니다.</p>
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
    const url = blogHtmlUrl(p.slug);
    const pubDate = new Date(p.date).toUTCString();
    return `    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>${url}</link>
      <guid>${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${p.excerpt}]]></description>
      <category>${p.category || "SEO"}</category>
      <author>hello@searchtuneos.com (${p.author || "서치튠 블로거"})</author>
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

// ── 9. About page generator ───────────────────────────────────────
function generateAboutHtml(latestPosts, assets) {
  const title = "서치튠OS 소개 – AI 검색 최적화 진단 도구";
  const desc = "서치튠OS는 SEO, AEO, GEO 관점에서 웹사이트의 AI 검색 준비도를 진단하고 개선 방향을 제안하는 검색 최적화 도구입니다.";
  const orgJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: title,
    description: desc,
    url: `${SITE}/about`,
    inLanguage: "ko",
    isPartOf: { "@type": "WebSite", name: "서치튠OS", url: SITE },
  });
  const blogLinks = latestPosts
    .map(p => `<li><a href="${blogHtmlPath(p.slug)}" style="color:#3056d3;text-decoration:none">${esc(p.title)}</a></li>`)
    .join("\n        ");

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${SITE}/about" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${SITE}/about" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="서치튠OS" />
  <meta property="og:locale" content="ko_KR" />
  <meta name="google-site-verification" content="MEMyH-PWuk7VIwn_C-PigFKHJRuwjuq65k6HYnDOehs" />
  <meta name="naver-site-verification" content="d6a9e174a1839bf56c1ab85d7ba0c3241c0eda31" />
  <script type="application/ld+json">${orgJsonLd}</script>
  ${assets.cssLinks.join("\n  ")}
  ${assets.preloads.join("\n  ")}
</head>
<body>
  <div id="root">
    <div style="max-width:720px;margin:2rem auto;padding:1rem;font-family:sans-serif;color:#222">
      <nav style="margin-bottom:1.5rem"><a href="/" style="color:#666;text-decoration:none">← 홈</a></nav>
      <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:0.5rem">서치튠OS 소개</h1>
      <p style="color:#444;line-height:1.7">서치튠OS(SearchTune OS)는 2025년 출시된 한국어 기반 AI 검색 진단 도구로, URL만 입력하면 SEO·AEO·GEO 3개 축의 점수를 즉시 분석합니다.</p>
      <h2 style="font-size:1.2rem;margin-top:2rem">3가지 진단 축</h2>
      <ul style="line-height:1.8">
        <li><strong>SEO</strong> – 메타 태그, 구조화 데이터, Canonical, Sitemap 등 기술 SEO</li>
        <li><strong>AEO</strong> – ChatGPT·Perplexity·뤼튼 등 AI 답변 엔진 인용 가능성</li>
        <li><strong>GEO</strong> – Google AI Overviews·Naver Cue: 등 생성형 검색 출처 인용 준비도</li>
      </ul>
      <h2 style="font-size:1.2rem;margin-top:2rem">최신 블로그</h2>
      <ul style="line-height:1.8">
        ${blogLinks}
      </ul>
      <footer style="margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:0.85rem;color:#888">
        <a href="/" style="color:#666;margin-right:1rem">홈</a>
        <a href="/blog" style="color:#666">블로그 전체</a>
      </footer>
    </div>
  </div>
  ${assets.moduleScripts.join("\n  ")}
</body>
</html>`;
}

// ── 10. Inject latest blog links into root index.html for crawler discovery
function injectHomeLinks(latestPosts) {
  const indexPath = path.join(DIST, "index.html");
  if (!fs.existsSync(indexPath)) return;
  let html = fs.readFileSync(indexPath, "utf-8");
  if (html.includes("data-prerender-home-links")) return; // idempotent

  const linksHtml = `<section data-prerender-home-links style="display:none">
    <h2>최신 블로그</h2>
    <ul>
      ${latestPosts.map(p => `<li><a href="${blogHtmlPath(p.slug)}">${esc(p.title)}</a></li>`).join("\n      ")}
    </ul>
    <p><a href="/blog">블로그 전체 보기</a> · <a href="/about">서치튠OS 소개</a></p>
  </section>`;

  // Inject right before </noscript> closing tag (visible to crawlers without JS)
  html = html.replace(/<\/noscript>/, `${linksHtml}\n    </noscript>`);
  fs.writeFileSync(indexPath, html, "utf-8");
  console.log("[prerender] Injected home internal links for crawlers");
}

// ── 11. Naver Store landing generator ─────────────────────────────
function generateNaverStoreHtml(assets) {
  const title = "네이버 스마트스토어 SEO 진단 – 서치튠OS";
  const desc = "네이버 스마트스토어의 검색 노출 상태를 SEO, AEO, GEO 관점에서 점검하고 개선 방향을 확인하세요.";
  const url = `${SITE}/naver-store`;
  const pageJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description: desc,
    url,
    inLanguage: "ko",
    isPartOf: { "@type": "WebSite", name: "서치튠OS", url: SITE },
  });
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="${url}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="서치튠OS" />
  <meta property="og:locale" content="ko_KR" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="google-site-verification" content="MEMyH-PWuk7VIwn_C-PigFKHJRuwjuq65k6HYnDOehs" />
  <meta name="naver-site-verification" content="d6a9e174a1839bf56c1ab85d7ba0c3241c0eda31" />
  <script type="application/ld+json">${pageJsonLd}</script>
  ${assets.cssLinks.join("\n  ")}
  ${assets.preloads.join("\n  ")}
</head>
<body>
  <div id="root">
    <div style="max-width:720px;margin:2rem auto;padding:1rem;font-family:sans-serif;color:#222">
      <nav style="margin-bottom:1.5rem"><a href="/" style="color:#666;text-decoration:none">← 홈</a></nav>
      <h1 style="font-size:1.8rem;font-weight:800;margin-bottom:0.5rem">네이버 스마트스토어 SEO 진단</h1>
      <p style="color:#444;line-height:1.7">네이버 스마트스토어의 검색 노출 상태를 SEO, AEO, GEO 관점에서 점검하고 개선 방향을 확인하세요. 브랜드 스토어·스마트스토어의 검색 권위 누수율, AI 답변 인용 가능성, 외부 콘텐츠 점유율을 무료로 진단합니다.</p>
      <h2 style="font-size:1.2rem;margin-top:2rem">3가지 진단 항목</h2>
      <ul style="line-height:1.8">
        <li><strong>권위 누수율</strong> – 검색 권위 중 naver.com에 적립돼 회수 불가능한 비율</li>
        <li><strong>AI 인용 가능성</strong> – ChatGPT·Perplexity가 내 브랜드를 답변에 인용할 준비도</li>
        <li><strong>외부 채널 점유율</strong> – 블로그·카페·웹문서 등 외부 채널의 브랜드 언급 분포</li>
      </ul>
      <footer style="margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:0.85rem;color:#888">
        <a href="/" style="color:#666;margin-right:1rem">홈</a>
        <a href="/about" style="color:#666;margin-right:1rem">서치튠OS 소개</a>
        <a href="/blog" style="color:#666">블로그</a>
      </footer>
    </div>
  </div>
  ${assets.moduleScripts.join("\n  ")}
</body>
</html>`;
}
