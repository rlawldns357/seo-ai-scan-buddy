import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOPICS = [
  {
    category: "SEO",
    themes: [
      "Core Web Vitals 최적화 전략",
      "기술적 SEO 체크리스트",
      "사이트 속도 개선 방법",
      "모바일 SEO 최적화",
      "내부 링크 구조 설계",
      "이미지 SEO 최적화",
      "국제 SEO (hreflang) 설정",
      "사이트맵 최적화 전략",
      "캐노니컬 태그 활용법",
      "검색 콘솔 활용 가이드",
      "네이버 서치어드바이저 활용 팁",
      "네이버 검색 알고리즘 이해",
      "구글 알고리즘 업데이트 대응",
      "E-E-A-T 신호 강화 방법",
      "로컬 SEO 최적화",
      "SSL/HTTPS가 SEO에 미치는 영향",
      "robots.txt 고급 설정법",
      "페이지 경험 시그널 최적화",
    ],
  },
  {
    category: "AEO",
    themes: [
      "AI 답변 엔진의 콘텐츠 선택 기준",
      "ChatGPT에 내 콘텐츠 인용시키기",
      "Perplexity AI 최적화 전략",
      "뤼튼(Wrtn)에서 브랜드 노출하기",
      "FAQ 마크업으로 AEO 점수 올리기",
      "Q&A 콘텐츠 구조화 전략",
      "AI가 선호하는 콘텐츠 형식",
      "음성 검색 최적화와 AEO",
      "Featured Snippet 획득 전략",
      "지식 패널 최적화",
    ],
  },
  {
    category: "GEO",
    themes: [
      "Google SGE 대응 전략",
      "Naver Cue: 최적화 방법",
      "Bing Copilot에서 인용되기",
      "AI 크롤러 관리 전략",
      "생성형 검색 시대의 콘텐츠 전략",
      "AI 검색에서의 브랜드 권위 구축",
      "구조화 데이터와 GEO의 관계",
      "클로바X(Clova X) SEO 전략",
      "멀티모달 AI 검색 대비",
    ],
  },
  {
    category: "가이드",
    themes: [
      "2026년 검색 마케팅 트렌드",
      "소규모 비즈니스 SEO 시작 가이드",
      "콘텐츠 마케팅과 SEO 통합 전략",
      "경쟁사 분석으로 SEO 개선하기",
      "키워드 리서치 완벽 가이드",
      "백링크 구축 전략",
      "콘텐츠 업데이트 전략",
      "SEO·AEO·GEO 통합 점검 방법",
      "웹사이트 리뉴얼 시 SEO 유지 전략",
      "SaaS 기업을 위한 SEO 가이드",
    ],
  },
];

function slugify(text: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return `${base}-${date}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().slice(0, 10);
    const MAX_POSTS_PER_DAY = 2;

    // Check daily limit
    const { data: todayPosts } = await supabase
      .from("blog_posts")
      .select("id, title")
      .eq("date", today);

    if (todayPosts && todayPosts.length >= MAX_POSTS_PER_DAY) {
      return new Response(
        JSON.stringify({ success: false, message: `Already generated ${MAX_POSTS_PER_DAY} posts today` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recent titles to avoid duplicate themes
    const { data: recentPosts } = await supabase
      .from("blog_posts")
      .select("title")
      .order("date", { ascending: false })
      .limit(30);

    const recentTitles = (recentPosts || []).map((p) => p.title.toLowerCase());

    // Pick a theme that hasn't been covered recently
    const allThemes = TOPICS.flatMap((t) =>
      t.themes.map((theme) => ({ category: t.category, theme }))
    );

    // Shuffle and find first non-duplicate
    const shuffled = allThemes.sort(() => Math.random() - 0.5);
    const pick = shuffled.find(
      (t) => !recentTitles.some((title) => title.includes(t.theme.slice(0, 8).toLowerCase()))
    ) || shuffled[0];

    const { category, theme } = pick;

    console.log(`Generating blog post: [${category}] ${theme}`);

    const systemPrompt = `당신은 SEO, AEO(Answer Engine Optimization), GEO(Generative Engine Optimization) 전문가이자 기술 블로그 작가입니다. 
한국어로 블로그 글을 작성합니다. SearchTune OS라는 SEO/AEO/GEO 분석 도구의 블로그에 게시될 전문적인 콘텐츠를 생성하세요.

중요: 오늘 날짜는 ${today}입니다. 현재 연도는 ${new Date().getFullYear()}년입니다. 모든 콘텐츠는 반드시 ${new Date().getFullYear()}년 기준으로 작성하세요. 2024년, 2025년 등 과거 연도를 사용하지 마세요.

규칙:
1. 반드시 한국어로 작성
2. 마크다운 형식 사용 (## 제목, ### 소제목, - 리스트, > 인용, **굵게**)
3. 실용적이고 액셔너블한 콘텐츠
4. 1500-2500자 분량
5. 읽기 시간은 반드시 "2분", "3분", "4분" 중 하나로 설정 (절대 5분 이상 X)
6. 마지막에 SearchTune OS 사용을 자연스럽게 권유하는 문구 포함
7. 독창적인 인사이트와 구체적인 예시 포함
8. 네이버와 구글 양쪽 검색엔진 모두 고려
9. 연도를 언급할 때는 반드시 ${new Date().getFullYear()}년을 사용`;

    const userPrompt = `주제: "${theme}" (카테고리: ${category})

위 주제로 전문적인 블로그 글을 작성해주세요. 다음 JSON 형식으로 응답하세요:

title: 블로그 제목 (한국어, 매력적이고 SEO 친화적으로)
excerpt: 2-3문장의 요약 (검색 결과에 표시될 설명)
readTime: 예상 읽기 시간 (예: "8분")
content: 본문 (마크다운)
faqs: 주제와 관련된 자주 묻는 질문 5-7개. 각 FAQ는 실제 사용자가 궁금해할 만한 구체적인 질문과 2-3문장의 명확한 답변으로 구성.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_blog_post",
                description: "Create a blog post with structured fields including FAQs",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Blog post title in Korean" },
                    excerpt: { type: "string", description: "2-3 sentence summary in Korean" },
                    readTime: { type: "string", description: "Estimated read time like '8분'" },
                    content: { type: "string", description: "Full markdown content in Korean" },
                    faqs: {
                      type: "array",
                      description: "5-7 frequently asked questions related to the topic",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string", description: "FAQ question in Korean" },
                          answer: { type: "string", description: "FAQ answer in Korean, 2-3 sentences" },
                        },
                        required: ["question", "answer"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["title", "excerpt", "readTime", "content", "faqs"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "create_blog_post" },
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const args = JSON.parse(toolCall.function.arguments);
    const slug = slugify(args.title);

    // Append FAQ section to content if FAQs were generated
    let fullContent = args.content;
    if (args.faqs && args.faqs.length > 0) {
      fullContent += "\n\n## 자주 묻는 질문\n\n";
      for (const faq of args.faqs) {
        fullContent += `### Q. ${faq.question}\n\n${faq.answer}\n\n`;
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        slug,
        title: args.title,
        excerpt: args.excerpt,
        category,
        author: "서치튠 블로거",
        read_time: args.readTime,
        content: fullContent,
        date: today,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to insert post: ${insertError.message}`);
    }

    console.log(`Blog post created: ${slug}`);

    // Submit to IndexNow for faster indexing (fire-and-forget)
    try {
      const indexNowRes = await fetch(`${supabaseUrl}/functions/v1/submit-indexnow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ slug }),
      });
      const indexNowData = await indexNowRes.json();
      console.log("IndexNow submission:", indexNowData);
    } catch (e) {
      console.warn("IndexNow submission failed (non-blocking):", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        post: { slug, title: args.title, category, faqCount: args.faqs?.length || 0 },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating blog post:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
