export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: "SEO" | "AEO" | "GEO" | "가이드" | "뉴스";
  author: string;
  date: string;
  thumbnail: string;
  featured?: boolean;
  readTime: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "what-is-aeo",
    title: "AEO란? AI 답변 엔진에 내 콘텐츠를 인용시키는 전략",
    excerpt:
      "ChatGPT, Perplexity, 뤼튼 같은 AI가 내 콘텐츠를 직접 답변으로 인용하도록 최적화하는 AEO(Answer Engine Optimization)의 핵심 개념과 실전 전략을 알아봅니다.",
    category: "AEO",
    author: "SearchTune OS",
    date: "2026-04-01",
    thumbnail: "/placeholder.svg",
    featured: true,
    readTime: "8분",
  },
  {
    slug: "geo-generative-engine-optimization",
    title: "GEO 완전 가이드: 생성형 검색에서 브랜드 노출하기",
    excerpt:
      "Google SGE, Naver Cue:, Bing Copilot 등 생성형 AI 검색에서 내 브랜드와 콘텐츠가 출처로 인용되도록 준비하는 GEO 전략을 소개합니다.",
    category: "GEO",
    author: "SearchTune OS",
    date: "2026-03-28",
    thumbnail: "/placeholder.svg",
    readTime: "10분",
  },
  {
    slug: "structured-data-guide",
    title: "구조화 데이터(JSON-LD) 완벽 가이드",
    excerpt:
      "검색엔진과 AI가 페이지를 정확히 이해하도록 돕는 Schema.org 기반 구조화 데이터의 종류, 작성법, 효과를 상세히 설명합니다.",
    category: "SEO",
    author: "SearchTune OS",
    date: "2026-03-25",
    thumbnail: "/placeholder.svg",
    readTime: "12분",
  },
  {
    slug: "seo-vs-aeo-vs-geo",
    title: "SEO vs AEO vs GEO — 차이점과 통합 전략",
    excerpt:
      "검색 최적화의 3가지 축인 SEO, AEO, GEO가 각각 무엇을 의미하는지, 그리고 어떻게 통합적으로 접근해야 하는지를 정리합니다.",
    category: "가이드",
    author: "SearchTune OS",
    date: "2026-03-20",
    thumbnail: "/placeholder.svg",
    readTime: "7분",
  },
  {
    slug: "faq-schema-aeo-boost",
    title: "FAQ 스키마로 AEO 점수 올리는 5가지 방법",
    excerpt:
      "FAQPage 구조화 데이터를 활용해 AI 답변 엔진에서 내 콘텐츠가 선택될 확률을 높이는 실전 팁을 공유합니다.",
    category: "AEO",
    author: "SearchTune OS",
    date: "2026-03-15",
    thumbnail: "/placeholder.svg",
    readTime: "6분",
  },
  {
    slug: "ai-crawler-access",
    title: "AI 크롤러(GPTBot, Googlebot) 접근 허용 설정법",
    excerpt:
      "robots.txt에서 AI 크롤러 접근을 제어하는 방법과 GEO 점수에 미치는 영향을 단계별로 안내합니다.",
    category: "GEO",
    author: "SearchTune OS",
    date: "2026-03-10",
    thumbnail: "/placeholder.svg",
    readTime: "5분",
  },
  {
    slug: "lighthouse-score-improve",
    title: "Lighthouse 성능 점수 90+ 달성하는 실전 체크리스트",
    excerpt:
      "Google Lighthouse의 Performance, Accessibility, SEO 점수를 종합적으로 개선하기 위한 핵심 체크리스트입니다.",
    category: "SEO",
    author: "SearchTune OS",
    date: "2026-03-05",
    thumbnail: "/placeholder.svg",
    readTime: "9분",
  },
  {
    slug: "meta-tags-best-practices",
    title: "메타 태그 최적화: 클릭률을 높이는 title·description 작성법",
    excerpt:
      "검색 결과에서 클릭률을 극대화하는 효과적인 메타 태그 작성 공식과 사례를 분석합니다.",
    category: "SEO",
    author: "SearchTune OS",
    date: "2026-02-28",
    thumbnail: "/placeholder.svg",
    readTime: "6분",
  },
  {
    slug: "why-seo-alone-not-enough",
    title: "왜 SEO만으로는 부족한가? AI 검색 시대의 변화",
    excerpt:
      "전통적인 SEO만으로는 AI 검색 엔진 시대에 충분한 노출을 확보할 수 없는 이유와 대응 방안을 설명합니다.",
    category: "가이드",
    author: "SearchTune OS",
    date: "2026-02-20",
    thumbnail: "/placeholder.svg",
    readTime: "7분",
  },
];
