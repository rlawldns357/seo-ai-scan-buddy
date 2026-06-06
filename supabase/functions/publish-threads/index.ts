// Threads 자동발행 워커
// - social_publish_queue에서 ready 상태 + publish_at <= now() 항목을 처리
// - status를 publishing으로 선점 후 Meta Threads Graph API 호출
// - 성공: published, 실패: failed + retry_count++
//
// 인증: body.password === ADMIN_PASSWORD 또는 header x-cron-secret === CRON_SECRET
// (verify_jwt=false 로 동작해야 cron에서도 호출 가능)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const THREADS_API = "https://graph.threads.net/v1.0";

// 토큰을 절대 로그에 남기지 않기 위한 sanitizer
function safeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.replace(/access_token=[^&\s"]+/gi, "access_token=***");
}

async function postThreads(path: string, params: Record<string, string>, accessToken: string) {
  const form = new URLSearchParams({ ...params, access_token: accessToken });
  const res = await fetch(`${THREADS_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) {
    const errMsg = json?.error?.message || text || `HTTP ${res.status}`;
    throw new Error(`Threads API ${path} 실패: ${errMsg}`);
  }
  return json;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { password, queueId, force } = body as { password?: string; queueId?: string; force?: boolean };
    const cronSecret = req.headers.get("x-cron-secret");

    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    const expectedCron = Deno.env.get("CRON_SECRET");

    const isAdmin = adminPassword && password === adminPassword;
    const isCron = expectedCron && cronSecret === expectedCron;
    if (!isAdmin && !isCron) {
      return new Response(JSON.stringify({ error: "인증 실패" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) 처리 대상 조회
    // force=true (관리자가 "지금 발행" 클릭): publish_at 무시하고 ready 전체 처리
    let query = supabase
      .from("social_publish_queue")
      .select("*")
      .eq("platform", "threads")
      .eq("status", "ready")
      .order("publish_at", { ascending: true })
      .limit(10);

    if (!force) {
      query = query.lte("publish_at", new Date().toISOString());
    }

    if (queueId) {
      query = supabase
        .from("social_publish_queue")
        .select("*")
        .eq("id", queueId)
        .in("status", ["ready", "failed"])
        .limit(1);
    }

    const { data: rows, error: fetchErr } = await query;
    if (fetchErr) throw new Error(`큐 조회 실패: ${fetchErr.message}`);

    const results: Array<{ id: string; status: string; error?: string; post_id?: string }> = [];

    for (const row of rows || []) {
      // 2) 선점: status='publishing'
      const { data: claimed, error: claimErr } = await supabase
        .from("social_publish_queue")
        .update({ status: "publishing", error_message: null })
        .eq("id", row.id)
        .in("status", ["ready", "failed"])
        .select("id")
        .maybeSingle();
      if (claimErr || !claimed) continue; // 다른 워커가 선점

      try {
        // 3) 계정 토큰
        const { data: account, error: accErr } = await supabase
          .from("social_accounts")
          .select("id, threads_user_id, access_token, status")
          .eq("id", row.account_id)
          .maybeSingle();
        if (accErr || !account) throw new Error("연결된 Threads 계정이 없습니다");
        if (account.status !== "active") throw new Error(`계정 상태가 active가 아님: ${account.status}`);
        if (!account.threads_user_id) throw new Error("threads_user_id가 비어있음");

        // 4) 컨테이너 생성
        const containerParams: Record<string, string> = {
          media_type: row.media_type || "TEXT",
          text: row.body || "",
        };
        if ((row.media_type || "TEXT") === "IMAGE") {
          if (!row.media_url) throw new Error("IMAGE 게시인데 media_url이 비어있음");
          containerParams.image_url = row.media_url;
        }
        const container = await postThreads(
          `/${account.threads_user_id}/threads`,
          containerParams,
          account.access_token,
        );
        const creationId = container?.id;
        if (!creationId) throw new Error("creation_id를 받지 못했습니다");

        await supabase
          .from("social_publish_queue")
          .update({ threads_creation_id: creationId })
          .eq("id", row.id);

        // 5) 게시
        const publishRes = await postThreads(
          `/${account.threads_user_id}/threads_publish`,
          { creation_id: creationId },
          account.access_token,
        );
        const postId = publishRes?.id;
        if (!postId) throw new Error("게시 응답에 id가 없습니다");

        const publishedUrl = account.username
          ? `https://www.threads.net/@${account.username}/post/${postId}`
          : `https://www.threads.net/post/${postId}`;

        await supabase
          .from("social_publish_queue")
          .update({
            status: "published",
            threads_post_id: postId,
            published_url: publishedUrl,
            error_message: null,
          })
          .eq("id", row.id);

        results.push({ id: row.id, status: "published", post_id: postId });
      } catch (e) {
        const msg = safeError(e);
        await supabase
          .from("social_publish_queue")
          .update({
            status: "failed",
            error_message: msg,
            retry_count: (row.retry_count ?? 0) + 1,
          })
          .eq("id", row.id);
        results.push({ id: row.id, status: "failed", error: msg });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: safeError(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
