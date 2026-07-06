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

    const { mode = "status" } = await req.json().catch(() => ({}));

    if (mode === "status") {
      const [{ count: totalPublished }, { count: synced }] = await Promise.all([
        sb.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true),
        sb.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true).not("inblog_post_id", "is", null),
      ]);
      // read progress marker
      const { data: cfg } = await sb.from("engine_config").select("value").eq("key", "resync_progress").maybeSingle();
      return new Response(JSON.stringify({ ok: true, totalPublished, synced, progress: cfg?.value ?? null }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    if (mode !== "run") {
      return new Response(JSON.stringify({ error: "invalid mode" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" } });
    }

    // Background worker: iterate over all published posts and re-mirror
    const run = async () => {
      let offset = 0;
      let totalOk = 0, totalFail = 0, totalProcessed = 0;
      const startedAt = new Date().toISOString();
      const upsertProgress = async (extra: Record<string, unknown>) => {
        await sb.from("engine_config").upsert({
          key: "resync_progress",
          value: { startedAt, offset, totalOk, totalFail, totalProcessed, updatedAt: new Date().toISOString(), ...extra },
        }, { onConflict: "key" });
      };
      await upsertProgress({ status: "running" });
      for (let i = 0; i < 400; i++) {
        const r = await fetch(`${url}/functions/v1/bulk-mirror-to-inblog`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${svc}` },
          body: JSON.stringify({ password: pw, limit: 5, includeSynced: true, offset }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.error) {
          await upsertProgress({ status: "error", error: j?.error || `HTTP ${r.status}` });
          return;
        }
        totalProcessed += j.processed || 0;
        for (const res of (j.results || [])) if (res.ok) totalOk++; else totalFail++;
        offset = j.nextOffset || 0;
        await upsertProgress({ status: "running" });
        if (j.done) break;
      }
      await upsertProgress({ status: "done" });
    };

    // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(run());

    return new Response(JSON.stringify({ ok: true, started: true }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
