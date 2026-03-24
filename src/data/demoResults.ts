/** Sub-signal within an axis */
export interface SubSignal {
  name: string;
  score: number; // 0-100 integer
  weight: number; // weight out of 100
}

/** Improvement suggestion with expected score range */
export interface Improvement {
  label: string;
  pointRange: string; // e.g. "+2~+4"
}

/** Per-axis analysis block */
export interface AxisAnalysis {
  label: 'SEO' | 'AEO' | 'GEO';
  description: string;
  subSignals: SubSignal[];
  scoreRationale: string;
  issues: string[];       // 2-3 items
  strengths: string[];    // 1-2 items
  priorityFix: Improvement;
  quickFix: Improvement;
  additionalFixes: Improvement[];  // 1-2 items
  scoreCap?: string; // shown when hard blocker exists
}

export interface DemoResult {
  seoScore: number;
  aeoScore: number;
  geoScore: number;
  seoAxis: AxisAnalysis;
  aeoAxis: AxisAnalysis;
  geoAxis: AxisAnalysis;
}

/* ── Result A: decent site ── */
const resultA: DemoResult = {
  seoScore: 78,
  aeoScore: 80,
  geoScore: 58,
  seoAxis: {
    label: 'SEO',
    description: '검색엔진이 이 페이지를 크롤링·인덱싱하고 검색 결과에 노출할 기술적 준비 상태',
    subSignals: [
      { name: '크롤링 가능성', score: 82, weight: 25 },
      { name: '인덱싱 준비도', score: 85, weight: 20 },
      { name: '스니펫 품질', score: 72, weight: 20 },
      { name: '구조화 데이터', score: 65, weight: 15 },
      { name: '성능·모바일', score: 80, weight: 20 },
    ],
    scoreRationale: '메타 태그와 인덱싱 기반은 양호하나, 구조화 데이터 누락으로 스니펫 강화 여지가 있습니다.',
    issues: [
      '일부 페이지에서 구조화 데이터가 누락되어 있어요.',
      'robots.txt에 불필요한 차단 규칙이 포함돼 있어요.',
    ],
    strengths: [
      '메타 태그(title, description)가 충실해요.',
      'canonical 태그가 올바르게 설정되어 있어요.',
    ],
    priorityFix: { label: '누락 페이지에 Organization/FAQ 스키마 추가', pointRange: '+4~+7' },
    quickFix: { label: 'robots.txt 불필요 차단 규칙 제거', pointRange: '+2~+4' },
    additionalFixes: [
      { label: 'Open Graph / Twitter Card 메타 보강', pointRange: '+1~+2' },
    ],
  },
  aeoAxis: {
    label: 'AEO',
    description: '이 페이지의 콘텐츠가 질문에 대한 직접 답변으로 추출·요약될 준비 상태',
    subSignals: [
      { name: '질문형 구조', score: 75, weight: 20 },
      { name: '직접 답변 명확성', score: 82, weight: 25 },
      { name: '요약 가능성', score: 78, weight: 20 },
      { name: '답변 형식 적합성', score: 80, weight: 15 },
      { name: '엔티티·출처 명확성', score: 84, weight: 20 },
    ],
    scoreRationale: '첫 단락의 가치 설명은 양호하나, 요약 문장이 길어 핵심이 한 번에 잡히지 않습니다.',
    issues: [
      '요약 문장이 길어 핵심이 한 번에 안 잡혀요.',
      'FAQ/정의형 문장이 부분적으로만 존재해요.',
    ],
    strengths: [
      '첫 단락에서 제공 가치가 비교적 명확해요.',
      'H1과 본문 주제가 일관성 있어요.',
    ],
    priorityFix: { label: 'FAQ 섹션 추가 + FAQPage 스키마 적용', pointRange: '+4~+7' },
    quickFix: { label: '페이지 상단 요약을 2문장 이내로 압축', pointRange: '+2~+4' },
    additionalFixes: [
      { label: '정의형 문장(~란, ~입니다) 패턴 보강', pointRange: '+1~+3' },
    ],
  },
  geoAxis: {
    label: 'GEO',
    description: '생성형 검색 엔진에서 이 사이트와 브랜드가 발견·인용·참조될 준비 상태',
    subSignals: [
      { name: 'AI 접근 가능성', score: 65, weight: 20 },
      { name: 'Citation Eligibility', score: 48, weight: 20 },
      { name: 'Source Clarity', score: 45, weight: 20 },
      { name: '주제 커버리지', score: 62, weight: 15 },
      { name: 'Evidence·Freshness', score: 55, weight: 15 },
      { name: 'AI 가시성 추적', score: 50, weight: 10 },
    ],
    scoreRationale: '콘텐츠 양과 주제 커버리지는 양호하나, 출처 명확성과 인용 적합성에 보강이 필요합니다.',
    issues: [
      '브랜드·조직 소개가 흩어져 있어 출처 명확성이 약해요.',
      '인용 가능한 핵심 문장 구조가 부족해요.',
    ],
    strengths: [
      '주제별 콘텐츠 커버리지가 양호해요.',
      'AI 봇 접근이 허용되어 있어요.',
    ],
    priorityFix: { label: '브랜드·조직 소개를 한 블록으로 통합', pointRange: '+4~+7' },
    quickFix: { label: '핵심 주장에 출처·근거 문장 추가', pointRange: '+2~+4' },
    additionalFixes: [
      { label: '콘텐츠 최신성 표시(날짜, 업데이트 기록)', pointRange: '+1~+2' },
    ],
  },
};

/* ── Result B: mediocre site ── */
const resultB: DemoResult = {
  seoScore: 55,
  aeoScore: 64,
  geoScore: 52,
  seoAxis: {
    label: 'SEO',
    description: '검색엔진이 이 페이지를 크롤링·인덱싱하고 검색 결과에 노출할 기술적 준비 상태',
    subSignals: [
      { name: '크롤링 가능성', score: 60, weight: 25 },
      { name: '인덱싱 준비도', score: 50, weight: 20 },
      { name: '스니펫 품질', score: 48, weight: 20 },
      { name: '구조화 데이터', score: 40, weight: 15 },
      { name: '성능·모바일', score: 70, weight: 20 },
    ],
    scoreRationale: '기본 메타 태그는 존재하나 최적화가 부족하고, 구조화 데이터가 거의 없습니다.',
    issues: [
      'canonical 태그가 누락된 페이지가 있어요.',
      '구조화 데이터가 거의 없어요.',
      '기본 title 태그는 존재하지만 최적화가 필요해요.',
    ],
    strengths: [
      '기본적인 meta title이 존재해요.',
      '페이지 로딩 속도가 양호해요.',
    ],
    priorityFix: { label: '모든 페이지에 고유 title + meta description 추가', pointRange: '+5~+8' },
    quickFix: { label: 'canonical 태그를 전 페이지에 설정', pointRange: '+3~+5' },
    additionalFixes: [
      { label: 'Organization 스키마 추가', pointRange: '+2~+4' },
      { label: '이미지 alt 태그 보강', pointRange: '+1~+2' },
    ],
  },
  aeoAxis: {
    label: 'AEO',
    description: '이 페이지의 콘텐츠가 질문에 대한 직접 답변으로 추출·요약될 준비 상태',
    subSignals: [
      { name: '질문형 구조', score: 55, weight: 20 },
      { name: '직접 답변 명확성', score: 60, weight: 25 },
      { name: '요약 가능성', score: 68, weight: 20 },
      { name: '답변 형식 적합성', score: 65, weight: 15 },
      { name: '엔티티·출처 명확성', score: 72, weight: 20 },
    ],
    scoreRationale: '콘텐츠 양은 충분하나 핵심 가치가 첫 화면에서 바로 보이지 않습니다.',
    issues: [
      '첫 화면에서 핵심 제공 가치가 바로 안 보여요.',
      'H1과 본문 구조가 단순 나열 형태예요.',
      'FAQ/정의형 문장이 없어요.',
    ],
    strengths: [
      '콘텐츠 양이 충분해요.',
      '주제별 섹션 구분이 있어요.',
    ],
    priorityFix: { label: "첫 단락에 '누구를 위해 무엇을 제공하는지' 한 문장 고정", pointRange: '+4~+7' },
    quickFix: { label: "H2 섹션을 '문제-해결-근거-FAQ' 흐름으로 재정리", pointRange: '+3~+5' },
    additionalFixes: [
      { label: 'FAQ 섹션 + FAQPage 스키마 추가', pointRange: '+4~+7' },
    ],
  },
  geoAxis: {
    label: 'GEO',
    description: '생성형 검색 엔진에서 이 사이트와 브랜드가 발견·인용·참조될 준비 상태',
    subSignals: [
      { name: 'AI 접근 가능성', score: 58, weight: 20 },
      { name: 'Citation Eligibility', score: 45, weight: 20 },
      { name: 'Source Clarity', score: 42, weight: 20 },
      { name: '주제 커버리지', score: 60, weight: 15 },
      { name: 'Evidence·Freshness', score: 50, weight: 15 },
      { name: 'AI 가시성 추적', score: 55, weight: 10 },
    ],
    scoreRationale: '브랜드 신뢰 신호가 약하고, 인용 가능한 구조화된 출처 정보가 부족합니다.',
    issues: [
      '브랜드·연락처 정보가 약해 출처 신뢰 신호가 부족해요.',
      '인용 가능한 핵심 문장이 구조화되어 있지 않아요.',
      '콘텐츠 최신성 표시가 없어요.',
    ],
    strengths: [
      '기본적인 회사 소개가 존재해요.',
      '도메인에서 브랜드가 유추 가능해요.',
    ],
    priorityFix: { label: '푸터에 브랜드 소개·연락처·정책 링크 명시', pointRange: '+5~+8' },
    quickFix: { label: 'Organization 스키마 추가', pointRange: '+3~+5' },
    additionalFixes: [
      { label: '핵심 콘텐츠에 출처·근거 인용 문장 추가', pointRange: '+2~+4' },
    ],
    scoreCap: '출처 핵심 정보가 부족해 GEO 점수 상한이 제한됩니다.',
  },
};

/* ── Result C: weak site ── */
const resultC: DemoResult = {
  seoScore: 40,
  aeoScore: 32,
  geoScore: 28,
  seoAxis: {
    label: 'SEO',
    description: '검색엔진이 이 페이지를 크롤링·인덱싱하고 검색 결과에 노출할 기술적 준비 상태',
    subSignals: [
      { name: '크롤링 가능성', score: 45, weight: 25 },
      { name: '인덱싱 준비도', score: 35, weight: 20 },
      { name: '스니펫 품질', score: 30, weight: 20 },
      { name: '구조화 데이터', score: 20, weight: 15 },
      { name: '성능·모바일', score: 60, weight: 20 },
    ],
    scoreRationale: '타이틀과 메타 정보가 부적절하고, 스키마와 구조 정보가 거의 없습니다.',
    issues: [
      '타이틀/H1이 페이지 주제와 맞지 않아요.',
      'meta description이 없거나 부적절해요.',
      '스키마/조직 정보가 거의 없어요.',
    ],
    strengths: [
      '페이지가 정상적으로 로딩돼요.',
      '기본 HTML 구조가 존재해요.',
    ],
    priorityFix: { label: '타이틀/H1을 서비스명 + 핵심 가치 형태로 재작성', pointRange: '+8~+12' },
    quickFix: { label: '각 페이지에 고유 meta description 추가', pointRange: '+5~+8' },
    additionalFixes: [
      { label: 'Organization/WebSite 스키마 추가', pointRange: '+4~+7' },
      { label: 'sitemap.xml 생성 및 제출', pointRange: '+2~+4' },
    ],
    scoreCap: '현재 크롤링 차단으로 SEO 점수 상한이 제한됩니다.',
  },
  aeoAxis: {
    label: 'AEO',
    description: '이 페이지의 콘텐츠가 질문에 대한 직접 답변으로 추출·요약될 준비 상태',
    subSignals: [
      { name: '질문형 구조', score: 25, weight: 20 },
      { name: '직접 답변 명확성', score: 30, weight: 25 },
      { name: '요약 가능성', score: 35, weight: 20 },
      { name: '답변 형식 적합성', score: 28, weight: 15 },
      { name: '엔티티·출처 명확성', score: 38, weight: 20 },
    ],
    scoreRationale: '핵심 설명이 부족해 AI가 맥락을 잡기 어렵고, 답변 추출 구조가 거의 없습니다.',
    issues: [
      '첫 화면에 핵심 설명이 부족해 AI가 맥락을 잡기 어려워요.',
      '엔티티/브랜드 정보가 거의 없어요.',
      'FAQ/정의형 문장이 전혀 없어요.',
    ],
    strengths: [
      '콘텐츠는 존재해요.',
      '일부 섹션에 키워드가 포함돼 있어요.',
    ],
    priorityFix: { label: '첫 화면에 요약 1~2문장과 신뢰 요소 추가', pointRange: '+7~+12' },
    quickFix: { label: 'Organization, WebSite, FAQ 스키마 최소 적용', pointRange: '+5~+8' },
    additionalFixes: [
      { label: 'FAQ 섹션 추가', pointRange: '+5~+8' },
    ],
    scoreCap: '직접 답변 핵심이 부족해 AEO 점수 상승 폭이 제한됩니다.',
  },
  geoAxis: {
    label: 'GEO',
    description: '생성형 검색 엔진에서 이 사이트와 브랜드가 발견·인용·참조될 준비 상태',
    subSignals: [
      { name: 'AI 접근 가능성', score: 30, weight: 20 },
      { name: 'Citation Eligibility', score: 22, weight: 20 },
      { name: 'Source Clarity', score: 20, weight: 20 },
      { name: '주제 커버리지', score: 35, weight: 15 },
      { name: 'Evidence·Freshness', score: 28, weight: 15 },
      { name: 'AI 가시성 추적', score: 30, weight: 10 },
    ],
    scoreRationale: '출처 정보, 브랜드 신뢰 신호, 인용 적합 구조가 전반적으로 부족합니다.',
    issues: [
      '브랜드·조직 정보가 전혀 없어요.',
      '인용 가능한 구조화된 출처 문장이 없어요.',
      '콘텐츠 최신성 표시가 전혀 없어요.',
    ],
    strengths: [
      '도메인이 활성 상태예요.',
      '기본 페이지 구조가 있어요.',
    ],
    priorityFix: { label: '브랜드 소개·연락처·신뢰 요소를 명확히 추가', pointRange: '+8~+12' },
    quickFix: { label: 'Organization 스키마 적용', pointRange: '+4~+7' },
    additionalFixes: [
      { label: '핵심 콘텐츠에 날짜·출처·근거 추가', pointRange: '+3~+5' },
      { label: '다중 페이지 주제 커버리지 확장', pointRange: '+2~+4' },
    ],
    scoreCap: '출처 핵심 정보가 부족해 GEO 점수 상한이 제한됩니다.',
  },
};

export function getDemoResult(url: string): DemoResult {
  const lower = url.toLowerCase();
  if (lower.includes('blog')) return resultA;
  const withoutProtocol = lower.replace(/^https?:\/\//, '');
  if (withoutProtocol.length < 10 || !withoutProtocol.includes('.')) return resultC;
  return resultB;
}
