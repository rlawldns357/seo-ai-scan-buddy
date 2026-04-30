---
name: OG/Thumbnail Rulebook
description: OG=썸네일. 미니멀 단일 패널(좌/우 분할 폐기) — 브랜드별 크림/오프화이트 panelBg + 그레인 노이즈 + 중앙 워드마크 + 부제 "회사 · 카테고리". 한글 100% 안전 SVG 폴백
type: design
---

## 컨셉 (v2 — 미니멀)
업로드한 ChatGPT/Claude/AEO 예시 톤. 좌우 분할/그라데이션 시끄러움 폐기.
- **단일 패널**: 1200x630 풀 크림/오프화이트 (`brand.panelBg`)
- **그레인 노이즈**: SVG `<filter>` feTurbulence 6% opacity (한국적 종이 질감)
- **워드마크 중앙**: brand.wordmark, brand.color (Bing은 그라데이션 fill, AEO/GEO/SEO는 글자별 그라데이션, Google은 멀티컬러)
- **부제**: `회사 · 카테고리` (예: `OPENAI · AEO`, `ANTHROPIC · AEO`, `MICROSOFT · SEO`). brand.subtitle을 toUpperCase + letter-spacing 3
- **워터마크**: 우측 하단 `SEARCHTUNE OS · SEARCHTUNEOS.COM` (회색 0.32)

## 3-Tier 폴백 (유지)
1. **명확 브랜드**: ChatGPT/Claude/Gemini/Perplexity/Wrtn/Google/Naver/Cue:/Clova X/Cafe24/imweb/Bing → 워드마크 카드
2. **카테고리만**: AEO/GEO/SEO → 개념 카드 (글자별 그라데이션, 부제는 풀네임 `ANSWER ENGINE OPTIMIZATION`)
3. **둘 다 없음**: SearchTune OS 풀 그라데이션 폴백 (`buildGradientSvg`)

⚠️ `hasExplicitBrand(slug, title, category)` — category 인자 필수. 안 넘기면 AEO/GEO/SEO 컨셉 카드 폴백 안 됨

## 폰트 사이즈 룰
- 워드마크: `length > 8 → 120 / > 5 → 140 / else → 160`
- 컨셉(AEO/GEO/SEO): 180
- Bing: 156 (그라데이션 fill, descender padding)
- 부제: `subtitle.length > 28 → 18 / else → 22`

## 구현
- 공유 모듈: `src/lib/brandMatching.ts` ↔ `supabase/functions/_shared/brand-matching.ts` (mirror)
- 룰북: `supabase/functions/_shared/og-design-rulebook.ts` — `buildBrandSplitSvg` (이름 유지하되 단일 패널), `buildGradientSvg` (SearchTune 폴백만)

## Endpoints
- `og-svg` GET `?slug=...&title=...&category=...` — 영구 폴백 (Cache 24h)
- `generate-og-image` POST — AI 시도 후 실패 시 SVG 폴백, Storage(og-images, UUID) 업로드
