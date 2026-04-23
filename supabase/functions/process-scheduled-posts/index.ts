import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Scheduler: every minute (via pg_cron) this function:
 *  1. Selects all site_posts where status='scheduled' AND published_at <= now()
 *  2. Calls publish-site-post for each (which handles backlinks, scoring, status flip)
 *  3. Returns a small summary
 *
 * Idempotent: publish-site-post short-circuits when status='published'.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();
    const { data: due, error } = await supabase
      .from("site_posts")
      .select("id, site_id, title, published_at")
      .eq("status", "scheduled")
      .not("published_at", "is", null)
      .lte("published_at", nowIso)
      .order("published_at", { ascending: true })
      .limit(20);

    if (error) throw error;

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];

    for (const post of due ?? []) {
      try {
        const r = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/publish-site-post`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ postId: post.id }),
          },
        );
        const body = await r.json().catch(() => ({}));
        if (!r.ok || body?.error) {
          results.push({ id: post.id, ok: false, error: body?.error || `HTTP ${r.status}` });
        } else {
          results.push({ id: post.id, ok: true });
        }
      } catch (e) {
        results.push({
          id: post.id,
          ok: false,
          error: e instanceof Error ? e.message : "Unknown",
        });
      }
    }

    return new Response(
      JSON.stringify({
        checked: (due ?? []).length,
        published: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
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
