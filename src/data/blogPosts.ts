export interface FAQ {
  question: string;
  answer: string;
}

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
  content?: string;
  faqs?: FAQ[];
  ogImage?: string;
}

/** 한글 기준 분당 ~500자, 최소 3분 최대 5분 */
function calcReadTime(content?: string): string {
  if (!content) return "3분";
  const charCount = content.replace(/[#\-|>*`\n\s]/g, "").length;
  const minutes = Math.ceil(charCount / 500);
  return `${Math.max(3, Math.min(5, minutes))}분`;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "what-is-aeo",
    title: "AEO란? AI 답변 엔진에 내 콘텐츠를 인용시키는 전략",
    excerpt:
      "ChatGPT, Perplexity, 뤼튼 같은 AI가 내 콘텐츠를 직접 답변으로 인용하도록 최적화하는 AEO(Answer Engine Optimization)의 핵심 개념과 실전 전략을 알아봅니다.",
    category: "AEO",
    author: "서치튠 블로거",
    date: "2026-04-01",
    thumbnail: "/placeholder.svg",
    featured: true,
    readTime: "8분",
    faqs: [
      { question: "AEO와 SEO의 가장 큰 차이점은 무엇인가요?", answer: "SEO는 검색 결과 페이지(SERP)에서 상위 노출을 목표로 하지만, AEO는 ChatGPT, Perplexity 등 AI 답변 엔진이 생성하는 답변 안에 내 콘텐츠가 출처로 직접 인용되는 것을 목표로 합니다." },
      { question: "AEO 최적화를 시작하려면 무엇부터 해야 하나요?", answer: "FAQ 스키마 마크업 추가, Q&A 형식의 콘텐츠 구조화, 질문에 대한 직접적이고 간결한 답변 제공이 가장 먼저 해야 할 작업입니다." },
      { question: "AEO 점수는 어떻게 측정하나요?", answer: "SearchTune OS에서 FAQ 스키마 존재 여부, 콘텐츠 구조화 수준, AI 크롤러 접근성 등을 종합적으로 평가하여 AEO 준비도 점수를 산출합니다." },
      { question: "ChatGPT가 내 콘텐츠를 인용하려면 어떤 조건이 필요한가요?", answer: "GPTBot 크롤러 접근 허용, 구조화된 Q&A 콘텐츠, E-E-A-T(경험·전문성·권위·신뢰) 신호 강화, 그리고 최신 정보 유지가 핵심 조건입니다." },
      { question: "AEO는 모든 업종에 효과적인가요?", answer: "정보 검색이 많은 업종(교육, 건강, 기술, 금융 등)에서 특히 효과적입니다. 제품/서비스 비교, 방법론, 정의 등의 콘텐츠가 AI 인용에 유리합니다." },
    ],
    content: `> **TL;DR**
> AEO는 AI 답변 엔진이 내 글을 답변 근거로 이해하고 인용하기 쉽게 만드는 최적화입니다.
> 핵심은 질문형 구조, 직접 답변, FAQ, 신뢰 출처, 내부링크입니다.
> 색인만으로는 부족하고, AI가 요약하기 쉬운 문장 구조까지 같이 봐야 합니다.

## AEO(Answer Engine Optimization)란?

AEO는 **Answer Engine Optimization**의 약자로, AI 기반 답변 엔진(ChatGPT, Perplexity, 뤼튼 등)이 사용자 질문에 답변할 때 **내 콘텐츠를 출처로 인용**하도록 최적화하는 전략입니다.

기존 SEO가 검색 결과 페이지(SERP)에서 상위 노출을 목표로 했다면, AEO는 AI가 생성하는 답변 안에 내 콘텐츠가 직접 포함되는 것을 목표로 합니다.

## 왜 AEO가 중요한가?

AI 검색의 급성장으로 사용자 행동이 변화하고 있습니다:

- **ChatGPT**: 월간 활성 사용자 2억 명 돌파
- **Perplexity**: 월간 검색 쿼리 5억 건 이상
- **Google SGE**: 검색 결과의 40%에 AI 답변 포함

이러한 변화는 전통적인 SEO만으로는 충분한 트래픽을 확보하기 어려워지고 있음을 의미합니다.

## AEO 점수를 높이는 핵심 전략

### 1. 구조화된 콘텐츠 작성

AI는 잘 구조화된 콘텐츠를 선호합니다. 다음 형식을 활용하세요:

- **Q&A 형식**: 질문-답변 쌍으로 콘텐츠 구성
- **리스트 형식**: 번호 매기기 또는 불릿 포인트 활용
- **테이블 형식**: 비교 데이터를 표로 정리

### 2. FAQ 스키마 마크업

FAQPage 구조화 데이터를 추가하면 AI가 콘텐츠를 더 쉽게 파싱할 수 있습니다. 구현할 때는 [Schema.org FAQPage](https://schema.org/FAQPage)와 [Google Search Central의 구조화 데이터 가이드](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)를 기준으로 질문·답변 쌍을 명확하게 분리하는 것이 안전합니다.

### 3. 명확한 답변 제공

AI는 **직접적이고 간결한 답변**을 선호합니다. 핵심 답변을 문단 초반에 배치하고, 이후 상세 설명을 추가하는 "역피라미드" 구조를 사용하세요.

### 4. 신뢰성 확보

- 출처와 데이터를 명시
- 저자 정보와 전문성 표시
- 최신 정보로 정기적 업데이트

## SearchTune OS로 AEO 점수 확인하기

SearchTune OS의 분석 도구를 사용하면 웹사이트의 AEO 준비도를 즉시 확인할 수 있습니다. FAQ 스키마 존재 여부, 콘텐츠 구조화 수준, AI 크롤러 접근성 등을 종합적으로 평가합니다.

관련해서 함께 보면 좋은 글입니다.

- [SEO AEO GEO 차이: 검색·답변·생성형 최적화 통합 전략](/blog/seo-vs-aeo-vs-geo.html)
- [FAQ 스키마로 AEO 점수 올리는 5가지 방법](/blog/faq-schema-aeo-boost.html)
- [AI 크롤러 접근 허용 설정법](/blog/ai-crawler-access.html)

> AEO는 선택이 아닌 필수입니다. AI 검색 시대에 대비하여 지금부터 콘텐츠를 최적화하세요.`,
  },
  {
    slug: "geo-generative-engine-optimization",
    title: "GEO 완전 가이드: 생성형 검색에서 브랜드 노출하기",
    excerpt:
      "Google SGE, Naver Cue:, Bing Copilot 등 생성형 AI 검색에서 내 브랜드와 콘텐츠가 출처로 인용되도록 준비하는 GEO 전략을 소개합니다.",
    category: "GEO",
    author: "서치튠 블로거",
    date: "2026-03-28",
    thumbnail: "/placeholder.svg",
    readTime: "10분",
    faqs: [
      { question: "GEO와 SEO의 차이점은 무엇인가요?", answer: "SEO는 기존 검색 결과에서 순위를 높이는 것이고, GEO는 Google SGE, Naver Cue: 등 생성형 AI가 생성하는 답변에서 출처로 인용되는 것을 목표로 합니다." },
      { question: "GEO 최적화에 가장 중요한 요소는 무엇인가요?", answer: "AI 크롤러(GPTBot, Google-Extended 등) 접근 허용, 깊이 있는 콘텐츠 제공, Schema.org 구조화 데이터 적용, 그리고 브랜드 권위 구축이 핵심입니다." },
      { question: "Google SGE에서 내 사이트가 인용되는지 어떻게 확인하나요?", answer: "Google SGE 결과에서 출처 링크를 확인하거나, SearchTune OS의 GEO 분석 도구를 통해 AI 검색 대비 준비도를 점검할 수 있습니다." },
      { question: "robots.txt에서 AI 크롤러를 어떻게 허용하나요?", answer: "GPTBot, Google-Extended, ClaudeBot 등 AI 크롤러를 robots.txt에서 명시적으로 차단하지 않으면 자동으로 허용됩니다. 기존 차단 규칙이 있다면 해당 봇의 Disallow 규칙을 제거하세요." },
      { question: "GEO 점수가 낮으면 어떤 문제가 있나요?", answer: "생성형 AI 검색 결과에서 경쟁사 대비 노출 기회를 잃게 됩니다. AI 검색 사용이 급증하는 추세에서 GEO 대비 없이는 유기적 트래픽이 감소할 수 있습니다." },
    ],
    content: `## GEO(Generative Engine Optimization)란?

GEO는 **Generative Engine Optimization**의 약자로, Google SGE, Naver Cue:, Bing Copilot 등 **생성형 AI 검색 엔진**에서 내 브랜드와 콘텐츠가 출처로 인용되도록 최적화하는 전략입니다.

## GEO vs SEO: 무엇이 다른가?

| 구분 | SEO | GEO |
|------|-----|-----|
| 목표 | 검색 순위 상위 노출 | AI 답변 출처 인용 |
| 대상 | 구글, 네이버 검색 | SGE, Cue:, Copilot |
| 핵심 | 키워드, 백링크 | 콘텐츠 품질, 구조화 |

## GEO 핵심 전략

### 1. AI 크롤러 접근 허용

\`robots.txt\`에서 GPTBot, Google-Extended 등 AI 크롤러의 접근을 허용하는 것이 첫 번째 단계입니다.

### 2. 풍부한 컨텍스트 제공

생성형 AI는 단순 키워드가 아닌 **맥락(context)**을 이해합니다. 주제에 대한 깊이 있는 설명, 예시, 데이터를 포함하세요.

### 3. 브랜드 언급 & 인용 확보

다른 웹사이트에서 브랜드가 언급되고 인용될수록 AI가 신뢰할 수 있는 출처로 인식합니다.

### 4. 구조화 데이터 강화

Schema.org 마크업을 통해 콘텐츠의 의미를 명확히 전달하세요.

## GEO 점수 측정

SearchTune OS에서는 GEO 준비도를 다음 기준으로 평가합니다:
- AI 크롤러 접근성
- 구조화 데이터 완성도
- 콘텐츠 깊이와 품질
- 브랜드 신뢰도 신호`,
  },
  {
    slug: "structured-data-guide",
    title: "구조화 데이터(JSON-LD) 완벽 가이드",
    excerpt:
      "검색엔진과 AI가 페이지를 정확히 이해하도록 돕는 Schema.org 기반 구조화 데이터의 종류, 작성법, 효과를 상세히 설명합니다.",
    category: "SEO",
    author: "서치튠 블로거",
    date: "2026-03-25",
    thumbnail: "/placeholder.svg",
    readTime: "12분",
    faqs: [
      { question: "구조화 데이터(JSON-LD)란 무엇인가요?", answer: "구조화 데이터는 웹페이지의 콘텐츠를 검색엔진과 AI가 기계적으로 이해할 수 있도록 Schema.org 표준에 따라 마크업하는 것입니다. JSON-LD 형식이 Google에서 가장 권장됩니다." },
      { question: "구조화 데이터를 추가하면 SEO에 어떤 효과가 있나요?", answer: "리치 스니펫(별점, 가격, FAQ 등)이 검색 결과에 표시되어 CTR이 20-30% 향상됩니다. 또한 AI 답변 엔진의 콘텐츠 파싱을 도와 AEO에도 기여합니다." },
      { question: "가장 많이 사용되는 스키마 타입은 무엇인가요?", answer: "Organization(비즈니스 정보), FAQPage(자주 묻는 질문), Article/BlogPosting(기사/블로그), Product(상품), LocalBusiness(지역 업체), WebSite+SearchAction(사이트 검색) 등이 가장 많이 사용됩니다." },
      { question: "구조화 데이터가 올바르게 적용됐는지 어떻게 확인하나요?", answer: "Google의 리치 결과 테스트(Rich Results Test) 도구나 Schema.org 밸리데이터를 사용하여 검증할 수 있습니다. SearchTune OS에서도 자동으로 구조화 데이터 유효성을 진단합니다." },
      { question: "JSON-LD는 페이지 어디에 배치해야 하나요?", answer: "JSON-LD는 <script type=\"application/ld+json\"> 태그 안에 작성하며, <head> 또는 <body> 어디에나 배치할 수 있습니다. Google은 <head>에 넣는 것을 권장합니다." },
    ],
    content: `## 구조화 데이터란?

구조화 데이터(Structured Data)는 웹페이지의 콘텐츠를 검색엔진과 AI가 **기계적으로 이해**할 수 있는 형식으로 마크업하는 것입니다. Schema.org 표준을 따르며, JSON-LD 형식이 가장 권장됩니다.

## 왜 구조화 데이터가 중요한가?

- **리치 스니펫**: 검색 결과에 별점, 가격, FAQ 등 추가 정보 표시
- **AI 답변 인용**: 구조화된 콘텐츠는 AI가 파싱하기 쉬움
- **CTR 향상**: 리치 스니펫이 있는 결과는 클릭률이 20-30% 높음

## 주요 스키마 타입

### 1. Organization
비즈니스 정보를 검색엔진에 전달합니다.

### 2. FAQPage
자주 묻는 질문 목록을 마크업합니다. AEO에 특히 효과적입니다.

### 3. Article / BlogPosting
블로그 글이나 뉴스 기사의 메타데이터를 전달합니다.

### 4. WebSite + SearchAction
사이트 내 검색 기능을 구글 검색에서 직접 사용할 수 있게 합니다.

## JSON-LD 작성 예시

JSON-LD는 \`<script type="application/ld+json">\` 태그 안에 작성합니다. 페이지의 \`<head>\` 또는 \`<body>\` 어디에나 배치할 수 있습니다.

## SearchTune OS에서 구조화 데이터 점검하기

SearchTune OS의 SEO 분석에서는 구조화 데이터의 존재 여부, 유효성, 그리고 개선 기회를 자동으로 진단합니다.`,
  },
  {
    slug: "seo-vs-aeo-vs-geo",
    title: "SEO AEO GEO 차이: 검색·답변·생성형 최적화 통합 전략",
    excerpt:
      "SEO AEO GEO 차이를 한 번에 정리합니다. 검색엔진 노출, AI 답변 인용, 생성형 검색 추천이 각각 어떻게 다르고 어떤 순서로 최적화해야 하는지 설명합니다.",
    category: "가이드",
    author: "서치튠 블로거",
    date: "2026-03-20",
    thumbnail: "/placeholder.svg",
    readTime: "7분",
    faqs: [
      { question: "SEO AEO GEO 차이는 무엇인가요?", answer: "SEO는 Google·Naver 검색 결과 상위 노출, AEO는 ChatGPT·Perplexity 같은 답변 엔진의 직접 인용, GEO는 Google SGE·Naver Cue: 같은 생성형 검색에서 브랜드와 콘텐츠가 추천·출처화되는 것을 목표로 합니다." },
      { question: "AEO와 SEO의 차이점은 무엇인가요?", answer: "SEO는 검색 결과 목록에서 클릭을 얻는 최적화이고, AEO는 사용자의 질문에 대한 AI 답변 안에 내 콘텐츠가 답변 근거로 들어가도록 만드는 최적화입니다." },
      { question: "SEO, AEO, GEO 중 어떤 것을 먼저 해야 하나요?", answer: "기본적인 SEO(기술적 최적화, 메타 태그, 사이트맵)를 먼저 갖추고, 그 위에 AEO(Q&A 구조화, FAQ 스키마)와 GEO(AI 크롤러 허용, 깊이 있는 콘텐츠)를 순차적으로 적용하는 것이 효율적입니다." },
      { question: "세 가지를 동시에 최적화할 수 있나요?", answer: "네, 가능합니다. 구조화 데이터 적용, 고품질 콘텐츠 작성, AI 크롤러 허용 등 공통 작업이 많아서 통합적으로 접근하면 효율적입니다. SearchTune OS에서 세 점수를 한 번에 분석할 수 있습니다." },
      { question: "소규모 비즈니스도 AEO와 GEO가 필요한가요?", answer: "네, 오히려 소규모 비즈니스에 더 중요할 수 있습니다. AI 검색에서의 노출은 광고 비용 없이 잠재 고객에게 도달하는 효과적인 채널이 됩니다." },
      { question: "SEO 점수가 높으면 AEO/GEO 점수도 높나요?", answer: "반드시 그렇지는 않습니다. SEO에서 높은 순위를 가져도 FAQ 스키마 부재, AI 크롤러 차단 등의 이유로 AEO/GEO 점수가 낮을 수 있습니다. 각각 별도의 최적화가 필요합니다." },
      { question: "SEO·AEO·GEO 통합 점수를 확인할 수 있는 도구가 있나요?", answer: "SearchTune OS에서 하나의 URL을 입력하면 SEO, AEO, GEO 세 가지 점수를 동시에 분석하여 통합적인 개선 방향을 제시합니다." },
    ],
    content: `## SEO AEO GEO 차이 한눈에 보기

SEO AEO GEO 차이는 검색 결과에 노출되는 방식의 차이입니다. SEO는 Google·Naver 검색 결과에서 상위 노출을 목표로 하고, AEO는 ChatGPT·Perplexity 같은 AI 답변 엔진에 인용되는 것을 목표로 하며, GEO는 Google SGE·Naver Cue: 같은 생성형 검색에서 브랜드와 콘텐츠가 추천되는 것을 목표로 합니다.

디지털 마케팅에서 검색 노출은 가장 중요한 채널 중 하나입니다. 하지만 AI의 등장으로 검색 최적화도 진화하고 있습니다.

## SEO (Search Engine Optimization)

**전통적 검색 엔진 최적화**입니다. Google, Naver 등의 검색 결과에서 상위에 노출되는 것을 목표로 합니다.

핵심 요소:
- 키워드 리서치 & 최적화
- 기술적 SEO (속도, 모바일 최적화, 크롤링)
- 백링크 확보
- 콘텐츠 품질

## AEO (Answer Engine Optimization)

**AI 답변 엔진 최적화**입니다. ChatGPT, Perplexity 등이 답변할 때 내 콘텐츠를 인용하도록 합니다.

핵심 요소:
- Q&A 형식의 콘텐츠 구조
- FAQ 스키마 마크업
- 직접적이고 명확한 답변 제공
- 신뢰성 있는 데이터와 출처

## GEO (Generative Engine Optimization)

**생성형 AI 검색 최적화**입니다. Google SGE, Bing Copilot 등에서 출처로 인용되도록 합니다.

핵심 요소:
- AI 크롤러 접근 허용
- 깊이 있는 맥락 제공
- 브랜드 권위 구축

## 통합 전략

세 가지를 별도로 접근하기보다는 **통합적으로 관리**하는 것이 효율적입니다. SearchTune OS는 SEO, AEO, GEO 점수를 한 번에 분석하여 통합적인 개선 방향을 제시합니다.

## 다음으로 확인할 최적화

- [AEO란? AI 답변 엔진에 내 콘텐츠를 인용시키는 전략](/blog/what-is-aeo)
- [GEO 완전 가이드: 생성형 검색에서 브랜드 노출하기](/blog/generative-engine-optimization)
- [FAQ 스키마로 AEO 점수 올리는 5가지 방법](/blog/faq-schema-aeo-boost)
- [AI 크롤러 접근 허용 설정법](/blog/ai-crawler-access)`,
  },
  {
    slug: "faq-schema-aeo-boost",
    title: "FAQ 스키마로 AEO 점수 올리는 5가지 방법",
    excerpt:
      "FAQPage 구조화 데이터를 활용해 AI 답변 엔진에서 내 콘텐츠가 선택될 확률을 높이는 실전 팁을 공유합니다.",
    category: "AEO",
    author: "서치튠 블로거",
    date: "2026-03-15",
    thumbnail: "/placeholder.svg",
    readTime: "6분",
    faqs: [
      { question: "FAQ 스키마 마크업은 어떻게 작성하나요?", answer: "FAQPage 타입의 JSON-LD를 사용합니다. mainEntity 배열 안에 Question 타입 객체를 넣고, 각각에 name(질문)과 acceptedAnswer(답변) 속성을 지정합니다." },
      { question: "FAQ를 한 페이지에 몇 개까지 넣는 것이 좋나요?", answer: "Google은 FAQPage 스키마에 질문 수 제한을 두지 않지만, 사용자 경험과 콘텐츠 집중도를 위해 5-10개가 적절합니다. 주제와 관련 없는 FAQ는 별도 페이지로 분리하세요." },
      { question: "FAQ 스키마가 검색 결과에서 어떻게 보이나요?", answer: "Google 검색 결과에서 해당 페이지 아래에 접을 수 있는 질문-답변 목록이 표시됩니다(리치 스니펫). 이를 통해 검색 결과 면적이 넓어져 CTR이 크게 향상됩니다." },
      { question: "FAQ 답변에 링크를 포함해도 되나요?", answer: "네, FAQ 답변 내에 HTML 링크(<a> 태그)를 포함할 수 있습니다. 관련 콘텐츠로의 내부 링크를 추가하면 사용자 경험과 SEO 모두에 도움이 됩니다." },
      { question: "FAQ 스키마가 AEO 점수에 구체적으로 어떻게 기여하나요?", answer: "AI 답변 엔진은 질문-답변 형식의 구조화된 데이터를 우선적으로 파싱합니다. FAQ 스키마가 있으면 AI가 콘텐츠를 정확히 이해하고 답변 출처로 인용할 확률이 높아집니다." },
    ],
    content: `## FAQ 스키마가 AEO에 중요한 이유

AI 답변 엔진은 질문-답변 형식의 콘텐츠를 특히 잘 활용합니다. FAQPage 스키마 마크업이 있으면 AI가 콘텐츠를 더 쉽게 파싱하고 인용할 수 있습니다.

## 5가지 실전 팁

### 1. 실제 사용자 질문 기반으로 작성

검색 콘솔, 고객 문의, 커뮤니티에서 실제 질문을 수집하세요. 자연어 질문 형식이 AI 인용 확률을 높입니다.

### 2. 답변은 간결하게, 2-3문장으로

AI는 긴 답변보다 **핵심을 담은 간결한 답변**을 선호합니다. 첫 2-3문장에 핵심을 담고, 상세 내용은 본문에서 다루세요.

### 3. 관련 키워드를 자연스럽게 포함

답변에 타겟 키워드를 자연스럽게 녹여넣되, 키워드 스터핑은 피하세요.

### 4. 최신 정보 유지

AI는 최신 정보를 우선시합니다. FAQ를 정기적으로 업데이트하고 날짜를 명시하세요.

### 5. 여러 페이지에 분산 배치

하나의 페이지에 모든 FAQ를 몰아넣기보다, 관련 주제별로 분산 배치하는 것이 효과적입니다.

## 마크업 검증

SearchTune OS에서 FAQ 스키마의 유효성과 AEO 기여도를 즉시 확인할 수 있습니다.`,
  },
  {
    slug: "ai-crawler-access",
    title: "AI 크롤러(GPTBot, Googlebot) 접근 허용 설정법",
    excerpt:
      "robots.txt에서 AI 크롤러 접근을 제어하는 방법과 GEO 점수에 미치는 영향을 단계별로 안내합니다.",
    category: "GEO",
    author: "서치튠 블로거",
    date: "2026-03-10",
    thumbnail: "/placeholder.svg",
    readTime: "5분",
    faqs: [
      { question: "AI 크롤러에는 어떤 종류가 있나요?", answer: "주요 AI 크롤러로는 GPTBot(OpenAI), Google-Extended(Google AI), ClaudeBot(Anthropic), PerplexityBot(Perplexity), Yeti(네이버), Bingbot(Microsoft Copilot) 등이 있습니다." },
      { question: "AI 크롤러를 허용하면 콘텐츠가 무단 사용되나요?", answer: "AI 크롤러 허용은 검색 노출을 위한 것이며, 콘텐츠 저작권과는 별개입니다. 대부분의 AI 서비스는 출처를 표시하며, 민감한 콘텐츠는 선택적으로 차단할 수 있습니다." },
      { question: "robots.txt를 수정하면 바로 반영되나요?", answer: "크롤러마다 robots.txt 캐시 주기가 다릅니다. 보통 수 시간에서 1-2일 내에 반영됩니다. Google의 경우 Search Console에서 즉시 업데이트를 요청할 수 있습니다." },
      { question: "특정 AI 크롤러만 허용하고 나머지를 차단할 수 있나요?", answer: "네, robots.txt에서 User-agent별로 개별 규칙을 설정할 수 있습니다. 예를 들어 GPTBot만 허용하고 다른 AI 크롤러는 Disallow 규칙으로 차단할 수 있습니다." },
      { question: "AI 크롤러 차단이 일반 검색 SEO에도 영향을 주나요?", answer: "AI 크롤러(GPTBot 등)는 일반 검색 크롤러(Googlebot)와 별개이므로, AI 크롤러를 차단해도 일반 검색 노출에는 직접적인 영향이 없습니다. 하지만 GEO 점수는 하락합니다." },
    ],
    content: `## AI 크롤러란?

AI 크롤러는 ChatGPT, Google SGE 등 AI 서비스가 웹 콘텐츠를 수집하기 위해 사용하는 봇입니다. 주요 AI 크롤러에는 GPTBot(OpenAI), Google-Extended, ClaudeBot(Anthropic), PerplexityBot 등이 있습니다.

## robots.txt 설정 방법

AI 크롤러의 접근을 허용하려면 robots.txt에서 해당 봇을 차단하지 않아야 합니다.

### 허용 설정
모든 AI 크롤러를 허용하려면 별도의 차단 규칙을 추가하지 않으면 됩니다.

### 선택적 허용
특정 AI 크롤러만 허용하고 나머지는 차단할 수도 있습니다.

## GEO 점수에 미치는 영향

AI 크롤러 접근을 차단하면 GEO 점수가 크게 하락합니다. SearchTune OS에서는 AI 크롤러 접근성을 GEO 평가의 핵심 항목으로 포함하고 있습니다.

## 주의사항

- 민감한 콘텐츠(개인정보, 유료 콘텐츠)에 대해서는 신중하게 접근 제어
- AI 크롤러 허용이 곧 콘텐츠 무단 사용을 의미하지는 않음
- 정기적으로 크롤링 로그를 확인하여 비정상적 접근 모니터링`,
  },
  {
    slug: "lighthouse-score-improve",
    title: "Lighthouse 성능 점수 90+ 달성하는 실전 체크리스트",
    excerpt:
      "Google Lighthouse의 Performance, Accessibility, SEO 점수를 종합적으로 개선하기 위한 핵심 체크리스트입니다.",
    category: "SEO",
    author: "서치튠 블로거",
    date: "2026-03-05",
    thumbnail: "/placeholder.svg",
    readTime: "9분",
    faqs: [
      { question: "Lighthouse 점수 90점 이상이면 충분한가요?", answer: "Performance 90점 이상은 좋은 수준이지만, Core Web Vitals(LCP, FID, CLS) 개별 항목도 '양호' 기준을 충족해야 합니다. 점수보다는 실제 사용자 경험 데이터(CrUX)가 더 중요합니다." },
      { question: "LCP(Largest Contentful Paint)를 개선하는 가장 효과적인 방법은?", answer: "히어로 이미지를 WebP/AVIF로 최적화하고 preload 힌트를 추가하세요. JavaScript 번들 크기를 줄이고, 서버 응답 시간(TTFB)을 200ms 이내로 최적화하는 것이 효과적입니다." },
      { question: "CLS(Cumulative Layout Shift)가 높은 주요 원인은?", answer: "이미지/동영상에 width/height 미지정, 웹폰트 로딩 시 레이아웃 변경(FOUT), 동적으로 삽입되는 광고/배너, 그리고 lazy-loaded 콘텐츠의 크기 미확보가 주요 원인입니다." },
      { question: "Lighthouse와 PageSpeed Insights의 차이는 무엇인가요?", answer: "Lighthouse는 로컬 환경에서 페이지를 테스트하는 도구이고, PageSpeed Insights는 실제 사용자 데이터(CrUX)와 Lighthouse 시뮬레이션 결과를 함께 제공합니다. PSI가 더 현실적인 성능 지표를 보여줍니다." },
      { question: "모바일과 데스크톱 Lighthouse 점수가 크게 차이 나는 이유는?", answer: "Lighthouse 모바일 테스트는 중저가 스마트폰(Moto G Power)과 느린 네트워크(4G)를 시뮬레이션하기 때문입니다. JavaScript 실행과 렌더링이 느려져 모바일 점수가 낮게 나옵니다." },
    ],
    content: `## Lighthouse란?

Google Lighthouse는 웹페이지의 품질을 측정하는 오픈소스 도구입니다. Performance, Accessibility, Best Practices, SEO 4가지 카테고리로 평가합니다.

## Performance 점수 올리기

### Core Web Vitals 개선
- **LCP (Largest Contentful Paint)**: 2.5초 이내 목표
- **FID (First Input Delay)**: 100ms 이내 목표
- **CLS (Cumulative Layout Shift)**: 0.1 이내 목표

### 실전 체크리스트
- 이미지 최적화 (WebP/AVIF, lazy loading)
- JavaScript 번들 최소화 (코드 스플리팅, 트리 쉐이킹)
- CSS 최적화 (unused CSS 제거, critical CSS 인라인)
- 폰트 최적화 (font-display: swap, preload)
- 서버 응답 시간 단축

## SEO 점수 올리기

- 메타 태그 최적화 (title, description)
- 시맨틱 HTML 사용
- 모바일 반응형 디자인
- HTTPS 적용
- 구조화 데이터 추가

## SearchTune OS 활용

SearchTune OS는 Lighthouse 점수를 기반으로 SEO 현황을 진단하고, AEO·GEO까지 확장된 분석을 제공합니다.`,
  },
  {
    slug: "meta-tags-best-practices",
    title: "메타 태그 최적화: 클릭률을 높이는 title·description 작성법",
    excerpt:
      "검색 결과에서 클릭률을 극대화하는 효과적인 메타 태그 작성 공식과 사례를 분석합니다.",
    category: "SEO",
    author: "서치튠 블로거",
    date: "2026-02-28",
    thumbnail: "/placeholder.svg",
    readTime: "6분",
    faqs: [
      { question: "title 태그의 적정 길이는 몇 자인가요?", answer: "Google은 약 60자(영문 기준), 네이버는 약 40자(한글 기준)까지 표시합니다. 핵심 키워드를 앞쪽에 배치하고, 잘리더라도 의미가 전달되도록 작성하세요." },
      { question: "meta description이 검색 순위에 직접 영향을 주나요?", answer: "Google은 meta description을 직접적인 순위 요소로 사용하지 않습니다. 하지만 잘 작성된 description은 CTR을 높여 간접적으로 SEO에 기여합니다." },
      { question: "모든 페이지에 고유한 메타 태그가 필요한가요?", answer: "네, 각 페이지마다 고유한 title과 description을 작성해야 합니다. 중복된 메타 태그는 검색엔진이 페이지를 혼동할 수 있어 SEO에 불리합니다." },
      { question: "메타 태그에 브랜드명을 포함해야 하나요?", answer: "홈페이지는 브랜드명을 앞에, 나머지 페이지는 ' | 브랜드명' 형식으로 뒤에 추가하는 것이 일반적입니다. 브랜드 인지도가 높으면 CTR에 도움이 됩니다." },
      { question: "검색엔진이 meta description 대신 다른 텍스트를 표시하는 이유는?", answer: "Google은 사용자 검색 쿼리와 더 관련 있는 콘텐츠를 페이지 본문에서 추출하여 스니펫으로 표시할 수 있습니다. 이를 방지하려면 주요 키워드를 description에 포함하세요." },
    ],
    content: `## 메타 태그가 중요한 이유

메타 태그(title, description)는 검색 결과에서 사용자가 가장 먼저 보는 요소입니다. 잘 작성된 메타 태그는 **CTR(클릭률)을 20-30%** 높일 수 있습니다.

## Title 태그 작성법

### 공식
\`[핵심 키워드] — [가치 제안] | [브랜드명]\`

### 규칙
- 60자 이내로 작성
- 핵심 키워드를 앞쪽에 배치
- 클릭을 유도하는 수치나 혜택 포함
- 각 페이지마다 고유한 title 사용

## Description 태그 작성법

### 공식
\`[문제/니즈] + [해결책] + [CTA/가치]\`

### 규칙
- 155자 이내로 작성
- 액션 동사로 시작 ("알아보세요", "확인하세요")
- 타겟 키워드를 자연스럽게 포함
- 구체적인 수치나 데이터 활용

## 검증과 개선

SearchTune OS의 SEO 분석에서 메타 태그의 길이, 키워드 포함 여부, 고유성 등을 자동으로 점검합니다.`,
  },
  {
    slug: "why-seo-alone-not-enough",
    title: "왜 SEO만으로는 부족한가? AI 검색 시대의 변화",
    excerpt:
      "전통적인 SEO만으로는 AI 검색 엔진 시대에 충분한 노출을 확보할 수 없는 이유와 대응 방안을 설명합니다.",
    category: "가이드",
    author: "서치튠 블로거",
    date: "2026-02-20",
    thumbnail: "/placeholder.svg",
    readTime: "7분",
    faqs: [
      { question: "제로클릭 검색이란 무엇인가요?", answer: "사용자가 검색 결과 페이지에서 직접 답변을 얻어 웹사이트를 방문하지 않는 검색을 의미합니다. AI 답변, Featured Snippet, Knowledge Panel 등이 원인이며, 전체 검색의 약 60%가 제로클릭입니다." },
      { question: "AI 검색이 기존 웹사이트 트래픽에 미치는 영향은?", answer: "AI가 직접 답변을 제공하면서 일부 웹사이트의 유기적 트래픽이 감소하는 추세입니다. 하지만 AI 출처로 인용되는 사이트는 오히려 고품질 트래픽을 확보할 수 있습니다." },
      { question: "SEO가 완전히 쓸모없어지나요?", answer: "아닙니다. SEO는 여전히 검색 노출의 기본입니다. 다만 SEO만으로는 충분하지 않으며, AEO와 GEO를 함께 적용하여 AI 검색 시대에 대비해야 합니다." },
      { question: "AI 검색 시대에 콘텐츠 전략은 어떻게 바뀌어야 하나요?", answer: "짧은 키워드 나열 대신 깊이 있는 분석, 독창적 인사이트, Q&A 형식의 구조화된 콘텐츠가 중요해집니다. AI가 인용할 만한 신뢰성 있는 데이터와 전문성을 갖춘 콘텐츠를 작성하세요." },
      { question: "어떤 업종이 AI 검색 변화에 가장 큰 영향을 받나요?", answer: "정보 검색이 많은 업종(건강, 법률, 금융, 기술)이 가장 큰 영향을 받습니다. '~란 무엇인가', '~하는 방법' 등 정보성 쿼리가 많은 분야일수록 AI 답변으로 대체될 가능성이 높습니다." },
    ],
    content: `## AI 검색 시대의 도래

2026년 현재, 검색 환경은 근본적으로 변화한 상태입니다. Google은 SGE(Search Generative Experience)를 통해 검색 결과 상단에 AI 생성 답변을 표시하고, ChatGPT와 Perplexity 같은 대화형 AI가 검색 도구로 자리잡았습니다.

## SEO만으로 부족한 이유

### 1. 제로클릭 검색 증가
AI가 직접 답변을 제공하면서 사용자가 웹사이트를 방문하지 않는 "제로클릭 검색"이 급증하고 있습니다.

### 2. AI 답변의 출처 편향
AI는 신뢰도 높은 소수의 출처를 반복적으로 인용하는 경향이 있어, SEO 순위가 높아도 AI 인용에서 제외될 수 있습니다.

### 3. 새로운 경쟁 구도
AI 검색에서의 노출은 기존 SEO와 다른 기준으로 결정됩니다. 콘텐츠의 구조화, 직접적 답변 제공, 신뢰도 신호 등이 새로운 경쟁 요소입니다.

## 대응 방안: SEO + AEO + GEO

전통적 SEO를 기반으로 AEO(Answer Engine Optimization)와 GEO(Generative Engine Optimization)를 통합적으로 접근해야 합니다.

SearchTune OS는 이 세 가지 축을 한 번에 분석하여 종합적인 검색 최적화 전략을 수립할 수 있도록 돕습니다.`,
  },
  {
    slug: "naver-search-advisor-guide",
    title: "네이버 서치어드바이저 완벽 가이드: 사이트 등록부터 최적화까지",
    excerpt:
      "네이버 검색 노출의 첫걸음, 서치어드바이저(구 웹마스터도구)에 사이트를 등록하고 최적화하는 전 과정을 단계별로 안내합니다.",
    category: "SEO",
    author: "서치튠 블로거",
    date: "2026-04-02",
    thumbnail: "/placeholder.svg",
    readTime: "10분",
    faqs: [
      { question: "네이버 서치어드바이저에 등록하면 바로 검색에 노출되나요?", answer: "등록 후 네이버 크롤러가 사이트를 방문하고 색인하는 데 수일에서 수 주가 소요될 수 있습니다. 사이트맵 제출과 수집 요청 API를 활용하면 색인 속도를 높일 수 있습니다." },
      { question: "서치어드바이저 소유 확인 방법 중 어떤 것이 가장 쉬운가요?", answer: "HTML 태그 방식이 가장 간편합니다. 제공된 meta 태그를 사이트 head에 추가하기만 하면 됩니다. CMS를 사용한다면 대부분 플러그인으로 쉽게 추가할 수 있습니다." },
      { question: "네이버 서치어드바이저와 구글 서치 콘솔을 둘 다 등록해야 하나요?", answer: "네, 한국 시장을 타겟으로 한다면 두 가지 모두 등록하는 것이 필수입니다. 네이버와 구글은 별개의 크롤링·색인 시스템을 운영하므로 각각 등록해야 합니다." },
      { question: "IndexNow를 적용하면 어떤 이점이 있나요?", answer: "콘텐츠를 새로 작성하거나 수정할 때 네이버에 즉시 알릴 수 있어 색인 반영 속도가 크게 향상됩니다. 네이버가 공식 지원하는 프로토콜이므로 안정적으로 사용할 수 있습니다." },
      { question: "기존 신디케이션 방식은 더 이상 사용할 수 없나요?", answer: "네이버는 기존 신디케이션 방식에서 수집 요청 API로 전환을 완료했습니다. 수집 요청 API는 URL 목록만 전달하면 네이버 크롤러가 직접 페이지를 방문하는 더 효율적인 방식입니다." },
    ],
    content: `## 네이버 서치어드바이저란?

네이버 서치어드바이저(Naver Search Advisor)는 네이버 검색에서 웹사이트를 효과적으로 노출시키기 위한 **공식 웹마스터 도구**입니다. Google Search Console의 네이버 버전이라고 이해하면 됩니다.

## 왜 서치어드바이저 등록이 필수인가?

네이버는 한국 검색 시장의 약 50%를 차지하고 있습니다. 네이버 검색에 웹사이트가 노출되려면 서치어드바이저를 통한 사이트 등록이 **필수적**입니다.

- 크롤링 요청으로 빠른 색인 가능
- 검색 노출 현황 리포트 제공
- 콘텐츠 노출/클릭 데이터 분석
- 사이트 오류 진단

## 사이트 등록 단계

### 1. 서치어드바이저 접속

searchadvisor.naver.com에 접속하여 네이버 계정으로 로그인합니다.

### 2. 사이트 추가

"사이트 관리" > "사이트 추가"에서 웹사이트 URL을 입력합니다. https:// 프로토콜을 포함해서 정확히 입력하세요.

### 3. 소유 확인

다음 방법 중 하나로 사이트 소유권을 확인합니다:

- **HTML 파일 업로드**: 제공된 HTML 파일을 루트 디렉토리에 업로드
- **HTML 태그**: meta 태그를 head에 추가
- **DNS 레코드**: 도메인 DNS에 TXT 레코드 추가

### 4. 사이트맵 제출

sitemap.xml 파일을 제출하여 네이버가 사이트 구조를 파악할 수 있도록 합니다.

## 수집 요청 API

네이버는 기존 신디케이션 방식에서 **수집 요청 API**로 전환을 완료했습니다. 수집 요청 API는 URL 목록만 전달하면 네이버 검색로봇이 직접 해당 페이지를 방문하여 크롤링하는 구조입니다.

### 수집 요청 API 장점

- 웹페이지의 **모든 정보**(헤더, 링크, 이미지, 구조화 데이터)를 검색로봇이 직접 수집
- 신디케이션 대비 트래픽 부하 감소
- SEO 관점의 풍부한 정보 활용 가능

## IndexNow 프로토콜 지원

네이버는 **IndexNow 프로토콜**을 공식 지원합니다. IndexNow를 통해 콘텐츠 변경 시 네이버에 즉시 알릴 수 있어 색인 속도가 크게 향상됩니다.

> 네이버 검색 노출은 서치어드바이저 등록에서 시작됩니다. SearchTune OS로 네이버 SEO 상태를 진단해보세요.`,
  },
  {
    slug: "naver-seo-optimization-tips",
    title: "네이버 SEO 최적화 핵심 팁 7가지",
    excerpt:
      "구글과 다른 네이버 검색 알고리즘의 특성을 이해하고, 네이버에서 상위 노출되기 위한 핵심 최적화 전략을 정리합니다.",
    category: "가이드",
    author: "서치튠 블로거",
    date: "2026-03-30",
    thumbnail: "/placeholder.svg",
    readTime: "8분",
    faqs: [
      { question: "네이버 SEO와 구글 SEO의 가장 큰 차이점은?", answer: "네이버는 자체 플랫폼(블로그, 카페, 지식iN) 콘텐츠를 우선 노출하는 반면, 구글은 웹 전체를 대상으로 합니다. 네이버는 Open Graph 태그를 적극 활용하고, 모바일 최적화를 더 중시합니다." },
      { question: "네이버 블로그가 없어도 네이버 검색에 노출될 수 있나요?", answer: "네, 웹 검색 영역에서 외부 사이트도 노출됩니다. 서치어드바이저에 사이트를 등록하고 사이트맵을 제출하면 됩니다. 다만 블로그·카페 영역에는 네이버 플랫폼 콘텐츠만 노출됩니다." },
      { question: "네이버에서 E-E-A-T는 어떻게 평가되나요?", answer: "네이버도 콘텐츠의 전문성, 경험, 권위, 신뢰를 중시합니다. 저자 정보 명시, 출처 제공, 깊이 있는 전문 콘텐츠 작성, 그리고 사이트의 지속적 업데이트가 중요합니다." },
      { question: "네이버 SEO에서 Open Graph 태그가 왜 중요한가요?", answer: "네이버는 og:title, og:description, og:image 태그를 검색 결과 표시와 SNS 공유 시 적극 활용합니다. 잘 작성된 OG 태그는 네이버 검색 결과에서의 CTR을 크게 높일 수 있습니다." },
      { question: "네이버에서 사이트맵 제출은 어떻게 하나요?", answer: "서치어드바이저에 로그인한 후 '요청' > '사이트맵 제출'에서 sitemap.xml URL을 제출합니다. RSS 피드도 별도로 등록할 수 있어 콘텐츠 발견 속도를 높일 수 있습니다." },
    ],
    content: `## 네이버 검색은 구글과 다르다

네이버는 자체 콘텐츠 플랫폼(블로그, 카페, 지식iN)을 우선 노출하는 경향이 있지만, **웹 검색 영역**에서의 외부 사이트 노출도 점점 중요해지고 있습니다.

## 7가지 핵심 최적화 전략

### 1. 서치어드바이저에 사이트 등록

가장 기본적이면서도 중요한 단계입니다. 사이트를 등록하지 않으면 네이버 검색에 노출되기 어렵습니다.

### 2. 사이트맵(sitemap.xml) 제출

서치어드바이저에 사이트맵을 제출하여 네이버 크롤러가 모든 페이지를 발견할 수 있도록 합니다.

### 3. 모바일 최적화 필수

네이버 검색의 **70% 이상이 모바일**에서 이루어집니다. 반응형 디자인과 빠른 로딩 속도가 필수입니다.

### 4. 콘텐츠 품질에 집중

네이버도 구글과 마찬가지로 **E-E-A-T**(경험, 전문성, 권위, 신뢰)를 중시합니다. 깊이 있고 독창적인 콘텐츠를 작성하세요.

### 5. 구조화 데이터 적용

네이버도 Schema.org 기반 구조화 데이터를 인식합니다. 특히 FAQPage, Article, WebSite 스키마가 효과적입니다.

### 6. Open Graph 메타 태그 최적화

네이버는 og:title, og:description, og:image 메타 태그를 적극 활용합니다. SNS 공유 시에도 효과적입니다.

### 7. IndexNow 프로토콜 적용

네이버가 공식 지원하는 IndexNow를 적용하면 새 콘텐츠나 수정된 콘텐츠가 **즉시 네이버에 반영**됩니다.

## 네이버 웹 검색 결과 강화

네이버는 웹 검색 결과의 정보를 더 풍부하게 표시하는 방향으로 발전하고 있습니다. 서치어드바이저의 URL 검사 기능을 활용하여 페이지별 색인 상태와 개선점을 확인하세요.

> 네이버와 구글, 두 검색엔진 모두에서 좋은 성과를 내려면 SearchTune OS로 통합 분석해보세요.`,
  },
  {
    slug: "naver-cue-geo-strategy",
    title: "Naver Cue: 시대의 GEO 전략 — 네이버 AI 검색 대비하기",
    excerpt:
      "네이버의 AI 검색 서비스 Cue:에서 브랜드가 출처로 인용되기 위한 GEO 전략과 준비 방법을 알아봅니다.",
    category: "GEO",
    author: "서치튠 블로거",
    date: "2026-03-22",
    thumbnail: "/placeholder.svg",
    readTime: "9분",
    faqs: [
      { question: "Naver Cue:와 Google SGE의 가장 큰 차이점은?", answer: "Cue:는 네이버 검색 인덱스와 자체 플랫폼(블로그, 카페) 콘텐츠를 기반으로 작동하며 한국어에 최적화되어 있습니다. SGE는 구글의 글로벌 웹 인덱스를 기반으로 다국어를 지원합니다." },
      { question: "Naver Cue:에서 인용되려면 네이버 블로그가 꼭 있어야 하나요?", answer: "필수는 아닙니다. 서치어드바이저에 등록된 외부 웹사이트도 Cue:의 출처로 인용될 수 있습니다. 다만 양질의 한국어 콘텐츠와 구조화된 정보 제공이 필요합니다." },
      { question: "Cue: 최적화를 위해 네이버 크롤러(Yeti)를 어떻게 설정해야 하나요?", answer: "robots.txt에서 User-agent: Yeti의 Disallow 규칙이 없는지 확인하세요. 기본적으로 차단하지 않으면 Yeti가 자유롭게 크롤링할 수 있습니다." },
      { question: "한국어 콘텐츠가 아니면 Cue:에 노출되기 어려운가요?", answer: "Cue:는 한국어 사용자를 대상으로 하므로, 한국어 콘텐츠가 영문 콘텐츠보다 인용될 가능성이 높습니다. 글로벌 사이트라면 한국어 버전을 별도로 운영하는 것이 좋습니다." },
      { question: "Google SGE와 Naver Cue: 두 가지를 동시에 대비할 수 있나요?", answer: "네, 구조화 데이터 적용, 고품질 콘텐츠 작성, AI 크롤러 허용 등 공통 작업이 많습니다. 다만 Google은 영문 콘텐츠에, Naver는 한국어 콘텐츠에 각각 최적화하는 이중 전략이 효과적입니다." },
    ],
    content: `## Naver Cue:란?

Naver Cue:는 네이버의 **생성형 AI 검색 서비스**입니다. 사용자의 질문에 대해 웹 콘텐츠를 기반으로 AI가 종합적인 답변을 생성하며, 출처 링크를 함께 제공합니다.

## Cue:에서 인용되려면?

### 1. 네이버 크롤러 접근 보장

네이버 검색로봇(Yeti)이 사이트를 자유롭게 크롤링할 수 있어야 합니다. robots.txt에서 Yeti를 차단하지 않았는지 확인하세요.

### 2. 서치어드바이저 등록 및 사이트맵 제출

Cue:는 네이버 검색 인덱스를 기반으로 작동합니다. 서치어드바이저에 사이트를 등록하고 사이트맵을 제출하는 것이 전제 조건입니다.

### 3. 깊이 있는 한국어 콘텐츠

Cue:는 한국어 사용자를 타겟으로 합니다. **자연스럽고 깊이 있는 한국어 콘텐츠**가 인용 확률을 높입니다.

### 4. 전문성과 신뢰도 확보

- 저자 정보를 명시하세요
- 데이터와 출처를 구체적으로 제공하세요
- 정기적으로 콘텐츠를 업데이트하세요

### 5. 구조화된 콘텐츠 형식

Q&A, 리스트, 테이블 형식으로 콘텐츠를 구조화하면 AI가 정보를 추출하기 쉬워집니다.

## Google SGE와의 차이점

| 구분 | Naver Cue: | Google SGE |
|------|-----------|------------|
| 언어 | 한국어 중심 | 다국어 |
| 데이터 소스 | 네이버 인덱스 + 자체 플랫폼 | 구글 검색 인덱스 |
| 특징 | 네이버 블로그/카페 콘텐츠 우선 | 웹 전체 탐색 |
| 최적화 기본 | 서치어드바이저 등록 | Google Search Console |

## 이중 GEO 전략

한국 시장에서는 **Google SGE와 Naver Cue: 두 가지 모두**에 대비해야 합니다. 글로벌 콘텐츠는 구글 대응, 한국어 콘텐츠는 네이버 대응으로 이중 전략을 수립하세요.

> SearchTune OS의 GEO 분석으로 Google과 Naver AI 검색 모두에 대한 준비도를 확인하세요.`,
  },
  {
    slug: "imweb-seo-guide",
    title: "아임웹(imweb) SEO 최적화 완벽 가이드: 한계와 극복 전략",
    excerpt:
      "아임웹으로 만든 웹사이트의 SEO 한계점을 파악하고, 검색 노출을 극대화하기 위한 실전 최적화 전략을 단계별로 안내합니다.",
    category: "가이드",
    author: "서치튠 블로거",
    date: "2026-04-02",
    thumbnail: "/placeholder.svg",
    readTime: "11분",
    faqs: [
      { question: "아임웹으로 만든 사이트도 구글 검색에 노출될 수 있나요?", answer: "네, 가능합니다. 아임웹은 기본적인 SEO 설정(메타 태그, 사이트맵 자동 생성)을 지원합니다. 다만 코드 수준의 세부 최적화에 한계가 있으므로 제공되는 SEO 설정을 최대한 활용해야 합니다." },
      { question: "아임웹의 SEO 주요 한계점은 무엇인가요?", answer: "HTML 구조 직접 수정 불가, 서버 사이드 렌더링(SSR) 미지원, JavaScript 렌더링 의존성, 페이지 로딩 속도 제어 제한, 그리고 구조화 데이터 커스터마이징 제한이 주요 한계점입니다." },
      { question: "아임웹에서 구조화 데이터(JSON-LD)를 추가할 수 있나요?", answer: "아임웹의 '머리글 코드 삽입' 기능을 통해 JSON-LD 스크립트를 직접 추가할 수 있습니다. Organization, FAQPage 등의 스키마를 수동으로 작성하여 삽입하세요." },
      { question: "아임웹 사이트의 페이지 속도를 개선하려면?", answer: "이미지를 업로드 전 압축(TinyPNG 등)하고, 불필요한 위젯/섹션을 줄이며, 외부 스크립트를 최소화하세요. 아임웹 자체 CDN을 활용하되 과도한 애니메이션은 피하는 것이 좋습니다." },
      { question: "아임웹과 카페24 중 SEO에 더 유리한 플랫폼은?", answer: "카페24가 HTML 직접 수정, 서버 설정 접근 등 기술적 SEO 자유도가 높습니다. 반면 아임웹은 비개발자 친화적이며 기본 SEO 설정이 쉽습니다. 콘텐츠 중심 사이트는 아임웹, 대규모 쇼핑몰은 카페24가 유리합니다." },
      { question: "아임웹에서 네이버 서치어드바이저 등록은 어떻게 하나요?", answer: "아임웹 관리자 > 환경설정 > SEO 설정에서 네이버 서치어드바이저 인증 메타 태그를 추가할 수 있습니다. 사이트맵은 아임웹이 자동 생성하므로 해당 URL을 서치어드바이저에 제출하면 됩니다." },
    ],
    content: `## 아임웹(imweb)이란?

아임웹은 코딩 없이 웹사이트를 만들 수 있는 한국형 노코드 웹빌더입니다. 드래그 앤 드롭 방식으로 쉽게 사이트를 구축할 수 있어 소규모 비즈니스, 포트폴리오, 브랜딩 사이트에 많이 사용됩니다.

## 아임웹 SEO의 현실

아임웹은 편의성이 뛰어나지만, SEO 관점에서는 몇 가지 구조적 한계가 있습니다.

### 장점
- 메타 태그(title, description) 페이지별 설정 가능
- sitemap.xml 자동 생성
- SSL(HTTPS) 기본 지원
- 모바일 반응형 디자인 기본 제공
- Open Graph 태그 설정 가능

### 한계점
- **HTML 구조 직접 수정 불가**: 시맨틱 태그 최적화에 제한
- **JavaScript 렌더링 의존**: 검색엔진 크롤러가 콘텐츠를 파싱하기 어려울 수 있음
- **페이지 속도 제어 제한**: 서버 응답 시간, 코드 최적화에 제약
- **URL 구조 제한**: 일부 URL 패턴이 SEO에 최적화되어 있지 않음
- **구조화 데이터 제한**: 기본 제공 스키마가 제한적

## 아임웹 SEO 최적화 전략

### 1. 메타 태그 철저히 작성

모든 페이지에 고유한 title(60자 이내)과 description(155자 이내)을 작성하세요. 아임웹 관리자의 각 페이지 설정에서 직접 입력할 수 있습니다.

### 2. 이미지 최적화

아임웹에 업로드하기 전에 이미지를 압축하고, ALT 텍스트를 모든 이미지에 추가하세요. 아임웹의 이미지 위젯에서 ALT 텍스트를 설정할 수 있습니다.

### 3. 머리글 코드 삽입 활용

아임웹의 '머리글에 코드 삽입' 기능으로 구조화 데이터(JSON-LD), Google Analytics, 서치 콘솔 인증 코드 등을 추가할 수 있습니다.

### 4. 콘텐츠 전략 강화

기술적 SEO 한계를 콘텐츠 품질로 보완하세요. 블로그 기능을 적극 활용하여 타겟 키워드에 대한 깊이 있는 글을 작성합니다.

### 5. 외부 도구 연동

Google Search Console과 네이버 서치어드바이저를 반드시 연동하여 색인 상태를 모니터링하세요.

## AEO·GEO 관점에서의 아임웹

아임웹 사이트도 FAQ 스키마를 머리글 코드로 삽입하면 AEO 점수를 높일 수 있습니다. 다만 AI 크롤러의 JavaScript 렌더링 처리 능력에 따라 GEO 효과가 달라질 수 있습니다.

> SearchTune OS로 아임웹 사이트의 SEO·AEO·GEO 점수를 진단하고 개선 포인트를 확인하세요.`,
  },
  {
    slug: "cafe24-seo-guide",
    title: "카페24 쇼핑몰 SEO 완벽 가이드: 매출을 올리는 검색 최적화",
    excerpt:
      "카페24로 운영하는 쇼핑몰의 검색 노출을 극대화하는 SEO 전략을 소개합니다. 상품 페이지 최적화부터 구조화 데이터까지 실전 가이드입니다.",
    category: "가이드",
    author: "서치튠 블로거",
    date: "2026-03-27",
    thumbnail: "/placeholder.svg",
    readTime: "12분",
    faqs: [
      { question: "카페24 쇼핑몰도 구글에서 상위 노출이 가능한가요?", answer: "네, 카페24는 HTML 직접 수정이 가능하고 SEO 관련 앱/플러그인이 다양하여 체계적으로 최적화하면 구글과 네이버 모두에서 좋은 노출 성과를 낼 수 있습니다." },
      { question: "카페24에서 상품 페이지 SEO를 하려면 무엇이 가장 중요한가요?", answer: "고유한 상품명을 title 태그에 포함하고, 상품 설명을 200자 이상 작성하며, 상품 이미지에 ALT 텍스트를 추가하는 것이 가장 기본적이고 중요합니다. Product 스키마 마크업도 추가하면 리치 스니펫이 표시됩니다." },
      { question: "카페24의 SEO 한계점은 무엇인가요?", answer: "카페24는 HTML 수정이 가능하지만, 스킨(테마) 구조에 따라 시맨틱 HTML이 깨질 수 있고, 동적 URL 파라미터 관리가 복잡합니다. 또한 페이지 속도 최적화에 서버 레벨 제약이 있을 수 있습니다." },
      { question: "카페24에서 구조화 데이터(JSON-LD)는 어떻게 추가하나요?", answer: "카페24 관리자 > 디자인 > 스킨 편집에서 HTML을 직접 수정하여 JSON-LD 스크립트를 추가할 수 있습니다. Product, BreadcrumbList, Organization 스키마를 우선 적용하세요." },
      { question: "카페24 쇼핑몰에서 블로그/콘텐츠 마케팅을 해야 하나요?", answer: "강력 추천합니다. 상품만으로는 정보성 키워드를 잡기 어렵습니다. 카페24 게시판이나 외부 블로그를 활용해 구매 가이드, 비교 콘텐츠 등을 작성하면 유기적 트래픽과 전환율을 동시에 높일 수 있습니다." },
      { question: "카페24와 Shopify 중 SEO에 더 유리한 플랫폼은?", answer: "Shopify는 글로벌 SEO 앱 생태계가 풍부하고, 카페24는 한국 시장(네이버)에 특화되어 있습니다. 국내 시장 중심이라면 카페24, 글로벌 판매라면 Shopify가 유리합니다." },
    ],
    content: `## 카페24와 SEO

카페24는 한국 최대 이커머스 플랫폼으로, 약 200만 개 이상의 쇼핑몰이 운영되고 있습니다. 카페24는 HTML/CSS 직접 수정이 가능하여 다른 한국형 빌더 대비 **SEO 자유도가 높은** 편입니다.

## 카페24 SEO의 강점

- **HTML/CSS 직접 편집**: 시맨틱 태그, 구조화 데이터 직접 추가 가능
- **커스텀 URL 설정**: 상품/카테고리 URL 구조 최적화 가능
- **다양한 SEO 앱**: 마켓플레이스에서 SEO 관련 앱 설치 가능
- **네이버 쇼핑 연동**: EP(Engine Page) 연동으로 네이버 쇼핑 노출
- **SSL 기본 지원**: HTTPS 적용

## 상품 페이지 SEO 체크리스트

### 1. Title 태그 최적화

\`[상품명] - [핵심 키워드] | [브랜드명]\` 형식으로 작성하세요.

### 2. 상품 설명 충실히 작성

- 최소 200자 이상의 고유한 상품 설명
- 타겟 키워드를 자연스럽게 포함
- 사용법, 소재, 사이즈 등 상세 정보 제공
- 복사-붙여넣기 설명 지양 (중복 콘텐츠 페널티)

### 3. 이미지 ALT 텍스트

모든 상품 이미지에 설명적인 ALT 텍스트를 추가하세요. "상품1.jpg" 대신 "네이비 울 오버핏 코트 정면" 처럼 구체적으로 작성합니다.

### 4. Product 구조화 데이터

상품 페이지에 Product 스키마를 추가하면 검색 결과에 **가격, 재고, 리뷰 별점**이 표시되어 CTR이 크게 향상됩니다.

### 5. 카테고리 페이지 최적화

카테고리 페이지에도 고유한 title, description, 소개 텍스트를 추가하세요. 많은 쇼핑몰이 카테고리 페이지의 SEO를 놓치고 있습니다.

## 네이버 쇼핑 SEO

카페24의 네이버 쇼핑 EP 연동을 통해 네이버 쇼핑 검색에 상품을 노출시킬 수 있습니다.

- **상품명 최적화**: 네이버 쇼핑에서는 상품명이 검색 매칭의 핵심
- **카테고리 정확히 매핑**: 네이버 쇼핑 카테고리와 정확히 일치시키기
- **리뷰 확보**: 리뷰 수와 평점이 네이버 쇼핑 순위에 영향

## 페이지 속도 최적화

카페24 스킨의 불필요한 JavaScript를 정리하고, 이미지를 WebP로 변환하여 업로드하세요. 스킨 편집에서 lazy loading을 적용하면 초기 로딩 속도가 개선됩니다.

## AEO·GEO 관점

카페24 쇼핑몰도 FAQ 스키마를 상품 페이지에 추가하면 AI 검색에서 인용될 수 있습니다. "이 제품은 어떤 소재인가요?", "사이즈 가이드" 등 실제 고객 질문을 FAQ로 구조화하세요.

> SearchTune OS로 카페24 쇼핑몰의 SEO·AEO·GEO 현황을 무료로 진단해보세요.`,
  },
];

// Auto-calculate readTime based on content length
blogPosts.forEach((post) => {
  post.readTime = calcReadTime(post.content);
});

