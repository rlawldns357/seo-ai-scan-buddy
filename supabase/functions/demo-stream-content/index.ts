// Demo-only streaming content generation for internal team showcase.
// - SSE token streaming for visible "live typing" effect
// - No DB writes; ephemeral
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Mode = "recommend" | "draft" | "score" | "seo-brief";

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
      system = `당신은 이커머스/브랜드 사이트 전문 SEO 전략가입니다. 한국어로, 검색 노출(SEO)을 통해 광고비 없이 신규 매출을 만들 수 있는 콘텐츠 토픽 3개를 추천합니다.
- 구매 의도(commercial / transactional / informational) 키워드를 골고루 활용
- 상품 카테고리, 브랜드 스토리, 비교/리뷰형 중 하나씩 포함 권장
- 각 토픽은 정확히 다음 JSON 라인 형식으로만 출력 (설명 금지):
{"axis":"SEO|AEO|GEO","title":"60자 이내 검색 친화 제목","reason":"40자 이내, 어떤 검색 의도/매출 기여인지"}
세 줄을 줄바꿈으로 구분하여 출력하세요.`;
      user = `이커머스/브랜드 사이트: ${siteUrl || "데모 쇼핑몰"}
3가지 축(SEO 검색노출 / AEO 답변채택 / GEO AI인용)에 각각 1개씩, 총 3개의 토픽을 추천하세요.
모든 토픽은 검색 트래픽 → 상품 페이지 유입 → 매출 전환을 염두에 두어야 합니다.`;
    } else if (mode === "draft") {
      system = `당신은 이커머스/브랜드 콘텐츠 SEO 전문가입니다. 2026년 기준 Google·Naver 검색과 AI 검색(ChatGPT, Perplexity, Gemini)에서 상위 노출되도록 작성합니다.
- 마크다운 본문만 출력 (제목 H1 포함)
- H2(##) 3~5개, 각 섹션 2~3문단
- 도입부는 직접 답변형 + 구매 의도 자극 (AEO 친화)
- 상품/브랜드 관련 롱테일 키워드 자연스럽게 포함
- 구체적 수치, 사용 시나리오, 비교 표/리스트 활용
- 1200~2000자
- 코드펜스나 메타 텍스트 금지`;
      user = `이커머스/브랜드 사이트: ${siteUrl || "데모 쇼핑몰"}\n타겟 축: ${axis}\n주제: ${topic}\n\n검색 노출과 매출 전환을 동시에 노리는 발행 가능한 마크다운 본문을 작성하세요.`;
    } else if (mode === "seo-brief") {
      // SEO 기획 패키지: 주제·제목·메타·키워드·FAQ·구조화 outline 한 번에 (tool call)
      const briefSystem = `당신은 2026년 한국 이커머스/브랜드 SEO 전문가입니다. 주어진 사이트(또는 브랜드/상품 주제)에 대해 구글·네이버 검색과 AI 답변엔진(ChatGPT, Perplexity, Gemini)에서 동시에 노출될 수 있는 발행 직전 단계의 SEO 기획 패키지를 한국어로 만듭니다. 모든 출력은 한국어로, 구매 의도와 자연스러운 롱테일 키워드를 반영하세요.`;
      const userTopicHint = topic ? `\n\n사용자가 직접 지정한 주제: "${topic}"\n이 주제를 중심으로 기획해 주세요.` : `\n\n사용자가 주제를 지정하지 않았습니다. 사이트/브랜드에서 가장 매출 기여도가 높을 토픽 1개를 직접 골라 기획해 주세요.`;
      const briefUser = `사이트: ${siteUrl || "데모 쇼핑몰"}${userTopicHint}`;

      const briefResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: briefSystem },
            { role: "user", content: briefUser },
          ],
          tools: [{
            type: "function",
            function: {
              name: "build_seo_brief",
              description: "Generate full SEO planning package for one blog post",
              parameters: {
                type: "object",
                properties: {
                  topic: { type: "string", description: "최종 선정 주제 (한 문장, 50자 이내)" },
                  intent: { type: "string", enum: ["informational", "commercial", "transactional"], description: "주 검색 의도" },
                  title: { type: "string", description: "검색 친화 H1 제목 (60자 이내, 핵심 키워드 포함)" },
                  metaDescription: { type: "string", description: "메타 설명 (150자 이내, 클릭 유도 + 답변형 도입)" },
                  primaryKeyword: { type: "string", description: "주력 키워드 1개" },
                  secondaryKeywords: { type: "array", items: { type: "string" }, description: "보조/롱테일 키워드 4~6개" },
                  outline: {
                    type: "array",
                    description: "본문 구조 (H2 단위 4~6개)",
                    items: {
                      type: "object",
                      properties: {
                        h2: { type: "string", description: "H2 제목" },
                        points: { type: "array", items: { type: "string" }, description: "이 섹션에서 다룰 핵심 포인트 2~3개" },
                      },
                      required: ["h2", "points"],
                      additionalProperties: false,
                    },
                  },
                  faq: {
                    type: "array",
                    description: "AEO/AI 답변 채택을 노린 FAQ 4~6개",
                    items: {
                      type: "object",
                      properties: {
                        q: { type: "string", description: "사용자 질문 (자연어)" },
                        a: { type: "string", description: "답변 (1~2문장, 직접 답변형)" },
                      },
                      required: ["q", "a"],
                      additionalProperties: false,
                    },
                  },
                  structuredData: {
                    type: "array",
                    items: { type: "string", enum: ["Article", "FAQPage", "Product", "BreadcrumbList", "Organization", "HowTo", "Review"] },
                    description: "이 글에 적용 권장 schema.org 타입 (2~4개)",
                  },
                  internalLinkHints: {
                    type: "array",
                    items: { type: "string" },
                    description: "내부 링크로 연결하면 좋은 페이지 유형/카테고리 힌트 2~4개",
                  },
                },
                required: ["topic", "intent", "title", "metaDescription", "primaryKeyword", "secondaryKeywords", "outline", "faq", "structuredData", "internalLinkHints"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "build_seo_brief" } },
        }),
      });
      if (briefResp.status === 429 || briefResp.status === 402) {
        return new Response(JSON.stringify({ error: briefResp.status === 429 ? "Rate limit" : "Credits exhausted" }), {
          status: briefResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!briefResp.ok) {
        const t = await briefResp.text();
        console.error("brief gateway", briefResp.status, t);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const briefData = await briefResp.json();
      const briefArgs = briefData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!briefArgs) {
        return new Response(JSON.stringify({ error: "Brief generation failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(briefArgs, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
