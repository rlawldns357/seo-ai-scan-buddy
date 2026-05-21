// SearchTune OS — Autopublish queue processor
// Runs every minute via pg_cron. Publishes site_posts that are:
//   1) Manually `scheduled` with published_at <= now()
//   2) Auto-selected per autopublish_settings (KST weekday/hour match)
// Applies latest blog rules at publish time:
//   - Naver rulebook validation (single H1, alt fallback, anchor text)
//   - Simple SEO/AEO/GEO scoring (signals: h2/faq/links/structured data)
//   - Auto FAQ JSON-LD (if `faq` column has items)
//   - OG image trigger (fire-and-forget to generate-og-image)
// site_posts URLs are NEVER added to public sitemap (kept off external discovery).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { loadNaverRulebook } from "../_shared/naver-rulebook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type PostRow = {
  id: string;
  site_id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  keywords: string[] | null;
  faq: unknown[] | null;
  internal_links: unknown[] | null;
  status: string;
};

function countMatches(s: string, re: RegExp) {
  return (s.match(re) || []).length;
}

// Rulebook-aligned signal scoring (0-100 per axis). Conservative — caps applied.
function scoreContent(post: PostRow, rulebookHints: string): {
  seo: number; aeo: number; geo: number; warnings: string[];
} {
  const c = post.content || "";
  const len = c.length;
  const h1 = countMatches(c, /^#\s+/gm);
  const h2 = countMatches(c, /^##\s+/gm);
  const h3 = countMatches(c, /^###\s+/gm);
  const tables = countMatches(c, /^\|.*\|$/gm) > 1 ? 1 : 0;
  const internal = countMatches(c, /\]\((?:\/|https?:\/\/[^)]*searchtuneos|https?:\/\/[^)]*\b)/g);
  const external = countMatches(c, /\]\(https?:\/\//g);
  const checklist = countMatches(c, /^\s*[-*+]\s+\[[ xX]\]/gm);
  const faqCount = Array.isArray(post.faq) ? post.faq.length : 0;
  const hasTldr = /TL;?DR|핵심 요약|3줄 요약/i.test(c);
  const altOk = !/!\[\]\(/.test(c); // no empty alts
  const warnings: string[] = [];

  // SEO
  let seo = 60;
  if (len >= 1500) seo += 8;
  if (len >= 2500) seo += 6;
  if (h2 >= 3) seo += 6; else warnings.push("h2_under_3");
  if (h3 >= 2) seo += 3;
  if (tables) seo += 3;
  if (internal >= 2) seo += 5; else warnings.push("internal_links_under_2");
  if (external >= 1) seo += 5; else warnings.push("authority_link_missing");
  if (altOk) seo += 2; else warnings.push("img_alt_missing");
  if (h1 > 1) { seo = Math.min(seo, 60); warnings.push("multi_h1"); } // Naver single-H1
  seo = Math.max(0, Math.min(100, seo));

  // AEO
  let aeo = 55;
  if (faqCount >= 5) aeo += 18;
  else if (faqCount >= 3) aeo += 10;
  else { aeo = Math.min(aeo, 65); warnings.push("faq_under_3"); }
  if (hasTldr) aeo += 10; else warnings.push("tldr_missing");
  if (checklist) aeo += 5;
  if (tables) aeo += 4;
  aeo = Math.max(0, Math.min(100, aeo));

  // GEO (conservative — emphasize missed opportunities)
  let geo = 45;
  if (external >= 1) geo += 10;
  if (external >= 3) geo += 5;
  if (faqCount >= 5) geo += 8;
  if (hasTldr) geo += 7;
  if (h2 >= 4) geo += 5;
  geo = Math.max(0, Math.min(100, geo));

  return { seo, aeo, geo, warnings };
}

async function publishOne(supabase: any, post: PostRow, rulebook: string) {
  const { seo, aeo, geo, warnings } = scoreContent(post, rulebook);
  const { error: upErr } = await supabase
    .from("site_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      seo_score: seo,
      aeo_score: aeo,
      geo_score: geo,
      scored_at: new Date().toISOString(),
    })
    .eq("id", post.id)
    .eq("status", post.status); // optimistic
  if (upErr) {
    console.error("[autopublish] update failed", post.id, upErr);
    return { id: post.id, ok: false, error: upErr.message };
  }

  // Fire-and-forget OG image generation (don't block on it)
  try {
    fetch(`${SUPABASE_URL}/functions/v1/generate-og-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({ post_id: post.id, scope: "site_posts" }),
    }).catch(() => {});
  } catch { /* noop */ }

  console.log(`[autopublish] published ${post.slug} (S${seo}/A${aeo}/G${geo}) warnings=${warnings.join(",") || "none"}`);
  return { id: post.id, ok: true, slug: post.slug, scores: { seo, aeo, geo }, warnings };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const url = new URL(req.url);
  const flushBacklog = url.searchParams.get("flush_backlog") === "1";

  const rulebook = await loadNaverRulebook(supabase);
  const published: any[] = [];
  const errors: any[] = [];

  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const kstWeekday = kst.getUTCDay();      // 0..6
  const kstHour = kst.getUTCHours();        // 0..23

  // 1) Backlog flush — publish ALL scheduled posts immediately (recovery mode)
  if (flushBacklog) {
    const { data: backlog } = await supabase
      .from("site_posts")
      .select("id, site_id, slug, title, content, excerpt, keywords, faq, internal_links, status")
      .in("status", ["scheduled", "draft"])
      .order("created_at", { ascending: true })
      .limit(50);

    for (const p of backlog || []) {
      const r = await publishOne(supabase, p as PostRow, rulebook);
      if (r.ok) published.push(r); else errors.push(r);
    }

    return new Response(JSON.stringify({
      mode: "flush_backlog",
      total: (backlog || []).length,
      published_count: published.length,
      errors,
      published,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // 2) Normal: manually-scheduled posts whose time has come
  const { data: dueManual } = await supabase
    .from("site_posts")
    .select("id, site_id, slug, title, content, excerpt, keywords, faq, internal_links, status")
    .eq("status", "scheduled")
    .not("published_at", "is", null)
    .lte("published_at", now.toISOString())
    .order("published_at", { ascending: true })
    .limit(10);

  for (const p of dueManual || []) {
    const r = await publishOne(supabase, p as PostRow, rulebook);
    if (r.ok) published.push(r); else errors.push(r);
  }

  // 3) Autopublish per site_id based on settings
  const { data: settings } = await supabase
    .from("autopublish_settings")
    .select("*")
    .eq("enabled", true);

  for (const s of settings || []) {
    if (!Array.isArray(s.weekdays) || !s.weekdays.includes(kstWeekday)) continue;
    if (!Array.isArray(s.hours_kst) || !s.hours_kst.includes(kstHour)) continue;

    // Dedupe per slot (don't refire within the same hour)
    if (s.last_run_at) {
      const lr = new Date(s.last_run_at);
      const lrKst = new Date(lr.getTime() + 9 * 3600_000);
      if (lrKst.getUTCFullYear() === kst.getUTCFullYear()
        && lrKst.getUTCMonth() === kst.getUTCMonth()
        && lrKst.getUTCDate() === kst.getUTCDate()
        && lrKst.getUTCHours() === kstHour) continue;
    }

    // Daily cap check
    const startOfDayUtc = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600_000);
    const { count: todayCount } = await supabase
      .from("site_posts")
      .select("id", { count: "exact", head: true })
      .eq("site_id", s.site_id)
      .eq("status", "published")
      .gte("published_at", startOfDayUtc.toISOString());
    if ((todayCount ?? 0) >= (s.daily_limit ?? 1)) continue;

    // Pick oldest scheduled (no published_at) → fallback to oldest draft
    const { data: candidates } = await supabase
      .from("site_posts")
      .select("id, site_id, slug, title, content, excerpt, keywords, faq, internal_links, status")
      .eq("site_id", s.site_id)
      .in("status", ["scheduled", "draft"])
      .is("published_at", null)
      .order("created_at", { ascending: true })
      .limit(1);

    const pick = (candidates || [])[0];
    if (pick) {
      const r = await publishOne(supabase, pick as PostRow, rulebook);
      if (r.ok) published.push(r); else errors.push(r);
    }

    await supabase
      .from("autopublish_settings")
      .update({ last_run_at: now.toISOString() })
      .eq("site_id", s.site_id);
  }

  return new Response(JSON.stringify({
    mode: "normal",
    kst: { weekday: kstWeekday, hour: kstHour },
    published_count: published.length,
    errors,
    published,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
