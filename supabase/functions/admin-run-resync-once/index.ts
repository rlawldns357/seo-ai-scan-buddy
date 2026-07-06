// One-shot resync trigger. Reads ADMIN_PASSWORD from env and drives bulk-mirror-to-inblog
// includeSynced loop server-side so we don't need the admin password on the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const pw = Deno.env.get("ADMIN_PASSWORD")!;
    const sb = createClient(url, svc);

    const { mode = "status", offset: startOffset = 0, batches = 6, limit = 5 } = await req.json().catch(() => ({}));

    if (mode === "status") {
      const [{ count: totalPublished }, { count: synced }] = await Promise.all([
        sb.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true),
        sb.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true).not("inblog_post_id", "is", null),
      ]);
      return new Response(JSON.stringify({ ok: true, totalPublished, synced }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (mode !== "run") {
      return new Response(JSON.stringify({ error: "invalid mode" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Synchronous chunk: process `batches` batches of `limit` posts each, then return offset.
    let offset = Number(startOffset) || 0;
    let totalOk = 0, totalFail = 0, totalProcessed = 0;
    let done = false;
    let totalPublished = 0;
    const failures: Array<{ slug: string; error: string }> = [];
    for (let i = 0; i < Math.max(1, Math.min(20, Number(batches) || 6)); i++) {
      const r = await fetch(`${url}/functions/v1/bulk-mirror-to-inblog`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${svc}` },
        body: JSON.stringify({ password: pw, limit, includeSynced: true, offset }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.error) {
        return new Response(JSON.stringify({ ok: false, error: j?.error || `HTTP ${r.status}`, offset, totalOk, totalFail }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
      }
      totalProcessed += j.processed || 0;
      for (const res of (j.results || [])) {
        if (res.ok) totalOk++;
        else { totalFail++; failures.push({ slug: res.slug, error: res.error }); }
      }
      totalPublished = j.counts?.totalPublished || totalPublished;
      offset = j.nextOffset || 0;
      if (j.done) { done = true; break; }
    }
    return new Response(JSON.stringify({ ok: true, done, offset, totalProcessed, totalOk, totalFail, totalPublished, failures: failures.slice(0, 10) }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
