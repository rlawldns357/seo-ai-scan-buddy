// VIP 브랜드 식별 헬퍼.
// - GrowthBridge: 화이트리스트 IP (서버에서 판단 → rateLimit.whitelisted)
// - ProgressMedia: @my-progress.co.kr 이메일로 1회 이상 제출한 사용자 (localStorage)

export type VipBrand = "growthbridge" | "progressmedia";

const KEY = "vip_brand";
const EVENT = "vip-brand-change";

export const BRAND_LABEL: Record<VipBrand, string> = {
  growthbridge: "GrowthBridge",
  progressmedia: "ProgressMedia",
};

export function getStoredVipBrand(): VipBrand | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(KEY);
    return v === "growthbridge" || v === "progressmedia" ? v : null;
  } catch {
    return null;
  }
}

export function setStoredVipBrand(brand: VipBrand) {
  try {
    localStorage.setItem(KEY, brand);
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

/** 이메일 도메인 기반 브랜드 감지. 새 도메인은 여기 추가. */
export function detectBrandFromEmail(email: string): VipBrand | null {
  const lower = email.trim().toLowerCase();
  if (lower.endsWith("@my-progress.co.kr")) return "progressmedia";
  return null;
}

/** 제출 시 브랜드 매칭되면 저장. 호출부에서 손쉽게 쓰는 단축. */
export function maybeMarkBrandFromEmail(email: string) {
  const brand = detectBrandFromEmail(email);
  if (brand) setStoredVipBrand(brand);
}

export function subscribeVipBrand(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
