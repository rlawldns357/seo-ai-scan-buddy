// 사이트 정체성(brand/aliases/category) 매칭과 SoT 캐시를 다루는 공용 유틸.
// 모든 edge function이 동일한 룰로 "이 텍스트가 이 사이트를 가리키는가"를 판단하도록 한다.
//
// 사용처:
//  - analyze-site: 분석 시작 시 loadOrResolveIdentity로 SoT 가져와 prompt에 주입
//  - probe-ai-perception: AI 응답을 brandMentioned/categoryMatches로 판정
//  - generate-blog-post / scoring 등: 동일한 brand·category 사용

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ── 정체성 타입 ──────────────────────────────────────────────────
export interface SiteIdentity {
  host: string;
  brand: string | null;
  aliases: string[];
  category: string | null;
  description_short: string | null;
  confidence: number; // 0~1
  source: "page_signal" | "llm_gate" | "cross_llm_vote" | "cache" | "manual";
  refreshed_at?: string;
  expires_at?: string;
}

// ── 카테고리 stopword (정체성에 도움 안 되는 일반어) ─────────────
const CATEGORY_STOPWORDS = new Set([
  "쇼핑몰", "스토어", "사이트", "브랜드", "서비스", "플랫폼", "회사", "웹사이트",
  "페이지", "앱", "툴", "솔루션", "제품", "상품", "업체", "기업", "공식", "온라인",
]);

// ── 문자열 정규화 ────────────────────────────────────────────────
/** 공백·기호 제거, 한글·영숫자만 남김. "SearchTune OS" → "searchtuneos" */
export function squash(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

/** 카테고리에서 의미 있는 토큰만 추출. "여성 의류 쇼핑몰" → ["여성","의류"] */
export function meaningfulCategoryTokens(category: string | null | undefined): string[] {
  if (!category) return [];
  return category
    .split(/[\s,/·\-_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !CATEGORY_STOPWORDS.has(t));
}

// ── 모름 응답 판정 ───────────────────────────────────────────────
export function isDenialOnly(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return true;
  const denyPatterns = [
    /^모릅니다[.\s]*$/i, /^모르겠[^\n]{0,20}$/i,
    /알지\s*못/i, /정보가?\s*없/i, /확인이?\s*어려/i,
    /^i\s*do(n['']?t|\s*not)\s*(know|have)/i, /^no\s+information/i,
    /^unable to find/i, /^not\s+aware/i, /^cannot\s+verify/i,
  ];
  if (t.length <= 30 && denyPatterns.some((re) => re.test(t))) return true;
  if (/^\s*(모릅니다|모르겠|알지\s*못)/i.test(t)) return true;
  return false;
}

// ── 브랜드 언급 매칭 ─────────────────────────────────────────────
export type BrandMatchKind = "strict" | "fuzzy" | "none";

// 한국어 조사: 브랜드 토큰 뒤에 붙어도 "정확 언급"으로 인정.
// 예: "에바빈은", "쿠팡이", "네이버에서" → strict 매칭 유지.
const KO_PARTICLES = [
  "은","는","이","가","을","를","의","에","도","만","와","과","로","으로",
  "에서","에게","한테","께","부터","까지","처럼","보다","마저","조차",
  "이라","라는","이라는","라","이라고","라고","랑","이랑",
].sort((a, b) => b.length - a.length).join("|");

// 일반 영단어와 충돌하는 브랜드: strict 매칭 시 host 또는 다른 alias도 함께
// 보여야 진짜 언급으로 본다. (false-positive 방지)
const COMMON_WORD_BRANDS = new Set([
  "apple","amazon","origin","square","notion","slack","stripe","target",
  "best","shop","store","mall","home","work","cloud","mint","one","plus",
]);

/** brand/aliases 토큰이 텍스트에 단어경계 매칭(strict) 또는 squash 매칭(fuzzy)되는지 */
export function brandMentioned(
  text: string,
  identity: Pick<SiteIdentity, "host" | "brand" | "aliases">,
): BrandMatchKind {
  if (!text) return "none";
  const host = (identity.host || "").toLowerCase();
  const isNaverHost = /(^|\.)naver\.com$/i.test(host);
  const lower = text.toLowerCase();
  if (!isNaverHost && host && lower.includes(host)) return "strict";

  const tokens = [identity.brand, ...(identity.aliases || [])]
    .map((s) => (s || "").trim())
    .filter((s) => s.length >= 2);
  if (tokens.length === 0) return "none";

  const squashed = squash(text);
  let fuzzy = false;
  for (const raw of tokens) {
    const t = raw.toLowerCase();
    const isHangul = /[가-힣]/.test(t);
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // 한글 브랜드는 토큰 뒤 조사 허용
    const re = isHangul
      ? new RegExp(`(?:^|[^a-z0-9가-힣])${escaped}(?:${KO_PARTICLES})?(?:$|[^a-z0-9가-힣])`, "i")
      : new RegExp(`(?:^|[^a-z0-9가-힣])${escaped}(?:$|[^a-z0-9가-힣])`, "i");
    if (re.test(lower)) {
      // 일반 영단어 브랜드는 다른 alias가 함께 보여야 strict 인정
      if (!isHangul && COMMON_WORD_BRANDS.has(t)) {
        const otherHit = tokens.some((other) => {
          const o = other.toLowerCase();
          if (o === t) return false;
          return new RegExp(`(?:^|[^a-z0-9가-힣])${o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^a-z0-9가-힣])`, "i").test(lower);
        });
        if (!otherHit) {
          fuzzy = true;
          continue;
        }
      }
      return "strict";
    }
    const sq = squash(raw);
    if (sq.length >= 4 && squashed.includes(sq)) fuzzy = true;
  }
  return fuzzy ? "fuzzy" : "none";
}

// ── 멀티테넌트 호스트 (host만으로 정체성 단정 불가) ─────────────
const MULTI_TENANT_HOSTS = [
  "smartstore.naver.com","shopping.naver.com","brand.naver.com",
  "blog.naver.com","cafe.naver.com","post.naver.com","m.blog.naver.com",
  "cafe24.com","imweb.me","modoo.at","tistory.com",
  "brunch.co.kr","medium.com","wixsite.com","webflow.io","github.io",
  "notion.site","framer.website","carrd.co",
];
export function isMultiTenantHost(host: string): boolean {
  const h = (host || "").toLowerCase();
  return MULTI_TENANT_HOSTS.some((mt) => h === mt || h.endsWith(`.${mt}`));
}

// ── 카테고리 의미 매칭 ───────────────────────────────────────────
/** 텍스트에 카테고리 의미 토큰이 얼마나 들어있는가 (0~1) */
export function categoryMatches(
  text: string,
  identity: Pick<SiteIdentity, "category">,
): number {
  const tokens = meaningfulCategoryTokens(identity.category);
  if (tokens.length === 0 || !text) return 0;
  const squashed = squash(text);
  const hits = tokens.reduce(
    (n, t) => (squashed.includes(squash(t)) ? n + 1 : n),
    0,
  );
  return hits / tokens.length;
}

// ── 종합 판정: "이 텍스트가 이 사이트를 가리키는가" ───────────────
export interface SameEntityResult {
  match: boolean;
  confidence: number; // 0~1
  reason: "brand_strict" | "brand_fuzzy" | "category_full" | "category_partial" | "denial" | "no_signal";
  awareness: "yes" | "partial" | "no";
}
export function describesSameEntity(text: string, identity: SiteIdentity): SameEntityResult {
  if (!text || isDenialOnly(text)) {
    return { match: false, confidence: 0.95, reason: "denial", awareness: "no" };
  }
  const brand = brandMentioned(text, identity);
  if (brand === "strict") return { match: true, confidence: 0.95, reason: "brand_strict", awareness: "yes" };
  if (brand === "fuzzy") return { match: true, confidence: 0.7, reason: "brand_fuzzy", awareness: "partial" };
  const catRatio = categoryMatches(text, identity);
  if (catRatio >= 0.5 && text.trim().length >= 12) {
    return { match: true, confidence: 0.7, reason: "category_full", awareness: "yes" };
  }
  if (catRatio > 0 && text.trim().length >= 12) {
    return { match: true, confidence: 0.55, reason: "category_partial", awareness: "yes" };
  }
  return { match: false, confidence: 0.6, reason: "no_signal", awareness: "no" };
}

// ── 호스트 정규화 ────────────────────────────────────────────────
export function normalizeHost(input: string): string {
  let raw = (input || "").trim();
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const u = new URL(raw);
    return u.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return input.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}

// ── SoT 캐시 I/O ─────────────────────────────────────────────────
/** site_identity 캐시에서 host로 정체성 로드. 만료됐어도 stale로 반환 (호출측이 판단). */
export async function loadIdentity(
  supabase: SupabaseClient,
  host: string,
): Promise<{ identity: SiteIdentity | null; stale: boolean }> {
  try {
    const { data } = await supabase
      .from("site_identity")
      .select("*")
      .eq("host", host)
      .maybeSingle();
    if (!data) return { identity: null, stale: false };
    const stale = new Date(data.expires_at as string).getTime() < Date.now();
    return {
      identity: {
        host: data.host,
        brand: data.brand,
        aliases: (data.aliases as string[]) ?? [],
        category: data.category,
        description_short: data.description_short,
        confidence: Number(data.confidence ?? 0),
        source: (data.source as SiteIdentity["source"]) ?? "cache",
        refreshed_at: data.refreshed_at,
        expires_at: data.expires_at,
      },
      stale,
    };
  } catch (e) {
    console.warn("[identity-match] loadIdentity failed", e);
    return { identity: null, stale: false };
  }
}

/** site_identity 캐시에 upsert. expires_at = now + 7d */
export async function upsertIdentity(
  supabase: SupabaseClient,
  identity: SiteIdentity & { signals?: Record<string, unknown> },
): Promise<void> {
  try {
    await supabase.from("site_identity").upsert(
      {
        host: identity.host,
        brand: identity.brand,
        aliases: identity.aliases ?? [],
        category: identity.category,
        description_short: identity.description_short,
        confidence: identity.confidence,
        source: identity.source,
        signals: identity.signals ?? {},
        refreshed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "host" },
    );
  } catch (e) {
    console.warn("[identity-match] upsertIdentity failed", e);
  }
}

/** identity_audit_log에 한 줄 기록. 실패해도 본 흐름은 방해하지 않는다. */
export async function logAudit(
  supabase: SupabaseClient,
  entry: {
    host: string;
    stage: "resolve" | "gate" | "probe_match" | "cache_hit" | "voter";
    function_name?: string;
    before_state?: Record<string, unknown>;
    after_state?: Record<string, unknown>;
    confidence?: number;
    source?: string;
    reason?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await supabase.from("identity_audit_log").insert({
      host: entry.host,
      stage: entry.stage,
      function_name: entry.function_name ?? null,
      before_state: entry.before_state ?? {},
      after_state: entry.after_state ?? {},
      confidence: entry.confidence ?? null,
      source: entry.source ?? null,
      reason: entry.reason ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.warn("[identity-match] logAudit failed", e);
  }
}

/** loadIdentity → 없거나 stale이면 resolve-site-identity 호출 → 결과 반환 */
export async function loadOrResolveIdentity(
  supabase: SupabaseClient,
  url: string,
  options?: { allowStale?: boolean },
): Promise<SiteIdentity | null> {
  const host = normalizeHost(url);
  if (!host) return null;
  // 멀티테넌트 호스트는 캐시 키 충돌 → 매번 resolve, 캐시 우회
  if (isMultiTenantHost(host)) {
    return await invokeResolve(url);
  }
  const { identity, stale } = await loadIdentity(supabase, host);
  if (identity && !stale) return identity;
  if (identity && stale && options?.allowStale) {
    void invokeResolve(url).catch(() => undefined);
    return identity;
  }
  const resolved = await invokeResolve(url);
  return resolved ?? identity ?? null;
}

async function invokeResolve(url: string): Promise<SiteIdentity | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    const r = await fetch(`${supabaseUrl}/functions/v1/resolve-site-identity`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const j = await r.json();
    return (j?.identity as SiteIdentity) ?? null;
  } catch {
    return null;
  }
}
