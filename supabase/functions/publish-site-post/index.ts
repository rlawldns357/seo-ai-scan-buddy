import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTHLY_LIMIT = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { postId } = await req.json();
    if (!postId) {
      return new Response(JSON.stringify({ error: "postId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: post, error: postErr } = await supabase
      .from("site_posts").select("id, site_id, status").eq("id", postId).maybeSingle();
    if (postErr || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (post.status === "published") {
      return new Response(JSON.stringify({ ok: true, alreadyPublished: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { count } = await supabase
      .from("site_posts")
      .select("id", { count: "exact", head: true })
      .eq("site_id", post.site_id)
      .eq("status", "published")
      .gte("published_at", since.toISOString());

    if ((count ?? 0) >= MONTHLY_LIMIT) {
      return new Response(JSON.stringify({ error: `월 발행 한도(${MONTHLY_LIMIT}건) 초과` }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await supabase
      .from("site_posts")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", postId);

    if (updErr) throw updErr;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("publish-site-post error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
