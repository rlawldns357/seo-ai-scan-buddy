// 블로그 글 → Threads 자동 생성/큐 적재
// 인증: body.password === ADMIN_PASSWORD 또는 header x-cron-secret === CRON_SECRET
// 동작:
//  1) 활성 Threads 계정 1개 선택
//  2) blog_posts(published=true) 중 최근 30일 내 Threads에 안 올린 글 N개 픽업
//     - 중복 체크: social_publish_queue.body에 슬러그 마커가 포함됐는지 확인
//     - 우선순위: featured DESC, view 적은 것 우선이 아니라 신규성(date DESC) + 미사용
//  3) Lovable AI(gemini-3-flash-preview)로 Threads용 훅 1줄(120자 이내) 생성
//  4) UTM 붙인 링크 + 훅 + 링크 형태로 social_publish_queue에 적재
//  5) publish_at은 오늘 KST 10:00 / 14:00 / 19:00 등으로 분산

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SITE_BASE = "https://www.searchtuneos.com";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// KST 기준 발행 시간 슬롯 (시간만, 분=0)
const KST_SLOTS = [10, 14, 19];

function kstSlotToUtcIso(hourKst: number, baseDate = new Date()): string {
  // KST = UTC+9. 오늘 KST 날짜 기준 hourKst:00:00 → UTC로 환산
  // 가장 가까운 미래 슬롯을 잡되, 지난 시간이면 내일로
  const now = new Date(baseDate);
  // KST 현재 시각
  const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const target = new Date(Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
    hourKst,
    0,
    0,
  ));
  // target은 "KST 자정 기준의 시간"을 UTC로 표현한 것 → -9h
  const utcTarget = new Date(target.getTime() - 9 * 3600 * 1000);
  if (utcTarget.getTime() <= now.getTime()) {
    utcTarget.setUTCDate(utcTarget.getUTCDate() + 1);
  }
  return utcTarget.toISOString();
}

async function generateHook(title: string, excerpt: string, category: string, apiKey: string, engineRules: string, engineVersion: string): Promise<string> {
  const prompt = `너는 한국어 Threads 카피라이터다. 아래 블로그 글을 클릭하게 만드는 훅 1줄을 작성해라.

[룰 엔진 ${engineVersion}]
${engineRules}

[블로그 글]
제목: ${title}
카테고리: ${category}
요약: ${excerpt}

훅만 출력해라.`;

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI 게이트웨이 실패 ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content?.trim() || "";
  return text || `${title}\n👉`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { password, count: requestedCount } = body as { password?: string; count?: number };
    const cronSecret = req.headers.get("x-cron-secret");

    const adminPassword = Deno.env.get("ADMIN_PASSWORD");
    const expectedCron = Deno.env.get("CRON_SECRET");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    const isAdmin = adminPassword && password === adminPassword;
    const isCron = expectedCron && cronSecret === expectedCron;
    if (!isAdmin && !isCron) {
      return new Response(JSON.stringify({ error: "인증 실패" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!lovableKey) throw new Error("LOVABLE_API_KEY 없음");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) 활성 Threads 계정
    const { data: account, error: accErr } = await supabase
      .from("social_accounts")
      .select("id, username")
      .eq("platform", "threads")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (accErr || !account) throw new Error("활성 Threads 계정이 없습니다");

    // 1-b) 룰 엔진 설정 로드
    const { data: engineCfg } = await supabase
      .from("threads_engine_config")
      .select("rules, version_major, version_minor")
      .eq("config_key", "threads_engine")
      .maybeSingle();
    const engineRules = engineCfg?.rules || "한국어 120자 이내, 이모지 1~2개, 끝에 👉";
    const engineVersion = engineCfg ? `v${engineCfg.version_major}.${engineCfg.version_minor}` : "v1.0";

    const count = Math.min(Math.max(requestedCount ?? KST_SLOTS.length, 1), KST_SLOTS.length);

    // 2) 최근 큐(성공/대기/실패 전부)에 들어간 슬러그들 — 30일 이내
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("social_publish_queue")
      .select("body")
      .eq("platform", "threads")
      .gte("created_at", since);
    const usedSlugs = new Set<string>();
    for (const r of recent || []) {
      const m = String(r.body || "").match(/utm_campaign=([a-z0-9-]+)/i);
      if (m) usedSlugs.add(m[1]);
    }

    // 3) 후보 블로그 글 (published=true) 최신순
    const { data: posts, error: postsErr } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, category")
      .eq("published", true)
      .order("date", { ascending: false })
      .limit(50);
    if (postsErr) throw postsErr;

    const candidates = (posts || []).filter(p => !usedSlugs.has(p.slug)).slice(0, count);
    if (candidates.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, message: "발행할 새 글 없음 (최근 30일 내 모두 사용됨)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) 각 글마다 훅 생성 + 큐 적재
    const now = new Date();
    const inserted: Array<{ slug: string; publish_at: string }> = [];
    for (let i = 0; i < candidates.length; i++) {
      const post = candidates[i];
      const url = `${SITE_BASE}/blog/${post.slug}/?utm_source=threads&utm_medium=social&utm_campaign=${post.slug}`;

      let hook = "";
      try {
        hook = await generateHook(post.title, post.excerpt || "", post.category || "SEO", lovableKey, engineRules, engineVersion);
      } catch (e) {
        hook = `${post.title}\n👉`;
      }
      const text = `${hook}\n${url}`.slice(0, 480); // Threads 500자 한도 여유

      const publishAt = kstSlotToUtcIso(KST_SLOTS[i % KST_SLOTS.length], now);

      const { error: insErr } = await supabase
        .from("social_publish_queue")
        .insert({
          account_id: account.id,
          platform: "threads",
          body: text,
          media_type: "TEXT",
          publish_at: publishAt,
          status: "ready",
        });
      if (!insErr) inserted.push({ slug: post.slug, publish_at: publishAt });
    }

    return new Response(JSON.stringify({ inserted: inserted.length, items: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
