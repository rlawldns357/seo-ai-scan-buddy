const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

type ScrapedProduct = {
  title?: string;
  description?: string;
  price?: string;
  compare_at_price?: string;
  sale_label?: string;
  image_url?: string;
  keywords?: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY 미설정" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const url: string = (body?.url ?? "").toString().trim();
    if (!url || !/^https?:\/\//i.test(url) || url.length > 2000) {
      return new Response(JSON.stringify({ error: "유효한 URL이 필요해요" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const schema = {
      type: "object",
      properties: {
        title: { type: "string", description: "제품명. 브랜드명/사이트명은 제외하고 제품 자체 이름만." },
        description: { type: "string", description: "제품을 1~2문장으로 요약. 한국어." },
        price: { type: "string", description: "현재 판매 가격(할인 적용된 최종가). 예: 29,000원, ₩29,000, $29. 없으면 빈 문자열." },
        compare_at_price: { type: "string", description: "할인 전 원가/정가/소비자가. 취소선으로 표시되는 더 비싼 가격. 할인 표기가 없으면 빈 문자열." },
        sale_label: { type: "string", description: "행사/세일 라벨이 페이지에 명시돼 있으면 짧게(예: '오늘만', '단독특가', '브랜드위크', '재고소진임박'). 없으면 빈 문자열." },
        image_url: { type: "string", description: "대표 제품 이미지의 절대 URL. og:image 또는 메인 상품 사진." },
        keywords: {
          type: "array",
          items: { type: "string" },
          description: "이 제품과 관련된 한국어 키워드 5~10개 (카테고리/스타일/용도/소재 등). 짧고 검색 가능한 단어.",
        },
      },
    };

    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        onlyMainContent: true,
        formats: [
          { type: "json", schema, prompt: "상품 페이지에서 제품 정보를 추출하세요. 한국어 페이지면 한국어로 답하세요." },
        ],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error || `Firecrawl 오류 (${res.status})`;
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted: ScrapedProduct = data?.data?.json ?? data?.json ?? {};
    const meta = data?.data?.metadata ?? data?.metadata ?? {};

    const result: ScrapedProduct = {
      title: (extracted.title || meta.title || "").toString().trim().slice(0, 200),
      description: (extracted.description || meta.description || "").toString().trim().slice(0, 500),
      price: (extracted.price || "").toString().trim().slice(0, 50),
      compare_at_price: (extracted.compare_at_price || "").toString().trim().slice(0, 50),
      sale_label: (extracted.sale_label || "").toString().trim().slice(0, 30),
      image_url: (extracted.image_url || meta.ogImage || "").toString().trim().slice(0, 1000),
      keywords: Array.isArray(extracted.keywords)
        ? extracted.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 12)
        : [],
    };

    return new Response(JSON.stringify({ data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
