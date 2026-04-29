/**
 * 네이버 스마트/브랜드 스토어 URL 감지 유틸.
 * 메인 분석 진입에서 자동 분기, 결과 페이지에서 스토어 전용 섹션 노출 여부 판정에 사용.
 */

export type NaverStoreType = "brand" | "smartstore";

export interface NaverStoreInfo {
  type: NaverStoreType;
  slug: string;
  storeUrl: string;
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}

export function parseNaverStoreUrl(raw: string): NaverStoreInfo | null {
  try {
    const u = new URL(raw);
    const rawSlug = u.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!rawSlug) return null;
    // 한글 슬러그(예: brand.naver.com/뮤지코리아) 디코드 — 표시·비교는 디코드된 값으로
    const slug = safeDecode(rawSlug);
    if (u.hostname === "brand.naver.com") {
      return { type: "brand", slug, storeUrl: `https://brand.naver.com/${encodeURIComponent(slug)}` };
    }
    if (u.hostname === "smartstore.naver.com") {
      return { type: "smartstore", slug, storeUrl: `https://smartstore.naver.com/${encodeURIComponent(slug)}` };
    }
    return null;
  } catch {
    return null;
  }
}

export function isNaverStoreUrl(raw: string): boolean {
  return parseNaverStoreUrl(raw) !== null;
}
