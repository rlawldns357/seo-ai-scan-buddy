import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { loadNaverRulebook, isKoreanSite } from "../_shared/naver-rulebook.ts";
import { logApiCost, extractUsage } from "../_shared/cost-logger.ts";
import { normalizeHost, upsertIdentity, logAudit, loadIdentity } from "../_shared/identity-match.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_ANALYSIS_PROMPT = `You are an expert SEO/AEO/GEO analyst. Analyze the following website content and produce a JSON analysis.

## GOOGLE_OFFICIAL_BASELINE_START (2026 — 절대 삭제·변경 금지, 모든 채점의 베이스)

본 채점기는 Google Search Central 공식 가이드(2025-2026)와 정합되어야 합니다. 다음 원칙을 절대 위반하지 마세요:

1) **llms.txt / AI 전용 마크업 / 콘텐츠 청킹 / AI용 키워드 재작성은 "필수 아님"**.
   - 있으면 가점(+소폭), 없다고 감점하지 말 것. SEO/AEO/GEO 어느 축에서도 부재만으로 점수를 깎지 마세요.
   - 관련 issues/fixes에 "llms.txt 추가 필요" 류 문구를 priorityFix로 올리지 마세요 (선택 보강 항목으로만 표기 가능).

2) **AI 검색의 근간은 기존 SEO(RAG + Query Fan-out)**.
   - 신뢰 시그널(저자/조직 정보, 출처 인용, 업데이트 일자, HTTPS, 명확한 메타)을 SEO·GEO 양쪽 가중에서 우선 평가.
   - Query Fan-out 대응 = "한 주제를 다층(개요·비교·실행·사례·FAQ)으로 충실히 다루는 콘텐츠" 가점.

3) **People-first / Non-commodity 콘텐츠 우대**:
   - 1인칭 경험·실측 수치·고유 사례·전문가 견해가 있는 페이지를 우대 (+5~+10 GEO/AEO).
   - 일반론·AI 양산형·동어반복 콘텐츠는 GEO/AEO 상한 80으로 제한.

4) **E-E-A-T 명시 평가**:
   - 저자 정보(Person/Author schema 또는 본문 byline), 조직 정보(Organization), 연락처/About 페이지 존재 여부를 GEO Authority 신호와 SEO 인덱싱 준비도에 반영.

5) **AEO 청킹·Q&A 강제 완화**:
   - FAQ/Q&A 구조가 없어도 "직접 답변 명확성"이 높으면 감점 최소화.
   - "FAQPage 스키마 필수"로 priorityFix 올리지 말 것. 가점 항목으로만 권고.

6) **scoreRationale 작성 규칙**:
   - 각 축의 scoreRationale 끝에 "구글 공식 가이드: <짧은 근거 1문장>"을 1줄 추가.

## GOOGLE_OFFICIAL_BASELINE_END


**Scoring Criteria:**

## SEO (Search Engine Optimization) - 검색엔진 최적화
Evaluate based on these sub-signals (each 0-100):
- 크롤링 가능성 (weight 25): Are there robots.txt issues? Can search engines access pages?
- 인덱싱 준비도 (weight 20): Are meta tags (title, description, canonical) properly set?
- 스니펫 품질 (weight 20): Are title/description optimized for search snippets?
- 구조화 데이터 (weight 15): Is there JSON-LD/Schema.org structured data? Score guide: 0-30 = no structured data at all; 40-60 = 1 basic JSON-LD block; 60-75 = 2-3 valid JSON-LD types; 75-90 = 4+ JSON-LD types covering key schemas (WebSite, Organization, FAQPage, BreadcrumbList, SoftwareApplication, Product, etc.); 90-100 = comprehensive structured data with all relevant types and rich detail. Count the JSON-LD blocks provided in the analysis input carefully.
- 성능·모바일 (weight 20): Mobile-friendly? Fast loading indicators?

## AEO (Answer Engine Optimization) - AI 답변 최적화
Evaluate based on these sub-signals (each 0-100):
- 질문형 구조 (weight 20): Does content use Q&A or FAQ patterns?
- 직접 답변 명확성 (weight 25): Can AI extract clear, direct answers?
- 요약 가능성 (weight 20): Can the content be easily summarized?
- 답변 형식 적합성 (weight 15): Is content structured for featured snippets?
- 엔티티·출처 명확성 (weight 20): Are entities and sources clearly defined?

## GEO (Generative Engine Optimization) - 생성형 AI 검색 최적화
Evaluate based on these sub-signals (each 0-100):
- AI 접근 가능성 (weight 20): Can AI crawlers access the site?
- Citation Eligibility (weight 20): Is content citable with clear statements?
- Source Clarity (weight 20): Is brand/org identity clear for attribution?
- 주제 커버리지 (weight 15): How comprehensive is topic coverage?
- Evidence·Freshness (weight 15): Are there dates, data, citations?
- AI 가시성 추적 (weight 10): Are there signals for AI discovery?

**Output format (JSON only, no markdown):**
{
  "brand_name": "<공식 브랜드/사이트 이름. 예: '쿠팡', 'Notion', 'LG전자', 'SearchTune OS'. 콘텐츠·메타·로고·title·about에서 추론. URL 슬러그(예: 'direct','shop','m')는 절대 금지. title 태그가 '브랜드명 | 설명' 형식이면 앞부분이 브랜드. 추출 불가 시에만 null>",
  "brand_aliases": ["<영문/한글/약어 변형 1~5개. 예: ['LG전자','LG Electronics','LG']. 추출 불가 시 빈 배열>"],
  "category": "<사이트가 '실제로 판매·제공하는 핵심 제품/서비스'의 카테고리를 한국어 4~12자 명사구로. 예: '여성 의류 쇼핑몰', '생활용품 쇼핑몰', 'SEO 진단 SaaS', '프로젝트 관리 SaaS', '유제품 브랜드'. **반드시 다음 우선순위로 추출**: ① 메인페이지 title/메타 description, ② H1, ③ 메인 내비게이션·카테고리 메뉴, ④ 메인페이지 상품/서비스 리스트. **금지**: 블로그/게시판/공지/리뷰 본문에 우연히 등장한 단어 1개(예: 본문에 '밀폐용기'가 한 번 나왔다고 '밀폐용기 쇼핑몰'로 단정 금지), 카테고리가 여러 개로 보이면 가장 빈도 높고 대표적인 1개를 선택. 사이트 메인이 '브랜드 카탈로그' 형태면 '<섹터> 쇼핑몰' 형태로(예: '여성 의류 쇼핑몰'). '웹사이트','회사 홈페이지' 같은 완전 일반어만 금지. 정말로 콘텐츠가 비어 추출 불가능할 때만 null>",
  "seoScore": <0-100>,
  "aeoScore": <0-100>,
  "geoScore": <0-100>,
  "seoAxis": {
    "label": "SEO",
    "description": "검색엔진이 이 페이지를 크롤링·인덱싱하고 검색 결과에 노출할 기술적 준비 상태",
    "subSignals": [
      {"name": "크롤링 가능성", "score": <0-100>, "weight": 25},
      {"name": "인덱싱 준비도", "score": <0-100>, "weight": 20},
      {"name": "스니펫 품질", "score": <0-100>, "weight": 20},
      {"name": "구조화 데이터", "score": <0-100>, "weight": 15},
      {"name": "성능·모바일", "score": <0-100>, "weight": 20}
    ],
    "scoreRationale": "<1-2 sentence Korean rationale>",
    "issues": ["<Korean issue 1>", "<Korean issue 2>"],
    "strengths": ["<Korean strength 1>", "<Korean strength 2>"],
    "priorityFix": {"label": "<Korean fix description>", "pointRange": "+N~+M"},
    "quickFix": {"label": "<Korean fix description>", "pointRange": "+N~+M"},
    "additionalFixes": [{"label": "<Korean fix description>", "pointRange": "+N~+M"}],
    "scoreCap": "<optional Korean cap message or null>"
  },
  "aeoAxis": { 
    "label": "AEO", 
    "description": "이 페이지의 콘텐츠가 질문에 대한 직접 답변으로 추출·요약될 준비 상태",
    "subSignals": [
      {"name": "질문형 구조", "score": <0-100>, "weight": 20},
      {"name": "직접 답변 명확성", "score": <0-100>, "weight": 25},
      {"name": "요약 가능성", "score": <0-100>, "weight": 20},
      {"name": "답변 형식 적합성", "score": <0-100>, "weight": 15},
      {"name": "엔티티·출처 명확성", "score": <0-100>, "weight": 20}
    ],
    "scoreRationale": "<1-2 sentence Korean rationale>",
    "issues": ["<Korean issue 1>", "<Korean issue 2>"],
    "strengths": ["<Korean strength 1>", "<Korean strength 2>"],
    "priorityFix": {"label": "<Korean fix description>", "pointRange": "+N~+M"},
    "quickFix": {"label": "<Korean fix description>", "pointRange": "+N~+M"},
    "additionalFixes": [{"label": "<Korean fix description>", "pointRange": "+N~+M"}],
    "scoreCap": "<optional Korean cap message or null>"
  },
  "geoAxis": { 
    "label": "GEO", 
    "description": "생성형 검색 엔진에서 이 사이트와 브랜드가 발견·인용·참조될 준비 상태",
    "subSignals": [
      {"name": "AI 접근 가능성", "score": <0-100>, "weight": 20},
      {"name": "Citation Eligibility", "score": <0-100>, "weight": 20},
      {"name": "Source Clarity", "score": <0-100>, "weight": 20},
      {"name": "주제 커버리지", "score": <0-100>, "weight": 15},
      {"name": "Evidence·Freshness", "score": <0-100>, "weight": 15},
      {"name": "AI 가시성 추적", "score": <0-100>, "weight": 10}
    ],
    "scoreRationale": "<1-2 sentence Korean rationale>",
    "issues": ["<Korean issue 1>", "<Korean issue 2>"],
    "strengths": ["<Korean strength 1>", "<Korean strength 2>"],
    "priorityFix": {"label": "<Korean fix description>", "pointRange": "+N~+M"},
    "quickFix": {"label": "<Korean fix description>", "pointRange": "+N~+M"},
    "additionalFixes": [{"label": "<Korean fix description>", "pointRange": "+N~+M"}],
    "scoreCap": "<optional Korean cap message or null>"
  }
}

IMPORTANT:
- All text content (issues, strengths, rationale, fixes) MUST be in Korean (한국어)
- Be specific to the actual website content - don't give generic advice
- Score honestly based on what you actually see in the content
- pointRange should be realistic improvement estimates
- scoreCap should only be set when there's a hard blocker limiting the score
- brand_name/category는 best-effort로 채워라. title/description/H1/메타에서 합리적으로 추론 가능하면 반드시 추출하라. 완전히 비어 추출 불가능한 경우에만 null. brand_aliases는 확신이 없으면 빈 배열. URL 슬러그/도메인 토큰을 그대로 brand_name에 쓰지 마라.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load analysis prompt from DB (with fallback to hardcoded)
    let ANALYSIS_PROMPT = FALLBACK_ANALYSIS_PROMPT;
    let naverRulebook = "";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: configRow } = await supabase
        .from("engine_config")
        .select("config_value")
        .eq("config_key", "analysis_prompt")
        .single();
      if (configRow?.config_value) {
        ANALYSIS_PROMPT = configRow.config_value;
        console.log("Using dynamic analysis prompt from DB");
      }
      naverRulebook = await loadNaverRulebook(supabase);
    } catch (e) {
      console.warn("Failed to load prompt from DB, using fallback:", e);
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Scrape main page with Firecrawl
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    // Geo-aware Firecrawl: KR 도메인(.kr/.co.kr 등)은 첫 시도부터 한국 프록시를 사용한다.
    // 해외(US) 프록시는 한국 호스팅의 geo-block(방화벽)으로 자주 막혀서 분석 자체가 실패함.
    const urlObj = new URL(formattedUrl);
    const hostLower = urlObj.hostname.toLowerCase();
    const isKrHost = /\.kr$/.test(hostLower) || /\.kr\./.test(hostLower);
    const aboutUrl = `${urlObj.origin}/about`;

    const scrapeOnce = (target: string, formats: unknown[], onlyMain: boolean, useKr: boolean) =>
      fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: target,
          formats,
          onlyMainContent: onlyMain,
          waitFor: 3000,
          ...(useKr ? { location: { country: "KR", languages: ["ko"] } } : {}),
        }),
      });

    // Scrape main page and /about in parallel.
    // 1차: KR 호스트면 KR proxy / 그 외는 default
    let mainProxyCountry: "KR" | "DEFAULT" = isKrHost ? "KR" : "DEFAULT";
    let geoFallbackApplied = false;
    let mainRes = await scrapeOnce(
      formattedUrl,
      ["markdown", "html", "rawHtml", "links"],
      false,
      isKrHost,
    );
    let scrapeData = await mainRes.json().catch(() => ({}));
    logApiCost({ function_name: "analyze-site", model: "firecrawl/scrape", requests: 1, metadata: { stage: "main", url: formattedUrl, proxy: mainProxyCountry } });

    // 1차 실패가 timeout/네트워크 류이고 KR을 아직 안 써봤다면 KR proxy로 1회 재시도.
    // (해외 차단 사이트 자동 우회)
    const looksGeoBlock =
      !mainRes.ok ||
      !scrapeData?.success ||
      (typeof scrapeData?.error === "string" &&
        /timeout|timed?\s*out|unreachable|fetch|network|ECONN|forbidden|403/i.test(scrapeData.error));
    if (!isKrHost && looksGeoBlock) {
      console.warn("[analyze-site] retrying with KR proxy (geo-block suspected):", scrapeData?.error || mainRes.status);
      geoFallbackApplied = true;
      mainProxyCountry = "KR";
      mainRes = await scrapeOnce(
        formattedUrl,
        ["markdown", "html", "rawHtml", "links"],
        false,
        true,
      );
      scrapeData = await mainRes.json().catch(() => ({}));
      logApiCost({ function_name: "analyze-site", model: "firecrawl/scrape", requests: 1, metadata: { stage: "main_retry_kr", url: formattedUrl, proxy: "KR" } });
    }

    if (!mainRes.ok || !scrapeData?.success) {
      console.error("Firecrawl error:", scrapeData);
      const errMsg = String(scrapeData?.error || mainRes.status);
      // KR 프록시까지 실패했으면 사이트 자체가 닫혀있거나 양방향 차단. 사용자에게 명확히 전달.
      const friendly =
        geoFallbackApplied || isKrHost
          ? `사이트 응답이 없거나 접근이 차단되었어요. 사이트가 정상 운영 중인지, 방화벽 설정(특히 해외 IP 차단)을 확인해 주세요. (${errMsg})`
          : `크롤링 실패: ${errMsg}`;
      return new Response(
        JSON.stringify({
          success: false,
          error: friendly,
          geo_block_suspected: geoFallbackApplied || isKrHost,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // /about: 메인이 KR proxy로 성공했으면 about도 KR로 통일
    const useKrForAbout = mainProxyCountry === "KR";
    const aboutRes = await scrapeOnce(aboutUrl, ["markdown"], true, useKrForAbout).catch(() => null);
    if (aboutRes) logApiCost({ function_name: "analyze-site", model: "firecrawl/scrape", requests: 1, metadata: { stage: "about", proxy: mainProxyCountry } });

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const html = scrapeData.data?.html || scrapeData.html || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};
    const links = scrapeData.data?.links || scrapeData.links || [];

    // Extract about page content if available
    let aboutMarkdown = "";
    if (aboutRes) {
      try {
        const aboutData = await aboutRes.json();
        if (aboutData.success) {
          aboutMarkdown = aboutData.data?.markdown || aboutData.markdown || "";
          console.log("About page scraped successfully, length:", aboutMarkdown.length);
        }
      } catch { /* ignore about page errors */ }
    }

    // Extract JSON-LD from rawHtml (preserves script tags) first, fall back to html
    const rawHtml = scrapeData.data?.rawHtml || scrapeData.rawHtml || "";
    const htmlForJsonLd = rawHtml || html;
    const jsonLdBlocks: string[] = [];
    const jsonLdRegex = /<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let jsonLdMatch;
    while ((jsonLdMatch = jsonLdRegex.exec(htmlForJsonLd)) !== null) {
      jsonLdBlocks.push(jsonLdMatch[1].trim());
    }
    const jsonLdSummary = jsonLdBlocks.length > 0
      ? `Found ${jsonLdBlocks.length} JSON-LD block(s):\n${jsonLdBlocks.join("\n---\n")}`
      : "No JSON-LD structured data found in HTML.";

    // Truncate content for AI analysis (keep it under token limits)
    const truncatedMarkdown = markdown.slice(0, 8000);
    const truncatedHtml = html.slice(0, 6000);
    const truncatedAbout = aboutMarkdown.slice(0, 3000);

    console.log("Scrape successful, analyzing with AI...", { jsonLdCount: jsonLdBlocks.length, hasAbout: !!truncatedAbout });

    // Step 2: Analyze with AI
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const analysisInput = `
## Website URL: ${formattedUrl}

## Metadata
- Title: ${metadata.title || "N/A"}
- Description: ${metadata.description || "N/A"}
- Language: ${metadata.language || "N/A"}
- Status Code: ${metadata.statusCode || "N/A"}

## JSON-LD Structured Data
${jsonLdSummary}

## HTML (truncated)
${truncatedHtml}

## Markdown Content (truncated)
${truncatedMarkdown}

${truncatedAbout ? `## About / Sub-page Content (from ${aboutUrl})
${truncatedAbout}
` : ""}
## Links found: ${links.length}
${links.slice(0, 20).join("\n")}
`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              ANALYSIS_PROMPT +
              (naverRulebook && isKoreanSite(formattedUrl, analysisInput)
                ? `\n\n---\n[KOREAN SITE DETECTED — APPLY NAVER WEBMASTER RULEBOOK AS HARD BASELINE]\n${naverRulebook}\n\n위 룰북은 절대 무시할 수 없는 베이스 규칙이다. 한국 사이트 채점 시 SEO/AEO/GEO 모든 축에 교차 적용하라. 룰북 위반(Yeti 차단/단일 H1 위반/JSON-LD 0개/frame 사용 등) 발견 시 점수 캡을 반드시 적용하라.`
                : ""),
          },
          { role: "user", content: analysisInput },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI API error:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: `AI 분석 실패 (${aiRes.status})` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Log Gemini cost
    {
      const u = extractUsage(aiData);
      logApiCost({ function_name: "analyze-site", model: "google/gemini-3-flash-preview", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { url: formattedUrl } });
    }


    // Extract JSON from response
    let analysis;
    try {
      // Strip markdown code fences if present
      let cleaned = content.trim();
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
      
      // Try to find JSON in the response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content.slice(0, 500));
      return new Response(
        JSON.stringify({ success: false, error: "AI 응답 파싱 실패" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analysis complete:", {
      seo: analysis.seoScore,
      aeo: analysis.aeoScore,
      geo: analysis.geoScore,
    });

    // ── SoT 동기화: analyze가 추출한 brand/category를 site_identity 캐시에 권위 저장 ──
    // probe-ai-perception / generate-blog-post 등 다른 함수가 이 캐시를 그대로 쓰게 한다.
    // 이미 Firecrawl·Gemini를 돌렸으므로 추가 API 호출 없음.
    try {
      const host = normalizeHost(formattedUrl);
      if (host && (analysis.brand_name || analysis.category)) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { identity: prev } = await loadIdentity(supabase, host);
        // confidence: brand_name이 있고 메타가 명확하면 0.85, 일부만 있으면 0.65
        const conf =
          analysis.brand_name && analysis.category && (metadata?.title || jsonLdBlocks.length > 0)
            ? 0.85
            : analysis.brand_name || analysis.category
              ? 0.65
              : 0.4;
        const next = {
          host,
          brand: analysis.brand_name ?? prev?.brand ?? null,
          aliases: Array.isArray(analysis.brand_aliases) ? analysis.brand_aliases.slice(0, 5) : (prev?.aliases ?? []),
          category: analysis.category ?? prev?.category ?? null,
          description_short: metadata?.description ? String(metadata.description).slice(0, 120) : (prev?.description_short ?? null),
          confidence: conf,
          source: "page_signal" as const,
        };
        await upsertIdentity(supabase, { ...next, signals: { from: "analyze-site", jsonLdCount: jsonLdBlocks.length, hasMetaTitle: !!metadata?.title } });
        await logAudit(supabase, {
          host,
          stage: "gate",
          function_name: "analyze-site",
          before_state: prev ? { brand: prev.brand, category: prev.category, confidence: prev.confidence } : {},
          after_state: { brand: next.brand, category: next.category, confidence: next.confidence },
          confidence: conf,
          source: "page_signal",
          reason: prev ? `update (was ${prev.source}, conf ${prev.confidence})` : "first analysis",
        });
      }
    } catch (e) {
      console.warn("[analyze-site] SoT sync failed (non-blocking):", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: analysis,
        geo_fallback_applied: geoFallbackApplied,
        proxy_country: mainProxyCountry,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("analyze-site error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
