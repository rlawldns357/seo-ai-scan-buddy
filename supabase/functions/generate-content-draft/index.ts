import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_SYSTEM_PROMPT = `당신은 한국어 SEO/AEO/GEO 콘텐츠 전문가입니다.`;
const FALLBACK_AUTHORITY = "developers.google.com,searchadvisor.naver.com,schema.org,ko.wikipedia.org";

async function loadEngineConfig(): Promise<{ systemPrompt: string; authorityDomains: string[] }> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase
      .from("autoblog_engine_config")
      .select("config_key, config_value")
      .in("config_key", ["content_system_prompt", "authority_domains"]);
    const map = new Map<string, string>();
    (data || []).forEach((r: { config_key: string; config_value: string }) =>
      map.set(r.config_key, r.config_value)
    );
    return {
      systemPrompt: map.get("content_system_prompt") || FALLBACK_SYSTEM_PROMPT,
      authorityDomains: (map.get("authority_domains") || FALLBACK_AUTHORITY)
        .split(",").map((s) => s.trim()).filter(Boolean),
    };
  } catch (e) {
    console.warn("loadEngineConfig fallback:", e);
    return {
      systemPrompt: FALLBACK_SYSTEM_PROMPT,
      authorityDomains: FALLBACK_AUTHORITY.split(",").map((s) => s.trim()),
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { topic, targetAxis, siteUrl, analysisSummary } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { systemPrompt, authorityDomains } = await loadEngineConfig();

    const authorityGuide = authorityDomains.length
      ? `\n\n[권위 출처 화이트리스트 — 외부 링크는 반드시 아래 도메인 중 하나에서 1개 이상]\n${authorityDomains.join(", ")}`
      : "";

    const user = `사이트: ${siteUrl || "N/A"}
타겟 축(가중치 우선): ${targetAxis || "SEO"}
주제: ${topic}
${analysisSummary ? `분석 컨텍스트:\n${analysisSummary}` : ""}

위 규칙을 모두 지켜서 한 편의 글을 작성해 JSON으로 반환하세요.

본문(content)은 마크다운으로:
1. 도입부 (직접 답변 1문단)
2. H2 섹션 3~5개 (각 2~4문단, 1개 이상에 비교표 포함)
3. 본문 어딘가에 권위 출처 외부 링크 1개 이상 (마크다운 [텍스트](URL))
4. ## FAQ 섹션 (5개 질문)

추가로:
- 키워드(keywords): 본문 내 자연스러운 백링크 매칭에 사용할 핵심 단어 5~8개를 한국어로 추출 (중복·조사 제외)
- 외부 출처(externalCitation): 본문에 실제 사용한 권위 외부 링크 1개 (url, anchor)`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt + authorityGuide },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        tools: [{
          type: "function",
          function: {
            name: "create_post",
            description: "Create SEO/AEO/GEO optimized blog post with FAQ, keywords, and authority citation",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "60자 이내, 주 키워드 포함 SEO 제목" },
                slug: { type: "string", description: "url-friendly english slug, lowercase, hyphens" },
                excerpt: { type: "string", description: "150자 이내 메타 설명형 요약" },
                content: { type: "string", description: "마크다운 본문 (FAQ 섹션 + 권위 외부 링크 포함)" },
                keywords: {
                  type: "array",
                  items: { type: "string" },
                  description: "한국어 핵심 키워드 5~8개 (백링크 매칭용)",
                },
                faq: {
                  type: "array",
                  description: "FAQ 5개 (FAQPage JSON-LD용)",
                  items: {
                    type: "object",
                    properties: {
                      q: { type: "string" },
                      a: { type: "string", description: "100~200자 직접 답변" },
                    },
                    required: ["q", "a"],
                    additionalProperties: false,
                  },
                },
                externalCitation: {
                  type: "object",
                  description: "본문에 사용한 권위 외부 링크 1개",
                  properties: {
                    url: { type: "string" },
                    anchor: { type: "string", description: "본문에 표시한 앵커 텍스트" },
                  },
                  required: ["url", "anchor"],
                  additionalProperties: false,
                },
              },
              required: ["title", "slug", "excerpt", "content", "keywords", "faq", "externalCitation"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "create_post" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit. Please retry shortly." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("No tool call");
    const parsed = JSON.parse(args);

    parsed.keywords = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8) : [];
    parsed.faq = Array.isArray(parsed.faq) ? parsed.faq.slice(0, 8) : [];

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content-draft error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
