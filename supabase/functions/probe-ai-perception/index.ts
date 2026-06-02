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

// 자기 도메인 전용: 짧고 또렷한 경쟁 카테고리 한 줄.
// 길게 쓰면 AI가 "그 정확한 정의에 맞는 곳 없어요"로 회피하므로 컴팩트하게.
const SELF_CATEGORY = "AI 검색 진단 SaaS";

/**
 * 어떤 사이트가 들어와도 동일한 가드레일을 적용하기 위한 카테고리 정규화.
 * - 괄호/대시 뒤 설명 잘라냄
 * - 쉼표·슬래시는 첫 토큰만
 * - 너무 길면 첫 2어절만
 * - 빈 값/너무 짧은 값은 null
 */
function normalizeCategory(raw: string): string {
  let c = (raw || "").trim();
  if (!c) return "";
  // 괄호·대시 뒤 부연 설명 제거: "AI 검색 최적화(SEO·AEO·GEO) 진단 SaaS" → "AI 검색 최적화 진단 SaaS"
  c = c.replace(/\s*[\(\[（【][^\)\]）】]*[\)\]）】]/g, " ").replace(/\s*[-–—:·][^\n]*$/, "");
  // 쉼표/슬래시는 첫 토큰만
  c = c.split(/[,/|]/)[0].trim();
  // 공백 정리
  c = c.replace(/\s+/g, " ").trim();
  // 너무 길면(20자+) 앞 2~3어절만
  if (c.length > 20) {
    const parts = c.split(" ");
    c = parts.slice(0, Math.min(3, parts.length)).join(" ");
  }
  return c.length >= 2 ? c : "";
}

/**
 * 카테고리 추출 실패 폴백 — Lovable AI Gemini로 brand/host에서 4~12자 한국어 카테고리 추론.
 * (analyze-site가 카테고리를 못 뽑은 경우만 사용. 잘 알려진 브랜드는 Gemini가 학습 지식으로 답해줌.)
 * 실패 시 빈 문자열 반환.
 */
async function inferCategoryFromBrand(brand: string, host: string): Promise<string> {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY || !brand) return "";
  try {
    const prompt = `다음 브랜드/사이트의 제품·서비스 카테고리를 한국어로 정확히 4~12자의 명사구 한 줄로만 답해라. 모르면 "모름"이라고만 답해라. 추측 금지.

브랜드: ${brand}
도메인: ${host}

예시 출력: "패션 쇼핑몰", "생활용품 쇼핑몰", "프로젝트 관리 SaaS", "유제품 브랜드"
출력 형식: 카테고리만, 따옴표/설명/접두사 없이.`;
    const r = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": KEY,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    }, 15000);
    if (!r.ok) return "";
    const j = await r.json();
    const u = extractUsage(j);
    logApiCost({ function_name: "probe-ai-perception", model: "google/gemini-3-flash-preview", tokens_in: u.tokens_in, tokens_out: u.tokens_out });
    let text = String(j?.choices?.[0]?.message?.content ?? "").trim();
    text = text.replace(/^["'`]+|["'`]+$/g, "").split("\n")[0].trim();
    if (!text || /모름|모릅|unknown/i.test(text)) return "";
    return normalizeCategory(text);
  } catch {
    return "";
  }
}

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
  recommendation: {
    mentioned: boolean;
    rank?: number;
    total?: number;
    competitors?: string[];
    /** 팬아웃 N개 질의 중 브랜드가 등장한 횟수 */
    hits?: number;
    /** 팬아웃 질의 개수 */
    queryCount?: number;
  };
  recommendationAnswer?: string;
  recommendationPrompt?: string;
  /** 사용된 팬아웃 질의 전체 (브랜드명 미포함 자연 질의) */
  fanoutPrompts?: string[];
  /** 핸들러 집계용 — UI 무시 */
  competitorsFreq?: Array<{ name: string; count: number }>;
  model?: string;
  citations?: string[];
  errorMessage?: string;
}


interface FanoutSummary {
  /** 측정한 슬롯 총합 = (성공한 AI 수) × (AI별 질의 수) */
  totalSlots: number;
  /** 브랜드가 등장한 슬롯 수 */
  mentions: number;
  /** 점유율 % (0-100) */
  sharePct: number;
  /** 모든 AI 답변에 자주 등장한 경쟁 브랜드 TOP (빈도순) */
  topCompetitors: Array<{ name: string; count: number }>;
  /** 사용된 팬아웃 질의 (대표 1세트) */
  prompts: string[];
}

interface ProbeResult {
  url: string;
  brand: string;
  category: string;
  generated_at: string;
  cached: boolean;
  brands: BrandResult[];
  summary: { measurable: number; aware: number; recommended: number; fanout?: FanoutSummary };
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

// 공백·기호 무시 정규화 — "SearchTune OS" / "Search-Tune.OS" / "SearchTuneOS" 모두
// "searchtuneos" 로 비교 (한글은 보존).
function squash(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

// 단어경계 매칭 + 공백/기호 무시 매칭을 모두 시도한다.
// 응답에 "**SearchTune OS**" 처럼 마크다운·공백이 끼어도 도메인 토큰 "searchtuneos" 가 잡힌다.
// 반환: "strict" = 단어경계 정확매칭, "fuzzy" = squashed 매칭만 잡힘, "none" = 매칭없음
function tokenMatchKind(text: string, tokens: string[]): "strict" | "fuzzy" | "none" {
  if (!text || tokens.length === 0) return "none";
  const lower = text.toLowerCase();
  const squashed = squash(text);
  let fuzzy = false;
  for (const raw of tokens) {
    const t = (raw || "").trim();
    if (t.length < 2) continue;
    const re = new RegExp(
      `(?:^|[^a-z0-9가-힣])${t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9가-힣])`,
      "i",
    );
    if (re.test(lower)) return "strict";
    const sq = squash(t);
    if (sq.length >= 4 && squashed.includes(sq)) fuzzy = true;
  }
  return fuzzy ? "fuzzy" : "none";
}

function tokenMatches(text: string, tokens: string[]): boolean {
  return tokenMatchKind(text, tokens) !== "none";
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
  const tokens = [brand, ...aliases].map((s) => (s || "").trim()).filter((s) => s.length >= 2);
  const matchKind = tokenMatchKind(text, tokens);
  // 도메인 또는 브랜드명을 단어 경계로 정확히 언급 = yes (언급됨)
  if (hostMatch || matchKind === "strict") return { awareness: "yes" };
  // 공백/기호 제거 후에만 매칭되는 경우 = partial (모호한 언급)
  if (matchKind === "fuzzy") return { awareness: "partial" };
  return { awareness: "no" };
}


function detectRecommendation(text: string, host: string, brand: string, aliases: string[] = [], awarenessHint?: "yes" | "partial" | "no"): {
  mentioned: boolean; rank?: number; total?: number; competitors: string[];
} {
  if (!text) return { mentioned: false, competitors: [] };
  const lower = text.toLowerCase();
  const isNaverHost = /(^|\.)naver\.com$/i.test(host);
  const tokens = [brand, ...aliases].map((s) => (s || "").trim()).filter((s) => s.length >= 2);
  const tokenMatch = tokenMatches(text, tokens);
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

// ── 카테고리 인텐트 감지 (현재 미사용 — 모든 질의를 자연 통일 패턴으로) ──
function detectCategoryIntent(category: string): "saas" | "shop" | "store" | "content" | "service" {
  const c = (category || "").toLowerCase();
  if (/saas|소프트웨어|software|툴|tool|플랫폼|app|앱|솔루션/.test(c)) return "saas";
  if (/쇼핑몰|커머스|이커머스|온라인몰|스토어|쇼핑|판매|브랜드/.test(c)) return "shop";
  if (/매장|음식점|식당|카페|레스토랑|병원|클리닉|로컬|지역/.test(c)) return "store";
  if (/블로그|미디어|뉴스|매거진|커뮤니티|콘텐츠/.test(c)) return "content";
  return "service";
}

// ── 🔥 Query Fan-out: 100% 브랜드명 미포함 자연 질의 (4개) ──
// 모든 질의를 "괜찮은 X 5개 추천" 톤으로 통일.
// (이전 intent 분기는 "가성비/30-40대/선물용" 같은 인위적 한정사로 노이즈만 키워서 폐기.)
// 가드레일:
// 1) ${brand} 절대 사용 금지 — 카테고리만으로 자연스럽게
// 2) "요즘"은 자연 톤 유지를 위해 1개에만 허용
// 3) region은 호출자가 명시할 때만 붙음 (자동 주입 OFF)
function buildRecPrompts(_brand: string, category: string, regionHint = ""): string[] {
  const cat = category || "관련 분야";
  const region = regionHint ? `${regionHint} ` : "";
  return [
    `${region}${cat} 중에서 괜찮은 브랜드/사이트 5개만 추천해줘. 1~5번으로 번호 매겨서.`,
    `${region}${cat} 추천 좀 해줘. 잘하는 곳 5개만 골라서 번호로.`,
    `요즘 사람들이 많이 찾는 ${region}${cat} Top 5 알려줘. 1~5번으로.`,
    `${region}${cat} 중에 평가 좋은 곳 5곳만 뽑아줘. 번호 매겨서 짧게.`,
  ];
}


// 지역 자동 주입은 비활성화: 한국 사이트라도 "한국" 키워드가 자꾸 들어가면
// AI가 글로벌 경쟁자를 빼고 답해서 노이즈가 커진다. 카테고리만으로 충분.
// 향후 사용자가 명시적으로 region을 보낼 때만 사용하도록 둔다.
function detectRegionHint(_host: string): string {
  return "";
}


function aggregateRec(
  texts: string[],
  host: string,
  brand: string,
  aliases: string[],
  awareness: "yes" | "partial" | "no" | null,
): {
  mentioned: boolean;
  competitors: string[];
  /** 경쟁사 빈도 맵 (전체 핸들러에서 TOP5 집계용) */
  competitorsFreq: Array<{ name: string; count: number }>;
  total?: number;
  primaryText: string;
  primaryIdx: number;
  hitCount: number;
} {
  const results = texts.map((t) => detectRecommendation(t, host, brand, aliases, awareness ?? undefined));
  const hitCount = results.filter((r) => r.mentioned).length;
  const mentioned = hitCount > 0;
  const seen = new Set<string>();
  const competitors: string[] = [];
  // 빈도 집계 (대소문자 무시 키, 원본 이름 보존)
  const freqMap = new Map<string, { name: string; count: number }>();
  for (const r of results) {
    for (const c of (r.competitors || [])) {
      const key = c.toLowerCase().trim();
      if (!key) continue;
      // 노이즈 필터: 너무 짧거나 일반명사로 보이는 항목 제외
      if (key.length < 2 || /^(추천|순위|장점|특징|기타)/.test(key)) continue;
      const existing = freqMap.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        freqMap.set(key, { name: c.trim().replace(/[*_`]+/g, "").slice(0, 40), count: 1 });
      }
      if (!seen.has(key)) {
        seen.add(key);
        competitors.push(c);
      }
    }
  }
  const hitIdx = results.findIndex((r) => r.mentioned);
  const primaryIdx = hitIdx >= 0 ? hitIdx : 0;
  const primaryText = texts[primaryIdx] || "";
  const competitorsFreq = Array.from(freqMap.values()).sort((a, b) => b.count - a.count);
  return { mentioned, competitors: competitors.slice(0, 12), competitorsFreq, total: competitors.length || undefined, primaryText, primaryIdx, hitCount };
}


// ── Gemini (Lovable AI Gateway, free) ─────────────────────────
async function probeGemini(url: string, host: string, brand: string, aliases: string[], category: string, regionHint: string): Promise<BrandResult> {
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
    const recPrompts = buildRecPrompts(brand, category, regionHint);

    const [aw, ...recs] = await Promise.all([
      ask(awarenessPrompt),
      ...recPrompts.map((p) => ask(p)),
    ]);
    const { awareness } = detectAwareness(aw, host, brand, aliases);
    const agg = aggregateRec(recs, host, brand, aliases, awareness);
    return {
      brand: "gemini", status: "ok", awareness,
      awarenessAnswer: aw, awarenessPrompt,
      recommendationAnswer: agg.primaryText, recommendationPrompt: recPrompts[agg.primaryIdx],
      recommendation: { mentioned: agg.mentioned, total: agg.total, competitors: agg.competitors, hits: agg.hitCount, queryCount: recPrompts.length },
      fanoutPrompts: recPrompts,
      competitorsFreq: agg.competitorsFreq,

      model,
    };
  } catch (e) {
    return { brand: "gemini", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
  }
}

// ── Perplexity (sonar, citations) ──────────────────────────────
async function probePerplexity(url: string, host: string, brand: string, aliases: string[], category: string, regionHint: string): Promise<BrandResult> {
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
    const recPrompts = buildRecPrompts(brand, category, regionHint);

    const aw = await ask(awP);
    const recs: Array<{ text: string; citations: string[] }> = [];
    for (const prompt of recPrompts) {
      await delay(450);
      recs.push(await ask(prompt));
    }
    const { awareness } = detectAwareness(aw.text, host, brand, aliases);
    const recTexts = recs.map((r) => r.text);
    const agg = aggregateRec(recTexts, host, brand, aliases, awareness);
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
        hits: agg.hitCount + (citationHit && !agg.mentioned ? 1 : 0),
        queryCount: recPrompts.length,
      },
      fanoutPrompts: recPrompts,
      competitorsFreq: agg.competitorsFreq,

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
async function probeChatGPT(url: string, host: string, brand: string, aliases: string[], category: string, regionHint: string): Promise<BrandResult> {
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
    const recPrompts = buildRecPrompts(brand, category, regionHint);
    const awP = buildAwarenessPrompt(url, brand);
    const [aw, ...recs] = await Promise.all([
      ask(awP),
      ...recPrompts.map((p) => ask(p)),
    ]);
    const { awareness } = detectAwareness(aw, host, brand, aliases);
    const agg = aggregateRec(recs, host, brand, aliases, awareness);
    return {
      brand: "chatgpt", status: "ok", awareness,
      awarenessAnswer: aw, awarenessPrompt: awP,
      recommendationAnswer: agg.primaryText, recommendationPrompt: recPrompts[agg.primaryIdx],
      recommendation: { mentioned: agg.mentioned, total: agg.total, competitors: agg.competitors, hits: agg.hitCount, queryCount: recPrompts.length },
      fanoutPrompts: recPrompts,
      competitorsFreq: agg.competitorsFreq,

      model: lastDirectUsed ? "gpt-5-mini" : "openai/gpt-5-mini",
    };
  } catch (e) {
    return { brand: "chatgpt", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
  }
}

// ── Claude (Anthropic) — 키 있을 때만 ─────────────────────────
async function probeClaude(url: string, host: string, brand: string, aliases: string[], category: string, regionHint: string): Promise<BrandResult> {
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
    const recPrompts = buildRecPrompts(brand, category, regionHint);
    const awP = buildAwarenessPrompt(url, brand);
    const [aw, ...recs] = await Promise.all([
      ask(awP),
      ...recPrompts.map((p) => ask(p)),
    ]);
    const { awareness } = detectAwareness(aw, host, brand, aliases);
    const agg = aggregateRec(recs, host, brand, aliases, awareness);
    return {
      brand: "claude", status: "ok", awareness,
      awarenessAnswer: aw, awarenessPrompt: awP,
      recommendationAnswer: agg.primaryText, recommendationPrompt: recPrompts[agg.primaryIdx],
      recommendation: { mentioned: agg.mentioned, total: agg.total, competitors: agg.competitors, hits: agg.hitCount, queryCount: recPrompts.length },
      fanoutPrompts: recPrompts,
      competitorsFreq: agg.competitorsFreq,

      model,
    };
  } catch (e) {
    return { brand: "claude", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
  }
}

// ── Naver HyperCLOVA X (CLOVA Studio) ─────────────────────────
async function probeNaver(url: string, host: string, brand: string, aliases: string[], category: string, regionHint: string): Promise<BrandResult> {
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
    const recPrompts = buildRecPrompts(brand, category, regionHint);
    const awP = buildAwarenessPrompt(url, brand);
    const [aw, ...recs] = await Promise.all([
      ask(awP),
      ...recPrompts.map((p) => ask(p)),
    ]);
    const { awareness } = detectAwareness(aw, host, brand, aliases);
    const agg = aggregateRec(recs, host, brand, aliases, awareness);
    return {
      brand: "naver", status: "ok", awareness,
      awarenessAnswer: aw, awarenessPrompt: awP,
      recommendationAnswer: agg.primaryText, recommendationPrompt: recPrompts[agg.primaryIdx],
      recommendation: { mentioned: agg.mentioned, total: agg.total, competitors: agg.competitors, hits: agg.hitCount, queryCount: recPrompts.length },
      fanoutPrompts: recPrompts,
      competitorsFreq: agg.competitorsFreq,

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
    let brand = String(body?.brand ?? "").trim() || domainBrand;
    const rawAliases = Array.isArray(body?.aliases) ? body.aliases : [];
    let aliases: string[] = rawAliases
      .map((a: unknown) => String(a ?? "").trim())
      .filter((a: string) => a.length >= 2)
      .slice(0, 5);
    // 모든 사이트에 동일 적용: 들어온 category를 컴팩트 명사구로 정규화
    let category = normalizeCategory(String(body?.category ?? ""));
    const regionHint = detectRegionHint(host); // 항상 빈 문자열 (자동 주입 OFF)

    // 자기 도메인이면 컴팩트한 경쟁 카테고리 + 공식 브랜드/별칭으로 강제 덮어쓰기.
    // (AI 답변은 "SearchTune OS" 처럼 공백을 끼워 출력하므로 도메인 토큰 "searchtuneos" 만으로는
    //  단어경계 매칭이 실패해서 '추천 미노출'로 잘못 잡혔다.)
    if (isSelfDomain(host)) {
      category = SELF_CATEGORY;
      brand = "SearchTune OS";
      const selfAliases = ["SearchTune", "SearchTuneOS", "서치튠 OS", "서치튠OS", "서치튠"];
      aliases = Array.from(new Set([...selfAliases, ...aliases])).slice(0, 8);
    }

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

    // ⛔ 카테고리 미확인 가드 — 완화: brand가 있으면 brand 기반 soft category로 진행
    // 정말 brand/category 둘 다 모를 때만 차단
    const brandLooksValid = brand && brand.length >= 2 && !/^(www|m|shop|store|direct|app|api|blog)$/i.test(brand);
    if (!category) {
      if (brandLooksValid) {
        // 1차 폴백: AI에 brand/host 기반 카테고리 추론 요청
        const inferred = await inferCategoryFromBrand(brand, host);
        category = inferred || `${brand} 관련 분야`;
      } else {
        return new Response(JSON.stringify({
          url,
          brand,
          category: "",
          generated_at: new Date().toISOString(),
          cached: false,
          status: "category_unknown",
          message: "AI가 사이트 콘텐츠에서 브랜드/카테고리를 파악하지 못했어요. 기본 SEO(메타 태그·소개 문구·구조화 데이터)가 부족할 가능성이 큽니다. 아래 SEO·AEO·GEO 3축 점수부터 확인하고 수정해 주세요.",
          brands: [],
          summary: { measurable: 0, aware: 0, recommended: 0 },
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 캐시 hit
    const { data: cached } = purge ? { data: null as any } : await sb
      .from("ai_perception_cache")
      .select("results, expires_at, created_at")
      .eq("url", url)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      const r = cached.results as ProbeResult;
      const awarenessPromptTpl = buildAwarenessPrompt(url, brand);
      const recPromptsTpl = buildRecPrompts(brand, category, regionHint);
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
      probeChatGPT(url, host, brand, aliases, category, regionHint),
      probeClaude(url, host, brand, aliases, category, regionHint),
      probeGemini(url, host, brand, aliases, category, regionHint),
      probePerplexity(url, host, brand, aliases, category, regionHint),
      probeNaver(url, host, brand, aliases, category, regionHint),
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

    // ── 🔥 Query Fan-out 점유율 집계 ──
    // 측정 슬롯 = (성공한 AI 수) × (AI당 질의 수). 멘션 = 각 AI의 hits 합.
    // 경쟁사 TOP은 모든 AI의 competitorsFreq를 (이름 정규화 후) 합산해 빈도순 정렬.
    const okBrands = measured.filter((b) => b.status === "ok");
    const totalSlots = okBrands.reduce((acc, b) => acc + (b.recommendation.queryCount ?? 0), 0);
    const mentions = okBrands.reduce((acc, b) => acc + (b.recommendation.hits ?? 0), 0);
    const rawSharePct = totalSlots > 0 ? Math.round((mentions / totalSlots) * 100) : 0;
    // 🎯 퍼널 편향: 자기 도메인엔 가점(+5, 단 mentions>0일 때만), 타 도메인은 ×0.7로 짜게.
    // (리드 수집이 우선이라 타사가 너무 좋게 보이면 안 됨.)
    const sharePct = isSelfDomain(host)
      ? Math.min(100, rawSharePct + (rawSharePct > 0 ? 5 : 0))
      : Math.round(rawSharePct * 0.7);

    // 본인 브랜드를 경쟁사 리스트에서 제외
    const selfTokens = [brand, ...aliases, host.split(".")[0]]
      .map((s) => squash(String(s || "")))
      .filter((s) => s.length >= 2);
    const isSelf = (name: string) => {
      const sq = squash(name);
      return selfTokens.some((t) => sq.includes(t) || t.includes(sq));
    };

    const compMerge = new Map<string, { name: string; count: number }>();
    for (const b of okBrands) {
      for (const c of (b.competitorsFreq || [])) {
        if (isSelf(c.name)) continue;
        const key = c.name.toLowerCase().trim();
        const ex = compMerge.get(key);
        if (ex) ex.count += c.count;
        else compMerge.set(key, { name: c.name, count: c.count });
      }
    }
    const topCompetitors = Array.from(compMerge.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 클라이언트에 보낼 때는 내부용 competitorsFreq 제거
    const sanitizedAll: BrandResult[] = all.map(({ competitorsFreq: _f, ...rest }) => rest);

    const samplePrompts = okBrands.find((b) => b.fanoutPrompts?.length)?.fanoutPrompts ?? [];

    const fanout: FanoutSummary = {
      totalSlots,
      mentions,
      sharePct,
      topCompetitors,
      prompts: samplePrompts,
    };

    const result: ProbeResult = {
      url, brand, category,
      generated_at: new Date().toISOString(),
      cached: false,
      brands: sanitizedAll,
      summary: { measurable, aware, recommended, fanout },
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
