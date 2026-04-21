interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const SITE_URL = "https://searchtuneos.com";
const SITE_NAME = "서치튠OS";
const SITE_ALTERNATE_NAMES = ["SearchTune OS", "SearchTuneOS", "서치튠"];

export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        url: SITE_URL,
        description:
          "서치튠OS – URL만 입력하면 SEO, AEO, GEO 점수와 AI 검색 준비도를 빠르게 확인할 수 있어요.",
        inLanguage: "ko",
      }}
    />
  );
}

export function FAQPageJsonLd({
  faqs,
}: {
  faqs: { q: string; a: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.a,
          },
        })),
      }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        alternateName: SITE_ALTERNATE_NAMES,
        url: SITE_URL,
        applicationCategory: "WebApplication",
        operatingSystem: "Web",
        description:
          "서치튠OS(SearchTune OS)는 2026년 출시된 한국어 기반 AI 검색 진단 도구로, URL만 입력하면 SEO·AEO·GEO 3개 축의 점수를 즉시 분석합니다.",
        datePublished: "2026-01-15",
        dateModified: "2026-04-07",
        softwareVersion: "0.11.0-beta",
        featureList: [
          "SEO 기술 진단 (메타 태그, 구조화 데이터, Canonical, Sitemap)",
          "AEO 준비도 분석 (AI 답변 인용 가능성, Q&A 구조 평가)",
          "GEO 가시성 평가 (생성형 검색 출처 인용 준비도)",
          "Google Lighthouse v12 실측 (성능, 접근성, SEO)",
          "PDF 리포트 자동 생성 및 이메일 발송",
          "분석 엔진 2주 주기 자동 업데이트",
        ],
        author: {
          "@type": "Organization",
          name: "서치튠OS",
          url: SITE_URL,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
          description: "무료 베타",
        },
        inLanguage: "ko",
      }}
    />
  );
}
