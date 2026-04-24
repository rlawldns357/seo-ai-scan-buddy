/**
 * 가격 문자열에서 숫자만 안전하게 추출.
 * "29,000원" → 29000, "₩1,200,000" → 1200000, "$29.99" → 29.99
 */
export function parsePriceNumber(input: string | null | undefined): number | null {
  if (!input) return null;
  const cleaned = String(input).replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  // 한국식 천단위 콤마 제거
  const normalized = cleaned.includes(".") && cleaned.lastIndexOf(".") > cleaned.lastIndexOf(",")
    ? cleaned.replace(/,/g, "") // 1,234.56 형태
    : cleaned.replace(/,/g, ""); // 29,000 형태
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 원가 대비 할인률 계산. 원가가 판매가보다 크지 않으면 null.
 * @returns 0~99 사이 정수 퍼센트
 */
export function calcDiscountPercent(
  price: string | null | undefined,
  compareAt: string | null | undefined,
): number | null {
  const sale = parsePriceNumber(price);
  const original = parsePriceNumber(compareAt);
  if (!sale || !original || original <= sale) return null;
  const pct = Math.round(((original - sale) / original) * 100);
  return pct >= 1 && pct <= 99 ? pct : null;
}

/**
 * 행사 종료까지 남은 시간을 사람이 읽기 좋은 짧은 문구로.
 * 종료된 경우 null.
 */
export function formatSaleCountdown(endsAt: string | null | undefined): string | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (!Number.isFinite(end)) return null;
  const diff = end - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}일 남음`;
  }
  if (hours >= 1) return `${hours}시간 남음`;
  const mins = Math.max(1, Math.floor(diff / (1000 * 60)));
  return `${mins}분 남음`;
}
