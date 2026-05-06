/**
 * 슬러그/제목/카테고리에서 브랜드를 자동 감지하는 공유 모듈.
 *
 * Frontend (Blog.tsx, BlogPost.tsx) 와 Edge Function 양쪽에서 공통으로 사용된다.
 * (Edge Function 측 사본은 supabase/functions/_shared/brand-matching.ts 에 거울 유지.)
 *
 * 3-tier 폴백 전략:
 *  1. 명확한 브랜드 (ChatGPT, Claude, Naver 등) → 브랜드 워드마크 카드
 *  2. 카테고리만 명확 (AEO/GEO/SEO) → 개념 카드 (큰 키워드 워드마크)
 *  3. 둘 다 없음 → SearchTune OS 폴백 (최후)
 */

export type BrandKey =
  | "chatgpt"
  | "claude"
  | "gemini"
  | "perplexity"
  | "wrtn"
  | "google"
  | "google-ai-overview"
  | "naver"
  | "naver-cue"
  | "cafe24"
  | "imweb"
  | "bing-copilot"
  | "clovax"
  // 개념(컨셉) 카드 — 카테고리 폴백용
  | "aeo"
  | "geo"
  | "seo"
  | "searchtune";

export interface BrandStyle {
  key: BrandKey;
  /** 사용자에게 노출되는 라벨 */
  label: string;
  /** 카드/OG 좌측에 표기될 대표 워드마크 텍스트 */
  wordmark: string;
  /** 워드마크 폰트 family (CSS / SVG 공통) */
  fontFamily: string;
  /** 워드마크 weight (number 권장) */
  fontWeight: number;
  /** 워드마크 컬러 (HEX) */
  color: string;
  /** OG 카드 좌측 패널 배경 (HEX) */
  panelBg: string;
  /** 카테고리 부제 (소문자/한글 가능) */
  subtitle: string;
  /** 'AI' / 'SEARCH' / 'CONCEPT' 등 카테고리 태그 */
  kind: "AI" | "SEARCH" | "PLATFORM" | "BRAND" | "CONCEPT";
}

const PRETENDARD = `'Pretendard','Noto Sans KR','Apple SD Gothic Neo',-apple-system,BlinkMacSystemFont,sans-serif`;
const INTER = `'Inter','Pretendard','Noto Sans KR',sans-serif`;
const POPPINS = `'Poppins','Inter','Pretendard',sans-serif`;
const SERIF = `'Lora',Georgia,'Times New Roman',serif`;

export const BRAND_STYLES: Record<BrandKey, BrandStyle> = {
  chatgpt: {
    key: "chatgpt",
    label: "ChatGPT",
    wordmark: "ChatGPT",
    fontFamily: INTER,
    fontWeight: 600,
    color: "#1A1A1A",
    panelBg: "#F7F7F8",
    subtitle: "OpenAI · AEO",
    kind: "AI",
  },
  claude: {
    key: "claude",
    label: "Claude",
    wordmark: "claude",
    fontFamily: SERIF,
    fontWeight: 400,
    color: "#CC785C",
    panelBg: "#FAF9F5",
    subtitle: "Anthropic · AEO",
    kind: "AI",
  },
  gemini: {
    key: "gemini",
    label: "Gemini",
    wordmark: "Gemini",
    fontFamily: INTER,
    fontWeight: 600,
    color: "#4285F4",
    panelBg: "#F0F6FF",
    subtitle: "Google · AI",
    kind: "AI",
  },
  perplexity: {
    key: "perplexity",
    label: "Perplexity",
    wordmark: "perplexity",
    fontFamily: INTER,
    fontWeight: 500,
    color: "#1B1B1B",
    panelBg: "#F0F4F4",
    subtitle: "Answer Engine · AEO",
    kind: "AI",
  },
  wrtn: {
    key: "wrtn",
    label: "뤼튼 (Wrtn)",
    wordmark: "wrtn.",
    fontFamily: INTER,
    fontWeight: 900,
    color: "#FF6B00",
    panelBg: "#FFF6EE",
    subtitle: "한국 AI 검색 · AEO",
    kind: "AI",
  },
  google: {
    key: "google",
    label: "Google",
    wordmark: "Google",
    fontFamily: POPPINS,
    fontWeight: 600,
    color: "#4285F4",
    panelBg: "#FFFFFF",
    subtitle: "Google · SEO",
    kind: "SEARCH",
  },
  "google-ai-overview": {
    key: "google-ai-overview",
    label: "Google AI Overview",
    wordmark: "Google",
    fontFamily: POPPINS,
    fontWeight: 600,
    color: "#4285F4",
    panelBg: "#F8FBFF",
    subtitle: "AI Overview · GEO",
    kind: "SEARCH",
  },
  naver: {
    key: "naver",
    label: "Naver",
    wordmark: "NAVER",
    fontFamily: PRETENDARD,
    fontWeight: 800,
    color: "#03C75A",
    panelBg: "#F0FBF4",
    subtitle: "한국 검색 · SEO",
    kind: "SEARCH",
  },
  "naver-cue": {
    key: "naver-cue",
    label: "Naver Cue:",
    wordmark: "Cue:",
    fontFamily: PRETENDARD,
    fontWeight: 800,
    color: "#03C75A",
    panelBg: "#F0FBF4",
    subtitle: "Naver AI 검색 · GEO",
    kind: "SEARCH",
  },
  cafe24: {
    key: "cafe24",
    label: "Cafe24",
    wordmark: "cafe24",
    fontFamily: INTER,
    fontWeight: 700,
    color: "#0066BE",
    panelBg: "#F2F8FE",
    subtitle: "쇼핑몰 SEO",
    kind: "PLATFORM",
  },
  imweb: {
    key: "imweb",
    label: "imweb",
    wordmark: "imweb",
    fontFamily: INTER,
    fontWeight: 700,
    color: "#1A1A1A",
    panelBg: "#F7F7F7",
    subtitle: "아임웹 SEO",
    kind: "PLATFORM",
  },
  "bing-copilot": {
    key: "bing-copilot",
    label: "Bing",
    wordmark: "Bing",
    fontFamily: `'Segoe UI','Inter','Pretendard',sans-serif`,
    fontWeight: 600,
    color: "#0078D4",
    panelBg: "#F0F7FE",
    subtitle: "Microsoft 검색 · SEO",
    kind: "SEARCH",
  },
  clovax: {
    key: "clovax",
    label: "Clova X",
    wordmark: "CLOVA X",
    fontFamily: PRETENDARD,
    fontWeight: 800,
    color: "#03C75A",
    panelBg: "#F0FBF4",
    subtitle: "Naver AI · GEO",
    kind: "AI",
  },

  // ─── 개념(컨셉) 카드 — 카테고리 폴백 ──────────────────────────────
  aeo: {
    key: "aeo",
    label: "AEO",
    wordmark: "AEO",
    fontFamily: INTER,
    fontWeight: 900,
    color: "#9A3412", // 따뜻한 앰버 — AEO 카테고리 그라데이션과 매칭
    panelBg: "#FFF7ED",
    subtitle: "Answer Engine Optimization",
    kind: "CONCEPT",
  },
  geo: {
    key: "geo",
    label: "GEO",
    wordmark: "GEO",
    fontFamily: INTER,
    fontWeight: 900,
    color: "#0F766E", // 에메랄드 — GEO 카테고리 그라데이션과 매칭
    panelBg: "#ECFDF5",
    subtitle: "Generative Engine Optimization",
    kind: "CONCEPT",
  },
  seo: {
    key: "seo",
    label: "SEO",
    wordmark: "SEO",
    fontFamily: INTER,
    fontWeight: 900,
    color: "#1E3A8A", // 인디고 — SEO 카테고리 그라데이션과 매칭
    panelBg: "#EFF6FF",
    subtitle: "Search Engine Optimization",
    kind: "CONCEPT",
  },

  searchtune: {
    key: "searchtune",
    label: "SearchTune OS",
    wordmark: "SearchTune",
    fontFamily: PRETENDARD,
    fontWeight: 800,
    color: "#0F172A",
    panelBg: "#F8FAFC",
    subtitle: "SearchTune OS",
    kind: "BRAND",
  },
};

/**
 * 슬러그/제목 기반 결정적 브랜드 감지.
 *
 * 우선순위 (한국 시장 우선):
 *  1. 가장 구체적인 케이스 (AI Overview, Cue:, Clova)
 *  2. 한국 브랜드 (Naver, Cue:, Clova, 뤼튼) — 글로벌보다 위
 *  3. 글로벌 AI/검색 (ChatGPT, Claude, Gemini, Perplexity, Google, Bing)
 *  4. 플랫폼 (Cafe24, imweb)
 *  5. 카테고리 폴백 (AEO/GEO/SEO 개념 카드)
 *  6. SearchTune (최후)
 */
export function detectBrand(slug: string, title?: string, category?: string): BrandKey {
  const s = (slug || "").toLowerCase();
  const t = (title || "").toLowerCase();
  const both = `${s} ${t}`;

  const has = (...needles: string[]) => needles.some((n) => both.includes(n));

  // 1) 가장 구체적인 케이스 먼저
  if (has("ai-overview", "ai overview", "sge")) return "google-ai-overview";
  if (has("cue:", "naver-cue", "네이버 큐", "네이버큐")) return "naver-cue";
  if (has("clova", "클로바")) return "clovax";

  // 2) 한국 브랜드 — 글로벌보다 우선 (한국 시장 타겟)
  if (has("naver", "네이버", "search-advisor", "서치어드바이저")) return "naver";
  if (has("wrtn", "뤼튼")) return "wrtn";

  // 3) 글로벌 AI/검색
  if (has("chatgpt", "searchgpt", "openai")) return "chatgpt";
  if (has("claude", "anthropic", "클로드")) return "claude";
  if (has("gemini", "제미나이", "제미니")) return "gemini";
  if (has("perplexity", "퍼플렉시티")) return "perplexity";
  if (has("bing", "copilot")) return "bing-copilot";
  if (has("google", "search-console", "서치콘솔", "core-web-vitals")) return "google";

  // 4) 플랫폼
  if (has("cafe24", "카페24")) return "cafe24";
  if (has("imweb", "아임웹")) return "imweb";

  // 5) 카테고리 폴백 — 개념 카드 (브랜드보다 키워드가 더 강력)
  const c = (category || "").toUpperCase();
  if (c === "AEO") return "aeo";
  if (c === "GEO") return "geo";
  if (c === "SEO") return "seo";

  // 6) 최후 폴백
  return "searchtune";
}

export function getBrandStyle(slug: string, title?: string, category?: string): BrandStyle {
  return BRAND_STYLES[detectBrand(slug, title, category)];
}

/**
 * 슬러그/제목/카테고리가 의미 있는 카드(브랜드 또는 개념)와 매칭되는지.
 * SearchTune 폴백 외에는 모두 explicit으로 간주 → 워드마크 카드로 렌더.
 */
export function hasExplicitBrand(slug: string, title?: string, category?: string): boolean {
  const key = detectBrand(slug, title, category);
  return key !== "searchtune";
}
