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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");

    const auth = req.headers.get("authorization") || "";
    const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";

    const isAdmin = adminPassword && password === adminPassword;
    const isCron = expectedCron && cronSecret === expectedCron;
    const isService = serviceKey && bearer === serviceKey;
    const cronBearerKeys = [anonKey, publishableKey, publishableKeys]
      .flatMap((value) => (value || "").split(","))
      .map((value) => value.trim())
      .filter(Boolean);
    const isAnonCron = cronBearerKeys.includes(bearer);
    if (!isAdmin && !isCron && !isService && !isAnonCron) {
      console.error(`AUTH_FAIL bearer_len=${bearer.length} anon_len=${anonKey?.length||0} publishable_len=${publishableKey?.length||0} service_len=${serviceKey?.length||0} cron_hdr_len=${cronSecret?.length||0} expected_cron_len=${expectedCron?.length||0}`);
      return new Response(JSON.stringify({ error: "인증 실패" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) 처리 대상 조회
    // force=true (관리자가 "지금 발행" 클릭): publish_at 무시 + draft까지 포함
    //   → Meta Threads API 동시성/rate limit 이슈를 피하기 위해 **한 건만** 처리
    // 일반 cron: publish_at 도달한 ready 항목 중 최대 1건 (분당 1건씩 자연 분산)
    const statuses = force ? ["ready", "draft"] : ["ready"];
    const batchLimit = 1;
    let query = supabase
      .from("social_publish_queue")
      .select("*")
      .eq("platform", "threads")
      .in("status", statuses)
      .order("publish_at", { ascending: true })
      .limit(batchLimit);

    if (!force) {
      query = query.lte("publish_at", new Date().toISOString());
    }

    if (queueId) {
      query = supabase
        .from("social_publish_queue")
        .select("*")
        .eq("id", queueId)
        .in("status", ["ready", "failed", "draft"])
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
        .in("status", ["ready", "failed", "draft"])
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

        // 4) 본문을 `\n---\n` 기준으로 분할 → 첫 글 + 답글 체인
        const segments = String(row.body || "")
          .split(/\n---\n/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (segments.length === 0) throw new Error("본문이 비어있습니다");

        let firstPostId = "";
        let lastPostId = "";

        for (let i = 0; i < segments.length; i++) {
          const text = segments[i];
          const params: Record<string, string> = {
            media_type: i === 0 ? (row.media_type || "TEXT") : "TEXT",
            text,
          };
          if (i === 0 && (row.media_type || "TEXT") === "IMAGE") {
            if (!row.media_url) throw new Error("IMAGE 게시인데 media_url이 비어있음");
            params.image_url = row.media_url;
          }
          if (i > 0 && lastPostId) {
            params.reply_to_id = lastPostId;
          }

          const container = await postThreads(
            `/${account.threads_user_id}/threads`,
            params,
            account.access_token,
          );
          const creationId = container?.id;
          if (!creationId) throw new Error(`세그먼트 ${i + 1} creation_id 없음`);

          if (i === 0) {
            await supabase
              .from("social_publish_queue")
              .update({ threads_creation_id: creationId })
              .eq("id", row.id);
          }

          // Meta 권장: 컨테이너 처리 대기
          await new Promise((r) => setTimeout(r, 3000));

          const publishRes = await postThreads(
            `/${account.threads_user_id}/threads_publish`,
            { creation_id: creationId },
            account.access_token,
          );
          const postId = publishRes?.id;
          if (!postId) throw new Error(`세그먼트 ${i + 1} 게시 응답에 id 없음`);
          lastPostId = postId;
          if (i === 0) firstPostId = postId;
        }

        const postId = firstPostId;
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
