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

// KST 기준 발행 시간 슬롯 — 하루 10건을 10~19시에 1시간 간격으로 분산
const KST_SLOTS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

// hourKst 슬롯 + dayOffset(오늘 기준 +N일)을 UTC ISO로 변환
function kstSlotToUtcIso(hourKst: number, dayOffset = 0, baseDate = new Date()): string {
  const now = new Date(baseDate);
  const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const target = new Date(Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() + dayOffset,
    hourKst,
    0,
    0,
  ));
  const utcTarget = new Date(target.getTime() - 9 * 3600 * 1000);
  // 과거 시각이면 하루 미루기 (dayOffset=0인 오늘 슬롯이 이미 지났을 때)
  if (utcTarget.getTime() <= now.getTime()) {
    utcTarget.setUTCDate(utcTarget.getUTCDate() + 1);
  }
  return utcTarget.toISOString();
}

type Persona = {
  name: string;
  tagline: string;
  voice: string;
  apiKnowledge: string;
};

async function generateHook(
  title: string, excerpt: string, category: string,
  apiKey: string, engineRules: string, engineVersion: string,
  persona: Persona,
): Promise<string> {
  const prompt = `너는 '${persona.name}' — ${persona.tagline}. 아래 블로그 글을 클릭하게 만드는 Threads 훅 1줄을 너의 말투로 작성해라.

[너의 말투]
${persona.voice}

[Meta Threads Graph API 지식 — 반드시 준수]
${persona.apiKnowledge || "(없음)"}

[룰 엔진 ${engineVersion}]
${engineRules}

[블로그 글]
제목: ${title}
카테고리: ${category}
요약: ${excerpt}

훅만 출력해라. 첫 줄 80자 이내 권장.`;

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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const auth = req.headers.get("authorization") || "";
    const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
    const isAdmin = adminPassword && password === adminPassword;
    const isCron = expectedCron && cronSecret === expectedCron;
    const isService = serviceKey && bearer === serviceKey;
    if (!isAdmin && !isCron && !isService) {
      console.log(`AUTH_FAIL bearer_len=${bearer.length} service_len=${serviceKey?.length||0} cron_hdr_len=${cronSecret?.length||0} expected_cron_len=${expectedCron?.length||0} pw_len=${password?.length||0}`);
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

    // 1-b) 룰 엔진 설정 로드 (캐릭터·API 지식 포함)
    const { data: engineCfg } = await supabase
      .from("threads_engine_config")
      .select("rules, version_major, version_minor, character_name, character_tagline, character_voice, api_knowledge")
      .eq("config_key", "threads_engine")
      .maybeSingle();
    const engineRules = engineCfg?.rules || "한국어 120자 이내, 이모지 1~2개, 끝에 👉";
    const engineVersion = engineCfg ? `v${engineCfg.version_major}.${engineCfg.version_minor}` : "v1.0";
    const persona = {
      name: engineCfg?.character_name || "쓰레디",
      tagline: engineCfg?.character_tagline || "Threads 발행 전문가",
      voice: engineCfg?.character_voice || "친근한 마케터 톤, 반말, 결론 먼저.",
      apiKnowledge: engineCfg?.api_knowledge || "",
    };

    // 1-c) 자동 생성 룰 로드 (테이블 없으면 기본값)
    const { data: autogen } = await supabase
      .from("threads_autogen_settings")
      .select("enabled, daily_count")
      .eq("id", 1)
      .maybeSingle();
    // cron 호출일 때 enabled=false면 스킵
    if (isCron && autogen && autogen.enabled === false) {
      return new Response(JSON.stringify({ inserted: 0, skipped: "autogen disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const defaultCount = autogen?.daily_count ?? 10;
    const count = Math.min(Math.max(requestedCount ?? defaultCount, 1), 30);


    // 2) 최근 큐(성공/대기/실패 전부)에 들어간 슬러그들 — 30일 이내
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from("social_publish_queue")
      .select("body")
      .eq("platform", "threads")
      .gte("created_at", since);
    const slugRe = /\/blog\/([a-z0-9-]+)\/?/i;
    const usedSlugs = new Set<string>();
    for (const r of recent || []) {
      const m = String(r.body || "").match(slugRe);
      if (m) usedSlugs.add(m[1]);
    }

    // 3) 후보 블로그 글 (published=true) 최신순
    const { data: posts, error: postsErr } = await supabase
      .from("blog_posts")
      .select("id, slug, title, excerpt, category")
      .eq("published", true)
      .order("date", { ascending: false })
      .limit(200);
    if (postsErr) throw postsErr;

    const candidates = (posts || []).filter(p => !usedSlugs.has(p.slug)).slice(0, count);
    if (candidates.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, message: "발행할 새 글 없음 (최근 30일 내 모두 사용됨)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) 각 글마다 훅 생성 + draft(킵) 상태로 적재
    //    — 사용자가 체크한 것만 scheduleItem으로 다음 빈 KST 슬롯에 자동 예약됨.
    const now = new Date();
    const inserted: Array<{ slug: string }> = [];
    for (let i = 0; i < candidates.length; i++) {
      const post = candidates[i];
      const url = `${SITE_BASE}/blog/${post.slug}/`;

      let hook = "";
      try {
        hook = await generateHook(post.title, post.excerpt || "", post.category || "SEO", lovableKey, engineRules, engineVersion, persona);
      } catch (_e) {
        hook = `${post.title}\n👉`;
      }
      const text = `${hook}\n${url}`.slice(0, 480);

      const { error: insErr } = await supabase
        .from("social_publish_queue")
        .insert({
          account_id: account.id,
          platform: "threads",
          body: text,
          media_type: "TEXT",
          publish_at: now.toISOString(), // placeholder — 체크 시 재할당
          status: "draft",
          pause_reason: "자동 생성됨 — 체크하면 다음 빈 슬롯에 예약됩니다",
        });
      if (!insErr) inserted.push({ slug: post.slug });
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
