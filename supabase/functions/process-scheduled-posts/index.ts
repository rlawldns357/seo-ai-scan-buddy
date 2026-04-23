import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Auto-publish scheduler (runs every minute via pg_cron).
 *
 *  1. Publishes any site_post that user manually scheduled via the kanban
 *     (status='scheduled' AND published_at <= now()).
 *  2. For sites with `autopublish_settings.enabled=true`:
 *      - If KST weekday/hour matches the rule and we haven't hit the daily
 *        publish cap, pop ONE oldest 'scheduled' (or oldest 'draft' if no
 *        scheduled exists) and publish it.
 *      - If `auto_topup` is on and queue depth (idea+draft+scheduled) is
 *        below `min_queue`, fire-and-forget the topup-idea-queue function.
 *
 * Idempotent — publish-site-post short-circuits when status='published'.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const nowIso = new Date().toISOString();
    const results: any[] = [];

    // ── Pass 1: manual schedules due ─────────────────────────────────────
    const { data: due } = await supabase
      .from("site_posts")
      .select("id, site_id, title, published_at")
      .eq("status", "scheduled")
      .not("published_at", "is", null)
      .lte("published_at", nowIso)
      .order("published_at", { ascending: true })
      .limit(20);

    for (const post of due ?? []) {
      results.push(await publish(SUPABASE_URL, SERVICE_KEY, post.id, "manual"));
    }

    // ── Pass 2: rule-based autopublish ───────────────────────────────────
    const { data: settings } = await supabase
      .from("autopublish_settings")
      .select("site_id, enabled, weekdays, hours_kst, daily_limit, auto_topup, min_queue, last_run_at")
      .eq("enabled", true);

    // Compute KST now
    const kst = new Date(Date.now() + 9 * 3600 * 1000); // UTC + 9h
    const kstWeekday = kst.getUTCDay(); // 0=Sun..6=Sat (KST values, since we shifted)
    const kstHour = kst.getUTCHours();
    const kstYmd = kst.toISOString().slice(0, 10); // YYYY-MM-DD in KST

    for (const s of settings ?? []) {
      try {
        if (!s.weekdays?.includes(kstWeekday)) continue;
        if (!s.hours_kst?.includes(kstHour)) continue;

        // Don't re-trigger inside the same hour for the same site
        if (s.last_run_at) {
          const lastKst = new Date(new Date(s.last_run_at).getTime() + 9 * 3600 * 1000);
          if (
            lastKst.toISOString().slice(0, 10) === kstYmd &&
            lastKst.getUTCHours() === kstHour
          ) continue;
        }

        // Daily cap check (count today's published in KST window)
        const startKstUtcIso = new Date(`${kstYmd}T00:00:00+09:00`).toISOString();
        const { count: publishedToday } = await supabase
          .from("site_posts")
          .select("id", { count: "exact", head: true })
          .eq("site_id", s.site_id)
          .eq("status", "published")
          .gte("published_at", startKstUtcIso);
        if ((publishedToday ?? 0) >= s.daily_limit) continue;

        // Pick next: oldest scheduled with no future timestamp, else oldest draft
        let next: { id: string } | null = null;
        const { data: nextSched } = await supabase
          .from("site_posts")
          .select("id")
          .eq("site_id", s.site_id)
          .eq("status", "scheduled")
          .or(`published_at.is.null,published_at.lte.${nowIso}`)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (nextSched) next = nextSched;
        if (!next) {
          const { data: nextDraft } = await supabase
            .from("site_posts")
            .select("id, content")
            .eq("site_id", s.site_id)
            .eq("status", "draft")
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (nextDraft && nextDraft.content && nextDraft.content.length > 30) {
            next = { id: nextDraft.id };
          }
        }

        if (next) {
          const r = await publish(SUPABASE_URL, SERVICE_KEY, next.id, `auto:site:${s.site_id}`);
          results.push(r);
          await supabase
            .from("autopublish_settings")
            .update({ last_run_at: new Date().toISOString() })
            .eq("site_id", s.site_id);
        }

        // Topup queue if low
        if (s.auto_topup) {
          const { count: qDepth } = await supabase
            .from("site_posts")
            .select("id", { count: "exact", head: true })
            .eq("site_id", s.site_id)
            .in("status", ["idea", "draft", "scheduled"]);
          if ((qDepth ?? 0) < s.min_queue) {
            // fire-and-forget
            fetch(`${SUPABASE_URL}/functions/v1/topup-idea-queue`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_KEY}`,
              },
              body: JSON.stringify({ siteId: s.site_id, target: s.min_queue }),
            }).catch((e) => console.warn("topup invoke failed", e));
          }
        }
      } catch (e) {
        console.error("autopublish site error", s.site_id, e);
      }
    }

    return new Response(
      JSON.stringify({
        checked_manual: (due ?? []).length,
        checked_sites: (settings ?? []).length,
        results,
        at: nowIso,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("process-scheduled-posts error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

async function publish(url: string, key: string, postId: string, src: string) {
  try {
    const r = await fetch(`${url}/functions/v1/publish-site-post`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ postId }),
    });
    const body = await r.json().catch(() => ({}));
    return { id: postId, src, ok: r.ok && !body?.error, error: body?.error };
  } catch (e) {
    return { id: postId, src, ok: false, error: e instanceof Error ? e.message : "Unknown" };
  }
}
