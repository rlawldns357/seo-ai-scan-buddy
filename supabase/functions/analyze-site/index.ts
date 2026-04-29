import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { loadNaverRulebook, isKoreanSite } from "../_shared/naver-rulebook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_ANALYSIS_PROMPT = `You are an expert SEO/AEO/GEO analyst. Analyze the following website content and produce a JSON analysis.

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
- scoreCap should only be set when there's a hard blocker limiting the score`;

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

    // Scrape main page and /about in parallel
    const scrapeMain = fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "html", "rawHtml", "links"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    // Build /about URL from the base
    const urlObj = new URL(formattedUrl);
    const aboutUrl = `${urlObj.origin}/about`;
    const scrapeAbout = fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: aboutUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    }).catch(() => null);

    const [mainRes, aboutRes] = await Promise.all([scrapeMain, scrapeAbout]);

    const scrapeData = await mainRes.json();

    if (!mainRes.ok || !scrapeData.success) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: `크롤링 실패: ${scrapeData.error || mainRes.status}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          { role: "system", content: ANALYSIS_PROMPT },
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

    return new Response(
      JSON.stringify({ success: true, data: analysis }),
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
