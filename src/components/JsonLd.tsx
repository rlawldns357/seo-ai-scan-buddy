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
        url: SITE_URL,
        applicationCategory: "WebApplication",
        operatingSystem: "Web",
        description:
          "SEO, AEO, GEO 3개 독립 점수를 즉시 분석하는 웹사이트 진단 도구",
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
