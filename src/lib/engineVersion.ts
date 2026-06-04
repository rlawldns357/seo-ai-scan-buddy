// v10/v11은 v10.5 통합 마일스톤으로 표기 통일
export const formatEngineVersion = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return "";
  if (v === 10 || v === 11) return "10.5";
  return String(v);
};
