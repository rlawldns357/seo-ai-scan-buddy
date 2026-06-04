// 엔진 버전 표기 규칙:
// 정수 버전의 마지막 0을 소수점으로 치환해 "X.Y" 형태로 표기한다.
// 예) 10 → "1.0", 11 → "1.1", 12 → "1.2", 25 → "2.5", 100 → "10.0"
export const formatEngineVersion = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  const major = Math.floor(n / 10);
  const minor = n % 10;
  return `${major}.${minor}`;
};
