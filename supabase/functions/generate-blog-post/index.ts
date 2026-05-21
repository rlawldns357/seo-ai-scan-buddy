import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { loadNaverRulebook } from "../_shared/naver-rulebook.ts";
import { logApiCost, extractUsage } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// 자체 SEO/AEO/GEO 채점 통과 임계 (평균)
const QUALITY_PASS_THRESHOLD = 70;
const MAX_QUALITY_RETRIES = 0; // 임계 미달 시 추가 재시도 (타임아웃 방지로 0)
const ENABLE_FRESH_REFERENCES = true; // Firecrawl로 최신 레퍼런스 1~2개 자동 수집

/**
 * 토픽 풀.
 * 룰: 일정 비율(BRAND_TOPIC_RATIO)은 명확한 브랜드 키워드(ChatGPT/Claude/Naver/Google 등)가
 * 들어간 토픽을 우선 선택해서 브랜드 인지 OG/썸네일이 나오도록 한다.
 */
const TOPICS = [
  {
    category: "SEO",
    themes: [
      // 일반 SEO
      "Core Web Vitals 최적화 전략",
      "기술적 SEO 체크리스트",
      "사이트 속도 개선 방법",
      "모바일 SEO 최적화",
      "내부 링크 구조 설계",
      "이미지 SEO 최적화",
      "국제 SEO (hreflang) 설정",
      "사이트맵 최적화 전략",
      "캐노니컬 태그 활용법",
      "E-E-A-T 신호 강화 방법",
      "로컬 SEO 최적화",
      "SSL/HTTPS가 SEO에 미치는 영향",
      "robots.txt 고급 설정법",
      "페이지 경험 시그널 최적화",
      // 브랜드 친화
      "Google Search Console 활용 가이드",
      "Google Core Web Vitals 최신 대응",
      "네이버 서치어드바이저 활용 팁",
      "네이버 검색 알고리즘 이해",
      "Naver D.I.A. 2.0 콘텐츠 최적화",
      "Cafe24 쇼핑몰 SEO 핵심 체크리스트",
      "imweb 사이트 SEO 최적화 가이드",
    ],
  },
  {
    category: "AEO",
    themes: [
      // 일반 AEO
      "AI 답변 엔진의 콘텐츠 선택 기준",
      "FAQ 마크업으로 AEO 점수 올리기",
      "Q&A 콘텐츠 구조화 전략",
      "AI가 선호하는 콘텐츠 형식",
      "음성 검색 최적화와 AEO",
      "Featured Snippet 획득 전략",
      "지식 패널 최적화",
      // 브랜드 친화
      "ChatGPT에 내 콘텐츠 인용시키기",
      "ChatGPT Search 최적화 완벽 가이드",
      "Claude가 신뢰하는 콘텐츠 만들기",
      "Perplexity AI 최적화 전략",
      "Perplexity citations에 들어가는 법",
      "뤼튼(Wrtn)에서 브랜드 노출하기",
      "Gemini에 내 페이지 인용시키기",
    ],
  },
  {
    category: "GEO",
    themes: [
      // 일반 GEO
      "AI 크롤러 관리 전략",
      "생성형 검색 시대의 콘텐츠 전략",
      "AI 검색에서의 브랜드 권위 구축",
      "구조화 데이터와 GEO의 관계",
      "멀티모달 AI 검색 대비",
      // 브랜드 친화
      "Google SGE 대응 전략",
      "Google AI Overview 노출 전략",
      "Naver Cue: 최적화 방법",
      "Bing Copilot에서 인용되기",
      "Clova X SEO 전략",
      "ChatGPT vs Gemini: 인용 알고리즘 비교",
    ],
  },
  {
    category: "가이드",
    themes: [
      "올해 검색 마케팅 트렌드",
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

/**
 * 브랜드 친화 토픽 선택 비율.
 * 0.6 = 60% 확률로 명확한 브랜드 키워드(ChatGPT/Claude/Naver/Google/Perplexity/Wrtn/Cafe24/imweb 등)가
 * 들어간 토픽을 우선 선택. 나머지 40%는 일반 토픽.
 */
const BRAND_TOPIC_RATIO = 0.6;

const BRAND_KEYWORDS = [
  "chatgpt", "claude", "gemini", "perplexity", "wrtn", "뤼튼",
  "google", "구글", "naver", "네이버", "cue:", "clova", "클로바",
  "bing", "copilot", "cafe24", "카페24", "imweb", "아임웹",
  "ai overview", "sge", "search console", "서치어드바이저", "d.i.a",
];

function isBrandTopic(theme: string): boolean {
  const lower = theme.toLowerCase();
  return BRAND_KEYWORDS.some((kw) => lower.includes(kw));
}

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

/**
 * Build URL-safe ASCII slug. Naver Webmaster guideline: ASCII-only URLs.
 * Korean chars in URLs cause percent-encoding issues, broken share previews,
 * and Naver indexing failures. AI is now responsible for generating slug_en;
 * this fn validates / sanitizes / falls back.
 */
function buildSafeSlug(slugEn: string | undefined, fallbackTitle: string): string {
  const date = getKSTDateString().replace(/-/g, "");
  // 1) Sanitize AI-provided slug_en (strip non-ASCII just in case)
  const cleaned = (slugEn || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")  // ASCII letters/digits/space/hyphen only
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  // 2) Accept if has >=2 meaningful tokens (avoid single-word junk)
  const tokens = cleaned.split("-").filter((t) => t.length >= 2);
  if (tokens.length >= 2) {
    return `${tokens.join("-")}-${date}`;
  }

  // 3) Fallback: try extract ASCII tokens from title (e.g. "Gemini 3 가이드" → "gemini-3")
  const titleAscii = (fallbackTitle || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const titleTokens = titleAscii.split("-").filter((t) => t.length >= 2);
  if (titleTokens.length >= 2) {
    return `${titleTokens.slice(0, 6).join("-")}-${date}`;
  }

  // 4) Last resort: post-{date}-{6-char hash}
  const hash = Math.random().toString(36).slice(2, 8);
  return `post-${date}-${hash}`;
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

    // Optional bypass for admin/manual triggers + custom topic override
    let forceBypass = false;
    let customTheme: string | undefined;
    let customCategory: string | undefined;
    try {
      const body = await req.clone().json();
      forceBypass = body?.force === true;
      if (typeof body?.theme === "string" && body.theme.trim()) customTheme = body.theme.trim();
      if (typeof body?.category === "string" && body.category.trim()) customCategory = body.category.trim();
    } catch (_) { /* no body */ }

    // Check daily limit
    const { data: todayPosts } = await supabase
      .from("blog_posts")
      .select("id, title, author")
      .eq("date", today);

    if (!forceBypass && todayPosts && todayPosts.length >= MAX_POSTS_PER_DAY) {
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
    // 또한 BRAND_TOPIC_RATIO 확률로 브랜드 키워드가 들어간 토픽을 우선 선택
    // (ChatGPT/Claude/Naver/Google 등 → OG 분할 카드 비주얼이 자동 적용됨)
    const allThemes = TOPICS.flatMap((t) =>
      t.themes.map((theme) => ({ category: t.category, theme, isBrand: isBrandTopic(theme) }))
    );

    const preferBrand = Math.random() < BRAND_TOPIC_RATIO;
    const primaryPool = preferBrand
      ? allThemes.filter((t) => t.isBrand)
      : allThemes.filter((t) => !t.isBrand);
    const fallbackPool = preferBrand
      ? allThemes.filter((t) => !t.isBrand)
      : allThemes.filter((t) => t.isBrand);

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
    const primaryShuffled = shuffle(primaryPool);
    const fallbackShuffled = shuffle(fallbackPool);

    const matchesRecent = (theme: string) =>
      recentTitles.some((title) => title.includes(theme.slice(0, 10).toLowerCase()));

    // 1) 선호 풀에서 최근 중복 + 최근 카테고리 모두 회피
    let pick = primaryShuffled.find((t) => !matchesRecent(t.theme) && !recentCategories.includes(t.category));
    // 2) 선호 풀에서 최근 타이틀만 회피
    if (!pick) pick = primaryShuffled.find((t) => !matchesRecent(t.theme));
    // 3) 폴백 풀에서 최근 타이틀 회피
    if (!pick) pick = fallbackShuffled.find((t) => !matchesRecent(t.theme));
    // 4) 최종 폴백
    if (!pick) pick = primaryShuffled[0] || fallbackShuffled[0] || allThemes[0];

    let { category, theme } = pick;
    if (customTheme) {
      theme = customTheme;
      category = customCategory || category;
      console.log(`[OVERRIDE] Custom theme injected: [${category}] ${theme}`);
    }

    console.log(`Generating blog post: [${category}] ${theme} by ${author.name} (brand=${pick.isBrand}, prefer=${preferBrand})`);

    const recentTitleList = recentTitles.slice(0, 15).join(", ");

    // === (NEW) 최신 레퍼런스 자동 수집: Perplexity sonar (우선) → Firecrawl (폴백) ===
    let freshContext = "";
    let freshSource: "perplexity" | "firecrawl" | "none" = "none";
    if (ENABLE_FRESH_REFERENCES) {
      // 1순위: Perplexity sonar — 실시간 검색 + 인용 URL 자동 수집
      try {
        const pplxKey = Deno.env.get("PERPLEXITY_API_KEY");
        if (pplxKey) {
          const pplxRes = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${pplxKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "sonar",
              messages: [
                {
                  role: "system",
                  content: `You are a research assistant for a Korean SEO/AEO/GEO blog. Find 2-3 credible, recent (last 3 months) facts, statistics, or official guidance about the given topic. Respond in Korean. For each fact, include: (1) the fact itself, (2) the source name, (3) a 1-line context. Do not make up sources.`,
                },
                {
                  role: "user",
                  content: `주제: "${theme}". ${currentYear}년 기준 최신 사실·통계·공식 가이드 2~3개를 한국어로 정리해주세요.`,
                },
              ],
              search_recency_filter: "month",
              temperature: 0.2,
              max_tokens: 600,
            }),
          });
          if (pplxRes.ok) {
            const pplxData = await pplxRes.json();
            const content = pplxData.choices?.[0]?.message?.content as string | undefined;
            const citations: string[] = Array.isArray(pplxData.citations) ? pplxData.citations.slice(0, 5) : [];
            const u = extractUsage(pplxData);
            logApiCost({ function_name: "generate-blog-post", model: "sonar", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { theme } });
            if (content && content.trim().length > 50) {
              freshContext =
                `[Perplexity 실시간 리서치]\n${content.trim()}` +
                (citations.length > 0 ? `\n\n인용 출처:\n${citations.map((u, i) => `[${i + 1}] ${u}`).join("\n")}` : "");
              freshSource = "perplexity";
              console.log(`[Perplexity] 리서치 완료, 인용 ${citations.length}개`);
            }
          } else {
            console.warn("[Perplexity] failed:", pplxRes.status);
          }
        }
      } catch (e) {
        console.warn("[Perplexity] non-blocking error:", e);
      }

      // 2순위: Firecrawl 폴백
      if (!freshContext) {
        try {
          const fcKey = Deno.env.get("FIRECRAWL_API_KEY");
          if (fcKey) {
            const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
              method: "POST",
              headers: { Authorization: `Bearer ${fcKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                query: `${theme} ${currentYear}`,
                limit: 3,
                lang: "ko",
                country: "kr",
                tbs: "qdr:m",
              }),
            });
            if (fcRes.ok) {
              const fcData = await fcRes.json();
              const results = (fcData?.data || fcData?.web?.results || []).slice(0, 2);
              logApiCost({ function_name: "generate-blog-post", model: "firecrawl/search", requests: 1, metadata: { query: theme } });
              if (Array.isArray(results) && results.length > 0) {
                freshContext = results
                  .map((r: any, i: number) => `[참고 ${i + 1}] ${r.title || ""}\n출처: ${r.url || ""}\n요약: ${(r.description || r.snippet || "").slice(0, 220)}`)
                  .join("\n\n");
                freshSource = "firecrawl";
                console.log(`[Firecrawl 폴백] ${results.length}개 최신 레퍼런스 수집 완료`);
              }
            } else {
              console.warn("[Firecrawl] search failed:", fcRes.status);
            }
          }
        } catch (e) {
          console.warn("[Firecrawl] non-blocking error:", e);
        }
      }
    }

    // 네이버 웹마스터 공식 룰북 로드 (모든 자동 생성 글에 강제 주입)
    const naverRulebook = await loadNaverRulebook(supabase);

    const systemPrompt = `당신은 "${author.name}" (${author.title})입니다. ${author.style}
SearchTune OS라는 SEO/AEO/GEO 분석 도구의 블로그에 게시될 전문적인 콘텐츠를 생성하세요.

[시점 기준]
오늘 날짜: ${today}, 현재 연도: ${currentYear}년. 내부 참고용 최신 연도는 ${currentYear}년이며, 2024~${currentYear}년 자료만 인용. 단, **제목·도입부·본문에서 "${currentYear}년"을 반복적으로 노출하지 말 것** (필요할 때 1회만, 보통은 생략). 과거 연도(2024/2025) 단정도 금지.

[최근 발행 글 — 중복 절대 금지]
${recentTitleList}
위 제목과 30% 이상 유사한 주제·구성 금지. 새로운 시각·독창적 사례 필수.
**제목 다양성 규칙 (엄격)**:
- 위 최근 제목들과 동일/유사한 패턴 금지. 특히 "${currentYear}년 OO: △△ N단계 가이드", "${currentYear}년 OO N가지 전략" 같은 정형 구조 연속 사용 금지.
- 제목 첫머리에 "${currentYear}년"으로 시작 금지. 연도가 꼭 필요하면 부제·괄호로 빼거나 생략.
- 매번 다른 형태로: 질문형("왜 …은 …인가"), 단언형("…의 진짜 이유"), 비교형("A vs B"), 사례형("…했더니 …"), How-to("…하는 법"), 체크리스트형, 미신 깨기형 등 회전.
- "N단계 가이드 / N가지 전략 / 완벽 가이드 / 백서 / 실전 가이드" 같은 클리셰 표현은 최근 5개 제목 중 1회 이하로 제한.

[논리·사실성 가드 — 매우 중요]
- **억지·과장·근거 없는 단정 금지**. "X하면 트래픽 N배"처럼 입증 불가한 인과 주장 금지.
- **단정과 추정 구분**: 검증된 사실은 "~입니다"로, 일반론·추정은 "~인 경우가 많습니다 / ~로 알려져 있습니다"로 표기.
- **수치를 쓸 땐 출처 명기**: "Google 공식 문서에 따르면", "Search Console 도움말 기준" 등 발행처를 본문에 직접 표시. 출처 불명 수치는 쓰지 말 것.
- **모순·논리 비약 금지**: 도입 → 본론 → 결론이 한 흐름이어야 함. 같은 단락에서 상반된 주장 금지.
- **공허한 일반론 금지**: "SEO는 중요합니다", "콘텐츠가 핵심입니다" 같은 누구나 아는 문장 금지. 항상 구체 행동·사례·수치로 치환.
- **모든 주장에 다음 중 1개 이상 첨부**: (a) 공식 문서/통계 출처, (b) 구체 코드/설정 예시, (c) 실측 사례 수치, (d) 체크리스트.
${freshContext ? `\n[참고 자료 — 사실성 강화용 (직접 인용 시 출처 명기 필수, 표절 금지)]\n${freshContext}\n` : ""}

[필수 콘텐츠 구조 — 모두 1개 이상 포함]
1. **TL;DR 박스 (글 시작 직후)**: 도입 1문단 다음에 반드시 \`> **TL;DR**\\n>\\n> - 핵심 포인트 1\\n> - 핵심 포인트 2\\n> - 핵심 포인트 3\` 형식의 인용 박스로 3줄 핵심 요약. 글을 읽지 않아도 핵심을 잡게 하는 것이 목적.
2. **표(table)**: 비교/체크리스트/단계별 정리 중 1개 이상을 마크다운 표(| 헤더 | ... | + |---|---|)로 작성
3. **숫자 리스트**: "1. ", "2. " 형태의 순서 있는 리스트 1개 이상 (단계별 가이드 권장)
4. **불릿 리스트**: "- " 형태의 리스트 2개 이상
5. **코드블록 또는 인용**: 실제 예시(HTML/JSON-LD/robots.txt/스키마/명령어) \`\`\`언어 ... \`\`\` 1개 이상, 또는 권위 있는 출처 인용 "> "
6. **H2(##) 4개 이상, H3(###) 적절히 활용** — 위계 명확히
7. **본문 중간 CTA (자연 삽입)**: 본문 약 60~70% 지점에 자연스러운 한 문단으로 SearchTune OS 무료 진단 안내. 반드시 \`> 💡 **잠깐, 우리 사이트도 점검해 볼까요?**\`로 시작하는 인용 박스 형태로, 마지막에 \`👉 [무료 SEO·AEO·GEO 진단 받기](/)\` 링크 포함. 강매 톤 절대 금지, 자연스러운 흐름 유지.
8. **마무리 체크리스트 (글 끝)**: 결론 단락 직전 \`## ✅ 실행 체크리스트\` H2 + 5~7개 항목 \`- [ ] 항목명\` GitHub 스타일 체크박스 리스트. 독자가 바로 적용할 수 있게 구체적으로.

[네이버 C-Rank · D.I.A. 알고리즘 대응 — 신빙성 핵심]
- **출처(Source) 신뢰성**: 단정적 주장에는 출처 또는 근거(공식 문서/통계/실측 사례)를 본문에 명시. 추측·"~라고 한다" 표현 지양.
- **D.I.A. (Deep Intent Analysis)**: 사용자 검색 의도의 표층("무엇")을 넘어 심층("왜·어떻게·다음 행동")까지 답변. 직접 경험·실측 수치·구체 사례 1개 이상 포함.
- **C-Rank (Creator/Context/Chain)**: 주제 일관성을 유지하고, 본문 내 SearchTune OS 관련 내부 링크(예: [무료 분석](/) 또는 [관련 가이드](/blog)) 1개 이상 자연스럽게 삽입.
- **정보 충실도**: 핵심 키워드를 제목·도입부·H2에 자연스럽게 반복(키워드 스터핑은 금지). 동의어 활용.
- **독창성**: 타 블로그에서 흔히 쓰는 일반론(예: "SEO는 중요하다") 금지. 데이터·체크리스트·실패 사례 등 차별 가치 제공.
- **체류시간 유도**: 도입부 첫 2문장에서 글의 가치(읽고 나면 무엇을 얻는지)를 명시.
- **모바일 가독성**: 한 단락 3-5문장 이내. 긴 문장은 2개로 분할.

[작성 규칙]
- 한국어, 마크다운(##, ###, 1. , - , > , **굵게**, \`\`\`코드\`\`\`, | 표 |)
- 빈 볼드(****) · 연속 별표 · 의미 없는 마크다운 금지
- 분량 1,800-3,000자(공백 제외 기준 약 1,500자 이상)
- readTime: "3분", "4분", "5분" 중 하나
- 본문에 FAQ 섹션 포함 금지 (FAQ는 별도 필드로 생성)
- 마지막 문단: SearchTune OS 무료 분석을 자연스럽게 권유 (강매 톤 금지)
- 네이버 + 구글 + AI 검색엔진(ChatGPT/Perplexity/Cue:) 모두 고려
- ${currentYear}년 시점으로 모든 연도 표기

[FAQ 톤 분리 — 매우 중요]
- **faqs (본문용, 전문가 톤)**: 5-6개. 깊이 있는 분석가 어조. 각 답변 3-5문장. 반드시 데이터·통계·실제 사례·공식 문서 근거 중 1개 이상 포함. 격식 있는 문체("~합니다", "~입니다"). CTA 문구 절대 금지.
- **faqs_short (아코디언용, 친근 톤)**: 3-4개. 카페/SNS 어조처럼 친근하고 캐주얼. 각 답변 1-2문장. 끝에 자연스럽게 CTA 유도 문구 포함(예: "👉 [무료 진단해 보세요](/)", "지금 바로 점검해 보세요 ✨"). 친근한 문체("~예요", "~거든요", 이모지 1-2개 활용). faqs와 질문이 겹쳐도 OK — 답변 톤만 확실히 다르게.
- **faqs_short 내부 링크 규칙 (필수)**: 전체 faqs_short 답변을 합쳐서 마크다운 내부 링크 1~2개를 자연스럽게 삽입할 것. 사용 가능한 경로: \`/\` (무료 진단), \`/blog\` (관련 글 더보기), \`/about\` (서비스 소개). 형식 예: "👉 [무료 진단 받기](/)", "[다른 글도 읽어보기](/blog)". 외부 링크(http/https)나 존재하지 않는 경로는 절대 사용 금지. CTA 문구를 링크화하면 자연스러움.

---
[네이버 웹마스터 공식 룰북 — 모든 작성 규칙의 베이스]
${naverRulebook}

위 룰북은 절대 무시 불가. 본문/FAQ/링크/이미지 안내 등 모든 출력에서 다음을 강제 준수:
- 단일 H1 (제목 외 본문 H1 추가 금지), 시맨틱 위계 H2/H3
- 이미지 언급 시 alt 텍스트 필수 ("이미지 설명 + alt"로 가이드)
- 앵커 텍스트는 페이지 대표 키워드 ("여기 클릭"/"더보기" 같은 무의미 앵커 절대 금지)
- 코드 예시로 robots.txt/JSON-LD/og 태그 등을 보여줄 때는 네이버 룰북에 부합하는 모범 예시만 출력`;

    const userPrompt = `주제: "${theme}" (카테고리: ${category})

위 주제로 전문적인 블로그 글을 작성해주세요. 위 시스템 규칙(특히 표·숫자리스트·코드블록·내부링크·D.I.A. 깊이·출처 신빙성, 그리고 FAQ 톤 분리)을 모두 충족해야 합니다.

요청 필드:
- title: 한국어, SEO 친화적, 매력적 (핵심 키워드 포함). **"${currentYear}년"으로 시작 금지**, "N단계 가이드/N가지 전략/완벽 가이드" 같은 클리셰 회피, 최근 발행 제목과 구조·패턴이 겹치지 않게 다른 형태(질문형/비교형/사례형/단언형/How-to 등)로 작성.
- excerpt: 2-3문장 요약 (160자 이내, 검색결과 노출용 — 클릭 유도 메시지 포함)
- readTime: "3분" / "4분" / "5분" 중 하나
- content: 본문 마크다운 (FAQ 제외, 표·숫자리스트·코드블록·내부링크 모두 포함)
- faqs: 5-6개 (본문 노출용, 전문가 톤, 3-5문장 답변, 데이터/근거 포함, CTA 금지)
- faqs_short: 3-4개 (하단 아코디언용, 친근 톤, 1-2문장, 이모지+CTA 유도 문구 포함, 전체적으로 내부 링크 1~2개 자연 삽입: /, /blog, /about 만 허용)`;

    // === Quality validators (네이버 C-Rank/D.I.A. 대응) ===
    function validateQuality(content: string, faqs: any[], faqsShort: any[]): string[] {
      const issues: string[] = [];
      const len = content.length;
      if (len < 1500) issues.push(`본문이 너무 짧습니다(${len}자). 최소 1,500자 필요.`);
      const h2Count = (content.match(/^##\s+/gm) || []).length;
      if (h2Count < 4) issues.push(`H2(##) 개수가 부족합니다(${h2Count}개). 최소 4개 필요.`);
      const hasTable = /\n\s*\|[^\n]+\|\s*\n\s*\|[\s:|-]+\|/.test(content);
      if (!hasTable) issues.push("마크다운 표(| ... |\\n|---|---|)가 없습니다. 비교/정리용 표 1개 이상 필요.");
      const olMatches = content.match(/^\s*\d+\.\s+.+$/gm) || [];
      if (olMatches.length < 2) issues.push(`숫자 리스트(1. 2. ...) 항목이 부족합니다(${olMatches.length}개). 2개 이상 필요.`);
      const hasCode = /```[\s\S]+?```/.test(content);
      const hasQuote = /^>\s+/m.test(content);
      if (!hasCode && !hasQuote) issues.push("코드블록(```) 또는 인용(>) 중 최소 1개가 필요합니다.");
      const hasInternalLink = /\]\(\/(blog|about)?[)#?]/.test(content) || /\]\(\/[^)]*\)/.test(content);
      if (!hasInternalLink) issues.push("내부 링크([텍스트](/...)) 1개 이상 필요.");

      // === (NEW) 시각 컴포넌트 룰북 검증 ===
      // 1) TL;DR 박스 (글 시작 부근)
      const hasTldr = /TL;?DR/i.test(content.slice(0, 1000));
      if (!hasTldr) issues.push("TL;DR 인용 박스(글 시작 부근)가 없습니다. `> **TL;DR**` 형식 필요.");

      // 2) 본문 중간 CTA (자연스러운 인용 박스 + 무료 진단 링크)
      const hasMidCta =
        (/💡/.test(content) && /\]\(\/\)/.test(content)) ||
        (/잠깐[^\n]{0,30}점검/.test(content) && /\]\(\/\)/.test(content));
      if (!hasMidCta) issues.push("본문 중간 CTA 박스(`> 💡 **잠깐, 우리 사이트도 점검해 볼까요?**` + `[무료 진단](/)`)가 없습니다.");

      // 3) 마무리 체크리스트 (GitHub 체크박스)
      const checkboxCount = (content.match(/^\s*-\s*\[\s\]\s+/gm) || []).length;
      if (checkboxCount < 4) issues.push(`마무리 체크리스트 항목이 부족합니다(${checkboxCount}개). \`- [ ] 항목\` 5~7개 필요.`);

      if (!faqs || faqs.length < 5) issues.push(`본문 FAQ가 부족합니다(${faqs?.length || 0}개). 최소 5개 필요.`);
      if (!faqsShort || faqsShort.length < 3) issues.push(`아코디언용 faqs_short가 부족합니다(${faqsShort?.length || 0}개). 최소 3개 필요.`);
      // 톤 분리 검증: faqs_short 답변 평균 길이가 본문 faqs보다 짧아야 함
      if (faqs?.length && faqsShort?.length) {
        const avgFaqLen = faqs.reduce((s, f) => s + (f.answer?.length || 0), 0) / faqs.length;
        const avgShortLen = faqsShort.reduce((s, f) => s + (f.answer?.length || 0), 0) / faqsShort.length;
        if (avgShortLen >= avgFaqLen) {
          issues.push(`faqs_short가 본문 faqs보다 길거나 같습니다(short 평균 ${Math.round(avgShortLen)}자 / faqs 평균 ${Math.round(avgFaqLen)}자). 짧고 친근하게 다시 작성하세요.`);
        }
      }
      // faqs_short 내부 링크 검증: 전체 답변에서 1~2개 내부 링크 필요, 외부 링크 금지
      if (faqsShort?.length) {
        const allShortAnswers = faqsShort.map((f: any) => f.answer || "").join("\n");
        const internalLinks = allShortAnswers.match(/\]\(\/(?:blog|about)?(?:[/?#)][^)]*)?\)/g) || [];
        const externalLinks = allShortAnswers.match(/\]\(https?:\/\/[^)]+\)/g) || [];
        if (internalLinks.length < 1) {
          issues.push(`faqs_short 전체에 내부 링크([텍스트](/), (/blog), (/about))가 1개 이상 필요합니다(현재 ${internalLinks.length}개).`);
        }
        if (internalLinks.length > 3) {
          issues.push(`faqs_short 내부 링크가 너무 많습니다(${internalLinks.length}개). 1~2개 권장, 최대 3개.`);
        }
        if (externalLinks.length > 0) {
          issues.push(`faqs_short에 외부 링크가 포함되어 있습니다(${externalLinks.length}개). 내부 링크(/, /blog, /about)만 허용됩니다.`);
        }
      }
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
            model: "google/gemini-2.5-pro",
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
                      slug_en: {
                        type: "string",
                        description: "URL slug in ENGLISH ONLY — lowercase ASCII letters, digits, hyphens. NO Korean, NO spaces, NO underscores. 3-7 meaningful tokens that summarize the topic in English (translate Korean concepts: '네이버'→'naver', '카페24'→'cafe24', '아임웹'→'imweb', '구글'→'google', '검색최적화'→'seo', '답변최적화'→'aeo', '생성형'→'generative', '가이드'→'guide', '전략'→'strategy', '비교'→'comparison', '체크리스트'→'checklist'). Examples: 'naver-seo-checklist-2026', 'cafe24-aeo-strategy', 'gemini-vs-chatgpt-content'. Length 15-60 chars.",
                        pattern: "^[a-z0-9]+(-[a-z0-9]+)*$",
                      },
                      excerpt: { type: "string", description: "2-3 sentence summary in Korean, max 160 chars" },
                      readTime: { type: "string", enum: ["3분", "4분", "5분"], description: "Read time" },
                      content: { type: "string", description: "Full markdown content in Korean, WITHOUT FAQ section. MUST include ALL of these visual components: (1) `> **TL;DR**` blockquote with 3 bullets right after intro, (2) markdown table, (3) numbered list, (4) code block or quote, (5) internal link, (6) mid-content CTA blockquote `> 💡 **잠깐, 우리 사이트도 점검해 볼까요?**` with `[무료 SEO·AEO·GEO 진단 받기](/)` link at ~60-70% position, (7) `## ✅ 실행 체크리스트` H2 with 5-7 `- [ ] item` GitHub-style checkboxes before conclusion." },
                      faqs: {
                        type: "array",
                        description: "5-6 expert-tone FAQs for body content. Formal voice, 3-5 sentences each, MUST cite data/stats/sources. NO CTA phrases.",
                        items: {
                          type: "object",
                          properties: {
                            question: { type: "string", description: "FAQ question in Korean" },
                            answer: { type: "string", description: "Expert FAQ answer in Korean, 3-5 sentences with data/sources/examples. Formal tone (~합니다)." },
                          },
                          required: ["question", "answer"],
                          additionalProperties: false,
                        },
                      },
                      faqs_short: {
                        type: "array",
                        description: "3-4 friendly-tone FAQs for accordion. Casual voice with emojis, 1-2 sentences each, end with CTA. Across all answers combined, MUST include 1-2 internal markdown links to allowed paths only: /, /blog, /about. NO external (http/https) links.",
                        items: {
                          type: "object",
                          properties: {
                            question: { type: "string", description: "FAQ question in Korean, casual voice" },
                            answer: { type: "string", description: "Short friendly answer in Korean, 1-2 sentences with emoji. Casual tone (~예요, ~거든요). Embed internal markdown links like '👉 [무료 진단 받기](/)' or '[다른 글 더 보기](/blog)' where natural — only /, /blog, /about allowed. Across all faqs_short combined: 1-2 internal links total." },
                          },
                          required: ["question", "answer"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["title", "slug_en", "excerpt", "readTime", "content", "faqs", "faqs_short"],
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
      const u = extractUsage(data);
      logApiCost({ function_name: "generate-blog-post", model: "google/gemini-2.5-pro", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { stage: "draft" } });
      const tc = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) throw new Error("No tool call in AI response");
      return JSON.parse(tc.function.arguments);
    }

    // === (NEW) 자체 SEO/AEO/GEO 채점 (별도 AI 콜, 결정성 위해 temperature=0) ===
    async function scoreContent(title: string, content: string, faqs: any[]): Promise<{
      seo: number; aeo: number; geo: number; avg: number;
      weaknesses: string[]; tips: string[];
    } | null> {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            temperature: 0,
            messages: [
              {
                role: "system",
                content: `당신은 SearchTune OS의 콘텐츠 품질 평가관입니다. SEO/AEO/GEO 3축으로 0-100 점수를 매깁니다.
- SEO: 검색 노출 적합성 (제목·H2 키워드, 구조, 길이, 가독성, 내부링크)
- AEO: AI 답변 채택 가능성 (직접 답변 문장, FAQ 깊이, 인용 친화 문장 밀도)
- GEO: 생성형 검색 인용도 (출처·근거·수치, 구조화 데이터 친화성, 자기완결 문장)
엄격하게 채점하세요. 일반론·근거 부족·논리 비약은 강하게 감점.`,
              },
              {
                role: "user",
                content: `[제목]\n${title}\n\n[본문]\n${content.slice(0, 8000)}\n\n[FAQ 개수]\n${faqs?.length || 0}\n\n위 글을 채점하고, 가장 약한 축 2개와 즉시 보완할 팁 3개를 반환하세요.`,
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "score_blog",
                description: "Return SEO/AEO/GEO scores and improvement tips",
                parameters: {
                  type: "object",
                  properties: {
                    seo: { type: "integer", minimum: 0, maximum: 100 },
                    aeo: { type: "integer", minimum: 0, maximum: 100 },
                    geo: { type: "integer", minimum: 0, maximum: 100 },
                    weaknesses: { type: "array", items: { type: "string" }, description: "약한 축 사유 1-3개" },
                    tips: { type: "array", items: { type: "string" }, description: "즉시 보완 팁 3개" },
                  },
                  required: ["seo", "aeo", "geo", "weaknesses", "tips"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "score_blog" } },
          }),
        });
        if (!r.ok) {
          console.warn("[Self-score] HTTP", r.status);
          return null;
        }
        const d = await r.json();
        const u = extractUsage(d);
        logApiCost({ function_name: "generate-blog-post", model: "google/gemini-3-flash-preview", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { stage: "self-score" } });
        const args = JSON.parse(d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}");
        const seo = Number(args.seo) || 0;
        const aeo = Number(args.aeo) || 0;
        const geo = Number(args.geo) || 0;
        return { seo, aeo, geo, avg: Math.round((seo + aeo + geo) / 3), weaknesses: args.weaknesses || [], tips: args.tips || [] };
      } catch (e) {
        console.warn("[Self-score] error:", e);
        return null;
      }
    }

    // === Generate with quality retry (max 2 retries = 3 attempts) ===
    // Best-result tracking: 재시도가 더 나쁜 결과를 낼 수 있으므로 가장 좋은 시도를 보존
    let args: any;
    let issues: string[] = [];
    let bestArgs: any = null;
    let bestIssues: string[] = [];
    let bestScore = -1; // (content length) - (issues.length * 1000)
    let attempt = 0;
    const MAX_ATTEMPTS = 2; // 타임아웃 방지 (Edge Function ~200s 한계)
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
      issues = validateQuality(args.content, args.faqs || [], args.faqs_short || []);
      console.log(`[Attempt ${attempt}] quality issues:`, issues);

      // Score current attempt and keep best so far
      const score = (args.content?.length || 0) - issues.length * 1000;
      if (score > bestScore) {
        bestScore = score;
        bestArgs = args;
        bestIssues = issues;
      }

      if (issues.length === 0) break;
      if (attempt >= MAX_ATTEMPTS) {
        console.warn(`Max attempts reached. Using best attempt (issues: ${bestIssues.length}, len: ${bestArgs?.content?.length || 0})`);
        args = bestArgs;
        issues = bestIssues;
        break;
      }
      // Provide previous draft as context so AI improves it instead of regenerating shorter
      lastFeedback =
        "이전 작성한 본문을 폐기하지 말고, 아래 누락 항목만 보강하여 더 길고 풍부하게 다시 작성하세요. 본문은 반드시 1,800자 이상이어야 합니다.\n\n" +
        "[이전 본문 일부]\n" + (args.content || "").slice(0, 2000) + "\n\n" +
        "[누락/위반 항목]\n- " + issues.join("\n- ");
    }

    // === (NEW) 자체 채점 + 임계 미달 시 추가 재생성 (최대 MAX_QUALITY_RETRIES회) ===
    let qualityScore: { seo: number; aeo: number; geo: number; avg: number; weaknesses: string[]; tips: string[] } | null = null;
    args = bestArgs || args;
    if (args?.content) {
      let qAttempt = 0;
      while (qAttempt <= MAX_QUALITY_RETRIES) {
        qualityScore = await scoreContent(args.title || "", args.content || "", args.faqs || []);
        if (!qualityScore) break;
        console.log(`[Self-score attempt ${qAttempt + 1}] SEO=${qualityScore.seo} AEO=${qualityScore.aeo} GEO=${qualityScore.geo} avg=${qualityScore.avg}`);
        if (qualityScore.avg >= QUALITY_PASS_THRESHOLD) break;
        if (qAttempt >= MAX_QUALITY_RETRIES) {
          console.warn(`[Self-score] 임계(${QUALITY_PASS_THRESHOLD}) 미달 — 최선본 사용 (avg=${qualityScore.avg})`);
          break;
        }
        // 약점 기반 재생성
        const weaknessFeedback =
          `이전 본문이 자체 채점에서 SEO=${qualityScore.seo}, AEO=${qualityScore.aeo}, GEO=${qualityScore.geo} (평균 ${qualityScore.avg})로 임계 ${QUALITY_PASS_THRESHOLD}점에 미달했습니다.\n\n` +
          `[약점]\n- ${qualityScore.weaknesses.join("\n- ")}\n\n` +
          `[보완 지침]\n- ${qualityScore.tips.join("\n- ")}\n\n` +
          `위 약점을 직접 보완해 다시 작성하세요. 특히 출처 명기, 직접 답변 문장, 자기완결 인용 가능 문장 밀도를 높이세요. 길이는 유지하되 내용 밀도를 올리세요.`;
        try {
          const newArgs = await callAI(weaknessFeedback);
          // 검증도 다시
          const newIssues = validateQuality(newArgs.content, newArgs.faqs || [], newArgs.faqs_short || []);
          if ((newArgs.content?.length || 0) >= 1500 && newIssues.length <= bestIssues.length) {
            args = newArgs;
            bestIssues = newIssues;
          }
        } catch (e) {
          console.warn("[Self-score retry] AI call failed:", e);
          break;
        }
        qAttempt++;
      }
    }

    // Determine if this should be quarantined as failed
    const tooShort = !args || (args.content?.length || 0) < 800;
    const hasIssues = (bestIssues?.length || 0) > 0;
    const lowQuality = qualityScore !== null && qualityScore.avg < QUALITY_PASS_THRESHOLD;
    const isFailed = tooShort || hasIssues || lowQuality;

    // Clean content (use whatever we have)
    let cleanedContent = stripFaqFromContent(args?.content || "");
    cleanedContent = cleanMarkdownArtifacts(cleanedContent);

    // Append structured FAQ section
    let fullContent = cleanedContent;
    if (args?.faqs && args.faqs.length > 0) {
      fullContent += "\n\n## 자주 묻는 질문\n\n";
      for (const faq of args.faqs) {
        const cleanAnswer = cleanMarkdownArtifacts(faq.answer);
        fullContent += `### Q. ${faq.question}\n\n${cleanAnswer}\n\n`;
      }
    }

    const titleForSlug = args?.title || `failed-${theme}`;
    const slug = buildSafeSlug(args?.slug_en, titleForSlug) + (isFailed ? `-failed-${Date.now().toString(36)}` : "");

    const scoreSummary = qualityScore
      ? `[자체점수 SEO ${qualityScore.seo} / AEO ${qualityScore.aeo} / GEO ${qualityScore.geo} / 평균 ${qualityScore.avg}]`
      : "[자체점수 측정 불가]";
    const failureReason = isFailed
      ? (tooShort
          ? `생성된 본문이 너무 짧습니다(${args?.content?.length || 0}자). ${scoreSummary} ${bestIssues.join(" / ")}`
          : `${scoreSummary} ${lowQuality ? `평균 ${qualityScore!.avg}점이 임계 ${QUALITY_PASS_THRESHOLD}점 미만. ` : ""}${bestIssues.join(" / ")}`)
      : null;

    // Normalize faq_short → [{q, a}] for storage
    const faqShortNormalized = Array.isArray(args?.faqs_short)
      ? args.faqs_short
          .filter((f: any) => f?.question && f?.answer)
          .map((f: any) => ({ q: String(f.question).trim(), a: String(f.answer).trim() }))
      : null;

    const { data: inserted, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        slug,
        title: args?.title || `[FAILED] ${theme}`,
        excerpt: (args?.excerpt || "자동 생성 검증 실패").slice(0, 160),
        category,
        author: author.name,
        read_time: args?.readTime || "5분",
        content: fullContent || "(본문 생성 실패)",
        date: today,
        published: !isFailed,
        failure_reason: failureReason,
        failure_attempts: attempt,
        faq_short: faqShortNormalized && faqShortNormalized.length > 0 ? faqShortNormalized : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to insert post: ${insertError.message}`);
    }

    console.log(`Blog post created: ${slug} by ${author.name} ${isFailed ? "[FAILED-QUEUE]" : "[PUBLISHED]"}`);

    // Only generate OG / IndexNow when successfully published
    if (!isFailed) {
      try {
        const ogRes = await fetch(`${supabaseUrl}/functions/v1/generate-og-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ slug, title: args.title, category }),
        });
        const ogData = await ogRes.json();
        console.log("OG image generation:", ogData);
      } catch (e) {
        console.warn("OG image generation failed (non-blocking):", e);
      }

      try {
        const indexNowRes = await fetch(`${supabaseUrl}/functions/v1/submit-indexnow`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ slug }),
        });
        const indexNowData = await indexNowRes.json();
        console.log("IndexNow submission:", indexNowData);
      } catch (e) {
        console.warn("IndexNow submission failed (non-blocking):", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: !isFailed,
        failed: isFailed,
        failureReason,
        post: { id: inserted?.id, slug, title: args?.title, category, author: author.name, faqCount: args?.faqs?.length || 0, faqShortCount: faqShortNormalized?.length || 0 },
        qualityScore,
        usedFreshReferences: !!freshContext,
        freshReferenceSource: freshSource,
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
