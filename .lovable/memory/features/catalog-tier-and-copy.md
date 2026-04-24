---
name: Catalog Tier Gating & Cross-Site Copy
description: 카탈로그 티어 게이팅(Free/Beta=잠금, Lite=1개 맛보기, Pro/Studio=50개) + 사이트 간 일괄 복사 모달 (전 티어 무료, URL 중복 스킵, 대상 티어 한도 적용)
type: feature
---

# Catalog Tier Gating & Cross-Site Copy

## Tier limits (PRODUCT_LIMIT in `useUserTier.ts`)
- **Free / Beta**: 0 — `LockedFeature` 잠금 화면, "Lite로 업그레이드" CTA
- **Lite**: 1 (맛보기) — 등록 시 Lite teaser 배너 노출 ("Pro로 업그레이드하면 50개")
- **Pro / Studio**: 50
- **Admin**: 99

## UI Behavior
- Products 페이지 헤더 subtitle에 `(현재/한도)` 카운터 표시
- 한도 도달 시 "새 제품" 버튼 → "한도 도달 · 업그레이드" 버튼으로 전환 (`/autoblog#pricing` 이동)
- RLS는 베타 동안 `count_site_products(site_id) < 50` 유지. 클라이언트 검증으로 우선 게이팅. 추후 RLS에 티어별 한도 추가 예정.

## Cross-Site Copy (`CopyCatalogModal`)
- **트리거**: Products 페이지 헤더 우측 "다른 사이트로 복사" 버튼 (제품 1개 이상일 때만)
- **전 티어 무료** — 게이팅 없음
- **범위**: 선택 항목만 / 전체 (체크된 항목 있으면 디폴트=선택)
- **충돌**: URL 중복 자동 스킵 (덮어쓰기 없음)
- **대상 한도**: 대상 사이트의 현재 티어 `PRODUCT_LIMIT` 적용. 초과분은 잘리고 토스트 안내
- **복사 필드**: title, url, description, keywords, price, image_url, compare_at_price, sale_label, sale_ends_at, is_active, sort_order (append). click_count는 리셋

## Files
- `src/features/auth/useUserTier.ts` — `PRODUCT_LIMIT` 추가, 훅에 `productLimit` 반환
- `src/features/publish/CopyCatalogModal.tsx` — 신규
- `src/pages/dashboard/Products.tsx` — 게이팅 + 복사 버튼 통합
