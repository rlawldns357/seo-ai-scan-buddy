// GSC URL Inspection 자동 진단
// - 발행된 모든 블로그 URL의 색인 상태를 GSC URL Inspection API로 조회
// - gsc_index_coverage 테이블에 upsert
// - 미색인(Discovered/Crawled-not indexed) URL은 자동으로 IndexNow 재핑 + indexing_queue 적재

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://searchtuneos.com/";
const SITE_ORIGIN = "https://searchtuneos.com";
const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

function canonicalBlogUrl(slug: string): string {
  const s = String(slug || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  const path = s.startsWith("/blog/") ? s : `/blog/${s}`;
  return `${SITE_ORIGIN}${path.replace(/\.html$/i, "")}`;
}

async function inspect(url: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const connKey = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
  if (!apiKey || !connKey) throw new Error("missing_gsc_credentials");
  const res = await fetch(`${GATEWAY}/v1/urlInspection/index:inspect`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE, languageCode: "ko" }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`gsc_${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return {}; }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({} as any));
  const autoFix: boolean = body.autoFix !== false;
  const limit: number = Math.min(200, Math.max(1, Number(body.limit ?? 80)));
  const mode: string = body.mode || "auto"; // "auto" | "stale" | "all" | "unindexed"
  const specificSlug: string | undefined = body.slug;

  // ── Build target URL list ──
  let targets: { slug: string; url: string }[] = [];

  if (specificSlug) {
    targets = [{ slug: specificSlug, url: canonicalBlogUrl(specificSlug) }];
  } else {
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, date")
      .eq("published", true)
      .order("date", { ascending: false });
    const all = (posts || []).map((p: any) => ({ slug: p.slug, url: canonicalBlogUrl(p.slug) }));

    if (mode === "all") {
      targets = all.slice(0, limit);
    } else if (mode === "unindexed") {
      const { data: cov } = await supabase
        .from("gsc_index_coverage")
        .select("url, verdict, coverage_state")
        .neq("verdict", "PASS");
      const unindexedUrls = new Set((cov || []).map((c: any) => c.url));
      targets = all.filter((t) => unindexedUrls.has(t.url) || mode === "unindexed").slice(0, limit);
    } else {
      // "auto" / "stale": skip URLs inspected within last 3 days that are PASS
      const { data: recent } = await supabase
        .from("gsc_index_coverage")
        .select("url, verdict, inspected_at");
      const skip = new Set(
        (recent || [])
          .filter((r: any) =>
            r.verdict === "PASS" &&
            Date.now() - new Date(r.inspected_at).getTime() < 3 * 86400_000
          )
          .map((r: any) => r.url),
      );
      targets = all.filter((t) => !skip.has(t.url)).slice(0, limit);
    }
  }

  if (targets.length === 0) {
    return new Response(JSON.stringify({ success: true, inspected: 0, message: "no targets" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const results: any[] = [];
  const unindexedUrls: string[] = [];
  let inspected = 0;
  let errors = 0;

  for (const t of targets) {
    try {
      const data = await inspect(t.url);
      const idx = data?.inspectionResult?.indexStatusResult || {};
      const verdict = idx.verdict || "NEUTRAL"; // PASS | PARTIAL | FAIL | NEUTRAL
      const coverage_state = idx.coverageState || null;
      const indexing_state = idx.indexingState || null;
      const page_fetch_state = idx.pageFetchState || null;
      const robots_txt_state = idx.robotsTxtState || null;
      const last_crawl_time = idx.lastCrawlTime || null;
      const google_canonical = idx.googleCanonical || null;
      const user_canonical = idx.userCanonical || null;

      await supabase.from("gsc_index_coverage").upsert(
        {
          url: t.url,
          slug: t.slug,
          coverage_state,
          indexing_state,
          page_fetch_state,
          robots_txt_state,
          verdict,
          google_canonical,
          user_canonical,
          last_crawl_time,
          raw: data?.inspectionResult ?? data,
          inspected_at: new Date().toISOString(),
        },
        { onConflict: "url" },
      );

      results.push({ url: t.url, verdict, coverage_state });
      inspected++;

      // Identify unindexed-needs-help signals
      const needsHelp =
        verdict !== "PASS" &&
        (coverage_state?.includes("Discovered") ||
          coverage_state?.includes("Crawled") ||
          coverage_state?.includes("not indexed") ||
          coverage_state?.includes("발견됨") ||
          coverage_state?.includes("색인되지"));
      if (needsHelp) unindexedUrls.push(t.url);
    } catch (e) {
      errors++;
      console.error("inspect failed", t.url, (e as Error).message);
    }
    // Throttle: ~1.2 req/s — safely under 600/min URL Inspection quota
    await sleep(800);
  }

  // ── Auto-fix: ping IndexNow + enqueue ──
  let pinged = 0;
  let queued = 0;
  if (autoFix && unindexedUrls.length > 0) {
    try {
      const pingRes = await supabase.functions.invoke("submit-indexnow", {
        body: { urls: unindexedUrls },
      });
      pinged = (pingRes?.data as any)?.urls?.length ?? unindexedUrls.length;
    } catch (e) {
      console.error("indexnow ping failed", (e as Error).message);
    }

    // Enqueue rows that aren't already pending/requested
    for (const url of unindexedUrls) {
      const { data: exists } = await supabase
        .from("indexing_queue")
        .select("id, status")
        .eq("url", url)
        .in("status", ["pending", "requested", "re_request"])
        .maybeSingle();
      if (exists) continue;
      const { error } = await supabase.from("indexing_queue").insert({
        url,
        engine: "google",
        reason: "GSC: not indexed",
        priority: 7,
        status: "pending",
      });
      if (!error) queued++;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      inspected,
      errors,
      total_targets: targets.length,
      unindexed: unindexedUrls.length,
      indexnow_pinged: pinged,
      queued_for_indexing: queued,
      sample: results.slice(0, 10),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
