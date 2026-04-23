import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST_PER_ROLL = 1;

type Axis = "SEO" | "AEO" | "GEO";

/** Firecrawl로 사이트 컨텍스트 스크랩 (실패 시 빈 문자열) */
async function scrapeBrandContext(siteUrl: string): Promise<string> {
  const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!fcKey || !siteUrl) return "";
  try {
    const resp = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${fcKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url: siteUrl, formats: ["markdown", "summary"], onlyMainContent: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    const md: string = data?.data?.markdown ?? data?.markdown ?? "";
    const summary: string = data?.data?.summary ?? data?.summary ?? "";
    const title: string = data?.data?.metadata?.title ?? data?.metadata?.title ?? "";
    const desc: string = data?.data?.metadata?.description ?? data?.metadata?.description ?? "";
    const trimmed = md.replace(/\s+/g, " ").slice(0, 2000);
    return [
      title && `제목: ${title}`,
      desc && `설명: ${desc}`,
      summary && `요약: ${summary}`,
      trimmed && `본문 일부: ${trimmed}`,
    ].filter(Boolean).join("\n");
  } catch (e) {
    console.warn("scrapeBrandContext failed", e);
    return "";
  }
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "인증이 필요합니다." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "유효하지 않은 사용자입니다." }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const siteUrl: string = body.siteUrl ?? "";
    const siteTitle: string = body.siteTitle ?? "";
    const axis: Axis = (body.axis as Axis) || "SEO";
    const seed: string = (body.seed ?? "").toString().slice(0, 200);
    const currentTopic: string | undefined = body.currentTopic;
    const avoidTopics: string[] = Array.isArray(body.avoidTopics) ? body.avoidTopics.slice(0, 20) : [];

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Ensure credits row & charge
    const { data: existing } = await admin
      .from("regeneration_credits")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      const { data: tier } = await admin.rpc("get_user_tier", { _user_id: userId });
      const monthlyQuota = monthlyQuotaForTier((tier as string) ?? "free");
      await admin.from("regeneration_credits").insert({
        user_id: userId,
        balance: monthlyQuota,
        monthly_quota: monthlyQuota,
        addon_balance: 0,
      });
    }

    const { data: credits, error: creditsErr } = await admin
      .from("regeneration_credits")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (creditsErr || !credits) return json({ error: "크레딧 정보를 불러올 수 없습니다." }, 500);

    const total = (credits.balance ?? 0) + (credits.addon_balance ?? 0);
    if (total < COST_PER_ROLL) {
      return json({
        error: "크레딧이 부족합니다.",
        balance: credits.balance,
        addon_balance: credits.addon_balance,
      }, 402);
    }

    // 2. Generate new idea via Lovable AI (tool calling for structured output)
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return json({ error: "AI 키가 설정되지 않았습니다." }, 500);

    const axisDesc: Record<Axis, string> = {
      SEO: "검색엔진(Google/Naver) 노출과 트래픽 확보",
      AEO: "AI 답변엔진(ChatGPT, Perplexity 등) 인용·답변 채택",
      GEO: "생성형 AI 검색에서 브랜드/엔티티 가시성",
    };

    const brandContext = await scrapeBrandContext(siteUrl);

    const prompt = `당신은 한국어 SEO/AEO/GEO 콘텐츠 전략가입니다. 다음 사이트의 ${axis} 관점 콘텐츠 주제 1개를 추천하세요.

[사이트] ${siteTitle || "(제목 없음)"} — ${siteUrl || "N/A"}
[축] ${axis} (${axisDesc[axis]})
${brandContext ? `[사이트 컨텍스트 — Firecrawl 스크랩]\n${brandContext}\n` : ""}
${seed ? `[사용자 시드 키워드/관심사] ${seed}` : ""}
${currentTopic ? `[방금 거절된 주제(피해야 함)] ${currentTopic}` : ""}
${avoidTopics.length ? `[기존 추천(중복 금지)] ${avoidTopics.join(" / ")}` : ""}

요구사항:
- 주제는 한국어, 30~50자, 검색되는 실제 단어로 시작
- 반드시 위 사이트 컨텍스트(브랜드명·제품명·카테고리)와 직접 연관 — 일반론 금지
- 광고성/과장 금지, 정보형 가이드 톤
- "이유"는 왜 이 사이트에 효과적인지 1문장(60자 이내), 사이트 컨텍스트 단어를 1개 이상 포함`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.9,
        tools: [{
          type: "function",
          function: {
            name: "suggest_topic",
            description: "단일 콘텐츠 주제 추천",
            parameters: {
              type: "object",
              properties: {
                topic: { type: "string", description: "30~50자 한국어 주제" },
                reason: { type: "string", description: "1문장 추천 이유" },
              },
              required: ["topic", "reason"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "suggest_topic" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) return json({ error: "AI 호출량이 일시적으로 초과됐어요. 잠시 후 다시 시도해주세요." }, 429);
      if (aiRes.status === 402) return json({ error: "AI 크레딧이 부족해요. 관리자에게 문의해주세요." }, 402);
      return json({ error: "AI 생성에 실패했습니다." }, 500);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { topic: string; reason: string } | null = null;
    if (toolCall?.function?.arguments) {
      try { parsed = JSON.parse(toolCall.function.arguments); } catch { /* fallthrough */ }
    }
    if (!parsed?.topic) {
      // fallback to plain text
      const txt: string = aiJson.choices?.[0]?.message?.content ?? "";
      const cleaned = txt.replace(/```json\s*|\s*```/g, "").trim();
      try { parsed = JSON.parse(cleaned); } catch { /* ignore */ }
    }
    if (!parsed?.topic) return json({ error: "AI 응답을 해석할 수 없어요." }, 500);

    // 3. Charge credit (addon first)
    let newAddon = credits.addon_balance ?? 0;
    let newBalance = credits.balance ?? 0;
    if (newAddon >= COST_PER_ROLL) newAddon -= COST_PER_ROLL;
    else { const fromBal = COST_PER_ROLL - newAddon; newAddon = 0; newBalance -= fromBal; }

    await admin
      .from("regeneration_credits")
      .update({ balance: newBalance, addon_balance: newAddon, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    const { data: tier } = await admin.rpc("get_user_tier", { _user_id: userId });
    await admin.from("regeneration_log").insert({
      user_id: userId,
      post_id: null,
      tier: (tier as string) ?? "free",
      cost_credits: COST_PER_ROLL,
      model_used: "google/gemini-2.5-flash:idea",
    });

    return json({
      ok: true,
      topic: parsed.topic.slice(0, 120),
      reason: (parsed.reason ?? "").slice(0, 120),
      axis,
      newBalance,
      newAddon,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("regenerate-idea error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function monthlyQuotaForTier(tier: string): number {
  switch (tier) {
    case "admin":
    case "studio": return 999;
    case "pro": return 100;
    case "lite": return 20;
    case "beta": return 10;
    default: return 3;
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
