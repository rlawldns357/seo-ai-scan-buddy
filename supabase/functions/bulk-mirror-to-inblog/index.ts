// Batch mirror published blog_posts to Inblog.
// Processes up to `limit` (default 5) posts per call. Client polls until done=true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { password, limit = 5, retryFailed = false, includeSynced = false, offset = 0 } = await req.json();
    if (password !== Deno.env.get("ADMIN_PASSWORD")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Pick candidates. Normal mode: not yet mirrored. includeSynced mode: all published posts
    // so existing Inblog posts are PATCHed with current clean URL/content settings.
    let q = sb.from("blog_posts")
      .select("id, title, slug, inblog_sync_error")
      .eq("published", true)
      .order("date", { ascending: false })
      .range(Math.max(0, Number(offset) || 0), Math.max(0, Number(offset) || 0) + Math.max(1, Math.min(20, Number(limit) || 5)) - 1);
    if (!includeSynced) q = q.is("inblog_post_id", null);
    if (!retryFailed && !includeSynced) q = q.is("inblog_sync_error", null);

    const { data: candidates, error } = await q;
    if (error) throw error;

    const results: Array<{ id: string; slug: string; ok: boolean; error?: string; inblogPostId?: string }> = [];

    for (const p of candidates || []) {
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/publish-to-inblog`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ password, postId: p.id, publish: true }),
        });
        const j = await r.json();
        if (!r.ok || j?.error) throw new Error(j?.error || `HTTP ${r.status}`);
        results.push({ id: p.id, slug: p.slug, ok: true, inblogPostId: j.inblogPostId });
      } catch (e) {
        results.push({ id: p.id, slug: p.slug, ok: false, error: (e as Error).message });
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    // Remaining counts
    const [{ count: pending }, { count: failed }, { count: synced }, { count: totalPublished }] = await Promise.all([
      sb.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true).is("inblog_post_id", null).is("inblog_sync_error", null),
      sb.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true).is("inblog_post_id", null).not("inblog_sync_error", "is", null),
      sb.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true).not("inblog_post_id", "is", null),
      sb.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      processed: results.length,
      results,
      counts: { pending: pending ?? 0, failed: failed ?? 0, synced: synced ?? 0, totalPublished: totalPublished ?? 0 },
      nextOffset: includeSynced ? Math.max(0, Number(offset) || 0) + (candidates || []).length : 0,
      done: includeSynced
        ? (candidates || []).length === 0 || Math.max(0, Number(offset) || 0) + (candidates || []).length >= (totalPublished ?? 0)
        : (candidates || []).length === 0,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
