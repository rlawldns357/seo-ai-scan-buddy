/**
 * Routing test: every blog slug must have dist/blog/{slug}/index.html
 * (canonical full body) with canonical + og:url = https://searchtuneos.com/blog/{slug}.
 * The sibling dist/blog/{slug}.html may exist only as a legacy redirect stub
 * pointing back to the clean URL.
 *
 * Fails the build (exit 1) on any mismatch.
 */

import fs from "fs";
import path from "path";

const DIST = path.resolve("dist");
const BLOG_DIR = path.join(DIST, "blog");
const SITE = "https://searchtuneos.com";

const REQUIRED_BODY_MARKERS = {
  "what-is-aeo": ["TL;DR", "Schema.org FAQPage", "Google Search Central"],
  "geo-generative-engine-optimization": ["TL;DR", "Google Search Central", "/blog/ai-crawler-access"],
  "faq-schema-aeo-boost": ["TL;DR", "Schema.org FAQPage", "/blog/seo-vs-aeo-vs-geo"],
  "ai-crawler-access": ["TL;DR", "OpenAI GPTBot", "/blog/geo-generative-engine-optimization"],
};

function readMeta(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  const canonical = html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? null;
  const ogUrl = html.match(/<meta\s+property=["']og:url["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null;
  const ogImage = html.match(/<meta\s+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null;
  const refresh = html.match(/<meta\s+http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i)?.[1] ?? null;
  return { canonical, ogUrl, ogImage, refresh };
}

function listSlugs() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const slugs = new Set();
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      slugs.add(entry.name);
    }
  }
  return [...slugs];
}

function main() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.warn("[verify-routing] dist/blog not found, skipping");
    return;
  }

  const slugs = listSlugs();
  if (slugs.length === 0) {
    console.warn("[verify-routing] No blog slugs found, skipping");
    return;
  }

  let failed = 0;
  for (const slug of slugs) {
    const canonicalHtml = path.join(BLOG_DIR, slug, "index.html");
    const legacyHtml = path.join(BLOG_DIR, `${slug}.html`);
    const expected = `${SITE}/blog/${slug}`;
    const errors = [];

    if (!fs.existsSync(canonicalHtml) || !fs.statSync(canonicalHtml).isFile()) {
      errors.push(`missing canonical file at /blog/${slug}/index.html`);
    } else {
      const html = fs.readFileSync(canonicalHtml, "utf-8");
      const meta = readMeta(canonicalHtml);
      if (meta.canonical !== expected) errors.push(`canonical "${meta.canonical}" ≠ "${expected}"`);
      if (meta.ogUrl !== expected) errors.push(`og:url "${meta.ogUrl}" ≠ "${expected}"`);
      if (!meta.ogImage) errors.push(`missing og:image`);
      for (const marker of REQUIRED_BODY_MARKERS[slug] || []) {
        if (!html.includes(marker)) errors.push(`missing prerender body marker "${marker}"`);
      }
    }

    if (!fs.existsSync(legacyHtml) || !fs.statSync(legacyHtml).isFile()) {
      errors.push(`missing legacy redirect stub at /blog/${slug}.html`);
    } else {
      const meta = readMeta(legacyHtml);
      if (meta.canonical !== expected) errors.push(`stub canonical "${meta.canonical}" ≠ "${expected}"`);
      if (!meta.refresh || !meta.refresh.endsWith(`/blog/${slug}`)) {
        errors.push(`stub does not meta-refresh to "/blog/${slug}" (got "${meta.refresh}")`);
      }
    }

    if (errors.length) {
      failed++;
      console.error(`[verify-routing] ❌ ${slug}`);
      for (const e of errors) console.error(`                 - ${e}`);
    }
  }

  if (failed > 0) {
    console.error(`[verify-routing] FAILED: ${failed}/${slugs.length} slugs have routing inconsistencies.`);
    process.exit(1);
  }

  console.log(`[verify-routing] ✅ All ${slugs.length} blog slugs canonical at clean /blog/{slug} with legacy redirect stub.`);
}

main();
