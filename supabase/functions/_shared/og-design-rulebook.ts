/**
 * OG/썸네일 디자인 룰북 (그라데이션 모던 톤 + 브랜드 분할 카드)
 *
 * 모든 자동 생성 OG 이미지는 이 룰북을 강제 적용한다.
 * - 브랜드가 명확한 글: 좌측 브랜드 워드마크 카드 + 우측 다크 그라데이션 메타
 * - 그 외: 카테고리별 풀 그라데이션 + 타이틀
 * - 1200x630 (OG/Twitter Card 표준), 썸네일 겸용
 * - 한글 100% 안전 (SVG 폴백)
 */

import { detectBrand, getBrandStyle, hasExplicitBrand, type BrandKey, type BrandStyle } from "./brand-matching.ts";

export type CategoryKey = "SEO" | "AEO" | "GEO" | "가이드" | "뉴스";

export interface CategoryStyle {
  key: CategoryKey;
  label: string;
  emoji: string;
  /** 메인 그라데이션 (좌상→우하) */
  gradient: { from: string; via?: string; to: string };
  /** 텍스트 강조 악센트 */
  accent: string;
  /** 카테고리 배지 배경 */
  badgeBg: string;
  /** 카테고리 배지 텍스트 */
  badgeFg: string;
}

export const CATEGORY_STYLES: Record<CategoryKey, CategoryStyle> = {
  SEO: {
    key: "SEO",
    label: "SEO",
    emoji: "🔍",
    gradient: { from: "#0f172a", via: "#1e3a8a", to: "#312e81" },
    accent: "#60a5fa",
    badgeBg: "rgba(99,102,241,0.20)",
    badgeFg: "#a5b4fc",
  },
  AEO: {
    key: "AEO",
    label: "AEO",
    emoji: "🤖",
    gradient: { from: "#0c0a09", via: "#7c2d12", to: "#9a3412" },
    accent: "#fbbf24",
    badgeBg: "rgba(251,191,36,0.18)",
    badgeFg: "#fde68a",
  },
  GEO: {
    key: "GEO",
    label: "GEO",
    emoji: "🌐",
    gradient: { from: "#022c22", via: "#065f46", to: "#0f766e" },
    accent: "#34d399",
    badgeBg: "rgba(52,211,153,0.18)",
    badgeFg: "#a7f3d0",
  },
  가이드: {
    key: "가이드",
    label: "GUIDE",
    emoji: "📘",
    gradient: { from: "#1e1b4b", via: "#312e81", to: "#1e3a8a" },
    accent: "#93c5fd",
    badgeBg: "rgba(147,197,253,0.18)",
    badgeFg: "#bfdbfe",
  },
  뉴스: {
    key: "뉴스",
    label: "NEWS",
    emoji: "📰",
    gradient: { from: "#1c0b1f", via: "#581c87", to: "#7e22ce" },
    accent: "#e9d5ff",
    badgeBg: "rgba(216,180,254,0.18)",
    badgeFg: "#f3e8ff",
  },
};

export function resolveStyle(category: string | null | undefined): CategoryStyle {
  if (!category) return CATEGORY_STYLES["가이드"];
  const key = category as CategoryKey;
  return CATEGORY_STYLES[key] || CATEGORY_STYLES["가이드"];
}

/**
 * AI 모델용 디자인 프롬프트 (그라데이션 모던 일관성 강제).
 * 한글 텍스트는 SVG 폴백에서 안전하게 렌더하므로,
 * AI에는 "텍스트 없는 추상 아트워크"만 시키는 게 안전한 전략.
 *
 * 단, 풀패키지 모드에서는 AI에게도 텍스트를 요구하되,
 * 폴백 비율을 높여 한글 깨짐 시 자동 SVG 전환되도록 한다.
 */
export function buildAiOgPrompt(opts: { title: string; category: string }): string {
  const style = resolveStyle(opts.category);
  const safeTitle = opts.title.length > 38 ? opts.title.slice(0, 38) + "…" : opts.title;
  return [
    `Create a premium 1200x630 OG/social card for a Korean tech blog.`,
    ``,
    `BRAND: SearchTune OS — modern, gradient, minimalist tech aesthetic (think Vercel/Linear/Stripe blog cards).`,
    ``,
    `STYLE — STRICT:`,
    `- Background: rich smooth gradient from ${style.gradient.from} via ${style.gradient.via ?? style.gradient.from} to ${style.gradient.to}, with a subtle radial glow in ${style.accent} at top-left.`,
    `- Foreground: soft glassmorphism, faint geometric grid (8% opacity), tasteful blurred orb shapes.`,
    `- NO photos, NO illustrations of people/objects, NO clipart. Only typography + abstract shapes + light effects.`,
    ``,
    `LAYOUT:`,
    `- Top-left: small pill badge "${style.label} ${style.emoji}" with translucent ${style.accent} background, white text.`,
    `- Center-left: large bold Korean title "${safeTitle}" in white. Korean must render perfectly — use Pretendard / Noto Sans KR style. Max 3 lines, generous line-height.`,
    `- Bottom-left: thin "SearchTune OS" wordmark in ${style.accent}.`,
    `- Bottom-right: tiny "searchtuneos.com" URL in white 40% opacity.`,
    ``,
    `QUALITY:`,
    `- Premium, professional, calm. NOT busy.`,
    `- Korean text MUST be perfectly legible — no garbled characters.`,
    `- High contrast: white text on dark gradient.`,
    `- Looks like a top-tier SaaS company blog card.`,
  ].join("\n");
}

/**
 * 한글 100% 안전 SVG OG 이미지 (브랜드 자동 감지).
 *
 * 슬러그/제목에서 명확한 브랜드(ChatGPT/Claude/Naver/Google 등)가 감지되면
 * 좌측 브랜드 워드마크 카드 + 우측 다크 그라데이션 메타 분할 레이아웃으로 렌더한다.
 * 그 외에는 기존 카테고리 그라데이션 레이아웃으로 폴백.
 *
 * `slug` 미지정 시 카테고리 기반 폴백.
 */
export function buildSvgOg(opts: { title: string; category: string; slug?: string }): string {
  // /blog9 카드와 동일한 미니멀 룩으로 통일: 항상 buildBrandSplitSvg.
  // (SearchTune 폴백도 워드마크+부제 레이아웃으로 렌더)
  return buildBrandSplitSvg(opts);
}

/**
 * 모든 OG SVG에 주입하는 폰트 임베드 블록.
 *
 * 왜 필요한가:
 *  - SVG `font-family="'Pretendard',...'Noto Sans KR'"` 만으로는
 *    카톡/페북/트위터/슬랙 같은 외부 OG 렌더러가 시스템에 해당 폰트가 없을 때 한글이 깨진다.
 *  - SVG `<style>` 안에 `@import` 를 넣으면 SVG를 PNG로 래스터라이즈하는 서버
 *    (예: linkpreview, slack-imgproxy)들이 fetch해서 사용 가능.
 *  - 브라우저(<img src=...svg>)도 원격 폰트 fetch하므로 사이트 안에서도 일관됨.
 *
 * 폰트 선택:
 *  - Pretendard: jsdelivr CDN의 woff2 (한국어 표준)
 *  - Noto Sans KR: Google Fonts (가장 널리 쓰이는 한국어 웹폰트, 보편적 폴백)
 *  - Inter: Google Fonts (영문 brand-clean)
 *
 * 모든 buildSvgOg 산출물에 무조건 prepend.
 */
const FONT_EMBED = `<defs>
    <style type="text/css"><![CDATA[
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap');
      @font-face {
        font-family: 'Pretendard';
        font-weight: 400 900;
        font-display: swap;
        src: url('https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/woff2/PretendardVariable.woff2') format('woff2-variations');
      }
    ]]></style>
  </defs>`;

/**
 * 제목을 OG 부제용으로 "정갈하게" 요약.
 * - 콜론/대시 뒤 보조 설명 제거: "Q&A 4단계 전략 (AEO 최적화)" → "Q&A 4단계 전략"
 * - 괄호 안 부가 설명 제거
 * - 연도 prefix 제거: "2026년 ..." → "..." (이미 OG에 연도 노출은 식상)
 * - 너무 길면 단어 경계로 자르고 … 추가
 * - 최종 한 줄 (max 32자) 권장
 */
function tidyTitleForOg(rawTitle: string): string {
  let t = (rawTitle || "").trim();
  // 괄호 안 보조 설명 제거 (한/영 괄호 모두)
  t = t.replace(/\s*[(（][^)）]*[)）]\s*/g, " ").trim();
  // 콜론/대시/세미콜론 뒤 보조 설명 잘라내기 (앞부분이 충분히 길 때만)
  const splitMatch = t.match(/^(.+?)\s*[:：\-—–|]\s*(.+)$/);
  if (splitMatch && splitMatch[1].length >= 8) {
    t = splitMatch[1].trim();
  }
  // 연도 prefix 제거
  t = t.replace(/^20\d{2}년\s*/, "").trim();
  // 길이 제한
  const MAX = 32;
  if (t.length > MAX) {
    const sliced = t.slice(0, MAX);
    // 마지막 공백에서 자르기 (한글은 공백 적으니 그냥 컷)
    const lastSpace = sliced.lastIndexOf(" ");
    t = (lastSpace > MAX * 0.6 ? sliced.slice(0, lastSpace) : sliced).trim() + "…";
  }
  return t;
}

/**
 * 미니멀 워드마크 OG (1200x630) — /blog9 카드와 동일 미학.
 *
 * 룰:
 *  - 배경: brand.panelBg 단일 컬러 (크림/오프화이트). 크롬 없음.
 *  - 중앙: renderBrandWordmark (AEO/GEO/SEO 3-stop 그라데이션, Google 멀티컬러,
 *    Bing 그라데이션, 나머지 단일 컬러).
 *  - 워드마크 아래: brand.subtitle을 UPPERCASE tracking-wide muted 로.
 *    (SearchTune 폴백은 `OS · {category}`로 오버라이드하여 blog9의 SearchTuneBadge 매칭)
 *  - 하단: 아주 작은 SearchTune OS 워터마크 (opacity 0.3).
 */
function buildBrandSplitSvg(opts: { title: string; category: string; slug?: string }): string {
  const brand = getBrandStyle(opts.slug || "", opts.title, opts.category);

  // 워드마크는 시각 중심을 살짝 위로 (cy=305) — 부제와 워터마크 사이 균형
  const cx = 600;
  const cy = 320;
  const wordmarkSvg = renderBrandWordmark(brand, cx, cy);

  // 부제: SearchTune 폴백이면 blog9 SearchTuneBadge와 동일하게 `OS · {category}` 사용
  const rawSubtitle = brand.key === "searchtune"
    ? `OS · ${(opts.category || "SEO").trim()}`
    : brand.subtitle;
  const subtitleText = rawSubtitle.toUpperCase();
  // 길이 기반 letter-spacing / fontSize 폴백 (가용 폭 1040px 유지)
  const subtitleLong = subtitleText.length > 26;
  const subtitleFontSize = subtitleLong ? 20 : 24;
  const subtitleLetterSpacing = subtitleLong ? 4 : 6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${FONT_EMBED}

  <!-- 단일 패널 배경 (브랜드별 크림/오프화이트) -->
  <rect width="1200" height="630" fill="${brand.panelBg}"/>

  <!-- 워드마크 (정중앙 약간 위) -->
  ${wordmarkSvg}

  <!-- 부제: UPPERCASE tracking-wide muted (blog9 카드 하단 라인과 매칭) -->
  <text x="${cx}" y="430" font-family="'Inter','Pretendard','Noto Sans KR',sans-serif" font-size="${subtitleFontSize}" font-weight="700" fill="rgba(0,0,0,0.55)" text-anchor="middle" letter-spacing="${subtitleLetterSpacing}">${escXml(subtitleText)}</text>

  <!-- 하단 워터마크 (소셜 공유용 서명, 아주 작게) -->
  <text x="${cx}" y="580" font-family="'Inter','Pretendard','Noto Sans KR',sans-serif" font-size="12" font-weight="700" fill="rgba(0,0,0,0.30)" text-anchor="middle" letter-spacing="3">SEARCHTUNE OS · SEARCHTUNEOS.COM</text>
</svg>`;
}

/** 기존 카테고리 풀 그라데이션 SVG (브랜드 미감지 시). */
function buildGradientSvg(opts: { title: string; category: string }): string {
  const style = resolveStyle(opts.category);
  // 부제 룰북 적용 (괄호/연도/콜론 뒤 정리) → 우측 잘림 1차 방지
  const title = tidyTitleForOg(opts.title || "SearchTune OS");

  // 가용 폭: 좌우 패딩 80px씩 = 1040px
  // Pretendard 한글은 fontSize * 1.0 폭으로 잡으면 안전 (영문/숫자는 더 좁음)
  // 64pt: 한 줄 ~16자, 56pt: ~18자, 48pt: ~21자
  const PADDING_X = 80;
  const MAX_W = 1200 - PADDING_X * 2;

  // 한글/영문 혼합 글자 폭 추정 (한글=1, 영문/숫자=0.55, 공백=0.4)
  const measure = (s: string, fs: number): number => {
    let w = 0;
    for (const ch of s) {
      if (/[\uAC00-\uD7AF\u3130-\u318F]/.test(ch)) w += fs * 1.0;
      else if (ch === " ") w += fs * 0.4;
      else w += fs * 0.55;
    }
    return w;
  };

  // 폰트 사이즈 자동 축소 (76 → 64 → 56 → 48)
  const sizes = [76, 68, 60, 52];
  let fontSize = 52;
  let lines: string[] = [];
  for (const fs of sizes) {
    // 해당 fs에서 안전하게 들어갈 글자 수 = MAX_W / (fs * 1.0)
    const maxChars = Math.floor(MAX_W / (fs * 1.0));
    const candidate = wrapTitle(title, maxChars);
    // 모든 줄이 실제로 폭 안에 들어가는지 확인
    const allFit = candidate.every((ln) => measure(ln, fs) <= MAX_W);
    if (allFit && candidate.length <= 3) {
      fontSize = fs;
      lines = candidate;
      break;
    }
    if (fs === 52) {
      // 마지막 폴백 — 강제로 자름
      fontSize = fs;
      lines = candidate.slice(0, 3);
    }
  }

  const lineGap = Math.round(fontSize * 1.18);
  // 수직 중앙 정렬: 카드 중앙 y=315, 줄 수에 따라 시작 y 조정
  const totalH = lines.length * lineGap;
  const startY = Math.round(315 - totalH / 2 + fontSize * 0.85);

  const titleSvg = lines
    .map(
      (line, i) =>
        `<text x="${PADDING_X}" y="${startY + i * lineGap}" font-family="'Pretendard','Noto Sans KR','Apple SD Gothic Neo',-apple-system,BlinkMacSystemFont,sans-serif" font-size="${fontSize}" font-weight="800" fill="#ffffff" letter-spacing="-2">${escXml(
          line,
        )}</text>`,
    )
    .join("\n  ");

  const subtitle = "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  ${FONT_EMBED}
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${style.gradient.from}"/>
      <stop offset="50%" stop-color="${style.gradient.via ?? style.gradient.from}"/>
      <stop offset="100%" stop-color="${style.gradient.to}"/>
    </linearGradient>
    <radialGradient id="glow" cx="15%" cy="15%" r="50%">
      <stop offset="0%" stop-color="${style.accent}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${style.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <circle cx="1080" cy="540" r="220" fill="${style.accent}" opacity="0.08"/>
  <circle cx="980" cy="120" r="120" fill="${style.accent}" opacity="0.06"/>

  <g transform="translate(80, 90)">
    <rect width="180" height="56" rx="28" fill="${style.badgeBg}"/>
    <text x="90" y="38" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="24" font-weight="700" fill="${style.badgeFg}" text-anchor="middle">${style.emoji} ${escXml(style.label)}</text>
  </g>

  ${titleSvg}
  ${subtitle}

  <g transform="translate(80, 560)">
    <circle cx="14" cy="0" r="14" fill="${style.accent}"/>
    <text x="40" y="8" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="28" font-weight="700" fill="#ffffff" letter-spacing="-0.5">SearchTune OS</text>
  </g>
  <text x="1120" y="568" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="22" font-weight="500" fill="rgba(255,255,255,0.55)" text-anchor="end">searchtuneos.com</text>
</svg>`;
}

/**
 * 브랜드별 워드마크 SVG 렌더링.
 * Google 같은 멀티컬러 브랜드는 글자별 컬러 처리.
 * (cx, cy) 는 워드마크 중심점.
 */
function renderBrandWordmark(brand: BrandStyle, cx: number, cy: number): string {
  // 개념 카드 (AEO/GEO/SEO) — 글자별 그라데이션, 크게
  if (brand.key === "aeo" || brand.key === "geo" || brand.key === "seo") {
    const stops: Record<"aeo" | "geo" | "seo", [string, string, string]> = {
      aeo: ["#f59e0b", "#d97706", "#b45309"],
      geo: ["#10b981", "#059669", "#047857"],
      seo: ["#3b82f6", "#2563eb", "#1d4ed8"],
    };
    const colors = stops[brand.key];
    const letters = brand.wordmark.split("");
    const fontSize = 180;
    const charW = fontSize * 0.62;
    const totalW = charW * letters.length;
    const startX = cx - totalW / 2;
    return letters
      .map(
        (ch, i) =>
          `<text x="${startX + i * charW + charW / 2}" y="${cy}" font-family="${brand.fontFamily}" font-size="${fontSize}" font-weight="900" fill="${colors[i] ?? colors[colors.length - 1]}" text-anchor="middle" letter-spacing="-5">${escXml(ch)}</text>`,
      )
      .join("");
  }

  // Bing — Microsoft 시그니처 블루→사이언 그라데이션
  if (brand.key === "bing-copilot") {
    const fontSize = 220;
    return `
      <defs>
        <linearGradient id="bingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0078D4"/>
          <stop offset="100%" stop-color="#00B7C3"/>
        </linearGradient>
      </defs>
      <text x="${cx}" y="${cy}" font-family="${brand.fontFamily}" font-size="${fontSize}" font-weight="700" fill="url(#bingGrad)" text-anchor="middle" letter-spacing="-6">${escXml(brand.wordmark)}</text>
    `;
  }

  // 일반 브랜드 — 워드마크 길이에 따라 사이즈 조정 (전체적으로 +20)
  const fontSize = brand.wordmark.length > 8 ? 140 : brand.wordmark.length > 5 ? 160 : 190;

  // Google 멀티컬러
  if (brand.key === "google" || brand.key === "google-ai-overview") {
    const colors = ["#4285F4", "#EA4335", "#FBBC05", "#4285F4", "#34A853", "#EA4335"];
    const letters = "Google".split("");
    const charW = fontSize * 0.55;
    const totalW = charW * letters.length;
    const startX = cx - totalW / 2;
    return letters
      .map(
        (ch, i) =>
          `<text x="${startX + i * charW + charW / 2}" y="${cy}" font-family="${brand.fontFamily}" font-size="${fontSize}" font-weight="${brand.fontWeight}" fill="${colors[i]}" text-anchor="middle" letter-spacing="-2">${ch}</text>`,
      )
      .join("");
  }

  // 일반 브랜드: 단일 컬러 워드마크
  return `<text x="${cx}" y="${cy}" font-family="${brand.fontFamily}" font-size="${fontSize}" font-weight="${brand.fontWeight}" fill="${brand.color}" text-anchor="middle" letter-spacing="-3">${escXml(brand.wordmark)}</text>`;
}

function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapTitle(text: string, maxLen: number): string[] {
  const words = text.split(/(\s+)/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current + w).length > maxLen && current.trim().length > 0) {
      lines.push(current.trim());
      current = w.trimStart();
    } else {
      current += w;
    }
  }
  if (current.trim()) lines.push(current.trim());
  // 한글에는 공백이 적어 한 단어가 길 수 있음 → 강제 분할
  const out: string[] = [];
  for (const ln of lines) {
    if (ln.length <= maxLen) {
      out.push(ln);
    } else {
      for (let i = 0; i < ln.length; i += maxLen) {
        out.push(ln.slice(i, i + maxLen));
      }
    }
  }
  return out;
}
