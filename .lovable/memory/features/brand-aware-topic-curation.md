---
name: Brand-Aware Topic Curation
description: AutoBlog 토픽 풀의 60%를 명확한 브랜드 키워드(ChatGPT/Claude/Naver/Google/Perplexity/Wrtn/Cafe24/imweb 등) 친화 토픽으로 의도적 가중. 결과적으로 브랜드 OG 분할 카드가 자주 노출되어 SNS 공유성 ↑
type: feature
---

## 룰
- `supabase/functions/generate-blog-post/index.ts`의 `BRAND_TOPIC_RATIO = 0.6` (60%)
- `BRAND_KEYWORDS` 배열로 브랜드 토픽 식별 (`isBrandTopic`)
- 토픽 선택 시 매번 60% 확률로 브랜드 풀에서 우선 시도 → 회피 룰(최근 타이틀/카테고리)과 함께 적용
- 폴백: 일반 풀 → 일반 풀 회피 룰

## 효과
- 자동 발행 글 60%가 ChatGPT/Claude/Naver/Google 등 브랜드 워드마크 OG로 노출
- 일반 SEO 토픽도 40% 보존 → 다양성 유지
- detectBrand가 카테고리 폴백(AEO→ChatGPT, GEO→Perplexity)을 가지므로 비-브랜드 토픽도 OG는 브랜드 카드 가능

## 토픽 풀 확장 가이드
- 새 브랜드 추가 시: `brand-matching.ts`에 BrandKey + BRAND_STYLES 추가 + `BRAND_KEYWORDS` 동기화
- 토픽 라벨에 키워드 자연스럽게 포함 (예: "Perplexity citations에 들어가는 법")
