import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // ── SEO + AEO + GEO 3축 동시 최적화 시스템 프롬프트 ──
    const system = `당신은 한국어 SEO/AEO/GEO 콘텐츠 전문가입니다. 2026년 기준, Google·Naver 검색과 생성형 AI 검색(ChatGPT, Perplexity, Claude, Gemini, Copilot)에서 모두 잘 노출·인용되도록 콘텐츠를 작성합니다.

[3축 동시 최적화 규칙]

▸ SEO (검색엔진 노출)
- H2 소제목 3~5개, 각 H2 아래 2~4문단 + 필요 시 H3 1~2개
- 제목·도입부·H2에 주 키워드를 자연스럽게 1회씩 포함
- 본문 중간에 비교표(마크다운 테이블) 1개 이상 포함 → 리치결과 친화
- 외부 인용은 신뢰출처(공식 문서, 통계, 발표자료)만 [텍스트](URL) 형식으로 1~2회
- 1500~2500자 (공백 제외)

▸ AEO (AI 답변 채택)
- 도입부 첫 문단은 "주제 + 한 문장 직접 답변" (50~80자) → AI가 그대로 인용 가능한 형태
- 각 H2 아래 첫 문장도 결론부터 (역피라미드)
- 자주 묻는 질문 5개를 본문 마지막 별도 ## FAQ 섹션으로 작성 (질문은 사용자가 실제 검색하는 톤으로)
- 정의·수치·기간 등 사실 정보는 명확한 단언형으로

▸ GEO (생성형 AI 인용 친화)
- 사례·구체 수치·연도(2026 기준)·브랜드명·제품명 등 **검증 가능한 엔티티**를 본문에 풍부하게
- "전문가 의견", "공식 발표" 같은 출처 신호 표현 사용
- 비교·장단점·체크리스트 등 AI가 요약하기 좋은 구조 포함
- 모호한 일반화 금지, 항상 구체적으로

[금지]
- 광고성 과장 표현 ("최고의", "유일한" 등 단정 형용사)
- AI가 작성했다는 메타 언급
- 이모지 남발 (제목·H2에 이모지 금지, 본문 내 1~2개만 허용)`;

    const user = `사이트: ${siteUrl || "N/A"}
타겟 축(가중치 우선): ${targetAxis || "SEO"}
주제: ${topic}
${analysisSummary ? `분석 컨텍스트:\n${analysisSummary}` : ""}

위 규칙을 모두 지켜서 한 편의 글을 작성해 JSON으로 반환하세요.

본문(content)은 마크다운으로:
1. 도입부 (직접 답변 1문단)
2. H2 섹션 3~5개 (각 2~4문단, 1개 이상에 비교표 포함)
3. ## FAQ 섹션 (5개 질문)

추가로 키워드(keywords)는 본문 내 자연스러운 백링크 매칭에 사용할 핵심 단어 5~8개를 한국어로 추출해 주세요(중복·조사 제외).`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        tools: [{
          type: "function",
          function: {
            name: "create_post",
            description: "Create SEO/AEO/GEO optimized blog post with FAQ and keywords",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "60자 이내, 주 키워드 포함 SEO 제목" },
                slug: { type: "string", description: "url-friendly english slug, lowercase, hyphens" },
                excerpt: { type: "string", description: "150자 이내 메타 설명형 요약 (검색 결과 노출용)" },
                content: { type: "string", description: "마크다운 본문 (FAQ 섹션 포함)" },
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
                      q: { type: "string", description: "사용자가 실제 검색할 법한 질문" },
                      a: { type: "string", description: "100~200자 직접 답변" },
                    },
                    required: ["q", "a"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "slug", "excerpt", "content", "keywords", "faq"],
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

    // 안전 가드: 누락 필드 보정
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
