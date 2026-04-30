/**
 * Post-build verification: ensures every prerendered blog HTML
 * contains correct OG metadata and that og:url matches its physical path.
 *
 * Fails the build (exit 1) if any required tag is missing or mismatched.
 */

import fs from "fs";
import path from "path";

const DIST = path.resolve("dist");
const BLOG_DIR = path.join(DIST, "blog");
const SITE = "https://searchtuneos.com";

const REQUIRED_TAGS = [
  { name: "title", re: /<title>[^<]+<\/title>/i },
  { name: "meta description", re: /<meta\s+name=["']description["'][^>]*content=["'][^"']+["'][^>]*>/i },
  { name: "canonical", re: /<link\s+rel=["']canonical["'][^>]*href=["'][^"']+["'][^>]*>/i },
  { name: "og:title", re: /<meta\s+property=["']og:title["'][^>]*content=["'][^"']+["'][^>]*>/i },
  { name: "og:description", re: /<meta\s+property=["']og:description["'][^>]*content=["'][^"']+["'][^>]*>/i },
  { name: "og:url", re: /<meta\s+property=["']og:url["'][^>]*content=["'][^"']+["'][^>]*>/i },
  { name: "og:type", re: /<meta\s+property=["']og:type["'][^>]*content=["']article["'][^>]*>/i },
  { name: "og:image", re: /<meta\s+property=["']og:image["'][^>]*content=["'][^"']+["'][^>]*>/i },
  { name: "twitter:card", re: /<meta\s+name=["']twitter:card["'][^>]*content=["']summary_large_image["'][^>]*>/i },
  { name: "Article JSON-LD", re: /<script\s+type=["']application\/ld\+json["'][^>]*>[^<]*"@type"\s*:\s*"Article"/i },
];

function extractAttr(html, tagRe, attr) {
  const tag = html.match(tagRe);
  if (!tag) return null;
  const m = tag[0].match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
  return m ? m[1] : null;
}

function verifyFile(filePath, expectedUrl) {
  const html = fs.readFileSync(filePath, "utf-8");
  const errors = [];

  for (const { name, re } of REQUIRED_TAGS) {
    if (!re.test(html)) errors.push(`missing ${name}`);
  }

  // og:url must equal the canonical physical URL
  const ogUrl = extractAttr(html, /<meta\s+property=["']og:url["'][^>]*>/i, "content");
  if (ogUrl && ogUrl !== expectedUrl) {
    errors.push(`og:url mismatch: got "${ogUrl}", expected "${expectedUrl}"`);
  }

  // canonical must equal og:url
  const canonical = extractAttr(html, /<link\s+rel=["']canonical["'][^>]*>/i, "href");
  if (canonical && canonical !== expectedUrl) {
    errors.push(`canonical mismatch: got "${canonical}", expected "${expectedUrl}"`);
  }

  // og:image must be absolute http(s) URL (and not .svg, since Kakao won't render SVG)
  const ogImage = extractAttr(html, /<meta\s+property=["']og:image["'][^>]*>/i, "content");
  if (ogImage) {
    if (!/^https?:\/\//i.test(ogImage)) errors.push(`og:image not absolute: "${ogImage}"`);
    if (/\.svg(\?|$)/i.test(ogImage)) errors.push(`og:image is .svg (Kakao unsupported): "${ogImage}"`);
  }

  return errors;
}

function main() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.warn("[verify-og] dist/blog not found, skipping");
    return;
  }

  const files = fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".html") && f !== "index.html");

  if (files.length === 0) {
    console.warn("[verify-og] No blog HTML files to verify");
    return;
  }

  let failed = 0;
  for (const file of files) {
    const slug = file.replace(/\.html$/, "");
    const expectedUrl = `${SITE}/blog/${slug}.html`;
    const errors = verifyFile(path.join(BLOG_DIR, file), expectedUrl);
    if (errors.length) {
      failed++;
      console.error(`[verify-og] ❌ /blog/${file}`);
      for (const e of errors) console.error(`            - ${e}`);
    }
  }

  if (failed > 0) {
    console.error(`[verify-og] FAILED: ${failed}/${files.length} files have OG issues.`);
    process.exit(1);
  }

  console.log(`[verify-og] ✅ All ${files.length} blog pages have valid OG metadata.`);
}

main();
