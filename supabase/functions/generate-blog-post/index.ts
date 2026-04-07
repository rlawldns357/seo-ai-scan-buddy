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

// 3명의 가상 필진이 돌아가며 작성
const AUTHORS = [
  { name: "김도윤", title: "SEO 전략가", style: "데이터 기반의 분석적 관점으로 글을 작성합니다. 구체적인 수치와 사례를 중시하며, 실무자가 바로 적용할 수 있는 액션 아이템을 제시합니다." },
  { name: "박서연", title: "콘텐츠 마케터", style: "사용자 경험 중심으로 글을 작성합니다. 읽기 쉬운 구조와 비유를 활용하며, 마케팅 관점에서 SEO를 풀어냅니다." },
  { name: "이준혁", title: "테크니컬 SEO 엔지니어", style: "기술적 깊이가 있는 글을 작성합니다. 코드 예시와 설정 가이드를 포함하며, 개발자와 SEO 담당자 모두를 위한 콘텐츠를 만듭니다." },
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

/** Remove FAQ-like sections from AI-generated content to prevent duplication */
function stripFaqFromContent(content: string): string {
  // Remove sections starting with FAQ-related headings (##, ###)
  const faqPatterns = [
    /\n##\s*(?:자주\s*묻는\s*질문|FAQ|Q\s*&\s*A|자주\s*하는\s*질문)[\s\S]*/i,
    /\n---\s*\n\s*(?:자주\s*묻는\s*질문|FAQ)[\s\S]*/i,
  ];
  let cleaned = content;
  for (const pattern of faqPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.trimEnd();
}

/** Clean markdown artifacts like empty bold/italic markers */
function cleanMarkdownArtifacts(content: string): string {
  return content
    .replace(/\*{3,}/g, "**")       // **** or more → **
    .replace(/\*\*\s*\*\*/g, "")    // empty bold **  **
    .replace(/\*\s*\*/g, "")        // empty italic *  *
    .replace(/_{3,}/g, "__")        // ____ → __
    .replace(/__\s*__/g, "")        // empty __ __
    .replace(/\n{4,}/g, "\n\n\n")   // excessive newlines
    .trim();
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
    const currentYear = new Date().getFullYear();
    const MAX_POSTS_PER_DAY = 2;

    // Check daily limit
    const { data: todayPosts } = await supabase
      .from("blog_posts")
      .select("id, title, author")
      .eq("date", today);

    if (todayPosts && todayPosts.length >= MAX_POSTS_PER_DAY) {
      return new Response(
        JSON.stringify({ success: false, message: `Already generated ${MAX_POSTS_PER_DAY} posts today` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch recent titles + content hashes for stronger dedup
    const { data: recentPosts } = await supabase
      .from("blog_posts")
      .select("title, author, category")
      .order("date", { ascending: false })
      .limit(50);

    const recentTitles = (recentPosts || []).map((p) => p.title.toLowerCase());
    const recentCategories = (recentPosts || []).slice(0, 5).map((p) => p.category);
    const recentAuthors = (todayPosts || []).map((p) => p.author);

    // Pick author: avoid same author on same day, then rotate
    const availableAuthors = AUTHORS.filter((a) => !recentAuthors.includes(a.name));
    const author = availableAuthors.length > 0
      ? availableAuthors[Math.floor(Math.random() * availableAuthors.length)]
      : AUTHORS[Math.floor(Math.random() * AUTHORS.length)];

    // Pick a theme: avoid recent titles AND recent categories (prefer variety)
    const allThemes = TOPICS.flatMap((t) =>
      t.themes.map((theme) => ({ category: t.category, theme }))
    );

    const shuffled = allThemes.sort(() => Math.random() - 0.5);
    
    // First try: avoid both recent title AND recent category
    let pick = shuffled.find(
      (t) =>
        !recentTitles.some((title) => title.includes(t.theme.slice(0, 10).toLowerCase())) &&
        !recentCategories.includes(t.category)
    );
    // Fallback: just avoid recent titles
    if (!pick) {
      pick = shuffled.find(
        (t) => !recentTitles.some((title) => title.includes(t.theme.slice(0, 10).toLowerCase()))
      );
    }
    // Final fallback
    if (!pick) pick = shuffled[0];

    const { category, theme } = pick;

    console.log(`Generating blog post: [${category}] ${theme} by ${author.name}`);

    const recentTitleList = recentTitles.slice(0, 15).join(", ");

    const systemPrompt = `당신은 "${author.name}" (${author.title})입니다. ${author.style}
SearchTune OS라는 SEO/AEO/GEO 분석 도구의 블로그에 게시될 전문적인 콘텐츠를 생성하세요.

중요: 오늘 날짜는 ${today}입니다. 현재 연도는 ${currentYear}년입니다. 모든 콘텐츠는 반드시 ${currentYear}년 기준으로 작성하세요. 2024년, 2025년 등 과거 연도를 사용하지 마세요.

최근 발행된 글 제목(중복 방지): ${recentTitleList}
위 제목들과 유사한 내용은 절대 작성하지 마세요. 새로운 시각과 독창적인 관점으로 작성하세요.

규칙:
1. 반드시 한국어로 작성
2. 마크다운 형식: ## 제목, ### 소제목, - 리스트, > 인용, **굵게** 사용
3. 빈 볼드(**  **), 연속 별표(****), 불필요한 마크다운 기호 사용 금지
4. 실용적이고 액셔너블한 콘텐츠
5. 1500-2500자 분량
6. 읽기 시간은 반드시 "2분", "3분", "4분" 중 하나로 설정
7. 마지막에 SearchTune OS 사용을 자연스럽게 권유
8. 본문에 FAQ 섹션을 포함하지 마세요 (FAQ는 별도로 생성됩니다)
9. 네이버와 구글 양쪽 검색엔진 모두 고려
10. 연도를 언급할 때는 반드시 ${currentYear}년을 사용`;

    const userPrompt = `주제: "${theme}" (카테고리: ${category})

위 주제로 전문적인 블로그 글을 작성해주세요. 다음 JSON 형식으로 응답하세요:

title: 블로그 제목 (한국어, 매력적이고 SEO 친화적으로)
excerpt: 2-3문장의 요약 (검색 결과에 표시될 설명, 160자 이내)
readTime: 예상 읽기 시간 ("2분", "3분", "4분" 중 하나)
content: 본문 (마크다운, FAQ 섹션 제외)
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
                    excerpt: { type: "string", description: "2-3 sentence summary in Korean, max 160 chars" },
                    readTime: { type: "string", enum: ["2분", "3분", "4분"], description: "Read time" },
                    content: { type: "string", description: "Full markdown content in Korean, WITHOUT FAQ section" },
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

    // Clean content: strip any FAQ the AI included + fix markdown artifacts
    let cleanedContent = stripFaqFromContent(args.content);
    cleanedContent = cleanMarkdownArtifacts(cleanedContent);

    // Append structured FAQ section
    let fullContent = cleanedContent;
    if (args.faqs && args.faqs.length > 0) {
      fullContent += "\n\n## 자주 묻는 질문\n\n";
      for (const faq of args.faqs) {
        const cleanAnswer = cleanMarkdownArtifacts(faq.answer);
        fullContent += `### Q. ${faq.question}\n\n${cleanAnswer}\n\n`;
      }
    }

    const slug = slugify(args.title);

    const { data: inserted, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        slug,
        title: args.title,
        excerpt: args.excerpt.slice(0, 160),
        category,
        author: author.name,
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

    console.log(`Blog post created: ${slug} by ${author.name}`);

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
        post: { slug, title: args.title, category, author: author.name, faqCount: args.faqs?.length || 0 },
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
