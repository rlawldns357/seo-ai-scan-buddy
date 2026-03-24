export interface AxisAnalysis {
  label: string;
  description: string; // 왜 중요한지 1줄
  findings: string[];
  quickFixes: string[];
}

export interface DemoResult {
  overall: number;
  techSeo: number;
  contentClarity: number;
  aiReadiness: number;
  seoAxis: AxisAnalysis;
  aeoAxis: AxisAnalysis;
  geoAxis: AxisAnalysis;
  // Legacy summary cards
  issues: string[];
  strengths: string[];
  recommendations: string[];
}

const resultA: DemoResult = {
  overall: 82,
  techSeo: 78,
  contentClarity: 80,
  aiReadiness: 76,
  seoAxis: {
    label: 'SEO',
    description: '검색엔진이 페이지를 크롤링·인덱싱하는 기술적 기반이에요.',
    findings: [
      '메타 태그(title, description)가 충실해요.',
      'canonical 태그가 올바르게 설정되어 있어요.',
      '일부 페이지에서 구조화 데이터가 누락되어 있어요.',
    ],
    quickFixes: [
      '누락된 페이지에 Organization/FAQ 스키마를 추가하세요.',
      'robots.txt에서 불필요한 차단 규칙을 제거하세요.',
    ],
  },
  aeoAxis: {
    label: 'AEO',
    description: 'AI가 답변을 생성할 때 내 콘텐츠를 인용할 수 있는지를 판단하는 기준이에요.',
    findings: [
      '첫 단락에서 제공 가치가 비교적 명확해요.',
      '요약 문장이 길어 핵심이 한 번에 안 잡혀요.',
      'FAQ/정의형 문장이 부분적으로 존재해요.',
    ],
    quickFixes: [
      '페이지 상단 요약을 2문장 이내로 줄이세요.',
      'FAQ 섹션을 추가하고 FAQPage 스키마를 적용하세요.',
    ],
  },
  geoAxis: {
    label: 'GEO',
    description: '지역 검색과 지도 노출에 필요한 로컬 비즈니스 정보예요.',
    findings: [
      '조직/브랜드 소개가 흩어져 있어요.',
      'NAP(상호/주소/전화) 정보가 일부만 확인돼요.',
      'LocalBusiness 스키마가 없어요.',
    ],
    quickFixes: [
      '조직/브랜드 소개를 한 블록으로 정리하세요.',
      '푸터에 NAP 정보를 명시하고 LocalBusiness 스키마를 추가하세요.',
    ],
  },
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
  seoAxis: {
    label: 'SEO',
    description: '검색엔진이 페이지를 크롤링·인덱싱하는 기술적 기반이에요.',
    findings: [
      '기본 title 태그는 존재하지만 최적화가 필요해요.',
      'canonical 태그가 누락된 페이지가 있어요.',
      '구조화 데이터가 거의 없어요.',
    ],
    quickFixes: [
      '모든 페이지에 고유 title + meta description을 추가하세요.',
      'canonical 태그를 전 페이지에 설정하세요.',
    ],
  },
  aeoAxis: {
    label: 'AEO',
    description: 'AI가 답변을 생성할 때 내 콘텐츠를 인용할 수 있는지를 판단하는 기준이에요.',
    findings: [
      '첫 화면에서 핵심 제공 가치가 바로 안 보여요.',
      'H1과 본문 구조가 단순 나열 형태예요.',
      'FAQ/정의형 문장이 없어요.',
    ],
    quickFixes: [
      "첫 단락에 '누구를 위해 무엇을 제공하는지' 한 문장으로 고정하세요.",
      "H2 섹션을 '문제-해결-근거-FAQ' 흐름으로 재정리하세요.",
    ],
  },
  geoAxis: {
    label: 'GEO',
    description: '지역 검색과 지도 노출에 필요한 로컬 비즈니스 정보예요.',
    findings: [
      '브랜드/연락처 정보가 약해 신뢰 신호가 부족해요.',
      'NAP(상호/주소/전화) 정보가 확인되지 않아요.',
      '위치/지도 페이지 링크가 없어요.',
    ],
    quickFixes: [
      '푸터에 회사/브랜드 소개, 연락처, 정책 링크를 명확히 넣으세요.',
      'LocalBusiness 스키마를 추가하세요.',
    ],
  },
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
  seoAxis: {
    label: 'SEO',
    description: '검색엔진이 페이지를 크롤링·인덱싱하는 기술적 기반이에요.',
    findings: [
      '타이틀/H1이 페이지 주제와 맞지 않아요.',
      'meta description이 없거나 부적절해요.',
      '스키마/조직 정보가 거의 없어요.',
    ],
    quickFixes: [
      '타이틀/H1을 서비스명 + 핵심 가치 형태로 다시 쓰세요.',
      '각 페이지에 고유 meta description을 추가하세요.',
    ],
  },
  aeoAxis: {
    label: 'AEO',
    description: 'AI가 답변을 생성할 때 내 콘텐츠를 인용할 수 있는지를 판단하는 기준이에요.',
    findings: [
      '첫 화면에 핵심 설명이 부족해 AI가 맥락을 잡기 어려워요.',
      '엔티티/브랜드 정보가 거의 없어요.',
      'FAQ/정의형 문장이 전혀 없어요.',
    ],
    quickFixes: [
      '첫 화면에 요약 1~2문장과 신뢰 요소를 추가하세요.',
      'Organization, WebSite, FAQ 스키마부터 최소로 적용하세요.',
    ],
  },
  geoAxis: {
    label: 'GEO',
    description: '지역 검색과 지도 노출에 필요한 로컬 비즈니스 정보예요.',
    findings: [
      'NAP(상호/주소/전화) 정보가 전혀 없어요.',
      'LocalBusiness 스키마가 없어요.',
      '위치/지도 관련 페이지가 없어요.',
    ],
    quickFixes: [
      '푸터에 상호, 주소, 전화번호를 추가하세요.',
      'LocalBusiness 스키마를 적용하세요.',
    ],
  },
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
  const withoutProtocol = lower.replace(/^https?:\/\//, "");
  if (withoutProtocol.length < 10 || !withoutProtocol.includes(".")) return resultC;
  return resultB;
}
