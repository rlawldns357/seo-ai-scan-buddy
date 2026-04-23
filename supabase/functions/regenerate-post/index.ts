import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST_PER_ROLL = 1;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "인증이 필요합니다." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user via JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "유효하지 않은 사용자입니다." }, 401);
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const postId: string | undefined = body.postId;
    if (!postId || typeof postId !== "string") {
      return json({ error: "postId가 필요합니다." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Verify ownership
    const { data: post, error: postErr } = await admin
      .from("site_posts")
      .select("id, site_id, title, slug, content, source_axis, keywords, status, site:user_sites!inner(user_id, site_url, title)")
      .eq("id", postId)
      .single();
    if (postErr || !post) {
      return json({ error: "글을 찾을 수 없습니다." }, 404);
    }
    // @ts-expect-error - joined site
    if (post.site?.user_id !== userId) {
      return json({ error: "권한이 없습니다." }, 403);
    }

    // 2. Check tier & credits
    const { data: tier } = await admin.rpc("get_user_tier", { _user_id: userId });
    const userTier = (tier as string) ?? "free";

    // Ensure credits row exists
    const { data: existingCredits } = await admin
      .from("regeneration_credits")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingCredits) {
      const monthlyQuota = monthlyQuotaForTier(userTier);
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
    if (creditsErr || !credits) {
      return json({ error: "크레딧 정보를 불러올 수 없습니다." }, 500);
    }

    const totalAvailable = (credits.balance ?? 0) + (credits.addon_balance ?? 0);
    if (totalAvailable < COST_PER_ROLL) {
      return json({
        error: "크레딧이 부족합니다.",
        balance: credits.balance,
        addon_balance: credits.addon_balance,
      }, 402);
    }

    // 3. Generate new content via Lovable AI
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return json({ error: "AI 키가 설정되지 않았습니다." }, 500);
    }

    // @ts-expect-error - joined site
    const siteTitle: string = post.site?.title ?? "";
    // @ts-expect-error - joined site
    const siteUrl: string = post.site?.site_url ?? "";
    const axis = post.source_axis ?? "SEO";
    const keywords: string[] = (post.keywords as string[] | null) ?? [];

    const prompt = `당신은 SEO/AEO/GEO 통합 콘텐츠 전문가입니다. 다음 발행 글을 "주사위를 굴려" 완전히 새로운 시각으로 재작성하세요.

[원본 글 정보]
- 사이트: ${siteTitle} (${siteUrl})
- 제목: ${post.title}
- 주축: ${axis}
- 키워드: ${keywords.join(", ") || "없음"}

[원본 본문 발췌]
${(post.content as string).slice(0, 1500)}

[재생성 규칙]
1. 같은 주제·키워드를 유지하되 도입부, 구조, 예시를 완전히 새로 짭니다.
2. 본문은 1,800자 이상, 마크다운 H2/H3로 구조화.
3. AEO를 위해 마지막에 FAQ 3개를 "Q: ... \\nA: ..." 형식으로.
4. 자연스러운 한국어, 광고 톤 금지.

다음 JSON 형식으로만 응답하세요:
{"title":"새 제목","excerpt":"1-2문장 요약","content":"마크다운 본문 전체","faq":[{"q":"...","a":"..."},{"q":"...","a":"..."},{"q":"...","a":"..."}]}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8, // 주사위니까 다양성을 높임
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return json({ error: "AI 호출량이 일시적으로 초과됐어요. 잠시 후 다시 시도해주세요." }, 429);
      }
      if (aiRes.status === 402) {
        return json({ error: "AI 크레딧이 부족해요. 관리자에게 문의해주세요." }, 402);
      }
      return json({ error: "AI 생성에 실패했습니다." }, 500);
    }

    const aiJson = await aiRes.json();
    const raw: string = aiJson.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    let parsed: { title: string; excerpt: string; content: string; faq?: Array<{ q: string; a: string }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Parse fail:", cleaned.slice(0, 500));
      return json({ error: "AI 응답을 해석할 수 없어요." }, 500);
    }
    if (!parsed.title || !parsed.content) {
      return json({ error: "AI 응답에 필수 필드가 없어요." }, 500);
    }

    // 4. Deduct credits (addon first, then balance)
    let newAddon = credits.addon_balance ?? 0;
    let newBalance = credits.balance ?? 0;
    if (newAddon >= COST_PER_ROLL) {
      newAddon -= COST_PER_ROLL;
    } else {
      const fromBalance = COST_PER_ROLL - newAddon;
      newAddon = 0;
      newBalance -= fromBalance;
    }

    await admin
      .from("regeneration_credits")
      .update({ balance: newBalance, addon_balance: newAddon, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    // 5. Update the post
    await admin
      .from("site_posts")
      .update({
        title: parsed.title,
        excerpt: parsed.excerpt ?? null,
        content: parsed.content,
        faq: parsed.faq ?? [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    // 6. Log
    await admin.from("regeneration_log").insert({
      user_id: userId,
      post_id: postId,
      tier: userTier,
      cost_credits: COST_PER_ROLL,
      model_used: "google/gemini-2.5-flash",
    });

    return json({
      ok: true,
      newBalance,
      newAddon,
      post: {
        id: postId,
        title: parsed.title,
        excerpt: parsed.excerpt,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("regenerate-post error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function monthlyQuotaForTier(tier: string): number {
  switch (tier) {
    case "admin":
    case "studio":
      return 999;
    case "pro":
      return 100;
    case "lite":
      return 20;
    case "beta":
      return 10;
    default:
      return 3; // free
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
