---
name: OG/Thumbnail Rulebook
description: OG=썸네일. **항상 PNG 출력** (카카오톡 호환). 룰북 SVG 빌드 → resvg-wasm + Pretendard ttf로 래스터라이즈. eyebrow는 `회사 · DB카테고리` 강제 동기화
type: design
---

## 출력 형식 (v4 — PNG 강제)

**모든 OG 이미지는 PNG로 발행한다.** SVG 직접 호스팅 금지 (카카오톡 미지원).

해결 (`supabase/functions/_shared/og-png-renderer.ts`):
1. `buildSvgOg`로 룰북 SVG 빌드 (디자인 SSOT)
2. `svgToPng(svg)`로 resvg-wasm 래스터라이즈
3. **Pretendard-Bold.ttf**를 ArrayBuffer로 `fontBuffers` 직접 주입 → 한글 100% 보장
4. `og-images` 버킷에 `.png` 업로드, `og_image`/`thumbnail` 양쪽 저장 (synced)

## 컨셉 (단일 패널 미니멀)
- **단일 패널**: 1200x630 풀 크림/오프화이트 (`brand.panelBg`)
- **그레인 노이즈** + **중앙 라디얼 글로우** + **모서리 마크**
- **워드마크 중앙** (브랜드별 컬러/폰트)
- **위 메타(eyebrow)**: `회사 · {DB카테고리}` (예: `GOOGLE · AEO`)
- **아래 부제**: `tidyTitleForOg(title)` — 정갈 요약 한 줄
- **워터마크**: 중앙 하단 `SEARCHTUNE OS · SEARCHTUNEOS.COM`

## ⚠️ Eyebrow 카테고리 동기화 (v5 핵심 룰)
**eyebrow는 항상 `회사 · {opts.category}` 형태로 DB 카테고리를 강제 사용한다.**

이유: `brand.subtitle`에 하드코딩된 카테고리(예: `"OpenAI · AEO"`, `"Microsoft 검색 · SEO"`)가
DB의 글 카테고리와 어긋날 수 있음. (예: Bing Copilot 글의 DB cat=GEO인데 brand.subtitle은 "Microsoft · SEO")

구현 (`og-design-rulebook.ts` `buildBrandSplitSvg`):
```ts
const companyOnly = brand.subtitle.split("·")[0].trim();
const dbCategory = (opts.category || categoryStyle.label || "GUIDE").trim();
const meta = `${companyOnly} · ${dbCategory}`.toUpperCase();
```

브랜드 카드/컨셉 카드/그라데이션 폴백 모두 DB 카테고리가 단일 진실 소스.

## 3-Tier 폴백
1. **명확 브랜드**: ChatGPT/Claude/Gemini/Perplexity/Wrtn/Google/Naver/Cue:/Clova X/Cafe24/imweb/Bing → 워드마크 카드
2. **카테고리만**: AEO/GEO/SEO → 글자별 그라데이션 컨셉 카드
3. **둘 다 없음**: 가이드/뉴스 → `buildGradientSvg` 풀 그라데이션 폴백 (한글 안전 wrapTitle)

## 그라데이션 폴백 한글 안전 룰 (v5)
`buildGradientSvg`는 한글 글자 폭 측정 함수로 폰트 자동 축소 (76→68→60→52pt).
영문 28자 기준 wrapTitle은 한글에서 우측 잘림 발생 → 절대 사용 금지.

## tidyTitleForOg 룰
- 괄호/콜론 뒤 보조 설명 제거, 연도 prefix 제거, 32자 초과 시 컷+`…`

## 검증 (2026-04-30)
- 발행글 58개 모두 PNG 200 OK · synced (og_image == thumbnail)
- 카테고리 동기화 검증: `회사 · {DB cat}` 일치 100%
- 카카오 디버거: `Content-Type: image/png` + 글별 OG 정상 표시

## Endpoints
- `og-svg` GET `?slug=...&title=...&category=...` — PNG 응답 (Cloudflare 24h 캐시)
- `generate-og-image` POST `{slug,title,category}` — SVG → PNG → Storage → DB 갱신
