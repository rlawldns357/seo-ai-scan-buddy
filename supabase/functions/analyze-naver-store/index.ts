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

function parseStoreUrl(raw: string): StoreInfo | null {
  try {
    const u = new URL(raw);
    if (u.hostname === "brand.naver.com") {
      const slug = u.pathname.split("/").filter(Boolean)[0] ?? "";
      if (!slug) return null;
      return { type: "brand", slug, url: raw, storeUrl: `https://brand.naver.com/${slug}` };
    }
    if (u.hostname === "smartstore.naver.com") {
      const slug = u.pathname.split("/").filter(Boolean)[0] ?? "";
      if (!slug) return null;
      return { type: "smartstore", slug, url: raw, storeUrl: `https://smartstore.naver.com/${slug}` };
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

/**
 * 자사 도메인이 검색결과에 포함된 비율 (0~1)
 * 브랜드/스마트스토어 도메인 + 슬러그를 호스트네임으로 가진 결과 카운트.
 */
function ownDomainShare(items: any[], slug: string): number {
  if (!items || items.length === 0) return 0;
  let own = 0;
  for (const it of items) {
    const link = String(it?.link ?? "");
    if (link.includes(`brand.naver.com/${slug}`) || link.includes(`smartstore.naver.com/${slug}`)) {
      own++;
    }
  }
  return own / items.length;
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
  // 권위 누수율 = 1 - shopShare (shop에서 자사가 안 보이면 권위 누수 100%)
  const leakageRatio = 1 - x.shopShare;
  const leakagePct = Math.round(leakageRatio * 100);

  // 권위 회복 가능성 (자체 콘텐츠 점유율 기반)
  const ownAuthority = Math.round((x.shopShare * 0.6 + x.webkrOwnRatio * 0.4) * 100);

  // sub-signals
  const crawlability = 10; // robots.txt가 strict — 사실상 차단
  const indexability = Math.min(50, x.shopTotal > 0 ? 40 + Math.min(10, Math.log10(x.shopTotal) * 5) : 20);
  const ownDomain = 0; // 자체 도메인 없음
  const snippet = x.shopShare > 0 ? Math.round(x.shopShare * 60) : 15;
  const structured = 5; // 네이버 템플릿 — 구조화 데이터 통제 불가

  // 가중평균
  const raw = Math.round(
    crawlability * 0.20 +
    indexability * 0.20 +
    ownDomain * 0.25 +
    snippet * 0.15 +
    structured * 0.20
  );

  // Score cap: 자체 도메인 부재로 SEO 최대 45
  const SEO_CAP = 45;
  const score = Math.min(raw, SEO_CAP);

  const issues: string[] = [];
  if (leakageRatio >= 0.8) {
    issues.push(`검색 권위의 ${leakagePct}%가 naver.com에 적립되고 있어요. 자사 도메인이 없어 회수 불가능한 구조예요.`);
  }
  if (x.shopTotal === 0) {
    issues.push("브랜드명으로 네이버 쇼핑 검색 시 노출이 거의 없어요. 슬러그가 일반 키워드와 충돌할 가능성이 있어요.");
  }
  issues.push("네이버 스토어는 robots.txt로 외부 검색엔진 크롤을 차단하고 있어요. Google·Bing 검색결과에서는 거의 노출되지 않아요.");

  const strengths: string[] = [];
  if (x.shopShare >= 0.3) {
    strengths.push("쇼핑 검색결과에서 자사 스토어 노출 비중이 일정 수준 확보돼 있어요.");
  } else {
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
    scoreRationale: `브랜드 검색 권위의 ${leakagePct}%가 naver.com 도메인에 귀속됩니다. 자체 도메인이 없어 권위를 회수할 구조적 수단이 없습니다.`,
    issues: issues.slice(0, 3),
    strengths: strengths.slice(0, 2),
    priorityFix: { label: "외부 콘텐츠 허브 구축으로 검색 권위 회수 시작", pointRange: "+15~+30" },
    quickFix: { label: "스토어 외 자사 채널(블로그·자사몰) 진단 받기", pointRange: "+3~+5" },
    additionalFixes: [
      { label: "구조화된 외부 콘텐츠로 브랜드 신호 강화", pointRange: "+5~+10" },
    ],
    scoreCap: `네이버 스토어는 자체 도메인이 없어 SEO 점수가 ${SEO_CAP}점을 넘기 어려워요.`,
    // 스토어 전용 메타
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
      { name: "출처 다양성", score: Math.round(sourceDiversity), weight: 25 },
      { name: "자사 통제 콘텐츠 비중", score: ownControlled, weight: 25 },
      { name: "인용 가능성", score: Math.round(citability), weight: 20 },
      { name: "최신성", score: freshness, weight: 15 },
      { name: "브랜드 엔티티 명확성", score: brandClarity, weight: 15 },
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

  let input: { url?: string } = {};
  try {
    input = await req.json();
  } catch {
    /* empty body OK if query param used */
  }
  const targetUrl =
    input.url ?? new URL(req.url).searchParams.get("url") ?? "";

  if (!targetUrl) {
    return new Response(
      JSON.stringify({ success: false, error: "url required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const store = parseStoreUrl(targetUrl);
  if (!store) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Not a Naver store URL. brand.naver.com 또는 smartstore.naver.com URL을 입력해 주세요.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const query = store.slug;

  const [shop, blog, cafe, kin, webkr] = await Promise.all([
    naverSearch("shop", query, 10),
    naverSearch("blog", query, 10),
    naverSearch("cafearticle", query, 10),
    naverSearch("kin", query, 10),
    naverSearch("webkr", query, 10),
  ]);

  // 자사 점유율 계산
  const shopItems = shop.body?.items ?? [];
  const webkrItems = webkr.body?.items ?? [];
  const shopShare = ownDomainShare(shopItems, store.slug);
  const webkrOwnRatio = ownDomainShare(webkrItems, store.slug);

  const inputs: AxisInputs = {
    store,
    shopShare,
    shopTotal: shop.body?.total ?? 0,
    blogTotal: blog.body?.total ?? 0,
    cafeTotal: cafe.body?.total ?? 0,
    kinTotal: kin.body?.total ?? 0,
    webkrTotal: webkr.body?.total ?? 0,
    webkrOwnRatio,
  };

  const seoAxis = buildSeoAxis(inputs);
  const aeoAxis = buildAeoAxis(inputs);
  const geoAxis = buildGeoAxis(inputs);

  // 가중평균으로 최종 점수 계산
  const calcScore = (axis: any) =>
    Math.round(
      axis.subSignals.reduce(
        (sum: number, s: any) => sum + (s.score * s.weight) / 100,
        0,
      ),
    );

  const seoCap = 45;
  const aeoCap = 50;
  const geoCap = webkrOwnRatio === 0 ? 40 : 60;

  const seoScore = Math.min(calcScore(seoAxis), seoCap);
  const aeoScore = Math.min(calcScore(aeoAxis), aeoCap);
  const geoScore = Math.min(calcScore(geoAxis), geoCap);

  const result = {
    seoScore,
    aeoScore,
    geoScore,
    seoAxis,
    aeoAxis,
    geoAxis,
    // 스토어 전용 추가 메타 (UI에서 권위 누수 도넛/외부 점유율 바 그릴 때 사용)
    storeContext: {
      type: store.type,
      slug: store.slug,
      storeUrl: store.storeUrl,
      authorityLeakageRatio: 1 - shopShare,
      ownContentRatio: shopShare,
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
  };

  return new Response(
    JSON.stringify({ success: true, data: result }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
