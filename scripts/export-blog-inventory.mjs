import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://dmnrbmarbvirtymhszww.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbnJibWFyYnZpcnR5bWhzend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjM5MzMsImV4cCI6MjA4OTg5OTkzM30.oqj7ntlscycsC1aJ1XrHPyeT7804QctgSaCpczfokNY";
const SITE = "https://searchtuneos.com";
const OUT = "/mnt/documents/blog-migration";

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── 1. DB posts ───────────────────────────────────────────────
const { data: dbPosts, error } = await sb
  .from("blog_posts")
  .select("*")
  .eq("published", true)
  .order("date", { ascending: false });
if (error) throw error;

// ── 2. Static seed posts (blogPosts.ts) ───────────────────────
const { blogPosts: staticPosts } = await import(
  path.resolve("src/data/blogPosts.ts").replace(/\\/g, "/")
).catch(async () => {
  // tsx fallback: parse via dynamic transpile
  const src = fs.readFileSync("src/data/blogPosts.ts", "utf-8");
  // crude: eval the array — strip types and exports
  const m = src.match(/export const blogPosts[^=]*=\s*(\[[\s\S]*?\n\]);/);
  if (!m) throw new Error("blogPosts array not found");
  // Strip TS interfaces above; only need the literal
  const arr = eval(m[1]);
  return { blogPosts: arr };
});

// ── 3. Merge (dedupe by slug, DB wins) ────────────────────────
const bySlug = new Map();
for (const p of staticPosts) {
  bySlug.set(p.slug, {
    source: "static",
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    author: p.author,
    date: p.date,
    updated_at: p.date,
    thumbnail: p.thumbnail,
    og_image: p.ogImage || p.thumbnail,
    featured: !!p.featured,
    read_time: p.readTime,
    content: p.content || "",
    faqs: p.faqs || [],
    published: true,
  });
}
for (const p of dbPosts) {
  bySlug.set(p.slug, {
    source: "db",
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: p.category,
    author: p.author,
    date: p.date,
    updated_at: p.updated_at,
    thumbnail: p.thumbnail,
    og_image: p.og_image || p.thumbnail,
    featured: !!p.featured,
    read_time: p.read_time,
    content: p.content || "",
    faqs: p.faq_short || [],
    published: p.published,
  });
}

// ── 4. Enrich: URLs, tags, internal links ─────────────────────
const slugRe = /\/blog\/([a-zA-Z0-9\-]+)(?:\.html|\/)?/g;
const tagFromContent = (content) => {
  // pull keywords from H2/H3 headers as tag candidates (top 5)
  const heads = [...content.matchAll(/^##+\s+(.+)$/gm)].map((m) => m[1].trim());
  return heads.slice(0, 5);
};

const rows = [...bySlug.values()].map((p) => {
  const oldUrl = `${SITE}/blog/${p.slug}.html`;
  const newUrl = `${SITE}/blog/${p.slug}/`;
  const internal = new Set();
  if (p.content) {
    for (const m of p.content.matchAll(slugRe)) {
      if (m[1] !== p.slug) internal.add(`${SITE}/blog/${m[1]}/`);
    }
  }
  return {
    ...p,
    tags: tagFromContent(p.content),
    internal_links: [...internal],
    old_url: oldUrl,
    new_url: newUrl,
    canonical_url: oldUrl, // current canonical (.html)
  };
});

rows.sort((a, b) => (a.date < b.date ? 1 : -1));

// ── 5. Write JSON ─────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "blog-inventory.json"),
  JSON.stringify({ generated_at: new Date().toISOString(), total: rows.length, posts: rows }, null, 2),
);

// ── 6. CSV (inventory) ────────────────────────────────────────
const csvEscape = (v) => {
  if (v === null || v === undefined) return "";
  const s = Array.isArray(v) ? v.join(" | ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const cols = [
  "source", "slug", "title", "category", "author", "date", "updated_at",
  "featured", "read_time", "thumbnail", "og_image", "tags",
  "old_url", "new_url", "canonical_url", "internal_links",
  "excerpt", "published",
];
const csv = [
  cols.join(","),
  ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(",")),
].join("\n");
fs.writeFileSync(path.join(OUT, "blog-inventory.csv"), csv);

// ── 7. URL redirect map (CSV + JSON) ──────────────────────────
const redirects = rows.map((r) => ({
  old_url: r.old_url,
  old_path: `/blog/${r.slug}.html`,
  new_url: r.new_url,
  new_path: `/blog/${r.slug}/`,
  status: 301,
  slug: r.slug,
  title: r.title,
}));
fs.writeFileSync(path.join(OUT, "url-redirect-map.json"), JSON.stringify(redirects, null, 2));
const rcols = ["old_url", "old_path", "new_url", "new_path", "status", "slug", "title"];
fs.writeFileSync(
  path.join(OUT, "url-redirect-map.csv"),
  [rcols.join(","), ...redirects.map((r) => rcols.map((c) => csvEscape(r[c])).join(","))].join("\n"),
);

// ── 8. Content bodies (separate folder, markdown) ─────────────
const bodiesDir = path.join(OUT, "content");
fs.mkdirSync(bodiesDir, { recursive: true });
for (const r of rows) {
  const front = `---
slug: ${r.slug}
title: ${JSON.stringify(r.title)}
date: ${r.date}
updated_at: ${r.updated_at}
category: ${r.category}
author: ${JSON.stringify(r.author)}
excerpt: ${JSON.stringify(r.excerpt || "")}
thumbnail: ${r.thumbnail || ""}
og_image: ${r.og_image || ""}
featured: ${r.featured}
tags: [${(r.tags || []).map((t) => JSON.stringify(t)).join(", ")}]
old_url: ${r.old_url}
new_url: ${r.new_url}
canonical_url: ${r.canonical_url}
source: ${r.source}
---

`;
  fs.writeFileSync(path.join(bodiesDir, `${r.slug}.md`), front + (r.content || ""));
}

console.log(JSON.stringify({
  total: rows.length,
  db: rows.filter((r) => r.source === "db").length,
  static: rows.filter((r) => r.source === "static").length,
  outputs: [
    "blog-inventory.json", "blog-inventory.csv",
    "url-redirect-map.json", "url-redirect-map.csv",
    `content/ (${rows.length} markdown files)`,
  ],
}, null, 2));
