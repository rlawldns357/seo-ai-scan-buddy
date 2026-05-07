// AI Perception Preview — 6대 AI 브랜드가 사이트를 어떻게 답하는지 측정
// 측정 가능: ChatGPT(OpenAI), Claude(Anthropic), Gemini(Lovable AI), Perplexity
// 측정 불가(API 미공개): Bing/Copilot, Naver Cue:
// 24h 도메인 캐시. Promise.allSettled 병렬 + 8s 타임아웃.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIMEOUT_MS = 12000;

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
  recommendation: { mentioned: boolean; rank?: number; total?: number; competitors?: string[] };
  recommendationAnswer?: string;
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

function detectAwareness(text: string, host: string, brand: string): {
  awareness: "yes" | "partial" | "no";
} {
  if (!text) return { awareness: "no" };
  if (isDenialOnly(text)) return { awareness: "no" };
  const lower = text.toLowerCase();
  // 네이버 스토어처럼 host가 naver.com인 경우 'naver'만 언급돼도 yes로 판정되는
  // false-positive를 막기 위해 host 매칭을 비활성화하고 brand(=슬러그/브랜드명)만 본다.
  const isNaverHost = /(^|\.)naver\.com$/i.test(host);
  const hostMatch = !isNaverHost && lower.includes(host.toLowerCase());
  // 짧은 brand 토큰(lge 등)은 "LG전자"의 LG와 부분일치할 수 있음 → 단어 경계 강제
  const b = brand.toLowerCase();
  const brandMatch = b.length >= 2 && new RegExp(`(?:^|[^a-z0-9])${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`, "i").test(lower);
  if (hostMatch) return { awareness: "yes" };
  if (brandMatch) return { awareness: "partial" };
  // 슬러그/호스트와 토큰 일치는 없지만 부정 단답도 아니고 실질 답변(20자+)이면
  // 모델이 무언가는 알고 있다고 보고 partial로 둔다 (slug != 실제 브랜드명 케이스 대응)
  if (text.trim().length >= 20) return { awareness: "partial" };
  return { awareness: "no" };
}

function detectRecommendation(text: string, host: string, brand: string, awarenessHint?: "yes" | "partial" | "no"): {
  mentioned: boolean; rank?: number; total?: number; competitors: string[];
} {
  if (!text) return { mentioned: false, competitors: [] };
  const lower = text.toLowerCase();
  const isNaverHost = /(^|\.)naver\.com$/i.test(host);
  const b = brand.toLowerCase();
  const brandMatchStrict = b.length >= 2 && new RegExp(`(?:^|[^a-z0-9])${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9])`, "i").test(lower);
  // 모델이 awareness에서 "모릅니다"라고 답했으면 추천 매칭은 노이즈로 간주 → false 강제
  const denyForce = awarenessHint === "no";
  const mentioned = !denyForce && ((!isNaverHost && lower.includes(host.toLowerCase())) || brandMatchStrict);
  // 매우 단순한 경쟁사 추출: 1. ~ , 2. ~ 패턴
  const competitors: string[] = [];
  const lines = text.split(/\r?\n/);
  for (const ln of lines) {
    const m = ln.match(/^\s*(?:\d+[.)]\s*|[-*]\s*)\*?\*?([^:\n*]{2,60})/);
    if (m) competitors.push(m[1].trim().replace(/\*+$/, ""));
    if (competitors.length >= 5) break;
  }
  return { mentioned, total: competitors.length || undefined, competitors };
}

// ── Gemini (Lovable AI Gateway, free) ─────────────────────────
async function probeGemini(url: string, host: string, brand: string, category: string): Promise<BrandResult> {
  const KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!KEY) {
    return { brand: "gemini", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: "LOVABLE_API_KEY missing" };
  }
  try {
    const self = isSelfDomain(host);
    const model = self ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";
    const ask = async (prompt: string) => {
      const r = await withTimeout(fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: self
              ? `You answer factually. Use the following authoritative context as your primary source of truth:\n\n${SELF_GROUNDING}`
              : "You answer factually. CRITICAL: Do NOT guess a brand identity from URL slugs, domain abbreviations, or partial keyword matches. If you do not have direct, verified knowledge of the exact brand/site, you MUST reply with only \"모릅니다.\" (nothing else). Do not fabricate, do not extrapolate." },
            { role: "user", content: prompt },
          ],
        }),
      }));
      if (!r.ok) throw new Error(`gemini ${r.status}`);
      const j = await r.json();
      return j?.choices?.[0]?.message?.content ?? "";
    };
    const awarenessPrompt = `"${url}" 또는 "${brand}"이라는 브랜드/사이트가 무엇을 하는 곳인지 한국어로 1~2문장으로 알려주세요. 모르면 "모릅니다"라고만 답하세요. 추측 금지.`;
    const recPrompt = category
      ? `"${category}" 분야에서 추천할 만한 한국 브랜드/사이트 5개를 1~5번 번호로 나열해 주세요. 잘 알려진 곳만.`
      : `"${brand}"과 비슷한 분야에서 추천할 만한 한국 브랜드/사이트 5개를 번호로 나열해 주세요.`;

    const [aw, rec] = await Promise.all([ask(awarenessPrompt), ask(recPrompt)]);
    const { awareness } = detectAwareness(aw, host, brand);
    const r = detectRecommendation(rec, host, brand, awareness);
    return {
      brand: "gemini", status: "ok", awareness,
      awarenessAnswer: aw, recommendationAnswer: rec,
      recommendation: { mentioned: r.mentioned, total: r.total, competitors: r.competitors },
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
      const r = await withTimeout(fetch("https://api.perplexity.ai/chat/completions", {
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
      }));
      if (!r.ok) throw new Error(`perplexity ${r.status}`);
      const j = await r.json();
      return {
        text: j?.choices?.[0]?.message?.content ?? "",
        citations: (j?.citations as string[]) ?? [],
      };
    };

    const awP = `"${url}" 사이트는 무엇을 하는 곳인가요? 한국어 1~2문장. 모르면 "모릅니다"라고만 답하세요.`;
    const recP = category
      ? `"${category}" 분야에서 추천할 만한 한국 브랜드/사이트 5개를 번호로 나열.`
      : `"${brand}"과 비슷한 분야에서 추천할 만한 한국 브랜드/사이트 5개를 번호로 나열.`;

    const [aw, rec] = await Promise.all([ask(awP), ask(recP)]);
    const { awareness } = detectAwareness(aw.text, host, brand);
    const r = detectRecommendation(rec.text, host, brand, awareness);
    // 호스트가 naver.com이면 citation 매칭은 의미 없음. awareness=no면 추천 매칭도 무효화.
    const isNaverHost = /(^|\.)naver\.com$/i.test(host);
    const citationHit = !isNaverHost && awareness !== "no" &&
      (rec.citations || []).some((c) => c?.toLowerCase().includes(host.toLowerCase()));
    return {
      brand: "perplexity",
      status: "ok",
      awareness,
      awarenessAnswer: aw.text,
      recommendationAnswer: rec.text,
      recommendation: {
        mentioned: r.mentioned || citationHit,
        total: rec.citations?.length || r.total,
        competitors: r.competitors,
      },
      citations: rec.citations,
      model,
    };
  } catch (e) {
    return { brand: "perplexity", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
  }
}

// ── ChatGPT (OpenAI) — 키 있을 때만 ────────────────────────────
async function probeChatGPT(url: string, host: string, brand: string, category: string): Promise<BrandResult> {
  const KEY = Deno.env.get("OPENAI_API_KEY");
  if (!KEY) {
    return { brand: "chatgpt", status: "unsupported", awareness: null, recommendation: { mentioned: false }, errorMessage: "API 연결 대기" };
  }
  try {
    const self = isSelfDomain(host);
    const model = self ? "gpt-4o" : "gpt-4o-mini";
    const ask = async (prompt: string) => {
      const r = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: self
              ? `Answer factually. Use the following authoritative context as your primary source of truth:\n\n${SELF_GROUNDING}`
              : "Answer factually. Do NOT infer brand identity from URL slugs or abbreviations. If you do not have direct verified knowledge, reply only with \"모릅니다.\"" },
            { role: "user", content: prompt },
          ],
          temperature: 0,
        }),
      }));
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        console.error("OpenAI error", r.status, body.slice(0, 500));
        throw new Error(`openai ${r.status}: ${body.slice(0, 200)}`);
      }
      const j = await r.json();
      return j?.choices?.[0]?.message?.content ?? "";
    };
    const aw = await ask(`"${url}" 사이트는 무엇을 하는 곳인가요? 한국어 1~2문장. 모르면 "모릅니다"만.`);
    const rec = await ask(category
      ? `"${category}" 분야에서 추천할 만한 한국 브랜드/사이트 5개를 번호로 나열.`
      : `"${brand}"과 비슷한 분야에서 추천할 만한 한국 브랜드/사이트 5개를 번호로 나열.`);
    const { awareness } = detectAwareness(aw, host, brand);
    const r = detectRecommendation(rec, host, brand, awareness);
    return {
      brand: "chatgpt", status: "ok", awareness,
      awarenessAnswer: aw, recommendationAnswer: rec,
      recommendation: { mentioned: r.mentioned, total: r.total, competitors: r.competitors },
      model,
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
      const r = await withTimeout(fetch("https://api.anthropic.com/v1/messages", {
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
      }));
      if (!r.ok) throw new Error(`anthropic ${r.status}`);
      const j = await r.json();
      const blocks = j?.content ?? [];
      return blocks.map((b: any) => b?.text ?? "").join("\n");
    };
    const aw = await ask(`"${url}" 사이트는 무엇을 하는 곳인가요? 한국어 1~2문장. 모르면 "모릅니다"만.`);
    const rec = await ask(category
      ? `"${category}" 분야에서 추천할 만한 한국 브랜드/사이트 5개를 번호로 나열.`
      : `"${brand}"과 비슷한 분야에서 추천할 만한 한국 브랜드/사이트 5개를 번호로 나열.`);
    const { awareness } = detectAwareness(aw, host, brand);
    const r = detectRecommendation(rec, host, brand, awareness);
    return {
      brand: "claude", status: "ok", awareness,
      awarenessAnswer: aw, recommendationAnswer: rec,
      recommendation: { mentioned: r.mentioned, total: r.total, competitors: r.competitors },
      model,
    };
  } catch (e) {
    return { brand: "claude", status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(e) };
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
      return new Response(JSON.stringify({ ...r, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4모델 병렬 호출 (allSettled)
    const settled = await Promise.allSettled([
      probeChatGPT(url, host, brand, category),
      probeClaude(url, host, brand, category),
      probeGemini(url, host, brand, category),
      probePerplexity(url, host, brand, category),
    ]);

    const measured: BrandResult[] = settled.map((s, i) => {
      if (s.status === "fulfilled") return s.value;
      const keys: BrandKey[] = ["chatgpt", "claude", "gemini", "perplexity"];
      return { brand: keys[i], status: "error", awareness: null, recommendation: { mentioned: false }, errorMessage: String(s.reason) };
    });

    const all: BrandResult[] = [
      ...measured,
      unsupportedBrand("bing"),
      unsupportedBrand("naver"),
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

    // 캐시 저장 (upsert)
    await sb.from("ai_perception_cache").upsert({
      url,
      brand,
      category,
      results: result,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: "url" });

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
