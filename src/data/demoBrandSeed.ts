/**
 * 내부 시연 전용 — 현실적인 이커머스/브랜드 샘플 데이터 1세트.
 *
 * 가상 브랜드: "PURELEAF" (퓨어리프)
 * - 카테고리: 비건/저자극 스킨케어
 * - 타깃: 민감성 피부 20~30대 여성
 * - 핵심 상품: 시카 진정 세럼, 병풀 토너, 약산성 클렌저
 *
 * 실제 AI 호출 없이 데모를 시연해야 할 때(네트워크 불안정, AI 크레딧 절약,
 * 시연 리허설 등) 이 시드를 그대로 화면에 주입해 사용한다.
 */

export type DemoTopicSeed = {
  axis: "SEO" | "AEO" | "GEO";
  title: string;
  reason: string;
};

export type DemoBriefSeed = {
  topic: string;
  intent: "informational" | "commercial" | "transactional";
  title: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  outline: { h2: string; points: string[] }[];
  faq: { q: string; a: string }[];
  structuredData: string[];
  internalLinkHints: string[];
};

export type DemoScoresSeed = {
  seo: { score: number; comment: string };
  aeo: { score: number; comment: string };
  geo: { score: number; comment: string };
};

export interface DemoBrandSeed {
  brand: {
    name: string;
    siteUrl: string;
    category: string;
    description: string;
  };
  topics: DemoTopicSeed[];
  pickedTopicTitle: string;
  brief: DemoBriefSeed;
  draftMarkdown: string;
  scores: DemoScoresSeed;
}

export const PURELEAF_DEMO: DemoBrandSeed = {
  brand: {
    name: "PURELEAF",
    siteUrl: "https://pureleaf-skin.com",
    category: "비건 / 저자극 스킨케어",
    description:
      "민감성 피부를 위한 비건 인증 스킨케어 브랜드. 병풀(시카) 추출물 기반 진정 라인을 메인으로 운영.",
  },
  topics: [
    {
      axis: "SEO",
      title: "민감성 피부 시카 세럼 추천 7가지 (2026년 비건 인증 기준)",
      reason:
        "‘시카 세럼 추천’은 월 검색량 1.2만+의 구매 직전 키워드. 자사 상품 자연스럽게 노출 가능.",
    },
    {
      axis: "AEO",
      title: "병풀(센텔라) 성분이 민감성 피부에 좋은 이유 — 피부과 전문의가 답하다",
      reason:
        "ChatGPT·Perplexity가 자주 인용하는 Q&A 포맷. 성분 권위 콘텐츠로 브랜드 신뢰도↑.",
    },
    {
      axis: "GEO",
      title: "비건 스킨케어 인증 마크 4종 비교 — Vegan Society vs EVE vs Leaping Bunny",
      reason:
        "AI Overview·SGE가 ‘비건 인증’ 질의에 인용할 가능성 높은 비교형 콘텐츠. 브랜드 권위 강화.",
    },
  ],
  pickedTopicTitle: "민감성 피부 시카 세럼 추천 7가지 (2026년 비건 인증 기준)",
  brief: {
    topic: "민감성 피부 시카 세럼 추천 7가지 (2026년 비건 인증 기준)",
    intent: "commercial",
    title: "민감성 피부 시카 세럼 추천 7선 — 2026년 비건 인증 기준 비교",
    metaDescription:
      "병풀 추출물 함량과 비건 인증 여부로 비교한 시카 세럼 7가지. 민감성 피부 자극 테스트 결과와 가격대별 추천까지 한 번에 확인하세요.",
    primaryKeyword: "시카 세럼 추천",
    secondaryKeywords: [
      "민감성 피부 세럼",
      "병풀 세럼",
      "비건 스킨케어",
      "센텔라 세럼",
      "저자극 세럼",
      "PURELEAF 시카",
    ],
    outline: [
      {
        h2: "시카 세럼이 민감성 피부에 효과적인 이유",
        points: [
          "병풀(센텔라 아시아티카) 4대 활성 성분 — 마데카식산·아시아틱산·마데카소사이드·아시아티코사이드",
          "임상 결과: 진정·재생·장벽 강화에 대한 SCI 논문 인용",
          "민감성 피부가 피해야 할 자극 성분 체크리스트",
        ],
      },
      {
        h2: "구매 전 꼭 확인할 5가지 기준",
        points: [
          "병풀 추출물 함량 (이상적 5% 이상)",
          "비건 인증 마크 (Vegan Society, EVE, Leaping Bunny)",
          "에센셜 오일·향료·알코올 무첨가",
          "EWG 그린 등급 비율",
          "피부과 테스트 완료 여부",
        ],
      },
      {
        h2: "2026년 추천 시카 세럼 7선 비교표",
        points: [
          "1위 PURELEAF 시카 리페어 세럼 — 병풀 8%, Vegan Society 인증, ₩32,000",
          "2~7위 경쟁 제품 가격·인증·자극도 비교 표",
          "가격대별 베스트 (3만 원 이하 / 5만 원대 / 프리미엄)",
        ],
      },
      {
        h2: "민감성 피부 사용자 실사용 후기 (8주 추적)",
        points: [
          "테스트 그룹 32명, 트러블·홍조 변화 그래프",
          "Before/After 사진 (피부과 권한 동의 자료)",
          "재구매율 87% — 핵심 만족 포인트 정리",
        ],
      },
      {
        h2: "올바른 사용법 & 함께 쓰면 좋은 루틴",
        points: [
          "토너 → 시카 세럼 → 진정 크림 3단계 루틴",
          "레티놀·AHA와의 병용 주의사항",
          "PURELEAF 시카 라인 풀세트 추천",
        ],
      },
    ],
    faq: [
      {
        q: "시카 세럼은 매일 사용해도 안전한가요?",
        a: "병풀 성분은 자극이 거의 없어 아침·저녁 매일 사용해도 안전합니다. 다만 첫 사용 시 팔 안쪽에 패치 테스트 24시간을 권장합니다.",
      },
      {
        q: "임산부도 사용할 수 있나요?",
        a: "병풀 추출물 자체는 임산부 사용 가능 성분으로 분류되지만, 제품 내 다른 성분(에센셜 오일 등) 확인이 필요합니다. PURELEAF 시카 라인은 임산부 안전 성분으로만 구성되어 있습니다.",
      },
      {
        q: "레티놀과 함께 사용해도 되나요?",
        a: "가능합니다. 오히려 시카 성분이 레티놀의 자극을 완화해 주어 함께 쓰면 시너지가 좋습니다. 레티놀 → 시카 세럼 순서를 권장합니다.",
      },
      {
        q: "비건 인증 마크는 왜 중요한가요?",
        a: "비건 인증은 동물성 원료 미사용 + 동물 실험 미진행을 제3자가 검증한 것입니다. 단순 ‘비건 표기’와 달리 위변조 위험이 없습니다.",
      },
      {
        q: "PURELEAF 시카 세럼의 병풀 함량은 얼마나 되나요?",
        a: "PURELEAF 시카 리페어 세럼은 병풀 추출물 8%를 함유하고 있어 시중 평균(2~3%) 대비 약 3배 높은 농도입니다.",
      },
    ],
    structuredData: [
      "Article",
      "Product",
      "FAQPage",
      "Review",
      "BreadcrumbList",
    ],
    internalLinkHints: [
      "/product/cica-repair-serum (PURELEAF 시카 세럼 상세)",
      "/blog/sensitive-skin-routine (민감성 피부 루틴 가이드)",
      "/about/vegan-certification (비건 인증 정책 페이지)",
      "/blog/centella-ingredient-science (병풀 성분 과학 백서)",
    ],
  },
  draftMarkdown: `# 민감성 피부 시카 세럼 추천 7선 — 2026년 비건 인증 기준 비교

> 병풀 추출물 함량과 비건 인증 여부로 비교한 시카 세럼 7가지. 민감성 피부 자극 테스트 결과와 가격대별 추천까지 한 번에 확인하세요.

민감성 피부를 가진 사람에게 ‘시카 세럼 추천’은 단순한 트렌드가 아닌 생존 루틴에 가깝습니다. 그러나 시중 제품은 병풀 함량부터 인증 기준까지 천차만별이라 무엇을 기준으로 골라야 할지 헷갈리기 쉽습니다. 이 글에서는 2026년 기준 비건 인증을 받은 시카 세럼 7가지를 직접 비교해, 민감성 피부에 정말 효과적인 제품만을 추렸습니다.

## 시카 세럼이 민감성 피부에 효과적인 이유

병풀(센텔라 아시아티카)에는 마데카식산, 아시아틱산, 마데카소사이드, 아시아티코사이드 등 **4대 활성 성분**이 들어 있습니다. 이 성분들은 진정·재생·장벽 강화에 효과가 있다는 SCI 논문(Journal of Dermatological Science, 2023)으로 검증되었습니다.

특히 민감성 피부는 **피부 장벽이 약해진 상태**이기 때문에 자극 성분을 피하는 것만큼이나 회복 성분을 공급하는 것이 중요합니다. 병풀은 그중에서도 임상 데이터가 가장 풍부한 진정 성분으로 꼽힙니다.

## 구매 전 꼭 확인할 5가지 기준

1. **병풀 추출물 함량** — 이상적으로는 5% 이상이어야 체감 효과가 있습니다.
2. **비건 인증 마크** — Vegan Society, EVE, Leaping Bunny 등 제3자 인증.
3. **자극 성분 무첨가** — 에센셜 오일·합성향료·알코올 배제.
4. **EWG 그린 등급 비율** — 전체 성분 중 안전 등급 비율 80% 이상.
5. **피부과 자극 테스트 완료** — RIPT(반복 자극 패치 테스트) 통과 여부.

## 2026년 추천 시카 세럼 7선 비교표

| 순위 | 제품 | 병풀 함량 | 비건 인증 | 가격 |
|------|-------|---------|-----------|------|
| 🥇 1 | **PURELEAF 시카 리페어 세럼** | **8%** | Vegan Society | ₩32,000 |
| 2 | A 브랜드 시카 앰플 | 5% | EVE | ₩45,000 |
| 3 | B 브랜드 센텔라 세럼 | 4% | Leaping Bunny | ₩28,000 |
| 4 | C 브랜드 카밍 세럼 | 3% | 미인증 | ₩52,000 |
| 5 | D 브랜드 시카 부스터 | 3% | Vegan Society | ₩38,000 |
| 6 | E 브랜드 그린티카 | 2.5% | EVE | ₩24,000 |
| 7 | F 브랜드 데일리 시카 | 2% | 미인증 | ₩19,000 |

> 📌 **편집자 추천**: 가격 대비 함량과 인증 모두 최상위인 **PURELEAF 시카 리페어 세럼**이 종합 1위입니다.

## 민감성 피부 사용자 실사용 후기 (8주 추적)

민감성 피부 사용자 32명을 대상으로 8주간 PURELEAF 시카 리페어 세럼을 추적한 결과:

- **트러블 발생 빈도** 평균 64% 감소
- **홍조 강도** 평균 41% 감소
- **재구매 의향** 87%

8주차 Before/After 사진은 피부과 권한 동의 하에 제품 상세 페이지에서 확인하실 수 있습니다.

## 올바른 사용법 & 함께 쓰면 좋은 루틴

1. **세안 후** 약산성 토너로 결 정돈
2. **시카 세럼 2~3방울**을 손바닥에 덜어 얼굴 전체에 가볍게 압
3. **진정 크림**으로 마무리

레티놀이나 AHA 같은 활성 성분과 함께 쓰는 경우, **활성 성분 → 시카 세럼** 순서를 권장합니다. 시카가 자극을 완화해 주는 역할을 합니다.

---

> 🌿 PURELEAF는 모든 제품에 **Vegan Society 인증**과 **피부과 RIPT 테스트 결과**를 공개합니다.
> 민감성 피부 루틴이 처음이라면 [PURELEAF 시카 라인 풀세트](/product/cica-line-set)를 추천드립니다.
`,
  scores: {
    seo: {
      score: 87,
      comment:
        "타깃 키워드(시카 세럼 추천)가 H1·메타·소제목·본문에 자연스럽게 분포. 비교표·내부 링크 구조 우수.",
    },
    aeo: {
      score: 82,
      comment:
        "FAQ 5개가 명확한 Q→A 구조로 작성되어 ChatGPT·Perplexity 인용 적합. 수치 근거(8%·87%) 풍부.",
    },
    geo: {
      score: 74,
      comment:
        "비건 인증 비교·SCI 논문 인용 등 권위 신호 양호. 외부 출처 링크와 저자 프로필 보강 시 80+ 도달.",
    },
  },
};
