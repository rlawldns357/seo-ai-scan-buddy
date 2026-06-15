// Daily SERP tracker for Top 20 + reverse keywords on Google + Naver
// Naver: official Search API (NAVER_CLIENT_ID/SECRET)
// Google: Firecrawl /v2/search (FIRECRAWL_API_KEY)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logApiCost } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OUR_DOMAIN_PATTERNS = [
  "searchtuneos.com",
  "searchtune", // covers blog mentions on other domains too — strict match below
];

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isOurResult(url: string): boolean {
  const d = getDomain(url);
  if (!d) return false;
  return d === "searchtuneos.com" || d.endsWith(".searchtuneos.com");
}

function stripHtml(s: string): string {
  return (s || "").replace(/<[^>]+>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

interface SerpItem {
  rank: number;
  url: string;
  title: string;
  snippet: string;
  domain: string;
}

async function searchNaver(keyword: string): Promise<{ items: SerpItem[]; total?: number; error?: string }> {
  const id = Deno.env.get("NAVER_CLIENT_ID");
  const secret = Deno.env.get("NAVER_CLIENT_SECRET");
  if (!id || !secret) return { items: [], error: "NAVER_CLIENT_ID/SECRET not configured" };

  try {
    const url = `https://openapi.naver.com/v1/search/webkr.json?query=${encodeURIComponent(keyword)}&display=10&start=1`;
    const res = await fetch(url, {
      headers: { "X-Naver-Client-Id": id, "X-Naver-Client-Secret": secret },
    });
    if (!res.ok) {
      const txt = await res.text();
      return { items: [], error: `Naver API ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = await res.json();
    logApiCost({
      function_name: "track-serp-keywords",
      model: "naver/search",
      requests: 1,
      metadata: { surface: "webkr", keyword: keyword.slice(0, 60) },
    });
    const items: SerpItem[] = (data.items || []).map((it: any, i: number) => ({
      rank: i + 1,
      url: it.link,
      title: stripHtml(it.title),
      snippet: stripHtml(it.description),
      domain: getDomain(it.link),
    }));
    return { items, total: data.total };
  } catch (e) {
    return { items: [], error: String(e).slice(0, 200) };
  }
}

async function searchGoogle(keyword: string): Promise<{ items: SerpItem[]; error?: string }> {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return { items: [], error: "FIRECRAWL_API_KEY not configured" };

  try {
    const res = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: keyword, limit: 10, lang: "ko", country: "kr" }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { items: [], error: `Firecrawl ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = await res.json();
    logApiCost({
      function_name: "track-serp-keywords",
      model: "firecrawl/search",
      requests: 1,
      metadata: { surface: "google", keyword: keyword.slice(0, 60) },
    });
    // v2 returns { success, data: { web: [{ url, title, description, ... }] } } or { data: [...] }
    const raw = data?.data?.web || data?.web || data?.data || [];
    const items: SerpItem[] = (Array.isArray(raw) ? raw : []).slice(0, 10).map((it: any, i: number) => ({
      rank: i + 1,
      url: it.url || it.link || "",
      title: it.title || "",
      snippet: it.description || it.snippet || "",
      domain: getDomain(it.url || it.link || ""),
    }));
    return { items };
  } catch (e) {
    return { items: [], error: String(e).slice(0, 200) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Anti-abuse: cooldown of 6h between full runs unless admin password + force
  const url = new URL(req.url);
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  let providedPassword: string | null = null;
  let force = url.searchParams.get("force") === "1";
  if (req.method === "POST") {
    try {
      const body = await req.json();
      providedPassword = body?.password ?? null;
      if (body?.force) force = true;
    } catch { /* body optional */ }
  }
  const isAdmin = !!(adminPassword && providedPassword === adminPassword);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Cooldown: skip if last run was within 6 hours unless admin force
  if (!force) {
    const { data: lastRun } = await supabase
      .from("serp_tracking_results")
      .select("checked_at")
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastRun?.checked_at) {
      const sinceMin = (Date.now() - new Date(lastRun.checked_at).getTime()) / 60000;
      if (sinceMin < 360 && !isAdmin) {
        return new Response(
          JSON.stringify({ skipped: true, reason: "cooldown", last_run_min_ago: Math.round(sinceMin) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
  }

  const { data: keywords, error: kwErr } = await supabase
    .from("serp_keywords")
    .select("id, keyword")
    .eq("active", true)
    .order("priority", { ascending: false });

  if (kwErr || !keywords) {
    return new Response(JSON.stringify({ error: kwErr?.message || "no keywords" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const limitParam = parseInt(url.searchParams.get("limit") || "0", 10);
  const offsetParam = parseInt(url.searchParams.get("offset") || "0", 10);
  const concurrencyParam = Math.min(Math.max(parseInt(url.searchParams.get("concurrency") || "3", 10), 1), 6);
  // Hard cap on per-invocation duration to avoid edge timeout (default 240s).
  const maxDurationMs = Math.min(Math.max(parseInt(url.searchParams.get("maxMs") || "240000", 10), 30000), 540000);
  const startedAt = Date.now();

  let targetKeywords = keywords;
  if (offsetParam > 0) targetKeywords = targetKeywords.slice(offsetParam);
  if (limitParam > 0) targetKeywords = targetKeywords.slice(0, limitParam);

  const rows: any[] = [];
  let processed = 0;
  let timedOut = false;

  // Process keywords with bounded concurrency
  let cursor = 0;
  async function worker() {
    while (cursor < targetKeywords.length) {
      if (Date.now() - startedAt > maxDurationMs) { timedOut = true; return; }
      const idx = cursor++;
      const kw = targetKeywords[idx];
      const [naver, google] = await Promise.all([
        searchNaver(kw.keyword),
        searchGoogle(kw.keyword),
      ]);
      for (const [engine, result] of [
        ["naver", naver],
        ["google", google],
      ] as const) {
        const items = result.items;
        const ours = items.find((it) => isOurResult(it.url));
        const topDomains = Array.from(new Set(items.map((it) => it.domain).filter(Boolean))).slice(0, 10);
        rows.push({
          keyword_id: kw.id,
          keyword: kw.keyword,
          engine,
          our_exposed: !!ours,
          our_rank: ours?.rank ?? null,
          our_url: ours?.url ?? null,
          our_title: ours?.title ?? null,
          our_snippet: ours?.snippet ?? null,
          top10: items,
          top_domains: topDomains,
          total_results: (engine === "naver" ? (naver as any).total : items.length) ?? null,
          error: result.error ?? null,
        });
      }
      processed += 1;
      // Gentle pacing per worker (Naver 10 req/sec cap shared across workers)
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  await Promise.all(Array.from({ length: concurrencyParam }, () => worker()));

  // Batch insert in chunks of 200 to avoid payload limits
  let insErr: any = null;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const { error } = await supabase.from("serp_tracking_results").insert(chunk);
    if (error) { insErr = error; break; }
  }

  return new Response(
    JSON.stringify({
      success: !insErr,
      error: insErr?.message,
      processed,
      total_keywords: targetKeywords.length,
      rows_inserted: rows.length,
      timed_out: timedOut,
      duration_ms: Date.now() - startedAt,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});

