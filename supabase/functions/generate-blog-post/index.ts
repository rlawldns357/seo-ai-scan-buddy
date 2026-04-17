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

// 3명의 SEO 키워드 기반 필진이 돌아가며 작성
const AUTHORS = [
  { name: "검색최적화 연구소", title: "SEO 전략 분석가", style: "데이터 기반의 분석적 관점으로 글을 작성합니다. 구체적인 수치와 사례를 중시하며, 실무자가 바로 적용할 수 있는 액션 아이템을 제시합니다." },
  { name: "콘텐츠 전략가", title: "콘텐츠 마케팅 전문가", style: "사용자 경험 중심으로 글을 작성합니다. 읽기 쉬운 구조와 비유를 활용하며, 마케팅 관점에서 SEO를 풀어냅니다." },
  { name: "크롤링 마스터", title: "테크니컬 SEO 엔지니어", style: "기술적 깊이가 있는 글을 작성합니다. 코드 예시와 설정 가이드를 포함하며, 개발자와 SEO 담당자 모두를 위한 콘텐츠를 만듭니다." },
];

function getKSTDateString(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function slugify(text: string): string {
  const date = getKSTDateString().replace(/-/g, "");
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

    const today = getKSTDateString();
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

[시점 기준]
오늘 날짜: ${today}, 현재 연도: ${currentYear}년. 모든 콘텐츠는 ${currentYear}년 기준. 2024/2025년 같은 과거 연도 사용 금지.

[최근 발행 글 — 중복 절대 금지]
${recentTitleList}
위 제목과 30% 이상 유사한 주제·구성 금지. 새로운 시각·독창적 사례 필수.

[필수 콘텐츠 구조 — 모두 1개 이상 포함]
1. **표(table)**: 비교/체크리스트/단계별 정리 중 1개 이상을 마크다운 표(| 헤더 | ... | + |---|---|)로 작성
2. **숫자 리스트**: "1. ", "2. " 형태의 순서 있는 리스트 1개 이상
3. **불릿 리스트**: "- " 형태의 리스트 2개 이상
4. **코드블록 또는 인용**: 실제 예시(HTML/JSON-LD/robots.txt/스키마/명령어) ```언어 ... ``` 1개 이상, 또는 권위 있는 출처 인용 "> "
5. **H2(##) 4개 이상, H3(###) 적절히 활용** — 위계 명확히

[네이버 C-Rank · D.I.A. 알고리즘 대응 — 신빙성 핵심]
- **출처(Source) 신뢰성**: 단정적 주장에는 출처 또는 근거(공식 문서/통계/실측 사례)를 본문에 명시. 추측·"~라고 한다" 표현 지양.
- **D.I.A. (Deep Intent Analysis)**: 사용자 검색 의도의 표층("무엇")을 넘어 심층("왜·어떻게·다음 행동")까지 답변. 직접 경험·실측 수치·구체 사례 1개 이상 포함.
- **C-Rank (Creator/Context/Chain)**: 주제 일관성을 유지하고, 본문 내 SearchTune OS 관련 내부 링크(예: [무료 분석](/) 또는 [관련 가이드](/blog)) 1개 이상 자연스럽게 삽입.
- **정보 충실도**: 핵심 키워드를 제목·도입부·H2에 자연스럽게 반복(키워드 스터핑은 금지). 동의어 활용.
- **독창성**: 타 블로그에서 흔히 쓰는 일반론(예: "SEO는 중요하다") 금지. 데이터·체크리스트·실패 사례 등 차별 가치 제공.
- **체류시간 유도**: 도입부 첫 2문장에서 글의 가치(읽고 나면 무엇을 얻는지)를 명시.
- **모바일 가독성**: 한 단락 3-5문장 이내. 긴 문장은 2개로 분할.

[작성 규칙]
- 한국어, 마크다운(##, ###, 1. , - , > , **굵게**, ```코드```, | 표 |)
- 빈 볼드(****) · 연속 별표 · 의미 없는 마크다운 금지
- 분량 1,800-3,000자(공백 제외 기준 약 1,500자 이상)
- readTime: "3분", "4분", "5분" 중 하나
- 본문에 FAQ 섹션 포함 금지 (FAQ는 별도 필드로 생성)
- 마지막 문단: SearchTune OS 무료 분석을 자연스럽게 권유 (강매 톤 금지)
- 네이버 + 구글 + AI 검색엔진(ChatGPT/Perplexity/Cue:) 모두 고려
- ${currentYear}년 시점으로 모든 연도 표기`;

    const userPrompt = `주제: "${theme}" (카테고리: ${category})

위 주제로 전문적인 블로그 글을 작성해주세요. 위 시스템 규칙(특히 표·숫자리스트·코드블록·내부링크·D.I.A. 깊이·출처 신빙성)을 모두 충족해야 합니다.

요청 필드:
- title: 한국어, SEO 친화적, 매력적 (핵심 키워드 포함)
- excerpt: 2-3문장 요약 (160자 이내, 검색결과 노출용 — 클릭 유도 메시지 포함)
- readTime: "3분" / "4분" / "5분" 중 하나
- content: 본문 마크다운 (FAQ 제외, 표·숫자리스트·코드블록·내부링크 모두 포함)
- faqs: 5-7개. 사용자가 실제 검색할 법한 구체적 질문 + 2-4문장의 명확한 답변(근거/예시 포함)`;

    // === Quality validators (네이버 C-Rank/D.I.A. 대응) ===
    function validateQuality(content: string, faqs: any[]): string[] {
      const issues: string[] = [];
      const len = content.length;
      if (len < 1500) issues.push(`본문이 너무 짧습니다(${len}자). 최소 1,500자 필요.`);
      const h2Count = (content.match(/^##\s+/gm) || []).length;
      if (h2Count < 4) issues.push(`H2(##) 개수가 부족합니다(${h2Count}개). 최소 4개 필요.`);
      // 표 검증: |---| 구분선 또는 최소 2행 이상의 | 셀
      const hasTable = /\n\s*\|[^\n]+\|\s*\n\s*\|[\s:|-]+\|/.test(content);
      if (!hasTable) issues.push("마크다운 표(| ... |\\n|---|---|)가 없습니다. 비교/정리용 표 1개 이상 필요.");
      // 숫자 리스트 검증 (연속 2개 이상)
      const olMatches = content.match(/^\s*\d+\.\s+.+$/gm) || [];
      if (olMatches.length < 2) issues.push(`숫자 리스트(1. 2. ...) 항목이 부족합니다(${olMatches.length}개). 2개 이상 필요.`);
      // 코드블록 또는 인용 — 둘 중 하나라도 있어야 함
      const hasCode = /```[\s\S]+?```/.test(content);
      const hasQuote = /^>\s+/m.test(content);
      if (!hasCode && !hasQuote) issues.push("코드블록(```) 또는 인용(>) 중 최소 1개가 필요합니다.");
      // 내부 링크 (/, /blog, /about 등)
      const hasInternalLink = /\]\(\/(blog|about)?[)#?]/.test(content) || /\]\(\/[^)]*\)/.test(content);
      if (!hasInternalLink) issues.push("내부 링크([텍스트](/...)) 1개 이상 필요.");
      // FAQ 개수
      if (!faqs || faqs.length < 5) issues.push(`FAQ가 부족합니다(${faqs?.length || 0}개). 최소 5개 필요.`);
      return issues;
    }

    async function callAI(extraInstruction = ""): Promise<any> {
      const finalSystem = extraInstruction
        ? `${systemPrompt}\n\n[이전 시도 피드백 — 반드시 보완]\n${extraInstruction}`
        : systemPrompt;
      const r = await fetch(
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
              { role: "system", content: finalSystem },
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
                      readTime: { type: "string", enum: ["3분", "4분", "5분"], description: "Read time" },
                      content: { type: "string", description: "Full markdown content in Korean, WITHOUT FAQ section. MUST include table, numbered list, code/quote, internal link." },
                      faqs: {
                        type: "array",
                        description: "5-7 frequently asked questions related to the topic",
                        items: {
                          type: "object",
                          properties: {
                            question: { type: "string", description: "FAQ question in Korean" },
                            answer: { type: "string", description: "FAQ answer in Korean, 2-4 sentences with evidence/examples" },
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
            tool_choice: { type: "function", function: { name: "create_blog_post" } },
          }),
        }
      );

      if (!r.ok) {
        const errText = await r.text();
        console.error("AI gateway error:", r.status, errText);
        if (r.status === 429) throw new Error("RATE_LIMITED");
        if (r.status === 402) throw new Error("CREDITS_EXHAUSTED");
        throw new Error(`AI gateway returned ${r.status}`);
      }
      const data = await r.json();
      const tc = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) throw new Error("No tool call in AI response");
      return JSON.parse(tc.function.arguments);
    }

    // === Generate with quality retry (max 2 retries = 3 attempts) ===
    let args: any;
    let issues: string[] = [];
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    let lastFeedback = "";
    while (attempt < MAX_ATTEMPTS) {
      attempt++;
      try {
        args = await callAI(lastFeedback);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "RATE_LIMITED") {
          return new Response(JSON.stringify({ error: "Rate limited, please try again later" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (msg === "CREDITS_EXHAUSTED") {
          return new Response(JSON.stringify({ error: "Credits exhausted" }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        throw e;
      }

      // YEAR fix
      const wrongYearPattern = /\b(2024|2025)\b년?/g;
      if (wrongYearPattern.test(args.title)) {
        args.title = args.title.replace(/\b(2024|2025)\b(년?)/g, `${currentYear}$2`);
      }
      if (wrongYearPattern.test(args.content)) {
        args.content = args.content.replace(/\b(2024|2025)\b(년?)/g, `${currentYear}$2`);
      }

      // Validate
      issues = validateQuality(args.content, args.faqs || []);
      console.log(`[Attempt ${attempt}] quality issues:`, issues);
      if (issues.length === 0) break;
      if (attempt >= MAX_ATTEMPTS) {
        console.warn(`Max attempts reached. Publishing with remaining issues: ${issues.join(" | ")}`);
        break;
      }
      lastFeedback = "다음 항목들이 누락되어 재작성합니다. 반드시 모두 충족하세요:\n- " + issues.join("\n- ");
    }

    // Clean content
    let cleanedContent = stripFaqFromContent(args.content);
    cleanedContent = cleanMarkdownArtifacts(cleanedContent);

    if (cleanedContent.length < 500) {
      throw new Error(`Generated content too short (${cleanedContent.length} chars).`);
    }

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

    // Explicitly set published: true to prevent default issues
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
        published: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to insert post: ${insertError.message}`);
    }

    console.log(`Blog post created: ${slug} by ${author.name}`);

    // Generate OG image (fire-and-forget)
    try {
      const ogRes = await fetch(`${supabaseUrl}/functions/v1/generate-og-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ slug, title: args.title, category }),
      });
      const ogData = await ogRes.json();
      console.log("OG image generation:", ogData);
    } catch (e) {
      console.warn("OG image generation failed (non-blocking):", e);
    }

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
