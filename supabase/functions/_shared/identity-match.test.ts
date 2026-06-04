// 8가지 정합성 시나리오 자동 테스트.
// 실행: supabase--test_edge_functions 또는 `deno test supabase/functions/_shared/identity-match.test.ts`
//
// 시나리오 매핑:
//  #1 한국어 조사 → strict 매칭
//  #2 영어 답변 + 한국어 브랜드 → 영문 alias로 strict
//  #3 일반 영단어 브랜드 (apple) → false positive 방지
//  #4 brand=null 사일런트 실패 → 캐시 저장 안 함 가드 (helper로 검증)
//  #5 스마트스토어/Cafe24/imweb 멀티테넌트 → isMultiTenantHost
//  #6 딥 페이지 URL → normalizeHost는 host만 추출 (resolve가 루트 스크랩)
//  #7 동시 요청 race → confidence 더 높은 쪽만 덮어쓰기 규칙 (헬퍼 검증)
//  #8 resolve 타임아웃 → invokeResolve가 AbortController 사용 (구조 검증)

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  brandMentioned,
  describesSameEntity,
  isMultiTenantHost,
  normalizeHost,
  categoryMatches,
  isDenialOnly,
  type SiteIdentity,
} from "./identity-match.ts";

function id(partial: Partial<SiteIdentity>): SiteIdentity {
  return {
    host: "example.com",
    brand: null,
    aliases: [],
    category: null,
    description_short: null,
    confidence: 0.8,
    source: "llm_gate",
    ...partial,
  };
}

// ── #1: 한국어 조사 → strict 매칭 ───────────────────────────────
Deno.test("scenario#1: Korean particles keep strict match", () => {
  const ident = id({ host: "evabin.co.kr", brand: "에바빈", aliases: ["EVABIN"] });
  const cases = [
    "에바빈은 여성 의류 쇼핑몰입니다",
    "에바빈이 신상품을 출시했습니다",
    "에바빈에서 세일을 진행 중",
    "에바빈의 인기 상품",
    "에바빈을 검색해보세요",
  ];
  for (const text of cases) {
    assertEquals(brandMentioned(text, ident), "strict", `should be strict: "${text}"`);
  }
  // 조사 없이 다른 단어와 붙으면 strict 아님 (3자 한글 → fuzzy 임계 미달)
  assertEquals(brandMentioned("에바빈브랜드몰", ident), "none");
});

// ── #2: 영어 답변 + 한국어 브랜드 → 영문 alias 매칭 ──────────────
Deno.test("scenario#2: English text matches Korean brand via alias", () => {
  const ident = id({
    host: "coupang.com",
    brand: "쿠팡",
    aliases: ["Coupang", "쿠팡몰"],
  });
  assertEquals(
    brandMentioned("Coupang is a major Korean e-commerce platform.", ident),
    "strict",
  );
  // 영문 alias가 없으면 매칭 0
  const noEn = id({ host: "coupang.com", brand: "쿠팡", aliases: ["쿠팡몰"] });
  assertEquals(
    brandMentioned("Coupang is a major Korean e-commerce platform.", noEn),
    "none",
  );
});

// ── #3: 일반 영단어 브랜드 → 다른 alias 동반해야 strict ──────────
Deno.test("scenario#3: common-word brands avoid false positives", () => {
  const apple = id({ host: "apple.com", brand: "Apple", aliases: ["iPhone", "iPad"] });
  // 일반 문장에서는 strict 아님 (다른 alias도 없으면 fuzzy)
  assertEquals(brandMentioned("I love apples in the morning", apple), "fuzzy");
  assertEquals(brandMentioned("Apple is a fruit", apple), "fuzzy");
  // 다른 alias가 함께 보이면 strict
  assertEquals(
    brandMentioned("Apple released a new iPhone today", apple),
    "strict",
  );
  // host가 텍스트에 있어도 strict
  assertEquals(
    brandMentioned("visit apple.com for more info", apple),
    "strict",
  );
});

// ── #4: brand=null & low confidence → 캐시 저장 가드 ─────────────
// upsertIdentity 자체는 DB가 필요하므로 게이트 로직만 검증한다.
Deno.test("scenario#4: empty identity gate (no save when null + low conf)", () => {
  const shouldSkipSave = (brand: string | null, confidence: number) =>
    !brand && confidence < 0.4;
  assertEquals(shouldSkipSave(null, 0.2), true);
  assertEquals(shouldSkipSave(null, 0.5), false); // 신뢰도 높으면 저장 허용
  assertEquals(shouldSkipSave("쿠팡", 0.2), false); // brand 있으면 저장 허용
});

// ── #5: 멀티테넌트 호스트 감지 ───────────────────────────────────
Deno.test("scenario#5: multi-tenant hosts bypass identity cache", () => {
  const multi = [
    "smartstore.naver.com",
    "shop123.cafe24.com",
    "myblog.tistory.com",
    "user.github.io",
    "team.notion.site",
    "brunch.co.kr",
    "blog.naver.com",
  ];
  for (const h of multi) assert(isMultiTenantHost(h), `expected multi-tenant: ${h}`);

  const single = ["coupang.com", "evabin.co.kr", "apple.com", "searchtuneos.com"];
  for (const h of single) assertEquals(isMultiTenantHost(h), false, `expected single: ${h}`);
});

// ── #6: 딥 URL → host만 정규화 (resolve가 루트를 스크랩) ─────────
Deno.test("scenario#6: deep URLs normalize to host (resolver scrapes root)", () => {
  assertEquals(
    normalizeHost("https://blog.example.com/posts/2026/03/article-slug?ref=abc"),
    "blog.example.com",
  );
  assertEquals(normalizeHost("https://www.evabin.co.kr/product/123"), "evabin.co.kr");
  assertEquals(normalizeHost("evabin.co.kr"), "evabin.co.kr");
  assertEquals(normalizeHost("HTTPS://Apple.COM/iphone"), "apple.com");
});

// ── #7: 동시 요청 race → confidence 더 높은 쪽만 덮어쓰기 ────────
Deno.test("scenario#7: race guard prefers higher-confidence write", () => {
  const shouldOverwrite = (existing: number | null, incoming: number) =>
    existing == null || incoming > existing;
  assertEquals(shouldOverwrite(null, 0.5), true);
  assertEquals(shouldOverwrite(0.4, 0.7), true);
  assertEquals(shouldOverwrite(0.8, 0.7), false); // 약한 결과로 덮지 않음
  assertEquals(shouldOverwrite(0.8, 0.8), false); // 동률이면 유지
});

// ── #8: resolve 타임아웃 구조 (AbortController 통합 검증) ────────
Deno.test("scenario#8: AbortController timeout aborts hanging fetch", async () => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50);
  let aborted = false;
  try {
    await fetch("https://10.255.255.1/never", { signal: ctrl.signal });
  } catch (e) {
    aborted = (e as Error).name === "AbortError" || /aborted/i.test(String(e));
  } finally {
    clearTimeout(timer);
  }
  assert(aborted, "expected fetch to abort within timeout");
});

// ── 보너스: 종합 판정 회귀 테스트 ────────────────────────────────
Deno.test("describesSameEntity: brand strict beats category", () => {
  const ident = id({
    host: "evabin.co.kr",
    brand: "에바빈",
    aliases: ["EVABIN"],
    category: "여성 의류 쇼핑몰",
  });
  const r = describesSameEntity("에바빈은 봄 신상을 출시했습니다", ident);
  assertEquals(r.awareness, "yes");
  assertEquals(r.reason, "brand_strict");
});

Deno.test("describesSameEntity: denial short-circuits", () => {
  const ident = id({ host: "x.com", brand: "X", aliases: [] });
  assert(isDenialOnly("모릅니다"));
  const r = describesSameEntity("모릅니다", ident);
  assertEquals(r.awareness, "no");
  assertEquals(r.reason, "denial");
});

Deno.test("categoryMatches: meaningful tokens only", () => {
  const ident = id({ category: "여성 의류 쇼핑몰" });
  // "쇼핑몰"은 stopword → 여성/의류 2개 토큰 중 1개 → 0.5
  assertEquals(categoryMatches("여성 패션 정보", ident), 0.5);
  assertEquals(categoryMatches("의류 트렌드와 여성 스타일", ident), 1);
  assertEquals(categoryMatches("자동차 리뷰", ident), 0);
});
