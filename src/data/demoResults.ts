export interface DemoResult {
  overall: number;
  techSeo: number;
  contentClarity: number;
  aiReadiness: number;
  issues: string[];
  strengths: string[];
  recommendations: string[];
}

const resultA: DemoResult = {
  overall: 82,
  techSeo: 78,
  contentClarity: 80,
  aiReadiness: 76,
  issues: [
    "구조화 데이터(스키마)가 일부 페이지에서만 확인돼요.",
    "상단 요약 문장이 길어 핵심이 한 번에 안 잡혀요.",
    "조직/브랜드 소개가 흩어져 있어요.",
  ],
  strengths: [
    "타이틀과 H1이 주제와 잘 맞아요.",
    "첫 단락에서 제공 가치가 비교적 명확해요.",
    "기본 메타 정보가 충실해요.",
  ],
  recommendations: [
    "조직/브랜드 소개를 한 블록으로 정리하세요.",
    "페이지 상단 요약을 더 짧고 명확하게 바꾸세요.",
    "Organization/FAQ 등 핵심 스키마를 우선 추가하세요.",
  ],
};

const resultB: DemoResult = {
  overall: 61,
  techSeo: 55,
  contentClarity: 64,
  aiReadiness: 52,
  issues: [
    "페이지가 무엇을 제공하는지 첫 화면에서 바로 안 보여요.",
    "H1과 본문 구조가 단순 나열 형태예요.",
    "브랜드/연락처 정보가 약해 신뢰 신호가 부족해요.",
  ],
  strengths: [
    "기본적인 제목은 존재해요.",
    "이미지/섹션 구성이 어느 정도 있어요.",
    "모바일에서 읽기는 가능해요.",
  ],
  recommendations: [
    "첫 단락에 '누구를 위해 무엇을 제공하는지' 한 문장으로 고정하세요.",
    "H2 섹션을 '문제-해결-근거-FAQ' 흐름으로 다시 정리하세요.",
    "푸터에 회사/브랜드 소개, 연락처, 정책 링크를 명확히 넣으세요.",
  ],
};

const resultC: DemoResult = {
  overall: 38,
  techSeo: 40,
  contentClarity: 32,
  aiReadiness: 28,
  issues: [
    "타이틀/H1이 페이지 주제와 잘 맞지 않아요.",
    "첫 화면에 핵심 설명이 부족해 AI와 검색엔진이 맥락을 잡기 어려워요.",
    "스키마/조직 정보가 거의 없어요.",
  ],
  strengths: [
    "콘텐츠는 존재해요.",
    "일부 섹션은 키워드를 포함하고 있어요.",
    "페이지는 정상적으로 열려요.",
  ],
  recommendations: [
    "타이틀/H1을 서비스명 + 핵심 가치 형태로 다시 쓰세요.",
    "첫 화면에 요약 1~2문장과 신뢰 요소를 추가하세요.",
    "Organization, WebSite, FAQ 스키마부터 최소로 적용하세요.",
  ],
};

export function getDemoResult(url: string): DemoResult {
  const lower = url.toLowerCase();
  if (lower.includes("blog")) return resultA;
  // Short/ambiguous URL: less than 15 chars after protocol removal
  const withoutProtocol = lower.replace(/^https?:\/\//, "");
  if (withoutProtocol.length < 10 || !withoutProtocol.includes(".")) return resultC;
  return resultB;
}
