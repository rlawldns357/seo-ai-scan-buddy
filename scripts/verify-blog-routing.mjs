/**
 * Routing compatibility test:
 * For every blog slug, ensures that both URL shapes
 *   - /blog/{slug}        (served via dist/blog/{slug}/index.html)
 *   - /blog/{slug}.html   (legacy / explicit extension)
 * resolve to the SAME canonical and og:url.
 *
 * CRITICAL: We do NOT write an extensionless physical file at dist/blog/{slug}
 * because hosts often serve such files without Content-Type: text/html, which
 * causes browsers to DOWNLOAD the file instead of rendering it.
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
    if (entry.isDirectory()) {
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
    const dirIndex = path.join(BLOG_DIR, slug, "index.html");
    const dotHtml = path.join(BLOG_DIR, `${slug}.html`);
    const stray = path.join(BLOG_DIR, slug);
    const expected = `${SITE}/blog/${slug}`;
    const errors = [];

    // Guard: a plain extensionless file would cause MIME-less downloads
    if (fs.existsSync(stray) && fs.statSync(stray).isFile()) {
      errors.push(`UNSAFE: extensionless physical file exists at /blog/${slug} — browsers may download it instead of rendering`);
    }
    if (!fs.existsSync(dirIndex)) errors.push(`missing /blog/${slug}/index.html`);
    if (!fs.existsSync(dotHtml)) errors.push(`missing /blog/${slug}.html`);

    if (errors.length === 0) {
      const a = readMeta(dirIndex);
      const b = readMeta(dotHtml);

      if (a.canonical !== expected) errors.push(`dir-index canonical "${a.canonical}" ≠ "${expected}"`);
      if (b.canonical !== expected) errors.push(`.html canonical "${b.canonical}" ≠ "${expected}"`);
      if (a.ogUrl !== expected) errors.push(`dir-index og:url "${a.ogUrl}" ≠ "${expected}"`);
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

  console.log(`[verify-routing] ✅ All ${slugs.length} blog slugs are consistent across /blog/{slug} and /blog/{slug}.html`);
}

main();
