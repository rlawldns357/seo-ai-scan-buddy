// Temporary proxy: injects ADMIN_PASSWORD server-side, forwards to publish-to-inblog.
// Gated by x-resync-token header (RESYNC_TOKEN secret).
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-resync-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const tok = req.headers.get("x-resync-token");
    if (!tok || tok !== Deno.env.get("RESYNC_TOKEN")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const { postId } = await req.json();
    if (!postId) throw new Error("postId required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminPw = Deno.env.get("ADMIN_PASSWORD")!;

    const r = await fetch(`${supabaseUrl}/functions/v1/publish-to-inblog`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
      body: JSON.stringify({ password: adminPw, postId, publish: true }),
    });
    const j = await r.json();
    return new Response(JSON.stringify({ ok: r.ok && !j?.error, status: r.status, body: j }), {
      status: r.ok ? 200 : 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
