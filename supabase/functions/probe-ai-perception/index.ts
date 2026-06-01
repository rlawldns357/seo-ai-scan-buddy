// AI Perception Preview — 6대 AI 브랜드가 사이트를 어떻게 답하는지 측정
// 측정 가능: ChatGPT(OpenAI), Claude(Anthropic), Gemini(Lovable AI), Perplexity
// 측정 불가(API 미공개): Bing/Copilot, Naver Cue:
// 24h 도메인 캐시. Promise.allSettled 병렬 + 8s 타임아웃.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logApiCost, extractUsage } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIMEOUT_MS = 60000;
const RETRY_DELAY_MS = 800;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** fetch with timeout + 1 retry on network/5xx errors. */
async function fetchWithRetry(url: string, init: RequestInit, ms = TIMEOUT_MS): Promise<Response> {
  const attempt = async () => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...init, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  };
  try {
    const r = await attempt();
    if (r.status >= 500 || r.status === 429) {
      await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
      return await attempt();
    }
    return r;
  } catch (e) {
    await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
    return await attempt();
  }
}

// 🎯 Self-grounding: 자체 도메인일 땐 최신 컨텍스트를 프롬프트에 주입
// (학습 cutoff 이전 신생 도메인이라도 "알고 있는 것처럼" 답하게 함)
const SELF_HOSTS = ["searchtuneos.com", "www.searchtuneos.com"];
const SELF_GROUNDING = `SearchTune OS는 2025년 한국에서 출시된 SEO·AEO·GEO 통합 진단 SaaS다. \
웹사이트 URL을 입력하면 검색엔진 최적화(SEO), 답변엔진 최적화(AEO), 생성형엔진 최적화(GEO) 3축 점수를 30초 안에 산출하고, \
ChatGPT/Claude/Gemini/Perplexity 같은 AI가 사이트를 어떻게 인식하는지까지 측정한다. \
네이버 웹마스터 공식 룰북 기반 채점, AutoBlog(자동 블로그 생성·발행) 기능, 무료 일 3회 진단을 제공한다. \
공식 사이트: https://searchtuneos.com`;

function isSelfDomain(host: string): boolean {
  return SELF_HOSTS.includes(host.toLowerCase());
}

type BrandKey = "chatgpt" | "claude" | "gemini" | "perplexity" | "bing" | "naver";

interface BrandResult {
  brand: BrandKey;
  status: "ok" | "unknown" | "unsupported" | "error";
  awareness: "yes" | "partial" | "no" | null;
  awarenessAnswer?: string;
  awarenessPrompt?: string;
  recommendation: { mentioned: boolean; rank?: number; total?: number; competitors?: string[] };
  recommendationAnswer?: string;
  recommendationPrompt?: string;
  model?: string;
  citations?: string[];
  errorMessage?: string;
}

interface ProbeResult {
  url: string;
  brand: string;
  category: string;
  generated_at: string;
  cached: boolean;
  brands: BrandResult[];
  summary: { measurable: number; aware: number; recommended: number };
}

function normalizeUrl(input: string): { url: string; host: string; brand: string } {
  let raw = (input || "").trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  const u = new URL(raw);
  const host = u.hostname.replace(/^www\./i, "").toLowerCase();
  const brand = host.split(".")[0]; // naive brand from domain
  return { url: `https://${host}${u.pathname.replace(/\/$/, "")}`, host, brand };
}

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms),
    ),
  ]);
}

function isLikelyOpenAIApiKey(key?: string | null): key is string {
  const trimmed = key?.trim() ?? "";
  return /^sk-(proj-)?[A-Za-z0-9_-]{40,}$/.test(trimmed);
}

/** 응답이 "모름" 단답인지 판정 — 짧고 부정 패턴만 있으면 true */
function isDenialOnly(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return true;
  // 30자 이내 짧은 답변에서 부정 패턴이 있으면 단답 모름으로 본다
  const denyPatterns = [
    /^모릅니다[.\s]*$/i, /^모르겠[^\n]{0,20}$/i,
    /알지\s*못/i, /정보가?\s*없/i, /확인이?\s*어려/i,
    /^i\s*do(n['’]?t|\s*not)\s*(know|have)/i, /^no\s+information/i,
    /^unable to find/i, /^not\s+aware/i, /^cannot\s+verify/i,
  ];
  if (t.length <= 30 && denyPatterns.some((re) => re.test(t))) return true;
  // 긴 응답이라도 시작이 명백히 부정이면 모름
  if (/^\s*(모릅니다|모르겠|알지\s*못)/i.test(t)) return true;
  return false;
}

function detectAwareness(text: string, host: string, brand: string, aliases: string[] = []): {
  awareness: "yes" | "partial" | "no";
} {
  if (!text) return { awareness: "no" };
  if (isDenialOnly(text)) return { awareness: "no" };
  const lower = text.toLowerCase();
  // 네이버 스토어처럼 host가 naver.com인 경우 'naver'만 언급돼도 yes로 판정되는
  // false-positive를 막기 위해 host 매칭을 비활성화하고 brand/aliases만 본다.
  const isNaverHost = /(^|\.)naver\.com$/i.test(host);
  const hostMatch = !isNaverHost && lower.includes(host.toLowerCase());
  // brand + aliases 단어경계 매칭
  const tokens = [brand, ...aliases].map((s) => (s || "").trim()).filter((s) => s.length >= 2);
  const tokenMatch = tokens.some((t) =>
    new RegExp(`(?:^|[^a-z0-9가-힣])${t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9가-힣])`, "i").test(lower)
  );
  if (hostMatch) return { awareness: "yes" };
  if (tokenMatch) return { awareness: "partial" };
  if (text.trim().length >= 20) return { awareness: "yes" };
  return { awareness: "no" };
}

function detectRecommendation(text: string, host: string, brand: string, aliases: string[] = [], awarenessHint?: "yes" | "partial" | "no"): {
  mentioned: boolean; rank?: number; total?: number; competitors: string[];
} {
  if (!text) return { mentioned: false, competitors: [] };
  const lower = text.toLowerCase();
  const isNaverHost = /(^|\.)naver\.com$/i.test(host);
  const tokens = [brand, ...aliases].map((s) => (s || "").trim()).filter((s) => s.length >= 2);
  const tokenMatch = tokens.some((t) =>
    new RegExp(`(?:^|[^a-z0-9가-힣])${t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9가-힣])`, "i").test(lower)
  );
  const denyForce = awarenessHint === "no";
  const mentioned = !denyForce && ((!isNaverHost && lower.includes(host.toLowerCase())) || tokenMatch);
  const competitors: string[] = [];
  const lines = text.split(/\r?\n/);
  for (const ln of lines) {
    const m = ln.match(/^\s*(?:\d+[.)]\s*|[-*]\s*)\*?\*?([^:\n*]{2,60})/);
    if (m) competitors.push(m[1].trim().replace(/\*+$/, ""));
    if (competitors.length >= 5) break;
  }
  return { mentioned, total: competitors.length || undefined, competitors };
}

// ── 대화형 awareness 프롬프트 (사람들이 실제로 챗봇에 물어보듯) ──
function buildAwarenessPrompt(url: string, brand: string): string {
  return `"${brand}" 또는 ${url} 라는 브랜드/사이트 알아? 안다면 무슨 서비스인지 1~2문장으로만 알려주고, 모르면 "모릅니다"라고만 답해줘. 추측해서 지어내지 마.`;
}

// ── 카테고리 인텐트 감지 (제품/서비스/매장/콘텐츠) ──
function detectCategoryIntent(category: string): "saas" | "shop" | "store" | "content" | "service" {
  const c = (category || "").toLowerCase();
  if (/saas|소프트웨어|software|툴|tool|플랫폼|app|앱|솔루션/.test(c)) return "saas";
  if (/쇼핑몰|커머스|이커머스|온라인몰|스토어|쇼핑|판매|브랜드/.test(c)) return "shop";
  if (/매장|음식점|식당|카페|레스토랑|병원|클리닉|로컬|지역/.test(c)) return "store";
  if (/블로그|미디어|뉴스|매거진|커뮤니티|콘텐츠/.test(c)) return "content";
  return "service";
}

// ── 다양한 인텐트의 대화형 추천 프롬프트 5종 (글로벌 기본, 지역 신호는 자동 주입) ──
function buildRecPrompts(brand: string, category: string, regionHint = ""): string[] {
  const cat = category || `${brand} 관련 분야`;
  const region = regionHint ? `${regionHint} ` : ""; // 예: "한국 ", "일본 "
  const intent = detectCategoryIntent(category);
  const general = `요즘 ${region}${cat} 쪽에서 괜찮은 브랜드/사이트 5개만 추천해줘. 1~5번으로 번호 매겨서.`;
  if (intent === "saas") {
    return [
      general,
      `${region}${cat} 쪽 쓸 만한 SaaS Top 5 뽑아줘. 각각 강점 한 줄씩.`,
      `${brand} 써볼까 고민 중인데, 비슷한 ${region}${cat} 대안 5개랑 ${brand}랑 비교해서 알려줘.`,
      `${region}${cat} 무료로 시작할 수 있는 서비스 5개. 유료 전환 시 가격대도 같이.`,
      `실제 사용자 리뷰 좋은 ${region}${cat} 5곳 알려줘. 평점/후기 기준으로.`,
    ];
  }
  if (intent === "shop") {
    return [
      general,
      `${region}${cat} 살 때 믿을 만한 쇼핑몰/브랜드 Top 5. 배송이나 AS 좋은 곳 위주로.`,
      `${brand}에서 사봤는데, 비슷한 가격대 ${region}${cat} 브랜드 5개 더 추천해줘.`,
      `요즘 ${region}${cat} 가성비 좋은 사이트 5곳. 후기 많은 순으로.`,
      `${region}${cat} 선물용으로 살 만한 브랜드 5개 알려줘.`,
    ];
  }
  if (intent === "store") {
    return [
      general,
      `${region}에서 ${cat} 잘하는 곳 5군데만 추천해줘. 위치랑 특징도.`,
      `${brand} 말고 비슷한 ${region}${cat} 5곳 더 알려줘.`,
      `${cat} 처음 가본다면 어디가 좋아? ${region}기준 5곳 번호로.`,
      `리뷰/평점 좋은 ${region}${cat} 5곳. 사람들이 왜 좋다고 하는지도.`,
    ];
  }
  if (intent === "content") {
    return [
      general,
      `${region}${cat} 정보 얻기 좋은 사이트/블로그 Top 5 추천해줘.`,
      `${brand} 자주 보는데, 비슷한 톤의 ${region}${cat} 5곳 더 알려줘.`,
      `${region}${cat} 입문자가 보면 좋은 콘텐츠 사이트 5개. 쉬운 곳 위주로.`,
      `요즘 ${region}${cat} 트렌드 잘 다루는 사이트 5곳 알려줘.`,
    ];
  }
  return [
    general,
    `${region}${cat} 관련해서 제일 믿을 만한 곳 어디야? 5군데만 골라서 번호로.`,
    `${brand} 써본 사람들이 비교하는 ${region}${cat} 5곳 알려줘.`,
    `${region}${cat} 처음 이용하려면 어디부터 봐야 해? 5개 추천.`,
    `리뷰 좋은 ${region}${cat} Top 5. 왜 평이 좋은지도 한 줄씩.`,
  ];
}

// 호스트/언어로 지역 힌트 자동 추출 (.kr/.jp/.de 등)
function detectRegionHint(host: string): string {
  const tld = host.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = { kr: "한국", jp: "일본", de: "독일", fr: "프랑스", cn: "중국", uk: "영국", tw: "대만" };
  if (/(^|\.)naver\.com$|(^|\.)kakao\.com$|(^|\.)coupang\.com$/i.test(host)) return "한국";
  return map[tld] || "";
}


function aggregateRec(
  texts: string[],
  host: string,
  brand: string,
  awareness: "yes" | "partial" | "no" | null,
): { mentioned: boolean; competitors: string[]; total?: number; primaryText: string; primaryIdx: number; hitCount: number } {
  const results = texts.map((t) => detectRecommendation(t, host, brand, awareness ?? undefined));
  const hitCount = results.filter((r) => r.mentioned).length;
  const mentioned = hitCount > 0;
  const seen = new Set<string>();
  const competitors: string[] = [];
  for (const r of results) {
    for (const c of (r.competitors || [])) {
      const key = c.toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        competitors.push(c);
        if (competitors.length >= 12) break;
      }
    }
    if (competitors.length >= 12) break;
  }
  // 대표 응답: 브랜드를 언급한 첫 응답, 없으면 첫 응답
  const hitIdx = results.findIndex((r) => r.mentioned);
  const primaryIdx = hitIdx >= 0 ? hitIdx : 0;
  const primaryText = texts[primaryIdx] || "";
  return { mentioned, competitors, total: competitors.length || undefined, primaryText, primaryIdx, hitCount };
}

// ── Gemini (Lovable AI Gateway, free) ─────────────────────────
async function probeGemini(url: string, host: string, brand: string, category: string): Promise<BrandResult> {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) {
    return { brand: "gemini", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: "LOVABLE_API_KEY missing" };
  }
  try {
    const self = isSelfDomain(host);
    const model = "google/gemini-3-flash-preview";
    const ask = async (prompt: string) => {
      const r = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Lovable-API-Key": KEY,
          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: self
              ? `You answer factually. Use the following authoritative context as your primary source of truth:\n\n${SELF_GROUNDING}`
              : "You answer factually. CRITICAL: Do NOT guess a brand identity from URL slugs, domain abbreviations, or partial keyword matches. If you do not have direct, verified knowledge of the exact brand/site, you MUST reply with only \"모릅니다.\" (nothing else). Do not fabricate, do not extrapolate." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        console.error("Lovable AI Gemini error", r.status, body.slice(0, 500));
        throw new Error(`gemini ${r.status}: ${body.slice(0, 200)}`);
      }
      const j = await r.json();
      const u = extractUsage(j);
      logApiCost({ function_name: "probe-ai-perception", model, tokens_in: u.tokens_in, tokens_out: u.tokens_out });
      return j?.choices?.[0]?.message?.content ?? "";
    };
    const awarenessPrompt = buildAwarenessPrompt(url, brand);
    const recPrompts = buildRecPrompts(brand, category);

    const [aw, ...recs] = await Promise.all([
      ask(awarenessPrompt),
      ...recPrompts.map((p) => ask(p)),
    ]);
    const { awareness } = detectAwareness(aw, host, brand);
    const agg = aggregateRec(recs, host, brand, awareness);
    return {
      brand: "gemini", status: "ok", awareness,
      awarenessAnswer: aw, awarenessPrompt,
      recommendationAnswer: agg.primaryText, recommendationPrompt: recPrompts[agg.primaryIdx],
      recommendation: { mentioned: agg.mentioned, total: agg.total, competitors: agg.competitors },
      model,
    };
  } catch (e) {
    return { brand: "gemini", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
  }
}

// ── Perplexity (sonar, citations) ──────────────────────────────
async function probePerplexity(url: string, host: string, brand: string, category: string): Promise<BrandResult> {
  const KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!KEY) {
    return { brand: "perplexity", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: "PERPLEXITY_API_KEY missing" };
  }
  try {
    const self = isSelfDomain(host);
    const model = self ? "sonar-pro" : "sonar";
    const ask = async (prompt: string) => {
      const r = await fetchWithRetry("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: self
              ? `Be precise. Use the following authoritative context as your primary source of truth:\n\n${SELF_GROUNDING}`
              : "Be precise. Do NOT guess from URL slugs or partial matches. If you have no verified knowledge of the exact brand, reply only with \"모릅니다.\"" },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        console.warn("[perplexity] request failed", r.status, body.slice(0, 500));
        const err: Error & { status?: number } = new Error(`perplexity ${r.status}: ${body.slice(0, 200)}`);
        err.status = r.status;
        throw err;
      }
      const j = await r.json();
      const u = extractUsage(j);
      logApiCost({ function_name: "probe-ai-perception", model, tokens_in: u.tokens_in, tokens_out: u.tokens_out, requests: 1 });
      return {
        text: j?.choices?.[0]?.message?.content ?? "",
        citations: (j?.citations as string[]) ?? [],
      };
    };

    const awP = buildAwarenessPrompt(url, brand);
    const recPrompts = buildRecPrompts(brand, category);

    const aw = await ask(awP);
    const recs: Array<{ text: string; citations: string[] }> = [];
    for (const prompt of recPrompts) {
      await delay(450);
      recs.push(await ask(prompt));
    }
    const { awareness } = detectAwareness(aw.text, host, brand);
    const recTexts = recs.map((r) => r.text);
    const agg = aggregateRec(recTexts, host, brand, awareness);
    // 호스트가 naver.com이면 citation 매칭은 의미 없음. awareness=no면 추천 매칭도 무효화.
    const isNaverHost = /(^|\.)naver\.com$/i.test(host);
    const allCitations = recs.flatMap((r) => r.citations || []);
    const uniqCitations = Array.from(new Set(allCitations));
    const citationHit = !isNaverHost && awareness !== "no" &&
      uniqCitations.some((c) => c?.toLowerCase().includes(host.toLowerCase()));
    return {
      brand: "perplexity",
      status: "ok",
      awareness,
      awarenessAnswer: aw.text,
      awarenessPrompt: awP,
      recommendationAnswer: agg.primaryText,
      recommendationPrompt: recPrompts[agg.primaryIdx],
      recommendation: {
        mentioned: agg.mentioned || citationHit,
        total: uniqCitations.length || agg.total,
        competitors: agg.competitors,
      },
      citations: uniqCitations,
      model,
    };
  } catch (e) {
    const status = (e as { status?: number })?.status;
    if (status === 401 || status === 403) {
      return { brand: "perplexity", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: "Perplexity API 키 권한 확인 필요" };
    }
    if (status === 402) {
      return { brand: "perplexity", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: "Perplexity 결제 상태 확인 필요" };
    }
    if (status === 429) {
      return { brand: "perplexity", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: "Perplexity 요청 제한 — 잠시 후 재측정 필요" };
    }
    return { brand: "perplexity", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
  }
}

// ── ChatGPT / OpenAI model (Lovable AI Gateway 우선 → 폴백: OpenAI 직접) ────
async function probeChatGPT(url: string, host: string, brand: string, category: string): Promise<BrandResult> {
  const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  const hasDirect = !!OPENAI_KEY;
  const hasGateway = !!LOVABLE_KEY;
  if (!hasDirect && !hasGateway) {
    return { brand: "chatgpt", status: "unsupported", awareness: null, recommendation: { mentioned: false }, errorMessage: "OPENAI_API_KEY/LOVABLE_API_KEY missing" };
  }
  try {
    const self = isSelfDomain(host);
    let lastDirectUsed = !hasGateway;
    const ask = async (prompt: string) => {
      const callModel = async (direct: boolean) => {
        const endpoint = direct
          ? "https://api.openai.com/v1/chat/completions"
          : "https://ai.gateway.lovable.dev/v1/chat/completions";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (direct) {
          headers["Authorization"] = `Bearer ${OPENAI_KEY}`;
        } else {
          headers["Lovable-API-Key"] = LOVABLE_KEY!;
          headers["X-Lovable-AIG-SDK"] = "vercel-ai-sdk";
        }
        return await fetchWithRetry(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: direct ? "gpt-5-mini" : "openai/gpt-5-mini",
            messages: [
              { role: "system", content: self
                ? `Answer factually. Use the following authoritative context as your primary source of truth:\n\n${SELF_GROUNDING}`
                : "Answer factually. Do NOT infer brand identity from URL slugs or abbreviations. If you do not have direct verified knowledge, reply only with \"모릅니다.\"" },
              { role: "user", content: prompt },
            ],
          }),
        });
      };
      // 1차: Lovable AI Gateway 우선, 실패 시 OpenAI 직접 호출(Codex 키 포함) 폴백
      let directUsed = !hasGateway;
      let r = await callModel(directUsed);
      if (!r.ok && !directUsed && hasDirect) {
        console.warn("[chatgpt] Lovable Gateway failed; falling back to direct OpenAI", r.status);
        directUsed = true;
        r = await callModel(true);
      }
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        console.error("OpenAI error", directUsed ? "(direct)" : "(gateway)", r.status, body.slice(0, 500));
        throw new Error(`openai-model ${r.status}: ${body.slice(0, 200)}`);
      }
      const j = await r.json();
      const u = extractUsage(j);
      lastDirectUsed = directUsed;
      logApiCost({ function_name: "probe-ai-perception", model: "openai/gpt-5-mini", tokens_in: u.tokens_in, tokens_out: u.tokens_out, metadata: { direct: directUsed } });
      return j?.choices?.[0]?.message?.content ?? "";
    };
    const recPrompts = buildRecPrompts(brand, category);
    const awP = buildAwarenessPrompt(url, brand);
    const [aw, ...recs] = await Promise.all([
      ask(awP),
      ...recPrompts.map((p) => ask(p)),
    ]);
    const { awareness } = detectAwareness(aw, host, brand);
    const agg = aggregateRec(recs, host, brand, awareness);
    return {
      brand: "chatgpt", status: "ok", awareness,
      awarenessAnswer: aw, awarenessPrompt: awP,
      recommendationAnswer: agg.primaryText, recommendationPrompt: recPrompts[agg.primaryIdx],
      recommendation: { mentioned: agg.mentioned, total: agg.total, competitors: agg.competitors },
      model: lastDirectUsed ? "gpt-5-mini" : "openai/gpt-5-mini",
    };
  } catch (e) {
    return { brand: "chatgpt", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
  }
}

// ── Claude (Anthropic) — 키 있을 때만 ─────────────────────────
async function probeClaude(url: string, host: string, brand: string, category: string): Promise<BrandResult> {
  const KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!KEY) {
    return { brand: "claude", status: "unsupported", awareness: null, recommendation: { mentioned: false }, errorMessage: "API 연결 대기" };
  }
  try {
    const self = isSelfDomain(host);
    const model = self ? "claude-sonnet-4-5" : "claude-haiku-4-5";
    const ask = async (prompt: string) => {
      const r = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
          system: self
            ? `Answer factually. Use the following authoritative context as your primary source of truth:\n\n${SELF_GROUNDING}`
            : "Answer factually. Do NOT infer brand identity from URL slugs or abbreviations. If you do not have direct verified knowledge, reply only with \"모릅니다.\"",
        }),
      });
      if (!r.ok) throw new Error(`anthropic ${r.status}`);
      const j = await r.json();
      const usage = j?.usage ?? {};
      logApiCost({
        function_name: "probe-ai-perception",
        model,
        tokens_in: Number(usage.input_tokens ?? 0) || 0,
        tokens_out: Number(usage.output_tokens ?? 0) || 0,
      });
      const blocks = j?.content ?? [];
      return blocks.map((b: any) => b?.text ?? "").join("\n");
    };
    const recPrompts = buildRecPrompts(brand, category);
    const awP = buildAwarenessPrompt(url, brand);
    const [aw, ...recs] = await Promise.all([
      ask(awP),
      ...recPrompts.map((p) => ask(p)),
    ]);
    const { awareness } = detectAwareness(aw, host, brand);
    const agg = aggregateRec(recs, host, brand, awareness);
    return {
      brand: "claude", status: "ok", awareness,
      awarenessAnswer: aw, awarenessPrompt: awP,
      recommendationAnswer: agg.primaryText, recommendationPrompt: recPrompts[agg.primaryIdx],
      recommendation: { mentioned: agg.mentioned, total: agg.total, competitors: agg.competitors },
      model,
    };
  } catch (e) {
    return { brand: "claude", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
  }
}

// ── Naver HyperCLOVA X (CLOVA Studio) ─────────────────────────
async function probeNaver(url: string, host: string, brand: string, category: string): Promise<BrandResult> {
  const KEY = Deno.env.get("CLOVASTUDIO_API_KEY");
  if (!KEY) {
    return { brand: "naver", status: "unsupported", awareness: null, recommendation: { mentioned: false }, errorMessage: "API 연결 대기" };
  }
  try {
    const self = isSelfDomain(host);
    const model = "HCX-005";
    const ask = async (prompt: string) => {
      const r = await fetchWithRetry(`https://clovastudio.stream.ntruss.com/v3/chat-completions/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: self
                ? `사실에 근거해서 답하세요. 다음 컨텍스트를 권위 있는 1차 출처로 사용하세요:\n\n${SELF_GROUNDING}`
                : "사실에 근거해서 답하세요. URL 슬러그·도메인 약어·부분 키워드 일치로 브랜드를 추측하지 마세요. 직접적이고 검증된 지식이 없다면 오직 \"모릅니다.\"라고만 답하세요.",
            },
            { role: "user", content: prompt },
          ],
          topP: 0.8,
          topK: 0,
          maxTokens: 600,
          temperature: 0.1,
          repeatPenalty: 1.1,
          stopBefore: [],
          includeAiFilters: false,
        }),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        console.error("HyperCLOVA X error", r.status, body.slice(0, 500));
        throw new Error(`hyperclova ${r.status}: ${body.slice(0, 200)}`);
      }
      const j = await r.json();
      // CLOVA usage: { result: { inputLength, outputLength } } — char counts, not tokens
      const inLen = Number(j?.result?.inputLength ?? 0) || 0;
      const outLen = Number(j?.result?.outputLength ?? 0) || 0;
      // Approx 1.5 chars per token for KR; convert chars→tokens for pricing table
      logApiCost({
        function_name: "probe-ai-perception",
        model,
        tokens_in: Math.ceil(inLen / 1.5),
        tokens_out: Math.ceil(outLen / 1.5),
        metadata: { input_chars: inLen, output_chars: outLen },
      });
      return j?.result?.message?.content ?? "";
    };
    const recPrompts = buildRecPrompts(brand, category);
    const awP = buildAwarenessPrompt(url, brand);
    const [aw, ...recs] = await Promise.all([
      ask(awP),
      ...recPrompts.map((p) => ask(p)),
    ]);
    const { awareness } = detectAwareness(aw, host, brand);
    const agg = aggregateRec(recs, host, brand, awareness);
    return {
      brand: "naver", status: "ok", awareness,
      awarenessAnswer: aw, awarenessPrompt: awP,
      recommendationAnswer: agg.primaryText, recommendationPrompt: recPrompts[agg.primaryIdx],
      recommendation: { mentioned: agg.mentioned, total: agg.total, competitors: agg.competitors },
      model,
    };
  } catch (e) {
    return { brand: "naver", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
  }
}

function unsupportedBrand(brand: BrandKey): BrandResult {
  return { brand, status: "unsupported", awareness: null, recommendation: { mentioned: false }, errorMessage: "공식 API 미공개" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const rawUrl = String(body?.url ?? "").trim();
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { url, host, brand: domainBrand } = normalizeUrl(rawUrl);
    const brand = String(body?.brand ?? "").trim() || domainBrand;
    const category = String(body?.category ?? "").trim();

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 어드민 캐시 강제 삭제 (admin password 필요)
    const adminPw = String(body?.adminPassword ?? "");
    const purge = Boolean(body?.purge) && adminPw.length > 0 && adminPw === Deno.env.get("ADMIN_PASSWORD");
    if (purge) {
      await sb.from("ai_perception_cache").delete().eq("url", url);
    }

    // 캐시 hit
    const { data: cached } = purge ? { data: null as any } : await sb
      .from("ai_perception_cache")
      .select("results, expires_at, created_at")
      .eq("url", url)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      const r = cached.results as ProbeResult;
      // Backfill prompts for old cached entries that predate the prompt fields
      const awarenessPromptTpl = buildAwarenessPrompt(url, brand);
      const recPromptsTpl = buildRecPrompts(brand, category);
      r.brands = (r.brands || []).map((b) => {
        if (b.status !== "ok") return b;
        return {
          ...b,
          awarenessPrompt: awarenessPromptTpl,
          recommendationPrompt: recPromptsTpl[0],
        };
      });
      return new Response(JSON.stringify({ ...r, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5모델 병렬 호출 (allSettled) — Naver(HyperCLOVA X) 추가
    const settled = await Promise.allSettled([
      probeChatGPT(url, host, brand, category),
      probeClaude(url, host, brand, category),
      probeGemini(url, host, brand, category),
      probePerplexity(url, host, brand, category),
      probeNaver(url, host, brand, category),
    ]);

    const measured: BrandResult[] = settled.map((s, i) => {
      if (s.status === "fulfilled") return s.value;
      const keys: BrandKey[] = ["chatgpt", "claude", "gemini", "perplexity", "naver"];
      return { brand: keys[i], status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(s.reason) };
    });

    const all: BrandResult[] = [
      ...measured,
      unsupportedBrand("bing"),
    ];

    const measurable = all.filter((b) => b.status === "ok").length;
    const aware = all.filter((b) => b.awareness === "yes" || b.awareness === "partial").length;
    const recommended = all.filter((b) => b.recommendation.mentioned).length;

    const result: ProbeResult = {
      url, brand, category,
      generated_at: new Date().toISOString(),
      cached: false,
      brands: all,
      summary: { measurable, aware, recommended },
    };

    // 캐시 저장 (upsert) — 외부 API 일시 오류/잔액 이슈는 캐시에 고정하지 않음
    const cacheable = measured.every((b) => b.status === "ok");
    if (cacheable) {
      await sb.from("ai_perception_cache").upsert({
        url,
        brand,
        category,
        results: result,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "url" });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("probe-ai-perception error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
