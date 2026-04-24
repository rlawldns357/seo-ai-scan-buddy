/**
 * 제품 URL에서 추적·세션 파라미터를 제거해 깔끔한 표준 URL을 만든다.
 * - utm_*, gclid, fbclid, gad_*, gbraid, wbraid, mc_*, _ga, yclid, msclkid, ref, ref_src 제거
 * - 빈 query는 통째로 제거
 * - 끝의 # 빈 fragment 제거
 * - 잘못된 URL이면 원본 trim 값 반환
 */
const TRACKING_PARAM_PATTERNS: RegExp[] = [
  /^utm_/i,
  /^gad_/i,
  /^gclid$/i,
  /^gbraid$/i,
  /^wbraid$/i,
  /^fbclid$/i,
  /^msclkid$/i,
  /^yclid$/i,
  /^_ga$/i,
  /^mc_/i,
  /^ref$/i,
  /^ref_src$/i,
  /^ref_url$/i,
  /^src$/i,
  /^source$/i,
  /^trk$/i,
  /^trkid$/i,
  /^spm$/i,
  /^_branch_match_id$/i,
  /^igshid$/i,
];

const isTrackingParam = (key: string): boolean =>
  TRACKING_PARAM_PATTERNS.some((re) => re.test(key));

export function cleanProductUrl(input: string): string {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return "";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return trimmed;
  }

  // 추적 파라미터 제거
  const keysToDelete: string[] = [];
  parsed.searchParams.forEach((_v, k) => {
    if (isTrackingParam(k)) keysToDelete.push(k);
  });
  keysToDelete.forEach((k) => parsed.searchParams.delete(k));

  // 빈 fragment 제거
  if (parsed.hash === "#" || parsed.hash === "") {
    parsed.hash = "";
  }

  // search가 비었으면 ?도 제거
  let result = parsed.toString();
  if (parsed.search === "" || parsed.search === "?") {
    result = result.replace(/\?(?=#|$)/, "");
  }

  return result;
}
