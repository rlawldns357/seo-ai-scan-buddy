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
  const explicit = !!opts.slug && hasExplicitBrand(opts.slug, opts.title);
  if (explicit) {
    return buildBrandSplitSvg(opts);
  }
  return buildGradientSvg(opts);
}

/** 좌측 브랜드 카드 + 우측 메타 분할 OG (1200x630). */
function buildBrandSplitSvg(opts: { title: string; category: string; slug?: string }): string {
  const brand = getBrandStyle(opts.slug || "", opts.title, opts.category);
  const cat = resolveStyle(opts.category);
  const title = (opts.title || "SearchTune OS").trim();
  const lines = wrapTitle(title, 18); // 우측 패널이 좁으므로 짧게

  const titleSvg = lines
    .slice(0, 4)
    .map(
      (line, i) =>
        `<text x="540" y="${230 + i * 70}" font-family="'Pretendard','Noto Sans KR','Apple SD Gothic Neo',-apple-system,BlinkMacSystemFont,sans-serif" font-size="56" font-weight="800" fill="#ffffff" letter-spacing="-1.5">${escXml(
          line,
        )}</text>`,
    )
    .join("\n  ");

  const overflow =
    lines.length > 4
      ? `<text x="540" y="${230 + 4 * 70}" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="28" font-weight="500" fill="rgba(255,255,255,0.6)">${escXml(lines.slice(4).join(" "))}…</text>`
      : "";

  // 좌측 패널 (브랜드 워드마크) - 화이트/라이트 컬러 패널
  // 우측 패널 (메타) - 카테고리 그라데이션
  // 패널 분할: 좌측 480px, 우측 720px
  const wordmarkSvg = renderBrandWordmark(brand, 240, 315); // 좌측 패널 중앙

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="metaBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cat.gradient.from}"/>
      <stop offset="50%" stop-color="${cat.gradient.via ?? cat.gradient.from}"/>
      <stop offset="100%" stop-color="${cat.gradient.to}"/>
    </linearGradient>
    <radialGradient id="metaGlow" cx="80%" cy="20%" r="60%">
      <stop offset="0%" stop-color="${cat.accent}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="${cat.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="metaGrid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Left brand panel -->
  <rect x="0" y="0" width="480" height="630" fill="${brand.panelBg}"/>
  <!-- Subtle inset shadow -->
  <rect x="478" y="0" width="2" height="630" fill="rgba(0,0,0,0.06)"/>
  ${wordmarkSvg}
  <text x="240" y="385" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="20" font-weight="500" fill="rgba(0,0,0,0.5)" text-anchor="middle" letter-spacing="0.5">${escXml(brand.subtitle)}</text>

  <!-- Right meta panel -->
  <rect x="480" y="0" width="720" height="630" fill="url(#metaBg)"/>
  <rect x="480" y="0" width="720" height="630" fill="url(#metaGrid)"/>
  <rect x="480" y="0" width="720" height="630" fill="url(#metaGlow)"/>
  <circle cx="1100" cy="540" r="180" fill="${cat.accent}" opacity="0.08"/>

  <!-- Category badge -->
  <g transform="translate(540, 110)">
    <rect width="160" height="48" rx="24" fill="${cat.badgeBg}"/>
    <text x="80" y="32" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="20" font-weight="700" fill="${cat.badgeFg}" text-anchor="middle">${cat.emoji} ${escXml(cat.label)}</text>
  </g>

  <!-- Title -->
  ${titleSvg}
  ${overflow}

  <!-- SearchTune wordmark bottom-right of meta panel -->
  <g transform="translate(540, 560)">
    <circle cx="10" cy="0" r="10" fill="${cat.accent}"/>
    <text x="30" y="6" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="22" font-weight="700" fill="#ffffff" letter-spacing="-0.5">SearchTune OS</text>
  </g>
  <text x="1140" y="566" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="18" font-weight="500" fill="rgba(255,255,255,0.55)" text-anchor="end">searchtuneos.com</text>
</svg>`;
}

/** 기존 카테고리 풀 그라데이션 SVG (브랜드 미감지 시). */
function buildGradientSvg(opts: { title: string; category: string }): string {
  const style = resolveStyle(opts.category);
  const title = (opts.title || "SearchTune OS").trim();
  const lines = wrapTitle(title, 28);

  const titleSvg = lines
    .slice(0, 3)
    .map(
      (line, i) =>
        `<text x="80" y="${260 + i * 90}" font-family="'Pretendard','Noto Sans KR','Apple SD Gothic Neo',-apple-system,BlinkMacSystemFont,sans-serif" font-size="76" font-weight="800" fill="#ffffff" letter-spacing="-2">${escXml(
          line,
        )}</text>`,
    )
    .join("\n  ");

  const subtitle =
    lines.length > 3
      ? `<text x="80" y="${260 + 3 * 90}" font-family="'Pretendard','Noto Sans KR',sans-serif" font-size="32" font-weight="500" fill="rgba(255,255,255,0.6)">${escXml(lines.slice(3).join(" "))}…</text>`
      : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
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
  const fontSize = brand.wordmark.length > 7 ? 56 : 72;

  // Google 멀티컬러
  if (brand.key === "google" || brand.key === "google-ai-overview") {
    const colors = ["#4285F4", "#EA4335", "#FBBC05", "#4285F4", "#34A853", "#EA4335"];
    const letters = "Google".split("");
    // 글자별 x 오프셋 근사 (모노스페이스 가정)
    const charW = fontSize * 0.55;
    const totalW = charW * letters.length;
    const startX = cx - totalW / 2;
    const letterTags = letters
      .map(
        (ch, i) =>
          `<text x="${startX + i * charW + charW / 2}" y="${cy}" font-family="${brand.fontFamily}" font-size="${fontSize}" font-weight="${brand.fontWeight}" fill="${colors[i]}" text-anchor="middle" letter-spacing="-1">${ch}</text>`,
      )
      .join("");
    return letterTags;
  }

  // 일반 브랜드: 단일 컬러 워드마크
  return `<text x="${cx}" y="${cy}" font-family="${brand.fontFamily}" font-size="${fontSize}" font-weight="${brand.fontWeight}" fill="${brand.color}" text-anchor="middle" letter-spacing="-1.5">${escXml(brand.wordmark)}</text>`;
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
