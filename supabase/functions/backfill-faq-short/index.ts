import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD")!;

async function generateFaqShort(title: string, content: string): Promise<any[]> {
  const truncated = (content || "").slice(0, 8000);
  const prompt = `다음 블로그 글을 읽고, 독자가 가볍게 스캔할 수 있는 **친근한 톤의 짧은 FAQ 3~4개**를 만들어주세요.

규칙:
- 답변은 1~2문장, 친근한 구어체 (~예요, ~해요)
- 이모지 1개 자연스럽게 포함
- **내부 링크 규칙(필수)**: FAQ 전체에서 마크다운 내부 링크를 **1~2개** 자연스럽게 삽입할 것.
  - 허용 경로만 사용: \`/\` (무료 진단), \`/blog\` (블로그 더 보기), \`/about\` (서비스 소개)
  - 외부 링크(http/https) 절대 금지
  - 예시: 👉 [무료 진단](/), [블로그 더 보기](/blog), [서비스 소개](/about)
- 본문 핵심 메시지 기반, 새 정보 만들지 말 것
- JSON 배열만 출력 (마크다운 코드펜스 금지)

출력 형식 예시 (반드시 키 이름은 "q"와 "a"로):
[
  {"q": "...", "a": "..."},
  ...
]

제목: ${title}

본문:
${truncated}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`AI Gateway error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  let text = data.choices?.[0]?.message?.content || "";
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error("AI did not return an array");
  // Normalize: accept either {q,a} or {question,answer}; output {q,a}
  const filtered = parsed
    .map((x: any) => {
      const q = typeof x?.q === "string" ? x.q : (typeof x?.question === "string" ? x.question : null);
      const a = typeof x?.a === "string" ? x.a : (typeof x?.answer === "string" ? x.answer : null);
      return q && a ? { q, a } : null;
    })
    .filter(Boolean);
  if (filtered.length < 2) throw new Error("Too few valid FAQ items");
  return filtered.slice(0, 4);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { password, slug, id, all, limit = 10, overwrite = false } = body;

    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "인증 실패" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve target posts
    let query = supabase
      .from("blog_posts")
      .select("id, slug, title, content, faq_short")
      .eq("published", true);

    if (id) query = query.eq("id", id);
    else if (slug) query = query.eq("slug", slug);
    else if (all) {
      if (!overwrite) query = query.is("faq_short", null);
      query = query.order("date", { ascending: false }).limit(Math.min(limit, 50));
    } else {
      return new Response(
        JSON.stringify({ error: "slug, id, 또는 all=true 중 하나가 필요합니다" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: posts, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;
    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ message: "대상 글이 없습니다", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: any[] = [];
    for (const post of posts) {
      if (!overwrite && post.faq_short) {
        results.push({ slug: post.slug, status: "skipped", reason: "already has faq_short" });
        continue;
      }
      try {
        const faqShort = await generateFaqShort(post.title, post.content);
        const { error: updateErr } = await supabase
          .from("blog_posts")
          .update({ faq_short: faqShort })
          .eq("id", post.id);
        if (updateErr) throw updateErr;
        results.push({ slug: post.slug, status: "success", count: faqShort.length });
      } catch (e: any) {
        results.push({ slug: post.slug, status: "error", error: e.message });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        success: results.filter((r) => r.status === "success").length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "서버 오류" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
