// Answer Share Measurement — Phase 1
// 진단 결과 기반 1클릭 응답 점유율 측정.
// 자동: 브랜드/별칭/경쟁사/질문 5개 생성 → 4개 엔진 병렬 호출 → Gemini 분석 → 점유율 계산.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logApiCost, extractUsage } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIMEOUT_MS = 25000;
const FN_NAME = "measure-answer-share";

const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY");
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

type EngineKey = "perplexity" | "chatgpt" | "gemini" | "claude";

interface MeasureInput {
  url: string;
  brand?: string;
  category?: string;
  aliases?: string[];
  competitors?: string[];
}

interface QueryAnalysis {
  brandMentioned: boolean;
  brandPosition: number | null;
  brandCitationFound: boolean;
  brandCitationUrls: string[];
  competitorMentions: { name: string; mentioned: boolean; position: number | null }[];
}

interface QueryResult {
  query: string;
  engine: EngineKey;
  rawResponse: string;
  citations: string[];
  analysis: QueryAnalysis;
  error?: string;
}

function fetchTimeout(url: string, init: RequestInit, ms = TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function normalizeUrl(input: string): { url: string; host: string; domainCore: string } {
  let raw = (input || "").trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const u = new URL(raw);
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  const domainCore = host.split(".")[0];
  return { url: `https://${host}${u.pathname.replace(/\/$/, "")}`, host, domainCore };
}

// ── 자동 추출: 브랜드/카테고리/경쟁사/질문 생성 ──────────────────────────
async function autoExtractContext(input: MeasureInput, host: string, domainCore: string): Promise<{
  brand: string;
  category: string;
  aliases: string[];
  competitors: string[];
  queries: string[];
}> {
  if (!LOVABLE_KEY) {
    return {
      brand: input.brand || domainCore,
      category: input.category || "웹 서비스",
      aliases: input.aliases || [domainCore],
      competitors: input.competitors || [],
      queries: [`${input.category || "이 분야"} 추천`],
    };
  }

  const prompt = `사이트 URL: ${input.url}
호스트: ${host}
힌트 브랜드: ${input.brand || "(없음)"}
힌트 카테고리: ${input.category || "(없음)"}

이 사이트에 대해 다음을 JSON으로 반환:
1) brand: 정식 브랜드명 (영문 또는 한글, 가장 흔히 불리는 형태)
2) category: 한국어 카테고리 (예: "SEO 진단 도구", "수제 디저트 쇼핑몰")
3) aliases: 브랜드 별칭 배열 (한/영 변형, 줄임말 포함, 최대 5개)
4) competitors: 같은 카테고리의 잘 알려진 경쟁 브랜드 5개 (한국 시장 기준, 본 브랜드 제외)
5) queries: 이 사이트가 답이어야 할 한국어 질문 5개. **절대 브랜드명/경쟁사명을 포함하지 말 것.** 카테고리 중심 일반 질문만. 예: "GEO 진단 도구 추천", "수제 마카롱 주문 어디서"`;

  try {
    const r = await fetchTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "한국어 마케팅·SEO 전문가. JSON만 반환." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    }, 20000);
    const j = await r.json();
    const u = extractUsage(j);
    await logApiCost({
      function_name: FN_NAME,
      model: "google/gemini-2.5-flash",
      tokens_in: u.tokens_in,
      tokens_out: u.tokens_out,
      metadata: { phase: "context-extract" },
    });
    const txt = j?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(String(txt).replace(/^```json\s*|\s*```$/g, ""));
    return {
      brand: parsed.brand || input.brand || domainCore,
      category: parsed.category || input.category || "웹 서비스",
      aliases: Array.isArray(parsed.aliases) ? parsed.aliases.slice(0, 5) : [domainCore],
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors.slice(0, 5) : [],
      queries: Array.isArray(parsed.queries) ? parsed.queries.slice(0, 5) : [],
    };
  } catch (e) {
    console.warn("[context-extract] failed:", e);
    return {
      brand: input.brand || domainCore,
      category: input.category || "웹 서비스",
      aliases: [domainCore],
      competitors: [],
      queries: [],
    };
  }
}

// ── 엔진 호출 ────────────────────────────────────────────────────────
async function askPerplexity(query: string): Promise<{ text: string; citations: string[]; error?: string }> {
  if (!PERPLEXITY_KEY) return { text: "", citations: [], error: "no-key" };
  try {
    const r = await fetchTimeout("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${PERPLEXITY_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: "Answer naturally and objectively in Korean. Do not mention this is a test. Do not force any specific brand." },
          { role: "user", content: query },
        ],
      }),
    });
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content ?? "";
    const citations: string[] = Array.isArray(j?.citations) ? j.citations : [];
    const u = extractUsage(j);
    await logApiCost({ function_name: FN_NAME, model: "sonar", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { phase: "ask", engine: "perplexity" } });
    return { text, citations };
  } catch (e) {
    return { text: "", citations: [], error: String(e) };
  }
}

async function askGemini(query: string): Promise<{ text: string; citations: string[]; error?: string }> {
  if (!LOVABLE_KEY) return { text: "", citations: [], error: "no-key" };
  try {
    const r = await fetchTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Answer naturally and objectively in Korean. Do not mention this is a test. Do not force any specific brand." },
          { role: "user", content: query },
        ],
      }),
    });
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content ?? "";
    const u = extractUsage(j);
    await logApiCost({ function_name: FN_NAME, model: "google/gemini-2.5-flash", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { phase: "ask", engine: "gemini" } });
    return { text, citations: [] };
  } catch (e) {
    return { text: "", citations: [], error: String(e) };
  }
}

async function askChatGPT(query: string): Promise<{ text: string; citations: string[]; error?: string }> {
  const useDirect = !!OPENAI_KEY;
  if (!useDirect && !LOVABLE_KEY) return { text: "", citations: [], error: "no-key" };
  try {
    const endpoint = useDirect
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (useDirect) headers["Authorization"] = `Bearer ${OPENAI_KEY}`;
    else headers["Authorization"] = `Bearer ${LOVABLE_KEY}`;
    const model = useDirect ? "gpt-5-mini" : "openai/gpt-5-mini";
    const r = await fetchTimeout(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "Answer naturally and objectively in Korean. Do not mention this is a test. Do not force any specific brand." },
          { role: "user", content: query },
        ],
      }),
    });
    const j = await r.json();
    const text = j?.choices?.[0]?.message?.content ?? "";
    const u = extractUsage(j);
    await logApiCost({ function_name: FN_NAME, model: "openai/gpt-5-mini", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { phase: "ask", engine: "chatgpt", direct: useDirect } });
    return { text, citations: [] };
  } catch (e) {
    return { text: "", citations: [], error: String(e) };
  }
}

async function askClaude(query: string): Promise<{ text: string; citations: string[]; error?: string }> {
  if (!ANTHROPIC_KEY) return { text: "", citations: [], error: "no-key" };
  try {
    const r = await fetchTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 800,
        system: "Answer naturally and objectively in Korean. Do not mention this is a test. Do not force any specific brand.",
        messages: [{ role: "user", content: query }],
      }),
    });
    const j = await r.json();
    const text = Array.isArray(j?.content) ? j.content.map((c: any) => c?.text ?? "").join("\n").trim() : "";
    const tokens_in = j?.usage?.input_tokens ?? 0;
    const tokens_out = j?.usage?.output_tokens ?? 0;
    await logApiCost({ function_name: FN_NAME, model: "claude-haiku-4-5", tokens_in, tokens_out, metadata: { phase: "ask", engine: "claude" } });
    return { text, citations: [] };
  } catch (e) {
    return { text: "", citations: [], error: String(e) };
  }
}

const ENGINES: Record<EngineKey, (q: string) => Promise<{ text: string; citations: string[]; error?: string }>> = {
  perplexity: askPerplexity,
  chatgpt: askChatGPT,
  gemini: askGemini,
  claude: askClaude,
};

// ── 분석 ─────────────────────────────────────────────────────────────
async function analyzeResponse(
  responseText: string,
  citations: string[],
  brand: string,
  domain: string,
  aliases: string[],
  competitors: string[],
): Promise<QueryAnalysis> {
  const empty: QueryAnalysis = {
    brandMentioned: false,
    brandPosition: null,
    brandCitationFound: false,
    brandCitationUrls: [],
    competitorMentions: competitors.map((c) => ({ name: c, mentioned: false, position: null })),
  };
  if (!responseText || !LOVABLE_KEY) return empty;

  const prompt = `다음 AI 답변을 분석:

--- 답변 ---
${responseText.slice(0, 4000)}
--- 끝 ---

대상 브랜드: ${brand}
도메인: ${domain}
브랜드 별칭: ${aliases.join(", ") || "(없음)"}
경쟁사: ${competitors.join(", ") || "(없음)"}
인용 출처: ${citations.slice(0, 10).join(", ") || "(없음)"}

다음 JSON만 반환 (코드블록 없이):
{
  "brandMentioned": boolean,
  "brandPosition": number 또는 null (답변에서 추천 리스트의 몇 번째로 등장하는지, 리스트 아니면 null),
  "brandCitationFound": boolean (인용 출처 URL에 도메인이 포함되는지),
  "competitorMentions": [{"name":"...", "mentioned":boolean, "position":number|null}, ...]
}`;

  try {
    const r = await fetchTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "한국어 텍스트 분석. 정확한 JSON만 반환." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      }),
    }, 20000);
    const j = await r.json();
    const u = extractUsage(j);
    await logApiCost({ function_name: FN_NAME, model: "google/gemini-2.5-flash", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { phase: "analyze" } });
    const txt = j?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(String(txt).replace(/^```json\s*|\s*```$/g, ""));
    const citedDomains = citations.filter((c) => c.toLowerCase().includes(domain.toLowerCase()));
    return {
      brandMentioned: !!parsed.brandMentioned,
      brandPosition: typeof parsed.brandPosition === "number" ? parsed.brandPosition : null,
      brandCitationFound: !!parsed.brandCitationFound || citedDomains.length > 0,
      brandCitationUrls: citedDomains,
      competitorMentions: Array.isArray(parsed.competitorMentions)
        ? parsed.competitorMentions
        : competitors.map((c) => ({ name: c, mentioned: false, position: null })),
    };
  } catch (e) {
    console.warn("[analyze] failed:", e);
    // 폴백: 단순 텍스트 매칭
    const lower = responseText.toLowerCase();
    const brandHit = [brand, ...aliases, domain].some((s) => s && lower.includes(s.toLowerCase()));
    return {
      brandMentioned: brandHit,
      brandPosition: null,
      brandCitationFound: citations.some((c) => c.toLowerCase().includes(domain.toLowerCase())),
      brandCitationUrls: citations.filter((c) => c.toLowerCase().includes(domain.toLowerCase())),
      competitorMentions: competitors.map((c) => ({
        name: c,
        mentioned: lower.includes(c.toLowerCase()),
        position: null,
      })),
    };
  }
}

// ── 점수 계산 ────────────────────────────────────────────────────────
function computeScores(results: QueryResult[], competitors: string[]) {
  const valid = results.filter((r) => r.rawResponse && !r.error);
  const total = valid.length || 1;
  const mentioned = valid.filter((r) => r.analysis.brandMentioned).length;
  const cited = valid.filter((r) => r.analysis.brandCitationFound).length;
  const first = valid.filter((r) => r.analysis.brandPosition === 1).length;
  const positions = valid
    .map((r) => r.analysis.brandPosition)
    .filter((p): p is number => typeof p === "number" && p > 0);
  const avgPos = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null;

  const competitorShare: Record<string, number> = {};
  competitors.forEach((c) => {
    const hits = valid.filter((r) => r.analysis.competitorMentions.some((m) => m.name === c && m.mentioned)).length;
    competitorShare[c] = Math.round((hits / total) * 100);
  });

  return {
    responseShare: Math.round((mentioned / total) * 100),
    citationShare: Math.round((cited / total) * 100),
    firstMentionShare: Math.round((first / total) * 100),
    avgBrandPosition: avgPos !== null ? Math.round(avgPos * 10) / 10 : null,
    competitorShare,
    totalResponses: total,
  };
}

// ── 메인 ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as MeasureInput;
    if (!body?.url || typeof body.url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, host, domainCore } = normalizeUrl(body.url);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    // 1) 컨텍스트 자동 추출
    const ctx = await autoExtractContext({ ...body, url }, host, domainCore);
    if (!ctx.queries.length) {
      return new Response(JSON.stringify({ error: "질문 생성에 실패했어요. 잠시 후 다시 시도해 주세요." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) 엔진 × 질문 병렬 호출
    const engines: EngineKey[] = ["perplexity", "chatgpt", "gemini", "claude"];
    const tasks: Promise<QueryResult>[] = [];
    for (const q of ctx.queries) {
      for (const engine of engines) {
        tasks.push(
          (async () => {
            const res = await ENGINES[engine](q);
            const analysis = await analyzeResponse(
              res.text,
              res.citations,
              ctx.brand,
              host,
              ctx.aliases,
              ctx.competitors,
            );
            return { query: q, engine, rawResponse: res.text, citations: res.citations, analysis, error: res.error };
          })(),
        );
      }
    }
    const results = await Promise.all(tasks);

    // 3) 점수 계산
    const scores = computeScores(results, ctx.competitors);

    // 4) 미노출 질문 = 모든 엔진에서 brandMentioned=false
    const byQuery = ctx.queries.map((q) => {
      const rows = results.filter((r) => r.query === q);
      return {
        query: q,
        anyMentioned: rows.some((r) => r.analysis.brandMentioned),
        engines: rows.map((r) => ({
          engine: r.engine,
          mentioned: r.analysis.brandMentioned,
          position: r.analysis.brandPosition,
          citation: r.analysis.brandCitationFound,
          competitors: r.analysis.competitorMentions.filter((m) => m.mentioned).map((m) => m.name),
          error: r.error,
        })),
      };
    });
    const missedQueries = byQuery.filter((q) => !q.anyMentioned).map((q) => q.query);

    // 5) by_engine 요약
    const byEngine: Record<string, { mentioned: number; total: number; share: number }> = {};
    for (const eng of engines) {
      const rows = results.filter((r) => r.engine === eng && r.rawResponse && !r.error);
      const m = rows.filter((r) => r.analysis.brandMentioned).length;
      byEngine[eng] = {
        mentioned: m,
        total: rows.length,
        share: rows.length ? Math.round((m / rows.length) * 100) : 0,
      };
    }

    // 6) 저장
    try {
      const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await sb.from("answer_share_results").insert({
        url,
        brand: ctx.brand,
        domain: host,
        ip_address: ip,
        response_share: scores.responseShare,
        citation_share: scores.citationShare,
        first_mention_share: scores.firstMentionShare,
        avg_brand_position: scores.avgBrandPosition,
        competitor_share: scores.competitorShare,
        missed_queries: missedQueries,
        queries_used: ctx.queries,
        by_engine: byEngine,
        by_query: byQuery,
        total_responses: scores.totalResponses,
      });
    } catch (e) {
      console.warn("[insert] failed:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url,
          brand: ctx.brand,
          domain: host,
          category: ctx.category,
          aliases: ctx.aliases,
          competitors: ctx.competitors,
          queries: ctx.queries,
          ...scores,
          missedQueries,
          byEngine,
          byQuery,
          generatedAt: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[measure-answer-share] error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
