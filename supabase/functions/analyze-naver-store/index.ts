/**
 * analyze-naver-store — 네이버 스마트/브랜드스토어 전용 진단
 *
 * PoC(naver-store-poc)에서 승격됨. 일반 사이트와 동일한 SEO/AEO/GEO 3축 점수
 * 체계를 유지하되, 측정 로직만 네이버 Search API 5-surface 기반으로 재정의함.
 *
 * 점수 매핑 원칙 (네이버 웹마스터 룰북 베이스):
 *  - SEO = 권위 누수율 (브랜드 검색결과에서 자사 콘텐츠 비중)
 *          → 자체 도메인 부재(룰북 §6 브랜드 도메인) → SEO cap ≤ 45
 *          → robots.txt 외부 차단(룰북 §1 Yeti 허용)도 외부 검색 기준 0% 처리
 *  - AEO = AI 답변 인용 가능성 (외부 콘텐츠의 구조화·언급 정도)
 *          → 스토어 템플릿 = JSON-LD 통제 불가(룰북 §5) → AEO cap ≤ 50
 *  - GEO = 외부 출처 다양성 (webkr/blog/cafe 인용 가능 출처 수)
 *          → 자사 통제 콘텐츠 0%면 GEO cap ≤ 40
 *
 * 엔진 업데이트:
 *  - DB의 `naver_webmaster_rulebook`을 fallback과 함께 로드해 응답 메타에 동봉
 *  - 룰북 버전을 응답에 포함해 클라이언트가 어떤 룰북 기준으로 채점됐는지 추적 가능
 *
 * Output: DemoResult 형태 그대로 반환 (ScoreDashboard 100% 재사용).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadNaverRulebook } from "../_shared/naver-rulebook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const NAVER_CLIENT_ID = Deno.env.get("NAVER_CLIENT_ID");
const NAVER_CLIENT_SECRET = Deno.env.get("NAVER_CLIENT_SECRET");

type StoreType = "brand" | "smartstore";

interface StoreInfo {
  type: StoreType;
  slug: string;
  url: string;
  storeUrl: string; // canonical store URL
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

function parseStoreUrl(raw: string): StoreInfo | null {
  try {
    const u = new URL(raw);
    const rawSlug = u.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!rawSlug) return null;
    // 한글 슬러그(brand.naver.com/뮤지코리아)는 percent-encoded로 들어옴 → 검색·매칭용으로 디코드
    const slug = safeDecode(rawSlug);
    if (u.hostname === "brand.naver.com") {
      return { type: "brand", slug, url: raw, storeUrl: `https://brand.naver.com/${encodeURIComponent(slug)}` };
    }
    if (u.hostname === "smartstore.naver.com") {
      return { type: "smartstore", slug, url: raw, storeUrl: `https://smartstore.naver.com/${encodeURIComponent(slug)}` };
    }
    return null;
  } catch {
    return null;
  }
}


async function naverSearch(
  type: "shop" | "blog" | "cafearticle" | "kin" | "webkr",
  query: string,
  display = 10,
) {
  const url = `https://openapi.naver.com/v1/search/${type}.json?query=${encodeURIComponent(query)}&display=${display}`;
  const res = await fetch(url, {
    headers: {
      "X-Naver-Client-Id": NAVER_CLIENT_ID!,
      "X-Naver-Client-Secret": NAVER_CLIENT_SECRET!,
    },
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

function stripTags(s: string): string {
  return (s ?? "").replace(/<[^>]*>/g, "");
}

/* ────────────────────────────────────────────────────────────────────
 * 시그널 계산 — 누수율의 진짜 의미를 살리기 위한 멀티 신호
 *
 * 네이버 쇼핑 결과는 link가 보통 smartstore.naver.com/main/products/...
 * 또는 shopping.naver.com/... 형태라 brand.naver.com/{slug} 매칭이 거의
 * 안 됩니다. 그래서 다음 4개 신호를 합산해 권위 누수를 산출합니다:
 *  1) storeShare — shop 결과의 mallName/link 호스트 일치 비율
 *  2) ownSiteShare — webkr 결과 중 자사 외부 도메인(.kr/.com 등) 비율
 *  3) slugAuthority — shop 결과 title에 슬러그 토큰 포함 비율 (충돌 감지)
 *  4) brandPresence — webkr 상위 결과의 자사 위키/공식 채널 존재
 * ──────────────────────────────────────────────────────────────────── */

/** 슬러그를 검색 비교용 토큰으로 정규화 */
function normalizeSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");
}

/** shop 결과 link/mallName이 본인 스토어인지 */
function isOwnStoreItem(item: any, slug: string): boolean {
  const link = String(item?.link ?? "").toLowerCase();
  const mall = String(item?.mallName ?? "").toLowerCase();
  const s = slug.toLowerCase();
  if (link.includes(`brand.naver.com/${s}`)) return true;
  if (link.includes(`smartstore.naver.com/${s}`)) return true;
  // mallName 직접 일치 (네이버 쇼핑 검색의 표준 필드)
  if (mall && (mall === s || mall.replace(/[^a-z0-9가-힣]/g, "") === normalizeSlug(slug))) return true;
  return false;
}

/** title에 슬러그 토큰이 포함되는 비율 → 슬러그 충돌(노이즈) 감지 */
function slugTitleMatch(items: any[], slug: string): number {
  if (!items || items.length === 0) return 0;
  const token = normalizeSlug(slug);
  if (!token) return 0;
  let hit = 0;
  for (const it of items) {
    const t = stripTags(String(it?.title ?? "")).toLowerCase().replace(/\s/g, "");
    if (t.includes(token)) hit++;
  }
  return hit / items.length;
}

/** webkr 결과 중 자사 외부 도메인(자사몰/공식 SNS) 비율
 *  네이버/쇼핑/카페/블로그/지식인을 제외한 URL = 자사 통제 가능 후보.
 *  슬러그 토큰이 호스트네임에 포함되거나, 사용자가 입력한 ownDomain과 일치하면 자사로 본다. */
function externalOwnedRatio(items: any[], slug: string, ownDomain?: string | null): number {
  if (!items || items.length === 0) return 0;
  const token = normalizeSlug(slug);
  const ownHost = ownDomain ? ownDomain.toLowerCase().replace(/^www\./, "") : "";
  if (!token && !ownHost) return 0;
  let owned = 0;
  let externalCount = 0;
  for (const it of items) {
    let host = "";
    try { host = new URL(String(it?.link ?? "")).hostname.toLowerCase().replace(/^www\./, ""); } catch { continue; }
    if (host.endsWith("naver.com") || host.endsWith("naver.net")) continue;
    if (host.includes("wiki") || host.includes("namu.")) continue;
    externalCount++;
    const tokenMatch = token && host.replace(/[^a-z0-9]/g, "").includes(token.replace(/[^a-z0-9]/g, ""));
    const domainMatch = ownHost && (host === ownHost || host.endsWith("." + ownHost));
    if (tokenMatch || domainMatch) owned++;
  }
  return externalCount === 0 ? 0 : owned / externalCount;
}

/** 자체 도메인 후보 자동 추출 — webkr/blog 결과에서 가장 많이 등장하는 비-naver 호스트 */
function inferOwnDomain(items: any[], slug: string): string | null {
  const token = normalizeSlug(slug).replace(/[^a-z0-9]/g, "");
  if (!items || items.length === 0 || !token) return null;
  const counts = new Map<string, number>();
  for (const it of items) {
    let host = "";
    try { host = new URL(String(it?.link ?? "")).hostname.toLowerCase().replace(/^www\./, ""); } catch { continue; }
    if (host.endsWith("naver.com") || host.endsWith("naver.net")) continue;
    if (host.includes("wiki") || host.includes("namu.") || host.includes("youtube") || host.includes("instagram") || host.includes("facebook")) continue;
    if (!host.replace(/[^a-z0-9]/g, "").includes(token)) continue;
    counts.set(host, (counts.get(host) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}


/**
 * 외부 surface(blog/cafe/kin/webkr) 점유 다양성 점수 (0~100)
 * 검색결과가 있는 surface 수 + 총량 기반.
 */
function externalDiversity(blog: any, cafe: any, kin: any, webkr: any): number {
  const surfaces = [blog, cafe, kin, webkr];
  const haveAny = surfaces.filter((s) => (s.body?.total ?? 0) > 0).length;
  const totalMentions = surfaces.reduce((sum, s) => sum + (s.body?.total ?? 0), 0);

  // 0~40: surface 다양성 (4개 모두면 40점)
  const diversityScore = (haveAny / 4) * 40;
  // 0~60: 언급 총량 (로그 스케일, 1000 이상이면 만점)
  const volumeScore = Math.min(60, (Math.log10(Math.max(1, totalMentions)) / 3) * 60);

  return Math.round(diversityScore + volumeScore);
}

/* ────────────────────────────────────────────────────────────────────
 * 3축 점수 산출
 * ──────────────────────────────────────────────────────────────────── */

interface AxisInputs {
  store: StoreInfo;
  shopShare: number;        // 0~1, shop 검색결과의 자사 점유율
  shopTotal: number;
  blogTotal: number;
  cafeTotal: number;
  kinTotal: number;
  webkrTotal: number;
  webkrOwnRatio: number;    // 0~1, webkr 결과 중 자사 비중
}

function buildSeoAxis(x: AxisInputs) {
  // x.shopShare = storeShare (스토어 자체 점유)
  // x.webkrOwnRatio = ownSiteShare (자사 외부 도메인 점유)
  const recovered = Math.min(1, x.shopShare * 0.6 + x.webkrOwnRatio * 0.4);
  const leakageRatio = Math.max(0.05, Math.min(0.95, 1 - recovered));
  const leakagePct = Math.round(leakageRatio * 100);
  const ownAuthority = Math.round(recovered * 100);

  // sub-signals — 멀티 신호 반영
  const crawlability = 10; // robots.txt strict
  // 인덱싱 준비도: shop 결과 총량(로그) + storeShare 가산
  const indexability = Math.min(60, (x.shopTotal > 0 ? Math.log10(x.shopTotal + 1) * 12 : 0) + x.shopShare * 30);
  // 자체 도메인 권위: ownSiteShare 직접 반영 (자사몰 있으면 가산)
  const ownDomain = Math.round(x.webkrOwnRatio * 80);
  // 스니펫: storeShare 직접 반영
  const snippet = Math.round(x.shopShare * 70 + 10);
  const structured = 5; // 네이버 템플릿 — 구조화 데이터 통제 불가

  const issues: string[] = [];
  if (leakagePct >= 70) {
    issues.push(`브랜드 검색 권위의 ${leakagePct}%가 naver.com에 적립되고 있어요. 자사 외부 채널 없이는 회수가 어려운 상태예요.`);
  } else if (leakagePct >= 40) {
    issues.push(`권위의 ${leakagePct}% 정도가 누수 중이에요. 자사 채널을 더 강화하면 회수 가능한 구간이에요.`);
  }
  if (x.shopShare === 0 && x.shopTotal > 0) {
    issues.push("쇼핑 검색결과 상위에 본인 스토어가 거의 안 잡혀요. 슬러그가 일반 키워드와 충돌하거나 상품 노출이 약할 가능성이 있어요.");
  }
  issues.push("네이버 스토어는 robots.txt로 외부 검색엔진 크롤을 차단하고 있어요. Google·Bing 검색결과에서는 거의 노출되지 않아요.");

  const strengths: string[] = [];
  if (x.webkrOwnRatio >= 0.3) {
    strengths.push("자사 외부 도메인(자사몰·공식 채널) 노출이 확보돼 있어 권위 회수 기반이 있어요.");
  }
  if (x.shopShare >= 0.3) {
    strengths.push("쇼핑 검색결과에서 자사 스토어 노출 비중이 일정 수준 이상이에요.");
  }
  if (strengths.length === 0) {
    strengths.push("네이버 쇼핑 채널 자체는 활성 상태로 운영되고 있어요.");
  }

  return {
    label: "SEO" as const,
    description: "검색엔진이 이 페이지를 크롤링·인덱싱하고 검색 결과에 노출할 기술적 준비 상태",
    subSignals: [
      { name: "Yeti 크롤 허용 (룰북 §1)", score: crawlability, weight: 20 },
      { name: "인덱싱 준비도 (룰북 §1)", score: Math.round(indexability), weight: 20 },
      { name: "자체 도메인 권위 (룰북 §6)", score: ownDomain, weight: 25 },
      { name: "스니펫·메타 품질 (룰북 §2)", score: snippet, weight: 15 },
      { name: "구조화 데이터 (룰북 §5)", score: structured, weight: 20 },
    ],
    scoreRationale: `브랜드 검색 권위의 약 ${leakagePct}%가 naver.com 도메인에 귀속됩니다. 자사 외부 채널 점유율을 높여야 권위 회수가 가능합니다.`,
    issues: issues.slice(0, 3),
    strengths: strengths.slice(0, 2),
    priorityFix: { label: "자사 외부 콘텐츠 허브 강화로 권위 회수", pointRange: "+15~+30" },
    quickFix: { label: "스토어 외 자사 채널(블로그·자사몰) 진단 받기", pointRange: "+3~+5" },
    additionalFixes: [
      { label: "구조화된 외부 콘텐츠로 브랜드 신호 강화", pointRange: "+5~+10" },
    ],
    scoreCap: x.webkrOwnRatio >= 0.3
      ? `자사 외부 도메인 신호가 있어 SEO 캡이 60점까지 완화돼요.`
      : `네이버 스토어는 자체 도메인이 없어 SEO 점수가 45~50점을 넘기 어려워요.`,
    _storeMeta: {
      authorityLeakageRatio: leakageRatio,
      ownAuthority,
      shopShare: x.shopShare,
    },
  };
}

function buildAeoAxis(x: AxisInputs) {
  // AEO = AI가 이 브랜드를 답변에 인용할 수 있는 정도
  // 스토어 자체는 AI 크롤 차단 → 외부 콘텐츠가 유일한 인용 경로

  const externalMentions = x.blogTotal + x.cafeTotal + x.kinTotal;
  const hasQA = x.kinTotal > 0; // 지식인 = Q&A 형식
  const hasReview = x.blogTotal > 50; // 블로그 = 리뷰성 콘텐츠

  const directAnswer = 10; // 스토어 페이지는 직접 답변 형식 아님
  const qaStructure = hasQA ? Math.min(50, Math.log10(x.kinTotal + 1) * 25) : 5;
  const reviewSignal = hasReview ? Math.min(50, Math.log10(x.blogTotal + 1) * 20) : 10;
  const summarizable = 15; // 스토어 템플릿 — 요약 적합도 낮음
  const entityClarity = x.shopShare >= 0.3 ? 60 : 25; // 자사 노출 비중이 entity 신뢰도

  const raw = Math.round(
    directAnswer * 0.20 +
    qaStructure * 0.20 +
    reviewSignal * 0.20 +
    summarizable * 0.15 +
    entityClarity * 0.25
  );

  // Score cap: 스토어 자체가 AI 크롤 차단 → AEO 최대 50
  const AEO_CAP = 50;
  const score = Math.min(raw, AEO_CAP);

  const issues: string[] = [
    "네이버 스토어는 ChatGPT·Claude 등 주요 AI 봇 크롤을 차단해요. AI가 이 스토어를 직접 인용할 방법이 없어요.",
  ];
  if (!hasQA) {
    issues.push("지식인·Q&A 콘텐츠가 거의 없어 질문형 답변에 채택되기 어려워요.");
  }
  if (!hasReview) {
    issues.push("블로그 리뷰 콘텐츠가 부족해 AI가 참고할 외부 신호가 약해요.");
  }

  const strengths: string[] = [];
  if (externalMentions > 100) {
    strengths.push(`외부 채널(블로그·카페·지식인)에 ${externalMentions.toLocaleString()}건의 언급이 있어요.`);
  } else {
    strengths.push("브랜드 인지도 형성을 위한 기초 언급은 존재해요.");
  }

  return {
    label: "AEO" as const,
    description: "AI 답변 엔진이 이 브랜드를 인용·요약하기 위해 필요한 외부 신호의 구조화 정도",
    subSignals: [
      { name: "직접 답변 가능성 (룰북 §2)", score: directAnswer, weight: 20 },
      { name: "Q&A 구조 — 지식인 (룰북 §4)", score: Math.round(qaStructure), weight: 20 },
      { name: "리뷰 신호 — 블로그 (룰북 §4)", score: Math.round(reviewSignal), weight: 20 },
      { name: "요약 적합도 (룰북 §2)", score: summarizable, weight: 15 },
      { name: "엔티티 명확성 (룰북 §5 sameAs)", score: entityClarity, weight: 25 },
    ],
    scoreRationale: `스토어 자체는 AI 봇 크롤 차단 상태입니다. AI 인용은 외부 콘텐츠(블로그 ${x.blogTotal.toLocaleString()}건·지식인 ${x.kinTotal.toLocaleString()}건)에만 의존합니다.`,
    issues: issues.slice(0, 3),
    strengths: strengths.slice(0, 2),
    priorityFix: { label: "AI가 인용 가능한 자사 운영 콘텐츠 채널 확보", pointRange: "+15~+25" },
    quickFix: { label: "브랜드 FAQ를 외부 채널에 구조화해 게시", pointRange: "+3~+6" },
    additionalFixes: [
      { label: "고객 질문 데이터 기반 Q&A 콘텐츠 시리즈화", pointRange: "+5~+10" },
    ],
    scoreCap: `스토어가 AI 봇을 차단하고 있어 AEO 점수가 ${AEO_CAP}점을 넘기 어려워요.`,
    _storeMeta: {
      externalMentions,
      hasQA,
      hasReview,
    },
  };
}

function buildGeoAxis(x: AxisInputs) {
  // GEO = 생성형 AI 검색 엔진이 이 브랜드를 발견·인용할 준비도
  // 출처 다양성과 자사 통제 콘텐츠가 핵심
  const diversity = externalDiversity(
    { body: { total: x.blogTotal } },
    { body: { total: x.cafeTotal } },
    { body: { total: x.kinTotal } },
    { body: { total: x.webkrTotal } },
  );

  const sourceDiversity = Math.min(50, diversity * 0.5);
  const ownControlled = Math.round(x.webkrOwnRatio * 100);
  const citability = x.webkrTotal > 10 ? Math.min(40, Math.log10(x.webkrTotal) * 15) : 10;
  const freshness = 20; // 측정 불가 — 기본값
  const brandClarity = x.shopShare >= 0.3 ? 50 : 20;

  const raw = Math.round(
    sourceDiversity * 0.25 +
    ownControlled * 0.25 +
    citability * 0.20 +
    freshness * 0.15 +
    brandClarity * 0.15
  );

  // Score cap: 자사 콘텐츠 0%이면 GEO 최대 40
  const GEO_CAP = x.webkrOwnRatio === 0 ? 40 : 60;
  const score = Math.min(raw, GEO_CAP);

  const issues: string[] = [];
  if (x.webkrOwnRatio === 0) {
    issues.push("웹 검색결과에 자사가 통제 가능한 콘텐츠(자체 도메인)가 0%예요. AI는 제3자 정보만으로 브랜드를 묘사하게 돼요.");
  }
  if (x.webkrTotal < 50) {
    issues.push("웹 전반의 브랜드 언급량이 부족해 AI 검색 엔진이 이 브랜드를 신뢰 출처로 인식하기 어려워요.");
  }
  issues.push("Perplexity·ChatGPT Search 등 생성형 AI는 정형화된 자체 도메인 콘텐츠를 우선 인용해요. 스토어 페이지는 인용 후보에서 제외돼요.");

  const strengths: string[] = [];
  if (diversity >= 60) {
    strengths.push("다양한 외부 채널에 브랜드 언급이 분산돼 있어 기초 인지도 신호는 확보돼 있어요.");
  } else {
    strengths.push("일부 채널에서 브랜드 언급의 시드(seed)가 형성돼 있어요.");
  }

  return {
    label: "GEO" as const,
    description: "ChatGPT·Perplexity 등 생성형 AI 검색 엔진이 이 브랜드를 발견·인용할 준비 상태",
    subSignals: [
      { name: "출처 다양성 (룰북 §4 외부 백링크)", score: Math.round(sourceDiversity), weight: 25 },
      { name: "자사 통제 콘텐츠 (룰북 §6)", score: ownControlled, weight: 25 },
      { name: "인용 가능성 (룰북 §5 JSON-LD)", score: Math.round(citability), weight: 20 },
      { name: "최신성 — lastmod (룰북 §6)", score: freshness, weight: 15 },
      { name: "브랜드 엔티티 명확성 (룰북 §5)", score: brandClarity, weight: 15 },
    ],
    scoreRationale: `웹 전반에서 자사 통제 콘텐츠 비중은 ${ownControlled}%입니다. 생성형 AI는 자체 도메인 콘텐츠를 우선 인용하므로, 자사 통제 영역 확보 없이는 인용률 상승이 어렵습니다.`,
    issues: issues.slice(0, 3),
    strengths: strengths.slice(0, 2),
    priorityFix: { label: "자사 통제 가능한 외부 콘텐츠 자산 구축", pointRange: "+15~+25" },
    quickFix: { label: "스토어 외 브랜드 채널(인스타·유튜브) 노출 점검", pointRange: "+2~+5" },
    additionalFixes: [
      { label: "AI 인용 친화적 구조(FAQ·가이드형) 콘텐츠 보강", pointRange: "+5~+10" },
    ],
    scoreCap: x.webkrOwnRatio === 0
      ? `자사 통제 콘텐츠가 0%여서 GEO 점수가 ${GEO_CAP}점을 넘기 어려워요.`
      : undefined,
    _storeMeta: {
      diversity,
      ownControlled,
    },
  };
}

/* ────────────────────────────────────────────────────────────────────
 * 메인 핸들러
 * ──────────────────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return new Response(
      JSON.stringify({ success: false, error: "NAVER_CLIENT_ID/SECRET not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  let input: { url?: string; ownDomain?: string } = {};
  try {
    input = await req.json();
  } catch {
    /* empty body OK if query param used */
  }
  const targetUrl =
    input.url ?? new URL(req.url).searchParams.get("url") ?? "";
  // 사용자 입력 자체 도메인 (정규화: 프로토콜/경로/www 제거)
  let userOwnDomain: string | null = null;
  const rawOwn = input.ownDomain ?? new URL(req.url).searchParams.get("ownDomain") ?? "";
  if (rawOwn && rawOwn.length < 200) {
    try {
      const withProto = /^https?:\/\//i.test(rawOwn) ? rawOwn : `https://${rawOwn}`;
      userOwnDomain = new URL(withProto).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      userOwnDomain = rawOwn.toLowerCase().replace(/^www\./, "").split("/")[0] || null;
    }
    if (userOwnDomain && userOwnDomain.endsWith("naver.com")) userOwnDomain = null; // 무효
  }

  if (!targetUrl || typeof targetUrl !== "string" || targetUrl.length > 2000) {
    return new Response(
      JSON.stringify({ success: false, error: "url required", code: "URL_REQUIRED" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── 도메인 검증 강화: 파싱 실패/스토어 아님은 무조건 튕긴다 ──
  let parsedHost = "";
  try {
    parsedHost = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: "유효한 URL이 아니에요. 예: https://brand.naver.com/내브랜드",
        code: "INVALID_URL",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const store = parseStoreUrl(targetUrl);
  if (!store) {
    const isNaverDomain = parsedHost.endsWith("naver.com");
    return new Response(
      JSON.stringify({
        success: false,
        error: isNaverDomain
          ? "네이버 스토어 URL이 아니에요. brand.naver.com/내브랜드 또는 smartstore.naver.com/내브랜드 형식이어야 해요."
          : "네이버 스토어 진단은 brand.naver.com 또는 smartstore.naver.com URL만 분석할 수 있어요.",
        code: "NOT_NAVER_STORE",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── Supabase 클라이언트 + 24h 캐시 조회 ──
  // 같은 스토어 URL은 24시간 동안 동일 결과 반환 (재현성·어뷰징 방지·API 비용 절감).
  // 캐시 키는 정규화된 storeUrl(쿼리스트링·해시 제거).
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const cacheKey = store.storeUrl;
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  try {
    const { data: cached } = await supabase
      .from("naver_store_analysis_cache")
      .select("result_data, analyzed_at")
      .eq("url", cacheKey)
      .maybeSingle();

    if (cached?.result_data && cached.analyzed_at) {
      const ageMs = Date.now() - new Date(cached.analyzed_at).getTime();
      if (ageMs < CACHE_TTL_MS) {
        // 캐시 HIT: 메타에 캐시 정보 주입해 반환
        const cachedResult = cached.result_data as Record<string, unknown>;
        const engineMeta = (cachedResult.engineMeta as Record<string, unknown>) ?? {};
        cachedResult.engineMeta = {
          ...engineMeta,
          cache: {
            hit: true,
            analyzedAt: cached.analyzed_at,
            ageMinutes: Math.floor(ageMs / 60000),
            ttlHours: 24,
          },
        };
        return new Response(
          JSON.stringify({ success: true, data: cachedResult }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
  } catch (e) {
    console.warn("[naver-store-cache] read failed, proceeding fresh:", e);
  }

  // ── 룰북 로드 (DB 우선, fallback 자동) ──
  const rulebook = await loadNaverRulebook(supabase).catch(() => null);

  const query = store.slug;

  const [shop, blog, cafe, kin, webkr] = await Promise.all([
    naverSearch("shop", query, 10),
    naverSearch("blog", query, 10),
    naverSearch("cafearticle", query, 10),
    naverSearch("kin", query, 10),
    naverSearch("webkr", query, 10),
  ]);

  // 네이버 API 전체 실패면 명확하게 알린다
  if (!shop.ok && !blog.ok && !webkr.ok) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "네이버 검색 API 응답이 없어요. 잠시 후 다시 시도해 주세요.",
        code: "NAVER_API_DOWN",
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ── 시그널 계산 (멀티 신호로 누수율 산출) ──
  const shopItems = shop.body?.items ?? [];
  const webkrItems = webkr.body?.items ?? [];
  const blogItems = blog.body?.items ?? [];

  // 자체 도메인: 사용자 입력 우선, 없으면 webkr+blog에서 자동 추론
  const inferredOwnDomain = inferOwnDomain([...webkrItems, ...blogItems], store.slug);
  const effectiveOwnDomain = userOwnDomain ?? inferredOwnDomain;

  // 1) shop 결과 중 본인 스토어(mallName/link 호스트) 비율
  const storeShare = shopItems.length === 0 ? 0
    : shopItems.filter((it: any) => isOwnStoreItem(it, store.slug)).length / shopItems.length;
  // 2) webkr 결과 중 자사 외부 도메인 비율 (자사몰/공식 SNS, 사용자 입력 도메인 포함)
  const ownSiteShare = externalOwnedRatio(webkrItems, store.slug, effectiveOwnDomain);
  // 3) shop 결과 title의 슬러그 토큰 매칭 → 1.0이면 충돌 없음, 낮으면 슬러그 노이즈
  const slugMatch = slugTitleMatch(shopItems, store.slug);

  // 자체 도메인 우세 판정: 사용자가 명시한 ownDomain이 webkr 외부에서 30% 이상 점유
  // → 권위가 정상 분배되는 운영 상태로 간주, 누수 프레임 해제
  const ownDomainDominant = !!effectiveOwnDomain && ownSiteShare >= 0.3;

  // 권위 회수율 계산
  const trust = slugMatch < 0.3 ? 0.6 : 1;
  const recovered = Math.min(1, storeShare * 0.6 * trust + ownSiteShare * 0.4);
  const rawLeakage = 1 - recovered;
  // 우세 모드면 클램프 해제 (실제 0%까지 내려갈 수 있음), 아니면 [5%, 95%]
  const leakageRatio = ownDomainDominant
    ? Math.max(0, rawLeakage)
    : Math.max(0.05, Math.min(0.95, rawLeakage));

  const inputs: AxisInputs = {
    store,
    shopShare: storeShare,
    shopTotal: shop.body?.total ?? 0,
    blogTotal: blog.body?.total ?? 0,
    cafeTotal: cafe.body?.total ?? 0,
    kinTotal: kin.body?.total ?? 0,
    webkrTotal: webkr.body?.total ?? 0,
    webkrOwnRatio: ownSiteShare,
  };

  const seoAxis = buildSeoAxis(inputs);
  const aeoAxis = buildAeoAxis(inputs);
  const geoAxis = buildGeoAxis(inputs);

  const calcScore = (axis: any) =>
    Math.round(
      axis.subSignals.reduce(
        (sum: number, s: any) => sum + (s.score * s.weight) / 100,
        0,
      ),
    );

  // ── 동적 캡 ──
  // 자체 도메인 우세 → SEO/GEO 캡을 대폭 완화 (정상 권위 분배 인정)
  const seoCap = ownDomainDominant ? 80 : ownSiteShare >= 0.3 ? 60 : ownSiteShare > 0 ? 50 : 45;
  const aeoCap = storeShare >= 0.3 ? 60 : 50;
  const geoCap = ownDomainDominant ? 80 : ownSiteShare >= 0.3 ? 70 : ownSiteShare > 0 ? 55 : 40;

  // 우세 모드: SEO에 자체 도메인 보너스 +15
  const ownDomainBonus = ownDomainDominant ? 15 : 0;
  const seoScore = Math.min(calcScore(seoAxis) + ownDomainBonus, seoCap);
  const aeoScore = Math.min(calcScore(aeoAxis), aeoCap);
  const geoScore = Math.min(calcScore(geoAxis) + Math.round(ownDomainBonus / 2), geoCap);


  const result = {
    seoScore,
    aeoScore,
    geoScore,
    seoAxis,
    aeoAxis,
    geoAxis,
    storeContext: {
      type: store.type,
      slug: store.slug,
      storeUrl: store.storeUrl,
      authorityLeakageRatio: leakageRatio,
      ownContentRatio: recovered,
      ownDomain: effectiveOwnDomain,
      ownDomainSource: userOwnDomain ? "user" : (inferredOwnDomain ? "inferred" : "none"),
      ownDomainDominant,
      signalBreakdown: {
        storeShare,
        ownSiteShare,
        slugMatch,
        trustAdjusted: trust < 1,
      },
      externalSurfaces: {
        shop: shop.body?.total ?? 0,
        blog: blog.body?.total ?? 0,
        cafe: cafe.body?.total ?? 0,
        kin: kin.body?.total ?? 0,
        webkr: webkr.body?.total ?? 0,
      },
      sampleTitles: {
        shop: shopItems.slice(0, 3).map((i: any) => stripTags(i.title)),
        blog: (blog.body?.items ?? []).slice(0, 3).map((i: any) => stripTags(i.title)),
        webkr: webkrItems.slice(0, 3).map((i: any) => stripTags(i.title)),
      },
    },
    engineMeta: {
      rulebook: "naver-webmaster-bible",
      rulebookLoaded: !!rulebook,
      rulebookHash: rulebook ? rulebook.length : 0,
      caps: { seo: seoCap, aeo: aeoCap, geo: geoCap },
      signals: { storeShare, ownSiteShare, slugMatch, leakageRatio, recovered },
    },
  };

  return new Response(
    JSON.stringify({ success: true, data: result }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
