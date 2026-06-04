// resolve-site-identity — 사이트 정체성(brand · aliases · category · description)의 SoT.
// Firecrawl + Gemini로 1차 추출, confidence가 낮으면 GPT-5-mini로 2차 합의(voter),
// 결과를 site_identity 캐시(7d)에 저장하고 identity_audit_log에 추적 기록.
//
// 모든 다른 함수는 _shared/identity-match.ts의 loadOrResolveIdentity()를 통해
// 이 함수를 호출하거나 캐시를 조회한다.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logApiCost, extractUsage } from "../_shared/cost-logger.ts";
import {
  normalizeHost,
  loadIdentity,
  upsertIdentity,
  logAudit,
  describesSameEntity,
  isMultiTenantHost,
  type SiteIdentity,
} from "../_shared/identity-match.ts";

const FETCH_TIMEOUT_MS = 18000;
async function fetchWithTimeout(url: string, init: RequestInit, ms = FETCH_TIMEOUT_MS): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONFIDENCE_VOTE_THRESHOLD = 0.7; // 미만이면 2차 voter 호출

interface ExtractedIdentity {
  brand: string | null;
  aliases: string[];
  category: string | null;
  description_short: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const url: string = body?.url ?? "";
    const force: boolean = !!body?.force;
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const host = normalizeHost(url);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 0) 캐시 (force가 아니면) — 멀티테넌트는 캐시 우회
    const multiTenant = isMultiTenantHost(host);
    if (!force && !multiTenant) {
      const { identity, stale } = await loadIdentity(supabase, host);
      if (identity && !stale) {
        await logAudit(supabase, {
          host,
          stage: "cache_hit",
          function_name: "resolve-site-identity",
          after_state: identityToState(identity),
          confidence: identity.confidence,
          source: identity.source,
          reason: "cache hit (<7d)",
        });
        return json({ success: true, identity, cached: true });
      }
    }

    // 1) Firecrawl: 항상 루트 호스트(`https://${host}/`)를 스크랩
    //    (사용자가 딥 페이지 URL을 줘도 블로그 글 기반 추출 방지)
    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_KEY || !LOVABLE_KEY) {
      return json({ success: false, error: "missing API keys" }, 500);
    }

    const rootUrl = `https://${host}/`;

    const fr = await fetchWithTimeout("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: rootUrl,
        formats: ["markdown", "summary"],
        onlyMainContent: true,
        waitFor: 1500,
      }),
    }, 20000);
    if (!fr.ok) {
      const errText = await fr.text().catch(() => "");
      console.error("[resolve] firecrawl failed", fr.status, errText.slice(0, 300));
      return json({ success: false, error: `firecrawl ${fr.status}` }, 200);
    }
    logApiCost({ function_name: "resolve-site-identity", model: "firecrawl/scrape", requests: 1, metadata: { host } });
    const fj = await fr.json();
    const md = String(fj?.data?.markdown ?? fj?.markdown ?? "");
    const summary = String(fj?.data?.summary ?? fj?.summary ?? "");
    const metadata = fj?.data?.metadata ?? fj?.metadata ?? {};
    const pageContext = [
      `Title: ${metadata?.title ?? ""}`,
      `Description: ${metadata?.description ?? ""}`,
      `Summary: ${summary}`,
      `---`,
      md.slice(0, 5000),
    ].join("\n");

    // 2) Gemini 1차 추출
    const primary = await extractWithGemini(LOVABLE_KEY, host, pageContext);
    let identity: SiteIdentity = {
      host,
      brand: primary.identity.brand,
      aliases: primary.identity.aliases,
      category: primary.identity.category,
      description_short: primary.identity.description_short,
      confidence: primary.confidence,
      source: "llm_gate",
    };

    // 3) 신뢰도 낮으면 GPT-5-mini로 voter 호출
    let voterUsed = false;
    if (primary.confidence < CONFIDENCE_VOTE_THRESHOLD) {
      const secondary = await extractWithGPT(LOVABLE_KEY, host, pageContext);
      voterUsed = true;
      // 두 모델 합의 평가
      const a = primary.identity;
      const b = secondary.identity;
      const probeText = `${b.brand ?? ""} ${b.category ?? ""} ${b.description_short ?? ""}`;
      const agree = describesSameEntity(probeText, {
        ...identity,
        brand: a.brand,
        aliases: a.aliases,
        category: a.category,
      });
      await logAudit(supabase, {
        host,
        stage: "voter",
        function_name: "resolve-site-identity",
        before_state: { primary: a, primary_conf: primary.confidence },
        after_state: { secondary: b, secondary_conf: secondary.confidence },
        confidence: agree.confidence,
        source: "cross_llm_vote",
        reason: agree.match ? `agree(${agree.reason})` : `disagree(${agree.reason})`,
      });
      if (agree.match) {
        // 합의: 신뢰도 부스트, primary 채택 (페이지 신호 더 가까움)
        identity = { ...identity, confidence: Math.min(0.95, Math.max(primary.confidence, secondary.confidence) + 0.15), source: "cross_llm_vote" };
      } else {
        // 불일치: 더 높은 confidence 쪽 채택하되 0.6 캡
        const winner = secondary.confidence > primary.confidence ? secondary : primary;
        identity = {
          host,
          brand: winner.identity.brand,
          aliases: winner.identity.aliases,
          category: winner.identity.category,
          description_short: winner.identity.description_short,
          confidence: Math.min(0.6, winner.confidence),
          source: "cross_llm_vote",
        };
      }
    }

    // 4) 저장
    await upsertIdentity(supabase, {
      ...identity,
      signals: { has_firecrawl: true, voter_used: voterUsed, metadata_title: metadata?.title ?? null },
    });
    await logAudit(supabase, {
      host,
      stage: "resolve",
      function_name: "resolve-site-identity",
      after_state: identityToState(identity),
      confidence: identity.confidence,
      source: identity.source,
      reason: voterUsed ? "voter consulted" : "primary only",
    });

    return json({ success: true, identity, cached: false });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[resolve-site-identity] error", msg);
    return json({ success: false, error: msg }, 500);
  }
});

// ── 헬퍼 ─────────────────────────────────────────────────────────
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function identityToState(i: SiteIdentity): Record<string, unknown> {
  return {
    brand: i.brand,
    aliases: i.aliases,
    category: i.category,
    description_short: i.description_short,
    source: i.source,
  };
}

const EXTRACTION_PROMPT = (host: string, pageContext: string) => `당신은 웹사이트 정체성 추출기다.
다음 페이지 콘텐츠에서 사이트의 **실제 정체**를 추출하라.

[Host] ${host}
[Page Context]
${pageContext}

작업:
1) **brand**: 공식 브랜드/사이트 이름. title의 "브랜드 | 설명"이면 앞부분. URL 슬러그(direct,shop,m 등) 금지. 추출 불가 시 null.
2) **aliases**: 영문/한글/약어 변형 1~5개. 추출 불가 시 [].
3) **category**: 한국어 4~12자 명사구로 사이트가 실제 판매·제공하는 것. 메인 title/H1/내비/상품 리스트 우선. 블로그 본문에 우연히 등장한 단어는 절대 금지. 카테고리 다수 시 빈도 높은 1개.
4) **description_short**: 한국어 1문장(40자 내) 한 줄 설명.
5) **confidence**: 0~1 추출 자신도. 신호 풍부도 기반.
   - 0.9~1.0: title·메타·H1·내비가 일관되게 같은 정체를 가리킴
   - 0.7~0.89: 본문/요약에서 명확
   - 0.5~0.69: 추론 필요
   - <0.5: 신호 부족

JSON만 반환. 마크다운 금지:
{"brand":"...","aliases":["..."],"category":"...","description_short":"...","confidence":0.85}`;

async function extractWithGemini(
  key: string,
  host: string,
  pageContext: string,
): Promise<{ identity: ExtractedIdentity; confidence: number }> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      temperature: 0,
      messages: [{ role: "user", content: EXTRACTION_PROMPT(host, pageContext) }],
    }),
  });
  if (!r.ok) throw new Error(`gemini ${r.status}`);
  const j = await r.json();
  const u = extractUsage(j);
  logApiCost({
    function_name: "resolve-site-identity",
    model: "google/gemini-3-flash-preview",
    tokens_in: u.tokens_in,
    tokens_out: u.tokens_out,
    metadata: { stage: "primary" },
  });
  return parseExtraction(j?.choices?.[0]?.message?.content ?? "");
}

async function extractWithGPT(
  key: string,
  host: string,
  pageContext: string,
): Promise<{ identity: ExtractedIdentity; confidence: number }> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5-mini",
      messages: [{ role: "user", content: EXTRACTION_PROMPT(host, pageContext) }],
    }),
  });
  if (!r.ok) throw new Error(`gpt-5-mini ${r.status}`);
  const j = await r.json();
  const u = extractUsage(j);
  logApiCost({
    function_name: "resolve-site-identity",
    model: "openai/gpt-5-mini",
    tokens_in: u.tokens_in,
    tokens_out: u.tokens_out,
    metadata: { stage: "voter" },
  });
  return parseExtraction(j?.choices?.[0]?.message?.content ?? "");
}

function parseExtraction(content: string): { identity: ExtractedIdentity; confidence: number } {
  let cleaned = (content || "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    return { identity: { brand: null, aliases: [], category: null, description_short: null }, confidence: 0 };
  }
  try {
    const obj = JSON.parse(match[0]);
    return {
      identity: {
        brand: typeof obj.brand === "string" && obj.brand.trim() ? obj.brand.trim() : null,
        aliases: Array.isArray(obj.aliases) ? obj.aliases.filter((a: unknown) => typeof a === "string").slice(0, 5) : [],
        category: typeof obj.category === "string" && obj.category.trim() ? obj.category.trim() : null,
        description_short: typeof obj.description_short === "string" ? obj.description_short.trim().slice(0, 120) : null,
      },
      confidence: Math.max(0, Math.min(1, Number(obj.confidence ?? 0))),
    };
  } catch {
    return { identity: { brand: null, aliases: [], category: null, description_short: null }, confidence: 0 };
  }
}
