---
name: OG/Thumbnail Rulebook
description: OG=썸네일. **항상 PNG 출력** (카카오톡 호환). 룰북 SVG 빌드 → resvg-wasm + Pretendard ttf로 래스터라이즈. 단일 패널 미니멀 + 그레인 + 후킹 부제
type: design
---

## 출력 형식 (v4 — PNG 강제, 2026-04-30)

**모든 OG 이미지는 PNG로 발행한다.** SVG 직접 호스팅 금지.

이유:
- **카카오톡**은 OG 이미지로 SVG 미지원 → 미리보기 자체가 안 뜸
- **페북/트위터/슬랙**은 SVG → PNG 변환 시 `@font-face`/`@import`를 무시하는 렌더러 多 → 한글 □□

해결 (`supabase/functions/_shared/og-png-renderer.ts`):
1. 룰북이 SVG 빌드 (`buildSvgOg` — 디자인 SSOT)
2. `svgToPng(svg)`로 resvg-wasm 래스터라이즈
3. **Pretendard-Bold.ttf** (jsdelivr `npm/pretendard@1.3.9/dist/public/static/alternative/`, 2.6MB) ArrayBuffer를 `fontBuffers`로 직접 주입 → @font-face 의존 X, 한글 100% 보장
4. `og-images` 버킷에 `.png` 업로드, `og_image`/`thumbnail` 양쪽 저장

## 컨셉 (v2 유지 — 미니멀 단일 패널)
업로드한 ChatGPT/Claude/AEO 예시 톤. 좌우 분할/그라데이션 시끄러움 폐기.
- **단일 패널**: 1200x630 풀 크림/오프화이트 (`brand.panelBg`)
- **그레인 노이즈**: SVG `<filter>` feTurbulence 6% opacity (한국적 종이 질감)
- **워드마크 중앙**: brand.wordmark, brand.color (Bing은 그라데이션 fill, AEO/GEO/SEO는 글자별 그라데이션, Google은 멀티컬러)
- **위 메타** (eyebrow): `회사 · 카테고리` (예: `OPENAI · AEO`). brand.subtitle.toUpperCase + letter-spacing 4
- **아래 후킹 부제**: `tidyTitleForOg(title)` — 제목 정갈 요약 한 줄 (Pretendard 600, 회색 0.72)
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
- 부제(eyebrow): `length > 28 → 14 / else → 16`
- 후킹 부제(아래): 길이별 자동 28-40 (28 → 32 → 36 → 40)

## tidyTitleForOg 룰
- 괄호 안 부가 설명 제거
- 콜론/대시 뒤 보조 설명 컷 (앞부분 8자 이상일 때)
- 연도 prefix(`2026년`) 제거
- 32자 초과 시 단어 경계로 컷 + `…`

## 구현
- 공유 모듈: `src/lib/brandMatching.ts` ↔ `supabase/functions/_shared/brand-matching.ts` (mirror)
- 룰북 SVG 빌더: `supabase/functions/_shared/og-design-rulebook.ts`
- **PNG 렌더러**: `supabase/functions/_shared/og-png-renderer.ts` (resvg-wasm + Pretendard ttf)

## Endpoints
- `og-svg` GET `?slug=...&title=...&category=...` — **PNG 응답** (Cloudflare 24h 캐시). `?format=svg`는 디버그용
- `generate-og-image` POST `{slug,title,category}` — 룰북 SVG → PNG → Storage 업로드 → DB 갱신

## prerender-blog.mjs
- `resolveOgImage(post)`: `og_image`가 비었거나 `.svg`로 끝나면 `og-svg` PNG endpoint URL로 강제 치환
- 모든 `<meta property="og:image">`는 반드시 PNG URL을 가리킴

## 신규 발행 자동 규칙 (CRD에 박힘)
1. 발행 시 `generate-og-image` 자동 호출 → og_image/thumbnail에 .png URL 저장
2. 만약 호출 실패해도 prerender가 og-svg endpoint(PNG)로 fallback → og:image는 항상 PNG 보장
3. SVG 직접 저장 금지 (Storage에 .svg 파일 새로 만들지 말 것)

## 검증 (v4)
- 발행글 57개 모두 PNG로 일괄 재생성 완료 (2026-04-30)
- 카카오톡 / Facebook 크롤러 UA로 fetch 테스트 → `Content-Type: image/png`, 200 OK
- 한글/영문 혼합 테스트: Google/Naver/Perplexity/AEO 카드 모두 Pretendard로 깨끗하게 렌더 ✓

