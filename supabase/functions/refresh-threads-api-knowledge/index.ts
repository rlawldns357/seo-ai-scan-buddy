// Meta Threads Graph API 최신 스펙을 Perplexity(sonar-pro)로 수집 → threads_engine_config.api_knowledge 갱신
// 인증: body.password === ADMIN_PASSWORD 또는 header x-cron-secret === CRON_SECRET
// 갱신 주기: 월 1회 (pg_cron) + 어드민 수동 트리거

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const PROMPT = `너는 Meta Threads Graph API 문서를 정확히 요약하는 기술 리서처다.
오늘 시점(2026년) 기준 공식 Meta Threads Graph API 스펙을 다음 마크다운 구조로 한국어 요약해라:

# Meta Threads Graph API 핵심 스펙 (자동 갱신)

## 게시물 제약
- 텍스트 최대 글자수, 이미지/비디오/캐러셀 한도

## 발행 흐름
- creation → publish 2단계, 미디어 만료 시간

## 답글/리포스트
- in_reply_to, quote_post_id, reply_control 옵션

## 인사이트
- 제공 지표

## 레이트 리밋
- 24h 게시물 수, 답글 포함 호출 수

## 권장 사항
- 훅 위치, 해시태그, 미디어 우대 등 알고리즘 힌트

각 섹션은 불릿으로, 출처 추측 없이 공식 문서 기반 사실만. 절대 거짓말하지 마라. 모르면 "확인 필요"로 표기.`;

async function fetchFromPerplexity(apiKey: string): Promise<string> {
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [{ role: "user", content: PROMPT }],
      temperature: 0.1,
      search_recency_filter: "month",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Perplexity ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  const content = j?.choices?.[0]?.message?.content?.trim() || "";
  if (!content || content.length < 100) throw new Error("Perplexity 응답이 비어있거나 너무 짧습니다");
  return content;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { password } = body as { password?: string };
    const cronSecret = req.headers.get("x-cron-secret");

    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    const expectedCron = Deno.env.get("CRON_SECRET");
    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");

    const isAdmin = adminPassword && password === adminPassword;
    const isCron = expectedCron && cronSecret === expectedCron;
    if (!isAdmin && !isCron) {
      return new Response(JSON.stringify({ error: "인증 실패" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!perplexityKey) throw new Error("PERPLEXITY_API_KEY 없음");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const knowledge = await fetchFromPerplexity(perplexityKey);
    const now = new Date().toISOString();

    const { error: upErr } = await supabase
      .from("threads_engine_config")
      .update({
        api_knowledge: knowledge,
        api_knowledge_updated_at: now,
        updated_at: now,
      })
      .eq("config_key", "threads_engine");
    if (upErr) throw upErr;

    // 시스템 메시지로 채팅 로그에 기록
    await supabase.from("threads_engine_chat").insert({
      role: "system",
      content: `📡 Meta Threads Graph API 지식 베이스를 최신 스펙으로 갱신했습니다. (${knowledge.length}자)`,
      version_at: null,
    });

    return new Response(JSON.stringify({
      success: true,
      length: knowledge.length,
      updated_at: now,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
