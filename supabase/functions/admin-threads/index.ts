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

    if (action === "scheduleItem") {
      const { id } = body;
      if (!id) throw new Error("id 필수");

      // 이미 예약된(ready/publishing) 항목들의 publish_at 수집
      const { data: taken, error: takenErr } = await supabase
        .from("social_publish_queue")
        .select("publish_at")
        .eq("platform", "threads")
        .in("status", ["ready", "publishing"])
        .gte("publish_at", new Date().toISOString());
      if (takenErr) throw takenErr;
      const takenSet = new Set((taken || []).map((t: any) => new Date(t.publish_at).toISOString()));

      // KST 10~19시 슬롯에서 가장 빠른 빈 자리 찾기 (최대 60일)
      const KST_SLOTS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
      const now = new Date();
      const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
      let publishAt: string | null = null;
      for (let day = 0; day < 60 && !publishAt; day++) {
        for (const hour of KST_SLOTS) {
          const target = new Date(Date.UTC(
            kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate() + day,
            hour, 0, 0,
          ));
          const utc = new Date(target.getTime() - 9 * 3600 * 1000);
          if (utc.getTime() <= now.getTime()) continue;
          const iso = utc.toISOString();
          if (takenSet.has(iso)) continue;
          publishAt = iso;
          break;
        }
      }
      if (!publishAt) throw new Error("60일 안에 빈 슬롯이 없습니다");

      const { error } = await supabase
        .from("social_publish_queue")
        .update({
          status: "ready",
          publish_at: publishAt,
          error_message: null,
          pause_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .in("status", ["draft", "failed"]);
      if (error) throw error;
      return json({ success: true, publish_at: publishAt });
    }

    if (action === "unscheduleItem") {
      const { id } = body;
      if (!id) throw new Error("id 필수");
      const { error } = await supabase
        .from("social_publish_queue")
        .update({
          status: "draft",
          pause_reason: "체크 해제됨 — 킵 상태",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .in("status", ["ready", "failed"]);
      if (error) throw error;
      return json({ success: true });
    }

    if (action === "getAutogen") {
      const { data, error } = await supabase
        .from("threads_autogen_settings")
        .select("enabled, daily_count, hour_kst, minute_kst, slot_start_hour_kst, slot_end_hour_kst, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return json({ settings: data });
    }

    if (action === "updateAutogen") {
      const { enabled, daily_count, hour_kst, minute_kst, slot_start_hour_kst, slot_end_hour_kst } = body;
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof enabled === "boolean") patch.enabled = enabled;
      if (typeof daily_count === "number") patch.daily_count = Math.min(30, Math.max(1, daily_count));
      if (typeof hour_kst === "number") patch.hour_kst = Math.min(23, Math.max(0, hour_kst));
      if (typeof minute_kst === "number") patch.minute_kst = Math.min(59, Math.max(0, minute_kst));
      if (typeof slot_start_hour_kst === "number") patch.slot_start_hour_kst = Math.min(23, Math.max(0, slot_start_hour_kst));
      if (typeof slot_end_hour_kst === "number") patch.slot_end_hour_kst = Math.min(23, Math.max(0, slot_end_hour_kst));

      const { error } = await supabase
        .from("threads_autogen_settings")
        .update(patch)
        .eq("id", 1);
      if (error) throw error;

      // cron 스케줄도 같이 갱신
      if (typeof hour_kst === "number" || typeof minute_kst === "number") {
        const { data: cur } = await supabase
          .from("threads_autogen_settings")
          .select("hour_kst, minute_kst")
          .eq("id", 1)
          .maybeSingle();
        if (cur) {
          await supabase.rpc("set_threads_autogen_cron", {
            p_hour: cur.hour_kst,
            p_minute: cur.minute_kst,
          });
        }
      }
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
