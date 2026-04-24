import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Tops up the idea queue for a site.
 *
 * Body: { siteId: string, target?: number }
 *
 * Algorithm:
 *  - Reads current queue depth (idea + draft + scheduled).
 *  - Ensures depth reaches `target` (default 5) by inserting fresh ideas
 *    via demo-stream-content (recommend mode), avoiding duplicate titles.
 *  - Inserts at most 5 ideas per call to keep the function snappy.
 *
 * Auth: service role only (called from process-scheduled-posts).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Service-role only
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.includes(SERVICE_KEY)) {
      return json({ error: "forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const siteId: string = body.siteId;
    const target: number = Math.min(Math.max(body.target ?? 5, 1), 20);
    if (!siteId) return json({ error: "siteId required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: site } = await admin
      .from("user_sites")
      .select("id, site_url, title")
      .eq("id", siteId)
      .maybeSingle();
    if (!site) return json({ error: "site not found" }, 404);

    const { count: depth } = await admin
      .from("site_posts")
      .select("id", { count: "exact", head: true })
      .eq("site_id", siteId)
      .in("status", ["idea", "draft", "scheduled"]);

    const need = Math.max(0, target - (depth ?? 0));
    if (need === 0) return json({ inserted: 0, depth: depth ?? 0, target });

    // Get existing titles to avoid dupes
    const { data: existing } = await admin
      .from("site_posts")
      .select("title")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false })
      .limit(60);
    const existingTitles = new Set(
      (existing ?? []).map((r: any) => (r.title ?? "").trim().toLowerCase()),
    );

    // Ask demo-stream-content (recommend mode) for ideas. Cap at 5 per call.
    const wantHere = Math.min(need, 5);
    const recRes = await fetch(`${SUPABASE_URL}/functions/v1/demo-stream-content`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        mode: "recommend",
        url: site.site_url,
        siteTitle: site.title,
      }),
    });
    if (!recRes.ok) {
      const t = await recRes.text();
      throw new Error(`recommend failed: ${recRes.status} ${t.slice(0, 120)}`);
    }
    const recBody = await recRes.json().catch(() => ({}));
    const ideas: Array<{ topic: string; axis?: string; reason?: string }> =
      Array.isArray(recBody?.ideas) ? recBody.ideas : [];

    const fresh = ideas
      .filter((i) => i?.topic && !existingTitles.has(i.topic.trim().toLowerCase()))
      .slice(0, wantHere);

    let inserted = 0;
    for (const idea of fresh) {
      const slug = `idea-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await admin.from("site_posts").insert({
        site_id: siteId,
        slug,
        title: idea.topic.slice(0, 200),
        excerpt: idea.reason?.slice(0, 280) ?? null,
        content: `# ${idea.topic}\n\n(자동 보충 — 초안으로 이동하면 AI가 본문을 생성합니다)`,
        status: "idea",
        source_axis: (idea.axis || "SEO").toUpperCase(),
        is_auto_generated: true,
      } as any);
      if (!error) inserted += 1;
    }

    return json({ inserted, depth: depth ?? 0, target, attempted: fresh.length });
  } catch (e) {
    console.error("topup-idea-queue error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
