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

export function parseNaverStoreUrl(raw: string): NaverStoreInfo | null {
  try {
    const u = new URL(raw);
    if (u.hostname === "brand.naver.com") {
      const slug = u.pathname.split("/").filter(Boolean)[0] ?? "";
      if (!slug) return null;
      return { type: "brand", slug, storeUrl: `https://brand.naver.com/${slug}` };
    }
    if (u.hostname === "smartstore.naver.com") {
      const slug = u.pathname.split("/").filter(Boolean)[0] ?? "";
      if (!slug) return null;
      return { type: "smartstore", slug, storeUrl: `https://smartstore.naver.com/${slug}` };
    }
    return null;
  } catch {
    return null;
  }
}

export function isNaverStoreUrl(raw: string): boolean {
  return parseNaverStoreUrl(raw) !== null;
}
