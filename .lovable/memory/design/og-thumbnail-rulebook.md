---
name: OG/Thumbnail Rulebook
description: OG=썸네일 통합. 3-tier 폴백 — (1) 명확 브랜드 워드마크 카드 (2) 카테고리만 명확 → AEO/GEO/SEO 개념 카드 (3) SearchTune 폴백. AI 실패 시 SVG 폴백, og-svg endpoint
type: design
---

## 3-Tier 폴백 전략
1. **명확 브랜드** (`detectBrand` 매칭): ChatGPT/Claude/Gemini/Perplexity/Wrtn/Google/Google AI Overview/**Naver/Naver Cue:/Clova X (한국 브랜드 우선)**/Cafe24/imweb/Bing Copilot → 좌 480px 라이트 패널(브랜드 시그니처 폰트·컬러 워드마크 + 부제) + 우 720px 카테고리 그라데이션 메타
2. **카테고리만 명확** (AEO/GEO/SEO): 개념 카드 — `aeo`/`geo`/`seo` BrandStyle (Inter 900, 카테고리 컬러). "GEO?" 호기심 유발 + 키워드 SEO 강화
3. **둘 다 없음**: SearchTune OS 폴백 (About/공지 등 자사 콘텐츠 전용)

## 한국 시장 우선순위
- `detectBrand` 순서: 구체 케이스(AI Overview/Cue:/Clova) → 한국 브랜드(Naver/뤼튼) → 글로벌(ChatGPT/Claude/Gemini/Perplexity/Bing/Google) → 플랫폼(Cafe24/imweb) → 카테고리 폴백 → searchtune
- Bing Copilot은 한국 시장 가치 낮음 → Naver 계열보다 아래로

## 구현
- 공유 모듈: `src/lib/brandMatching.ts` ↔ `supabase/functions/_shared/brand-matching.ts` (mirror)
- `hasExplicitBrand(slug, title, category)` 가 true면 워드마크 카드 렌더 (개념 카드 포함)
- `buildBrandSplitSvg`: 좌 패널 워드마크 + 우 패널 그라데이션 메타. 한글 100% 안전
- `buildGradientSvg`: SearchTune 폴백만 사용 (카테고리 풀 그라데이션 + 타이틀)
- 1200x630, og_image와 thumbnail 동일 이미지

## Endpoints
- `og-svg` GET `?slug=...&title=...&category=...` — 영구 폴백 (Cache 24h)
- `generate-og-image` POST — AI 시도 후 실패 시 SVG 폴백, Storage(og-images, UUID 파일명) 업로드
- 둘 다 brand-aware: slug+category로 자동 분기
