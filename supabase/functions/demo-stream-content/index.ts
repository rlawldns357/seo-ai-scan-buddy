// Demo-only streaming content generation for internal team showcase.
// - SSE token streaming for visible "live typing" effect
// - No DB writes; ephemeral
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Mode = "recommend" | "draft" | "score";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const mode: Mode = body.mode;
    const siteUrl: string = body.siteUrl || "";
    const topic: string = body.topic || "";
    const axis: string = body.axis || "SEO";
    const draftMd: string = body.draft || "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let system = "";
    let user = "";

    if (mode === "recommend") {
      system = `당신은 SEO/AEO/GEO 전략가입니다. 한국어로 사이트에 적합한 콘텐츠 토픽 3개를 추천합니다.
각 토픽은 정확히 다음 JSON 라인 형식으로만 출력하세요(설명 금지):
{"axis":"SEO|AEO|GEO","title":"60자 이내","reason":"40자 이내 한 줄"}
세 줄을 줄바꿈으로 구분하여 출력하세요.`;
      user = `사이트: ${siteUrl || "데모 사이트"}
3가지 축(SEO 검색노출 / AEO 답변채택 / GEO AI인용)에 각각 1개씩, 총 3개의 토픽을 추천하세요.`;
    } else if (mode === "draft") {
      system = `당신은 한국어 SEO/AEO/GEO 콘텐츠 전문가입니다. 2026년 기준 검색 엔진과 AI 검색(ChatGPT, Perplexity, Gemini)에서 잘 인용되도록 작성합니다.
- 마크다운 본문만 출력 (제목 H1 포함)
- H2(##) 3~5개, 각 섹션 2~3문단
- 직접 답변형 도입부 (AEO 친화)
- 구체적 수치/예시
- 1200~2000자
- 다른 메타 텍스트나 코드펜스 금지`;
      user = `사이트: ${siteUrl || "데모"}\n타겟 축: ${axis}\n주제: ${topic}\n\n위 정보로 발행 가능한 마크다운 본문을 작성하세요.`;
    } else if (mode === "score") {
      // Score is non-streaming JSON via tool call; use a separate path
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "당신은 콘텐츠를 SEO/AEO/GEO 3축으로 0~100점 채점하는 평가자입니다." },
            { role: "user", content: `다음 마크다운 콘텐츠를 채점하고 각 축별 1줄 코멘트를 한국어로 제공하세요.\n\n${draftMd.slice(0, 8000)}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "score_content",
              description: "Score the draft on three axes",
              parameters: {
                type: "object",
                properties: {
                  seo: { type: "object", properties: { score: { type: "integer" }, comment: { type: "string" } }, required: ["score", "comment"], additionalProperties: false },
                  aeo: { type: "object", properties: { score: { type: "integer" }, comment: { type: "string" } }, required: ["score", "comment"], additionalProperties: false },
                  geo: { type: "object", properties: { score: { type: "integer" }, comment: { type: "string" } }, required: ["score", "comment"], additionalProperties: false },
                },
                required: ["seo", "aeo", "geo"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "score_content" } },
        }),
      });
      if (resp.status === 429 || resp.status === 402) {
        return new Response(JSON.stringify({ error: resp.status === 429 ? "Rate limit" : "Credits exhausted" }), {
          status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!resp.ok) {
        const t = await resp.text();
        console.error("score gateway", resp.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await resp.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      const parsed = args ? JSON.parse(args) : { seo: { score: 70, comment: "" }, aeo: { score: 65, comment: "" }, geo: { score: 55, comment: "" } };
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ error: "invalid mode" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming branches: recommend & draft
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: true,
      }),
    });

    if (upstream.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Please retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (upstream.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!upstream.ok || !upstream.body) {
      const t = await upstream.text();
      console.error("stream gateway", upstream.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("demo-stream-content error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
