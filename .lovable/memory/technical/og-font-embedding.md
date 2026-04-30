---
name: OG SVG → PNG Font Embedding
description: OG는 항상 PNG. resvg-wasm + Pretendard-Bold.ttf ArrayBuffer를 fontBuffers로 직접 주입해서 한글 100% 보장. @font-face/@import 의존 X
type: technical
---

## 결론: PNG 강제 + Pretendard ttf ArrayBuffer 임베드

**SVG 직접 호스팅 금지.** 모든 OG는 PNG로 발행해야 한국 메신저(특히 카카오톡)에서 미리보기가 뜬다.

## 왜 SVG로는 안 됐나

| 플랫폼 | SVG OG 처리 | 결과 |
|---|---|---|
| 카카오톡 | image/svg+xml MIME 거부 | **미리보기 안 뜸** (디버거에서도 옛 placeholder만) |
| Facebook | 자체 서버 SVG→PNG | `@import`/`@font-face` 무시하는 렌더러 多 → 한글 □□ |
| Twitter/X | 자체 서버 SVG→PNG | 동일 |
| Slack | imgproxy로 변환 | 일부 환경에서 fontconfig 누락 → 한글 깨짐 |

## 해결: 서버사이드 PNG 래스터라이즈 + ttf 직접 주입

```ts
// supabase/functions/_shared/og-png-renderer.ts
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

const PRETENDARD_BOLD_TTF =
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative/Pretendard-Bold.ttf";
// Pretendard는 KR+EN 통합 폰트 (단일 ttf로 한글/영문/숫자 전부 커버, 2.6MB)

const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: 1200 },
  font: {
    fontBuffers: [new Uint8Array(pretendardTtfArrayBuffer)],
    loadSystemFonts: false,
    defaultFontFamily: "Pretendard",
  },
});
const png = resvg.render().asPng();
```

핵심:
- **`fontBuffers`로 ArrayBuffer 직접 주입** → resvg가 글리프를 직접 렌더 → @font-face/@import에 의존하지 않음
- **`loadSystemFonts: false`** → Edge 환경에 시스템 폰트 없으니 명시적으로 끄기
- **`defaultFontFamily: "Pretendard"`** → SVG의 font-family 스택을 무시하고 임베드한 폰트로 강제

## CDN 결정 근거
- ✅ `cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative/Pretendard-Bold.ttf` — HTTP 200, CORS `*`, 2.6MB
- ❌ `gh/orioncactus/pretendard@v1.3.9/...` — 일부 raw 경로 403/404
- ❌ resvg-wasm은 woff2 직접 파싱 못함 (ttf/otf만 지원) → 반드시 ttf 미러 사용

## 캐시 전략
- `wasmReady: Promise<void>` 모듈 스코프 캐시 → wasm 초기화 1회만
- `pretendardFontPromise: Promise<ArrayBuffer>` 모듈 스코프 캐시 → ttf fetch 1회만
- 첫 호출 ~3-5초, 이후 200-500ms (cold start 후)

## 적용 범위
- `generate-og-image` POST → 룰북 SVG 빌드 → `svgToPng()` → Storage `.png` 업로드
- `og-svg` GET → 룰북 SVG 빌드 → `svgToPng()` → `Content-Type: image/png` 응답 (Cloudflare 24h 캐시)
- 두 endpoint 모두 동일한 PNG 출력 보장

## 카카오 URL 규칙 (2026-04-30 추가)
- 블로그 canonical/share/og:url/sitemap/internal link는 `/blog/{slug}/index.html` 실물 파일 URL로 통일
- prerender 산출물은 `dist/blog/{slug}/index.html`만 허용
- `/blog/{slug}/`는 Lovable hosting SPA fallback이 기본 `index.html`을 반환해 카카오가 홈 OG를 집을 수 있으므로 공유 URL로 금지
- 확장자 없는 `dist/blog/{slug}` 파일은 Lovable hosting에서 `Content-Type: application/octet-stream`으로 나가 카카오 공유 디버거가 **Invalid URL**로 판정할 수 있으므로 금지

## 검증 (2026-04-30)
- 발행글 57개 일괄 재생성 → DB 검사: `png_count=57, svg_count=0` ✓
- 카카오톡 UA fetch: `Content-Type: image/png`, 200 OK ✓
- Facebook UA fetch: 200 OK, REVALIDATED ✓
- 시각 QA: Google 멀티컬러 / Naver 그린 / Perplexity 검정 워드마크 + 한글 후킹 부제 모두 깨끗 ✓

## SVG 폰트 임베드는 폐기
이전 버전에서 SVG `<style>` 안에 `@import` + `@font-face`로 폰트 주입했지만,
PNG 변환 단계에서 무시되는 케이스가 많아 신뢰 불가. 이제는 resvg에 ArrayBuffer로 직접 주입하는 방식만 신뢰.

SVG의 font-family 스택은 그대로 둬도 무방 (브라우저 직접 미리보기 시에만 사용).

## 주의
- resvg-wasm은 woff2 못 읽음 → **반드시 ttf/otf 미러 사용**
- ttf는 woff2보다 ~3배 무거움 (2.6MB vs 0.9MB) → 모듈 스코프 캐시로 cold start 비용만 감수
- Pretendard 단일 폰트로 디자인 통일 (Inter/Noto 별도 임베드 불필요)

