/**
 * Routing compatibility test:
 * For every blog slug, ensures that both URL shapes
 *   - /blog/{slug}/index.html (canonical Kakao-safe URL)
 *   - /blog/{slug}.html   (legacy / explicit extension)
 * resolve to the SAME canonical and og:url.
 *
 * CRITICAL: We do NOT write an extensionless physical file at dist/blog/{slug}
 * because Lovable hosting may serve some of those as application/octet-stream,
 * which Kakao rejects as Invalid URL.
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
  const ogTitle = html.match(/<meta\s+property=["']og:title["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null;
  const ogImage = html.match(/<meta\s+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? null;
  return { canonical, ogUrl, ogTitle, ogImage };
}

function listSlugs() {
  if (!fs.existsSync(BLOG_DIR)) return [];
  const slugs = new Set();
  for (const entry of fs.readdirSync(BLOG_DIR, { withFileTypes: true })) {
    if (entry.isDirectory() && fs.existsSync(path.join(BLOG_DIR, entry.name, "index.html"))) {
      slugs.add(entry.name);
    } else if (entry.isFile() && entry.name.endsWith(".html") && entry.name !== "index.html") {
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
    const indexHtml = path.join(BLOG_DIR, slug, "index.html");
    const unsafeSlugFile = path.join(BLOG_DIR, slug);
    const dotHtml = path.join(BLOG_DIR, `${slug}.html`);
    const expected = `${SITE}/blog/${slug}/`;
    const errors = [];

    // Canonical index.html must exist, and the unsafe extensionless file must not.
    if (!fs.existsSync(indexHtml) || !fs.statSync(indexHtml).isFile()) {
      errors.push(`missing canonical file at /blog/${slug}/index.html`);
    }
    if (fs.existsSync(unsafeSlugFile) && fs.statSync(unsafeSlugFile).isFile()) {
      errors.push(`unsafe extensionless file exists at /blog/${slug}`);
    }
    if (!fs.existsSync(dotHtml)) errors.push(`missing /blog/${slug}.html`);

    if (errors.length === 0) {
      const a = readMeta(indexHtml);
      const b = readMeta(dotHtml);

      if (a.canonical !== expected) errors.push(`index.html canonical "${a.canonical}" ≠ "${expected}"`);
      if (b.canonical !== expected) errors.push(`.html canonical "${b.canonical}" ≠ "${expected}"`);
      if (a.ogUrl !== expected) errors.push(`index.html og:url "${a.ogUrl}" ≠ "${expected}"`);
      if (b.ogUrl !== expected) errors.push(`.html og:url "${b.ogUrl}" ≠ "${expected}"`);

      if (a.canonical !== b.canonical) errors.push(`canonical mismatch between variants: "${a.canonical}" vs "${b.canonical}"`);
      if (a.ogUrl !== b.ogUrl) errors.push(`og:url mismatch between variants: "${a.ogUrl}" vs "${b.ogUrl}"`);
      if (a.ogTitle !== b.ogTitle) errors.push(`og:title mismatch between variants`);
      if (a.ogImage !== b.ogImage) errors.push(`og:image mismatch between variants`);
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

  console.log(`[verify-routing] ✅ All ${slugs.length} blog slugs are consistent across /blog/{slug}/index.html and /blog/{slug}.html`);
}

main();
