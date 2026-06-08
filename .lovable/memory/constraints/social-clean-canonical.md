---
name: Social Clean Canonical URL
description: Threads 등 소셜 자동 발행 링크는 항상 clean canonical URL만 사용. UTM·추적 파라미터 부착 금지
type: constraint
---

# 소셜 자동 발행 링크 = clean canonical only

## 규칙
- Threads / 향후 소셜 자동 발행 함수에서 블로그/제품 링크 조립 시 **UTM·추적 파라미터를 절대 붙이지 않는다**.
- 사용 형태: `https://www.searchtuneos.com/blog/{slug}/` (canonical 그대로).
- 채널 구분은 GA4의 referrer 자동 분류로 충분. UTM은 redundant + 500자 한도 잠식.

## Why
1. Threads 본문 500자 한도를 URL이 잠식해 훅이 잘림
2. canonical과 다른 URL이 외부로 노출되어 색인/공유 신호 분산
3. 카카오/메타 OG 캐시에서 canonical 미스매치 발생 가능

## How to apply
- 신규 소셜 자동화 함수를 만들 때 링크 조립부에서 반드시 `cleanProductUrl()` (src/lib/cleanProductUrl.ts) 통과
- 또는 처음부터 `${SITE_BASE}/blog/${slug}/` 형태만 사용, query/hash 부착 금지
- 과거 큐 정정: `social_publish_queue.body`에서 `?utm_*` 패턴 strip 마이그레이션 적용됨 (2026-06-08)
