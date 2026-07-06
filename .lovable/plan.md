# 조사 결과: 이미 절반은 통합되어 있음

`/blog9` 목록 카드와 인블로그로 보내는 OG 이미지는 **이미 동일한 브랜드 규칙 데이터**(`BRAND_STYLES` / `detectBrand` / `hasExplicitBrand`)를 공유합니다. 파일이 두 벌 있지만 서로의 미러:

- 프론트: `src/lib/brandMatching.ts` — Blog.tsx의 `CardVisual` → `BrandWordmark` / `SearchTuneBadge`가 사용
- 엣지: `supabase/functions/_shared/brand-matching.ts` (거울) — `og-design-rulebook.ts` → `buildBrandSplitSvg` → `renderBrandWordmark`가 사용
- OG 생성 진입점: `supabase/functions/generate-og-image/index.ts` (SVG → resvg-wasm PNG → `og-images` 버킷 → blog_posts.og_image + thumbnail 동시 업데이트)

즉 **큰 워드마크 + 부제 + 배경색 + 카테고리별 그라데이션(AEO/GEO/SEO)** 은 이미 OG PNG에도 그대로 그려지고 있습니다. 실제 DB의 og_image URL도 전부 `og-images/{uuid}.png` 형태로 SVG 렌더 산출물입니다.

## 1) blog9 카드의 정체 (a: 순수 CSS 컴포넌트)

이미지 파일이 아닙니다. `src/pages/Blog.tsx`의 `CardVisual` 컴포넌트가 브랜드 감지 결과에 따라 HTML+CSS로 즉시 그립니다:

- `hasExplicitBrand(slug, title, category)` true → `BrandWordmark`
  - AEO/GEO/SEO 개념 카드: 3-stop 그라데이션 letter별 컬러 (`aeo: #f59e0b→#d97706→#b45309`, `geo: #10b981→#059669→#047857`, `seo: #3b82f6→#2563eb→#1d4ed8`) + uppercase muted 부제
  - Google: 멀티컬러 letter (`#4285F4/#EA4335/#FBBC05/#4285F4/#34A853/#EA4335`)
  - Bing: `linear-gradient(135deg,#0078D4,#00B7C3)` text-clip
  - ChatGPT×Gemini 비교글: 두 워드마크 나란히 + "VS"
  - 그 외: 단일 컬러 워드마크 + 부제
- false → `SearchTuneBadge`: primary→accent 그라데이션 "SearchTune" + `OS · {category}`

배경은 카드 컨테이너의 `style.background = brand.panelBg` (예: ChatGPT `#F7F7F8`, Claude `#FAF9F5`, Cue: `#F0FBF4`).

**큰 타이포에 들어가는 값** = `BRAND_STYLES[key].wordmark` (예: "ChatGPT", "GEO", "Cue:", "CLOVA X").
**작은 부제** = `BRAND_STYLES[key].subtitle` (예: "OpenAI · AEO", "Generative Engine Optimization", "Naver AI 검색 · GEO"). uppercase + tracking-widest.
**결정 로직** = 슬러그/제목 substring 매칭 + 카테고리 폴백 (`detectBrand`).

## 2) 현재 OG 생성 코드

`supabase/functions/_shared/og-design-rulebook.ts` → `buildSvgOg` → 브랜드 감지되면 `buildBrandSplitSvg`, 아니면 그라데이션 폴백. `buildBrandSplitSvg`가 그리는 것:

- 배경: `brand.panelBg` 단일 컬러 ✅ (blog9와 동일)
- 중앙 워드마크: `renderBrandWordmark` — AEO/GEO/SEO 3-stop 그라데이션, Google 멀티컬러, Bing 그라데이션, 나머지 단일 컬러 ✅ (blog9와 동일 색상/폰트 규칙)
- **추가 요소 (blog9에는 없는 크롬)**:
  - 상단 eyebrow `"COMPANY · CATEGORY"` (letter-spacing 6, tracking wide) — line 286
  - eyebrow 아래 카테고리 점 — line 289
  - 좌우 액센트 바 (h=140, 카테고리 컬러) — lines 270-271
  - 4코너 프레임 마크 — lines 273-283
  - 중앙 라디얼 글로우 + 그레인 노이즈 + 비네팅 — lines 248-267
  - 워드마크 아래 제목 요약 2줄 (Pretendard 800, `tidyTitleForOg` 처리) — lines 226-236, 294
  - 하단 워터마크 `SEARCHTUNE OS · SEARCHTUNEOS.COM` — line 298

blog9에는 이 크롬이 하나도 없습니다. 단순히 `panelBg` 위 워드마크 + 소문자 부제 두 줄뿐.

## 3) 입력 데이터

blog9 카드도, OG SVG도 **동일한 3개 입력**만 사용: `slug`, `title`, `category`. 나머지는 전부 `BRAND_STYLES`에서 파생됩니다. `og_image` 필드는 저장된 PNG의 public URL이고, blog9는 이 필드를 아예 안 씁니다 (SELECT 리스트에도 없음: line 336에 `thumbnail`만 있음).

`OG SVG의 부제`만 blog9와 다른 소스에서 옵니다:
- blog9 부제 = `brand.subtitle` (예: "Generative Engine Optimization")
- OG SVG 부제 = `tidyTitleForOg(title)` 랩된 2줄 (긴 제목 요약)

---

# 계획: OG를 blog9와 동일한 미니멀 룩으로 정렬

## 목표
`buildBrandSplitSvg`를 blog9의 `CardVisual` 미학과 정확히 맞춥니다: 크림 배경 위에 큰 워드마크와 작은 대문자 부제만. 제목 텍스트, 코너 마크, 액센트 바, eyebrow 라인은 제거하거나 하나로 통합.

## 변경 파일 (1개만)
- `supabase/functions/_shared/og-design-rulebook.ts`의 `buildBrandSplitSvg` 함수 리팩터링. 다른 파일·프론트·DB 스키마 변화 없음.

## 새 레이아웃 (1200×630)

```
+------------------------------------------+
|                                          |
|              [워드마크]                    |  ← cy≈300, font-size 190/160/140
|                                          |     (blog9와 동일 로직: renderBrandWordmark 재사용)
|         SMALL UPPERCASE SUBTITLE          |  ← y≈400, 20pt, tracking 8, muted
|                                          |
|                                          |
|     SEARCHTUNE OS · SEARCHTUNEOS.COM      |  ← y≈580, 12pt, opacity 0.3
+------------------------------------------+
```

## 세부 규칙

1. **배경**: `brand.panelBg` 단일 fill만. `centerGlow`/`grain`/`vignette`/`corner marks`/`accent bars` 전부 제거.
2. **워드마크**: 기존 `renderBrandWordmark(brand, 600, 300)` 그대로 (AEO/GEO/SEO 3-stop 그라데이션 · Google 멀티컬러 · Bing 그라데이션 · 나머지 단일 컬러). blog9와 동일 규칙 이미 구현되어 있음.
3. **부제 라인 (핵심 정렬 포인트)**: `brand.subtitle`을 **uppercase**로 그리기 (예: "OPENAI · AEO", "GENERATIVE ENGINE OPTIMIZATION", "NAVER AI 검색 · GEO"). blog9의 `text-[10px] font-medium tracking-wider uppercase text-muted-foreground`에 대응:
   - font-family: `'Inter','Pretendard','Noto Sans KR',sans-serif`
   - font-size: 22 (짧을 때) / 18 (긴 경우), font-weight 700, `letter-spacing="6"`, fill `rgba(0,0,0,0.55)`, text-anchor middle
   - y ≈ 400 (워드마크 baseline 아래 100px)
   - `tidyTitleForOg`/`wrapTitle` 및 제목 2줄 렌더 코드 제거. eyebrow "COMPANY · CATEGORY" 라인도 제거 (부제가 이미 그 역할을 대체하므로 중복).
4. **워터마크**: 유지하되 위치 조정 (y=580, letter-spacing 3, opacity 0.30, 12pt). blog9는 워터마크 없지만 OG는 공유 매체용이라 SearchTune OS 서명을 남깁니다 — 유저가 원하면 제거 가능한 옵션.
5. **폴백 (`hasExplicitBrand=false` = SearchTune 폴백)**: 현재 `buildGradientSvg`로 분기됨. blog9와 대응시키려면 `buildBrandSplitSvg`에 `searchtune` 케이스도 통합해 위 레이아웃 그대로(워드마크="SearchTune", 부제=`OS · {category}` uppercase)로 렌더. 이 부분은 `buildSvgOg`의 분기 조건도 손봐야 함 (`hasExplicitBrand` 체크 유지하되 searchtune 폴백을 gradient 대신 split로).

## Blog9 쪽 변경? — **없음**
사용자 설명("blog9가 예쁘다")에 따라 blog9를 진실 소스로 삼음. 프론트 코드 무수정.

## 새 OG 이미지 재생성 흐름
1. 코드 배포 후, 관리자 `BlogManager`의 "OG 재생성" 액션 또는 `regenerate-og-image` 트리거로 기존 141편 재렌더 (SVG→PNG→og-images 업로드→blog_posts.og_image/thumbnail 갱신).
2. 이후 인블로그 재동기화 트리거 (`publish-to-inblog`)를 몇 편 샘플로 돌려 인블로그 측 대표 이미지가 새 PNG를 가리키는지 확인.

## 검증
1. 배포 후 dry-run: `generate-og-image` 함수를 slug=`chatgpt-citation-structure-tables-lists-20260705`로 호출 → 반환된 PNG URL 직접 접근해서 blog9의 해당 카드 스크린샷과 나란히 비교.
2. GEO 대표 (`naver-cue-terminated-ai-briefing-strategy-20260701`), SEO 대표 (`sitemap-optimization-strategy-for-ai-search-20260704`), SearchTune 폴백(브랜드 미매칭) 1편 각각 눈으로 확인.
3. Kakao 디버거/OG 리프레시로 인블로그 URL 미리보기 재캐싱까지 확인.

## 기술 노트
- 워드마크 y=300, 부제 y=400 조합에서 AEO/GEO/SEO는 fontSize=190 → baseline shift 필요 없음 (기존 cy=338 근처). 렌더 결과가 시각적으로 정중앙이 되도록 워드마크 cy를 300~320 사이로 미세 조정 예정.
- 부제가 긴 브랜드 (예: "GENERATIVE ENGINE OPTIMIZATION" 32자, letter-spacing 6 포함) 폭 확인 필요 → 폭 초과 시 letter-spacing 4로 하향 + fontSize 20으로 축소하는 fallback.
- 다국어 부제 (Cue의 "NAVER AI 검색 · GEO")는 한글 포함이라 Pretendard 폰트 병기(`'Inter','Pretendard','Noto Sans KR'`). 이미 FONT_EMBED에 Pretendard ttf가 임베드됨.

## 열린 질문 (플랜 확정 전 확인)
1. **워터마크 유지 여부**: blog9에는 없지만 인블로그 OG는 소셜 매체 노출이라 브랜드 서명이 있는 편이 유리. 유지/제거 어느 쪽?
2. **기존 141편 재생성 범위**: 전부 vs 최신 30편만 vs 카테고리 대표 몇 편 dry-run 후 결정?
3. **재생성 후 인블로그 재동기화**: 자동으로 함께 트리거 vs 사용자 확인 후 별도 실행?
