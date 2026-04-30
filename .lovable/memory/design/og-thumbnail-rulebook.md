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

## v3 업데이트 (2026-04-30): SVG SSOT + 후킹 부제
- **`generate-og-image` 기본값 SVG-first**: AI 이미지는 `prefer_ai=true` 명시할 때만 시도. 룰북 SVG가 단일 진실 소스 (한글 안전 + 스타일 일관성).
- **부제 2층 구조** in `buildBrandSplitSvg`:
  - **위 메타** (y=180, 14-16px, 회색 0.42, letter-spacing 4): `회사 · 카테고리` (예: `MICROSOFT · SEO`)
  - **워드마크** (중앙, y=305): 기존 그라데이션 유지
  - **아래 후킹 부제** (y=430, 28-40px 자동, Pretendard 600, 회색 0.72): 제목 정갈 요약 → 클릭 유도
- **`tidyTitleForOg(title)` 헬퍼**:
  - 괄호 안 부가 설명 제거 (`Q&A 4단계 전략 (AEO 최적화)` → `Q&A 4단계 전략`)
  - 콜론/대시 뒤 보조 설명 컷 (`완벽 가이드: 중복 콘텐츠 해결` → `완벽 가이드`)
  - 연도 prefix 제거 (`2026년 ...` → `...`)
  - 32자 초과 시 단어 경계로 컷 + `…`
- 발행된 모든 글 OG 일괄 재생성 (57개) — 모두 SVG 룰북 적용 완료.
