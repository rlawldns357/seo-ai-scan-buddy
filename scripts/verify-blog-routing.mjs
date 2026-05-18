/**
 * Routing test: every blog slug must have dist/blog/{slug}/index.html with
 * canonical + og:url pointing to the clean URL https://searchtuneos.com/blog/{slug}.
 * Cloudflare 301s legacy /blog/{slug}.html → /blog/{slug}, so we no longer emit
 * a .html sibling file.
 *
 * Fails the build (exit 1) on any mismatch.
 */

import fs from "fs";
import path from "path";

const DIST = path.resolve("dist");
const BLOG_DIR = path.join(DIST, "blog");
const SITE = "https://searchtuneos.com";

function readMeta(filePath) {
  const html = fs.readFileSync(filePath, "utf-8");
  const canonical = html.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? null;
  const ogUrl = html.match(/<meta\s+property=["']og:url["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null;
  const ogImage = html.match(/<meta\s+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null;
  return { canonical, ogUrl, ogImage };
}

function listSlugs() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const slugs = new Set();
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && fs.existsSync(path.join(BLOG_DIR, entry.name, "index.html"))) {
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
    const indexHtml = path.join(BLOG_DIR, slug, "index.html");
    const dotHtml = path.join(BLOG_DIR, `${slug}.html`);
    const expected = `${SITE}/blog/${slug}`;
    const errors = [];

    if (!fs.existsSync(indexHtml) || !fs.statSync(indexHtml).isFile()) {
      errors.push(`missing canonical file at /blog/${slug}/index.html`);
    }
    if (fs.existsSync(dotHtml) && fs.statSync(dotHtml).isFile()) {
      errors.push(`legacy /blog/${slug}.html file still present (Cloudflare handles 301, should not be emitted)`);
    }

    if (errors.length === 0) {
      const meta = readMeta(indexHtml);
      if (meta.canonical !== expected) errors.push(`canonical "${meta.canonical}" ≠ "${expected}"`);
      if (meta.ogUrl !== expected) errors.push(`og:url "${meta.ogUrl}" ≠ "${expected}"`);
      if (!meta.ogImage) errors.push(`missing og:image`);
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

  console.log(`[verify-routing] ✅ All ${slugs.length} blog slugs use clean /blog/{slug} canonical via /blog/{slug}/index.html`);
}

main();
