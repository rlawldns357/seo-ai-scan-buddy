/**
 * 슬러그/제목/카테고리에서 브랜드를 자동 감지하는 공유 모듈.
 *
 * Frontend (Blog.tsx, BlogPost.tsx) 와 Edge Function 양쪽에서 공통으로 사용된다.
 * (Edge Function 측 사본은 supabase/functions/_shared/brand-matching.ts 에 거울 유지.)
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
  /** 'AI' / 'SEARCH' 등 카테고리 태그 */
  kind: "AI" | "SEARCH" | "PLATFORM" | "BRAND";
}

const PRETENDARD = `'Pretendard','Noto Sans KR','Apple SD Gothic Neo',-apple-system,BlinkMacSystemFont,sans-serif`;
const INTER = `'Inter','Pretendard','Noto Sans KR',sans-serif`;
const POPPINS = `'Poppins','Inter','Pretendard',sans-serif`;
const SERIF = `Georgia,'Times New Roman',serif`;

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
    color: "#4285F4", // composite — rendered with multi-color in components
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
    label: "Bing Copilot",
    wordmark: "Copilot",
    fontFamily: INTER,
    fontWeight: 600,
    color: "#0078D4",
    panelBg: "#F0F7FE",
    subtitle: "Microsoft · GEO",
    kind: "AI",
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
 * 우선순위: 더 구체적인 브랜드(예: Cue:, AI Overview)가 일반 브랜드(Naver, Google)보다 먼저.
 */
export function detectBrand(slug: string, title?: string, category?: string): BrandKey {
  const s = (slug || "").toLowerCase();
  const t = (title || "").toLowerCase();
  const both = `${s} ${t}`;

  const has = (...needles: string[]) => needles.some((n) => both.includes(n));

  // 가장 구체적인 케이스 먼저
  if (has("ai-overview", "ai overview", "sge")) return "google-ai-overview";
  if (has("cue:", "naver-cue", "네이버 큐", "네이버큐")) return "naver-cue";
  if (has("clova", "클로바")) return "clovax";
  if (has("bing", "copilot")) return "bing-copilot";

  if (has("chatgpt", "searchgpt", "openai")) return "chatgpt";
  if (has("claude", "anthropic", "클로드")) return "claude";
  if (has("gemini", "제미나이", "제미니")) return "gemini";
  if (has("perplexity", "퍼플렉시티")) return "perplexity";
  if (has("wrtn", "뤼튼")) return "wrtn";

  if (has("cafe24", "카페24")) return "cafe24";
  if (has("imweb", "아임웹")) return "imweb";

  if (has("naver", "네이버", "search-advisor", "서치어드바이저")) return "naver";
  if (has("google", "search-console", "서치콘솔", "core-web-vitals")) return "google";

  // 카테고리 기반 약한 매칭 (브랜드 미스 시 폴백)
  const c = (category || "").toUpperCase();
  if (c === "AEO") return "chatgpt"; // AEO 대표 = ChatGPT
  if (c === "GEO") return "perplexity"; // GEO 대표 = Perplexity

  return "searchtune";
}

export function getBrandStyle(slug: string, title?: string, category?: string): BrandStyle {
  return BRAND_STYLES[detectBrand(slug, title, category)];
}

/** 슬러그가 명확한 브랜드와 매칭되는지 (searchtune 폴백 제외) */
export function hasExplicitBrand(slug: string, title?: string): boolean {
  // 카테고리는 약한 폴백이므로 제외
  const key = detectBrand(slug, title);
  return key !== "searchtune";
}
