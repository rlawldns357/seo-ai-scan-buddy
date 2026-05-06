/**
 * SVG → PNG 래스터라이즈 (한글 100% 보장)
 *
 * 왜 PNG로 변환해야 하나:
 *  - **카카오톡**은 OG 이미지로 SVG를 지원하지 않음 → 미리보기 자체가 안 뜸
 *  - **페북/트위터/슬랙**은 SVG → PNG 변환 시 `@import`/`@font-face`를 무시하는 경우가 많음
 *
 * 해결:
 *  1. resvg-wasm으로 서버사이드 래스터라이즈
 *  2. Pretendard ttf를 ArrayBuffer로 직접 fetch해서 fontBuffers로 주입
 *     → @font-face 의존 없이 resvg가 직접 글리프 렌더 → 한글 100% 보장
 *
 * Pretendard는 KR+EN 통합 폰트라 단일 ttf 하나로 한글/영문/숫자 전부 커버됨.
 *
 * 캐시: wasm 모듈 + Pretendard ttf 모두 모듈 스코프에 캐시.
 *      첫 호출만 ~3-5초, 이후는 200-500ms.
 */

import { Resvg, initWasm } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";

let wasmReady: Promise<void> | null = null;
let pretendardFontPromise: Promise<ArrayBuffer> | null = null;
let serifFontPromise: Promise<ArrayBuffer> | null = null;

// jsdelivr가 직접 호스팅하는 Pretendard 1.3.9 ttf (KR+EN 통합, 2.6MB)
// orioncactus/pretendard 공식 npm 패키지 dist 경로
const PRETENDARD_BOLD_TTF =
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative/Pretendard-Bold.ttf";

// Serif 폰트 (Claude/Anthropic 등 Georgia 계열 워드마크용)
// Claude 워드마크는 weight 400 (regular) — Bold 임베드 시 너무 굵게 렌더됨
const SERIF_REGULAR_TTF =
  "https://cdn.jsdelivr.net/fontsource/fonts/lora@latest/latin-400-normal.ttf";

async function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = (async () => {
      const wasmRes = await fetch(
        "https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm",
      );
      if (!wasmRes.ok) throw new Error(`resvg wasm fetch failed: ${wasmRes.status}`);
      await initWasm(await wasmRes.arrayBuffer());
    })();
  }
  return wasmReady;
}

async function ensureFont(): Promise<ArrayBuffer> {
  if (!pretendardFontPromise) {
    pretendardFontPromise = (async () => {
      const res = await fetch(PRETENDARD_BOLD_TTF);
      if (!res.ok) {
        throw new Error(`Pretendard ttf fetch failed: ${res.status}`);
      }
      return await res.arrayBuffer();
    })();
  }
  return pretendardFontPromise;
}

async function ensureSerifFont(): Promise<ArrayBuffer | null> {
  if (!serifFontPromise) {
    serifFontPromise = (async () => {
      const res = await fetch(SERIF_BOLD_TTF);
      if (!res.ok) throw new Error(`Lora ttf fetch failed: ${res.status}`);
      return await res.arrayBuffer();
    })();
  }
  try {
    return await serifFontPromise;
  } catch (e) {
    console.warn("[OG] serif font load failed, falling back to Pretendard:", e);
    serifFontPromise = null;
    return null;
  }
}

/**
 * SVG 문자열을 1200x630 PNG Uint8Array로 변환.
 * Pretendard ttf + Lora(serif) ttf를 임베드해서 한글 + Claude/Georgia 계열 워드마크 모두 안전.
 */
export async function svgToPng(svg: string): Promise<Uint8Array> {
  await ensureWasm();
  const [fontData, serifData] = await Promise.all([ensureFont(), ensureSerifFont()]);

  const fontBuffers = [new Uint8Array(fontData)];
  if (serifData) fontBuffers.push(new Uint8Array(serifData));

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    background: "rgba(255,255,255,1)",
    font: {
      fontBuffers,
      loadSystemFonts: false,
      defaultFontFamily: "Pretendard",
      serifFamily: "Lora",
      sansSerifFamily: "Pretendard",
      monospaceFamily: "Pretendard",
    },
    logLevel: "warn",
  });

  return resvg.render().asPng();
}
