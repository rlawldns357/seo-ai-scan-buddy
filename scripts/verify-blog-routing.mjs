/**
 * Routing test: every blog slug must have dist/blog/{slug}.html (canonical full
 * body) with canonical + og:url = https://searchtuneos.com/blog/{slug}.html.
 * The sibling dist/blog/{slug}/index.html should exist as a redirect stub
 * (meta-refresh + JS) pointing at the canonical .html.
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
  const refresh = html.match(/<meta\s+http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i)?.[1] ?? null;
  return { canonical, ogUrl, ogImage, refresh };
}

function listSlugs() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const slugs = new Set();
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith(".html") && entry.name !== "index.html") {
      slugs.add(entry.name.replace(/\.html$/, ""));
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
    const dotHtml = path.join(BLOG_DIR, `${slug}.html`);
    const stubHtml = path.join(BLOG_DIR, slug, "index.html");
    const expected = `${SITE}/blog/${slug}.html`;
    const errors = [];

    if (!fs.existsSync(dotHtml) || !fs.statSync(dotHtml).isFile()) {
      errors.push(`missing canonical file at /blog/${slug}.html`);
    } else {
      const meta = readMeta(dotHtml);
      if (meta.canonical !== expected) errors.push(`canonical "${meta.canonical}" ≠ "${expected}"`);
      if (meta.ogUrl !== expected) errors.push(`og:url "${meta.ogUrl}" ≠ "${expected}"`);
      if (!meta.ogImage) errors.push(`missing og:image`);
    }

    if (!fs.existsSync(stubHtml) || !fs.statSync(stubHtml).isFile()) {
      errors.push(`missing redirect stub at /blog/${slug}/index.html`);
    } else {
      const meta = readMeta(stubHtml);
      if (meta.canonical !== expected) errors.push(`stub canonical "${meta.canonical}" ≠ "${expected}"`);
      if (!meta.refresh || !meta.refresh.endsWith(`/blog/${slug}.html`)) {
        errors.push(`stub does not meta-refresh to "/blog/${slug}.html" (got "${meta.refresh}")`);
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

  console.log(`[verify-routing] ✅ All ${slugs.length} blog slugs canonical at /blog/{slug}.html with redirect stub.`);
}

main();
