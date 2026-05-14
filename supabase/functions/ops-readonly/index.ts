// Read-only Ops summary for automated reports (Hermes etc.)
// - Auth: x-ops-token header OR ?token= query param OR { token } body
// - Strictly READ ONLY. No INSERT/UPDATE/DELETE. No writes to seo_actions,
//   indexing_queue, serp_keywords, or any other table.
// - Returns compact summaries only. No emails, no payment data, no secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ops-token",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ---- Token validation ----------------------------------------------------
  const expected = Deno.env.get("OPS_READONLY_TOKEN");
  if (!expected) {
    return json(503, { error: "OPS_READONLY_TOKEN not configured on server" });
  }

  let provided =
    req.headers.get("x-ops-token") ||
    new URL(req.url).searchParams.get("token") ||
    "";
  if (!provided && (req.method === "POST" || req.method === "PUT")) {
    try {
      const body = await req.clone().json();
      provided = body?.token || "";
    } catch { /* ignore */ }
  }
  if (!provided || provided !== expected) {
    return json(401, { error: "Unauthorized" });
  }

  // ---- Read-only client ----------------------------------------------------
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ── SEO Monitor summary ────────────────────────────────────────────────
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);

    const [{ data: keywords }, { data: serpResults }] = await Promise.all([
      supabase
        .from("serp_keywords")
        .select("id, keyword, category, target_url, priority, status, last_action_at"),
      supabase
        .from("serp_tracking_results")
        .select("keyword, engine, our_exposed, our_rank, checked_at, error")
        .gte("checked_at", cutoff.toISOString())
        .order("checked_at", { ascending: false })
        .limit(3000),
    ]);

    // Latest 2 snapshots per (keyword, engine)
    const byKey = new Map<string, any[]>();
    for (const r of serpResults || []) {
      const k = `${r.keyword}::${r.engine}`;
      const arr = byKey.get(k) || [];
      if (arr.length < 2) arr.push(r);
      byKey.set(k, arr);
    }

    let exposed = 0, missing = 0, rising = 0, falling = 0;
    let needsFix = 0, indexingPending = 0;
    for (const kw of keywords || []) {
      for (const eng of ["google", "naver"]) {
        const arr = byKey.get(`${kw.keyword}::${eng}`) || [];
        const cur = arr[0], prev = arr[1];
        if (kw.status === "needs_fix") needsFix++;
        if (kw.status === "indexing_pending") indexingPending++;
        if (!cur) continue;
        if (cur.our_exposed) {
          const delta = cur.our_rank != null && prev?.our_rank != null
            ? prev.our_rank - cur.our_rank : null;
          if (delta != null && delta > 0) rising++;
          else if (delta != null && delta < 0) falling++;
          else exposed++;
        } else {
          missing++;
        }
      }
    }

    const lastSerp = (serpResults || [])[0];
    const lastSerpRun = lastSerp
      ? { checked_at: lastSerp.checked_at, ok: !lastSerp.error }
      : null;

    const seoMonitor = {
      total_keywords: (keywords || []).length,
      exposed,
      missing,
      rising,
      falling,
      needs_fix: needsFix,
      indexing_pending: indexingPending,
      last_serp_run: lastSerpRun,
    };

    // ── Indexing Queue summary ─────────────────────────────────────────────
    const { data: queue } = await supabase
      .from("indexing_queue")
      .select("id, url, status, engine, priority, target_keyword, created_at, updated_at, requested_at, verified_at")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    const items = queue || [];
    const counts: Record<string, number> = {
      pending: 0, requested: 0, verified: 0, re_request: 0, hold: 0, failed: 0,
    };
    for (const it of items) {
      counts[it.status] = (counts[it.status] ?? 0) + 1;
    }
    const indexingQueue = {
      total: items.length,
      counts,
      recent: items.slice(0, 10).map((i) => ({
        url: i.url,
        status: i.status,
        engine: i.engine,
        priority: i.priority,
        target_keyword: i.target_keyword,
        created_at: i.created_at,
        updated_at: i.updated_at,
      })),
    };

    // ── AI Growth Loop summary ─────────────────────────────────────────────
    const { data: actions } = await supabase
      .from("seo_actions")
      .select("id, page_url, target_keyword, action_type, result, ai_judgement, next_action, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const aitems = actions || [];
    const aiGrowthLoop = {
      total: aitems.length,
      counts: {
        improved: aitems.filter(a => a.result === "improved").length,
        waiting: aitems.filter(a => a.result === "waiting").length,
        unclear: aitems.filter(a => a.result === "unclear").length,
        no_change: aitems.filter(a => a.result === "no_change").length,
        worse: aitems.filter(a => a.result === "worse").length,
      },
      recent: aitems.slice(0, 10).map(a => ({
        page_url: a.page_url,
        target_keyword: a.target_keyword,
        action_type: a.action_type,
        result: a.result,
        ai_judgement: a.ai_judgement,
        next_action: a.next_action,
        created_at: a.created_at,
        updated_at: a.updated_at,
      })),
    };

    return json(200, {
      generated_at: new Date().toISOString(),
      mode: "read-only",
      seoMonitor,
      indexingQueue,
      aiGrowthLoop,
    });
  } catch (e) {
    return json(500, { error: (e as Error)?.message || "server error" });
  }
});
