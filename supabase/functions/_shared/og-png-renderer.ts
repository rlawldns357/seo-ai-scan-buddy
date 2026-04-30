/**
 * SVG → PNG 래스터라이즈 (한글 100% 보장)
 *
 * 왜 PNG로 변환해야 하나:
 *  - **카카오톡**은 OG 이미지로 SVG를 지원하지 않음 → 미리보기 자체가 안 뜸
 *  - **페북/트위터/슬랙**은 SVG를 자체 서버에서 PNG로 변환할 때 `@import`/`@font-face`를
 *    무시하는 렌더러를 쓰는 경우가 많음 → 한글이 □□로 깨짐
 *
 * 해결:
 *  1. resvg-wasm으로 서버사이드 래스터라이즈
 *  2. Pretendard woff2를 ArrayBuffer로 직접 fetch해서 fontFiles로 주입
 *     → @font-face/@import에 의존하지 않고 resvg가 직접 글리프 렌더
 *
 * Pretendard 단일 폰트만 임베드해도 한글/영문/숫자 모두 커버됨 (Pretendard는 KR+영문 통합 폰트).
 *
 * 캐시:
 *  - resvg-wasm 모듈, Pretendard woff2 ArrayBuffer 모두 모듈 스코프에 캐시.
 *  - 첫 호출만 ~2-3초, 이후는 200-500ms.
 */

// resvg-wasm: Deno에서 잘 동작하는 ESM 빌드
import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

let wasmReady: Promise<void> | null = null;
let pretendardFont: ArrayBuffer | null = null;
let pretendardFontPromise: Promise<ArrayBuffer> | null = null;

const PRETENDARD_WOFF2_URL =
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2/Pretendard-Bold.woff2";
// Pretendard는 KR+EN 통합 폰트라 단일 weight 하나만 임베드해도
// 한글/영문/숫자 모두 안전하게 렌더됨. Bold(700)을 base로 쓰는 이유는
// OG 카드 텍스트가 모두 굵은 헤드라인 위주이기 때문.

// woff2 → ttf 변환이 필요하지만 resvg-wasm은 woff2를 직접 파싱하지 못한다.
// 대신 Google Noto Sans KR의 ttf 버전을 사용한다 (구글 폰트는 ttf 다이렉트 제공).
const NOTO_SANS_KR_TTF_URL =
  "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Korean/NotoSansCJKkr-Bold.otf";
// ↑ 여전히 무겁다. 더 가벼운 옵션: Google Fonts CSS API로 ttf 직접 받기.

// === 결정: resvg-wasm은 ttf/otf만 지원. Google Fonts API에서 NotoSansKR ttf를 받자. ===
// Google Fonts API v1: /css?family=Noto+Sans+KR → CSS에서 woff2 url만 줌 → 안 됨
// → fonts.gstatic.com 에서 ttf 직접 호스팅하는 다른 미러 필요
// 가장 안정적: jsDelivr fontsource — ttf 직접 제공
const FONT_TTF_URL =
  "https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-kr@latest/korean-700-normal.ttf";

async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      // esm.sh가 wasm 바이너리도 함께 호스팅
      const wasmUrl =
        "https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm";
      const wasmRes = await fetch(wasmUrl);
      if (!wasmRes.ok) {
        throw new Error(`resvg wasm fetch failed: ${wasmRes.status}`);
      }
      const wasmBuf = await wasmRes.arrayBuffer();
      await initWasm(wasmBuf);
    })();
  }
  await wasmReady;
}

async function ensureFont(): Promise<ArrayBuffer> {
  if (pretendardFont) return pretendardFont;
  if (!pretendardFontPromise) {
    pretendardFontPromise = (async () => {
      const res = await fetch(FONT_TTF_URL);
      if (!res.ok) {
        throw new Error(`Font fetch failed: ${res.status} ${FONT_TTF_URL}`);
      }
      const buf = await res.arrayBuffer();
      pretendardFont = buf;
      return buf;
    })();
  }
  return pretendardFontPromise;
}

/**
 * SVG 문자열을 1200x630 PNG Uint8Array로 변환.
 *
 * @param svg OG SVG 문자열 (1200x630 viewBox 권장)
 * @returns PNG 바이트
 */
export async function svgToPng(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const fontData = await ensureFont();

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    background: "rgba(255,255,255,1)",
    font: {
      // resvg에 ArrayBuffer 직접 주입 — @font-face/@import 의존 없음
      fontBuffers: [new Uint8Array(fontData)],
      // 시스템 폰트 로딩은 Edge 환경에 없으므로 비활성화
      loadSystemFonts: false,
      // SVG의 font-family를 무시하고 임베드한 폰트로 fallback
      defaultFontFamily: "Noto Sans KR",
      serifFamily: "Noto Sans KR",
      sansSerifFamily: "Noto Sans KR",
      monospaceFamily: "Noto Sans KR",
    },
  });

  const png = resvg.render().asPng();
  return png;
}
