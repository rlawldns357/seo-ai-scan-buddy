---
name: OG/Thumbnail Rulebook
description: OG=썸네일 통합. 슬러그/제목 자동 브랜드 감지 → 좌측 브랜드 워드마크 카드 + 우측 카테고리 그라데이션 메타 (분할). 폴백은 카테고리 풀 그라데이션. AI 실패 시 SVG 폴백, og-svg endpoint
type: design
---

## 자동 브랜드 분할 카드 (1순위)
- `supabase/functions/_shared/brand-matching.ts` (=`src/lib/brandMatching.ts`)의 `detectBrand(slug, title, category)`로 명확한 브랜드(ChatGPT/Claude/Gemini/Perplexity/Wrtn/Google/Google AI Overview/Naver/Naver Cue:/Cafe24/imweb/Bing Copilot/Clova X) 감지
- `hasExplicitBrand`가 true → `buildBrandSplitSvg`: 좌 480px 라이트 패널(브랜드 워드마크 + 부제) + 우 720px 카테고리 그라데이션(카테고리 배지 + 타이틀 + SearchTune OS 마크)
- 브랜드별 시그니처 폰트/컬러 적용 (ChatGPT=Inter Black/#1A1A1A, Claude=Georgia/#CC785C, Naver=Pretendard 800/#03C75A, Google=Poppins 멀티컬러 등)
- AI 모델은 텍스트 깨짐 위험 때문에 SVG 폴백을 우선 — 한글 100% 안전

## 폴백 (카테고리 그라데이션)
- 슬러그 매칭 실패 시 `buildGradientSvg`: 카테고리(SEO/AEO/GEO/가이드/뉴스)별 그라데이션 + 타이틀 풀 화면
- 두 모드 모두 1200x630, og_image와 thumbnail 같은 이미지 공유 (DB에 둘 다 저장)

## Endpoints
- `og-svg` GET `?slug=...&title=...&category=...` — 영구 폴백 (Cache 24h)
- `generate-og-image` POST — AI 시도 후 실패 시 SVG로 폴백, Storage(og-images, UUID 파일명)에 업로드
- 둘 다 자동 brand-aware (slug 받으면 분할 카드 우선 시도)
