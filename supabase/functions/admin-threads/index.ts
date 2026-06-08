// 관리자용 Threads 큐 관리 (admin password 인증)
// actions: list, accounts, createTest, retry, deleteItem, triggerPublish
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { password, action } = body as any;
    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    if (!adminPassword || password !== adminPassword) {
      return new Response(JSON.stringify({ error: "인증 실패" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "list") {
      const { data, error } = await supabase
        .from("social_publish_queue")
        .select("id, account_id, body, media_type, media_url, publish_at, status, threads_post_id, published_url, error_message, pause_reason, retry_count, created_at, updated_at")
        .eq("platform", "threads")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return json({ items: data || [] });
    }

    if (action === "accounts") {
      // 토큰은 절대 노출하지 않음
      const { data, error } = await supabase
        .from("social_accounts")
        .select("id, platform, threads_user_id, username, status, token_expires_at, created_at")
        .eq("platform", "threads")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return json({ items: data || [] });
    }

    if (action === "createTest") {
      const { account_id, body: text, media_type = "TEXT", media_url = null, publish_at } = body;
      if (!account_id || !text) throw new Error("account_id와 body는 필수");
      const { data, error } = await supabase
        .from("social_publish_queue")
        .insert({
          account_id,
          platform: "threads",
          body: text,
          media_type,
          media_url,
          publish_at: publish_at || new Date().toISOString(),
          status: "ready",
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return json({ id: data?.id });
    }

    if (action === "retry") {
      const { id } = body;
      if (!id) throw new Error("id 필수");
      const { error } = await supabase
        .from("social_publish_queue")
        .update({ status: "ready", error_message: null, publish_at: new Date().toISOString() })
        .eq("id", id)
        .eq("status", "failed");
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "deleteItem") {
      const { id } = body;
      if (!id) throw new Error("id 필수");
      const { error } = await supabase
        .from("social_publish_queue")
        .delete()
        .eq("id", id)
        .in("status", ["ready", "failed", "draft"]);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "updateItem") {
      const { id, body: newBody, publish_at, status, pause_reason } = body;
      if (!id) throw new Error("id 필수");
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof newBody === "string") patch.body = newBody.slice(0, 500);
      if (typeof publish_at === "string" && publish_at) patch.publish_at = publish_at;
      if (status === "ready" || status === "draft") {
        patch.status = status;
        patch.error_message = null;
      }
      if (typeof pause_reason === "string") {
        patch.pause_reason = pause_reason.slice(0, 500) || null;
      }
      const { error } = await supabase
        .from("social_publish_queue")
        .update(patch)
        .eq("id", id)
        .in("status", ["ready", "failed", "draft"]);
      if (error) throw error;
      return json({ success: true });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
