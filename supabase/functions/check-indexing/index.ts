const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";
const NAVER_SEARCH_API = "https://openapi.naver.com/v1/search/webkr.json";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract domain from URL
    let domain: string;
    try {
      domain = new URL(url).hostname;
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Naver API credentials (optional — graceful fallback if not set)
    const naverClientId = Deno.env.get("NAVER_CLIENT_ID");
    const naverClientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
    const hasNaverApi = !!(naverClientId && naverClientSecret);

    // Build parallel requests
    // Google: only one query (site:domain), no lang/country to avoid false negatives
    const promises: Promise<Response>[] = [
      fetch(`${FIRECRAWL_V2}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `site:${domain}`,
          limit: 10,
        }),
      }),
    ];

    // Naver search (if credentials available)
    if (hasNaverApi) {
      const naverQuery = encodeURIComponent(domain);
      promises.push(
        fetch(`${NAVER_SEARCH_API}?query=${naverQuery}&display=10&start=1`, {
          method: "GET",
          headers: {
            "X-Naver-Client-Id": naverClientId!,
            "X-Naver-Client-Secret": naverClientSecret!,
          },
        }),
      );
    }

    const responses = await Promise.all(promises);
    const domainData = await responses[0].json();

    // Google results
    const domainList: any[] = Array.isArray(domainData?.data) ? domainData.data : [];
    const domainResults = domainList.length;

    const normalizedUrl = url.replace(/\/$/, "").toLowerCase();
    const exactMatch = domainList.some(
      (r: any) => r.url?.replace(/\/$/, "").toLowerCase() === normalizedUrl,
    );

    // Status: confirmed (>=1 result) | unknown (0 results, can't auto-verify)
    const googleStatus: "confirmed" | "unknown" =
      domainResults > 0 ? "confirmed" : "unknown";

    // Naver results
    let naverResult: {
      checkUrl: string;
      domainFound: boolean;
      resultCount: number;
      topResults: { title: string; url: string }[];
    };

    const naverCheckUrl = `https://search.naver.com/search.naver?query=site%3A${encodeURIComponent(domain)}`;

    if (hasNaverApi && responses[1]) {
      try {
        const naverData = await responses[1].json();
        const items: any[] = Array.isArray(naverData?.items) ? naverData.items : [];

        // Filter results that contain the domain in the link
        const domainMatches = items.filter(
          (item: any) => {
            try {
              const itemHost = new URL(item.link).hostname;
              return itemHost === domain || itemHost.endsWith(`.${domain}`);
            } catch {
              return false;
            }
          }
        );

        // Strip HTML tags from title
        const stripHtml = (str: string) => str?.replace(/<[^>]*>/g, "") || "";

        naverResult = {
          checkUrl: naverCheckUrl,
          domainFound: domainMatches.length > 0,
          resultCount: domainMatches.length,
          topResults: domainMatches.slice(0, 3).map((item: any) => ({
            title: stripHtml(item.title),
            url: item.link,
          })),
        };
      } catch (e) {
        console.error("Naver API parse error:", e);
        naverResult = {
          checkUrl: naverCheckUrl,
          domainFound: false,
          resultCount: 0,
          topResults: [],
        };
      }
    } else {
      naverResult = {
        checkUrl: naverCheckUrl,
        domainFound: false,
        resultCount: 0,
        topResults: [],
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        google: {
          status: googleStatus,
          domainIndexed: domainResults > 0,
          domainPages: domainResults,
          urlIndexed: exactMatch,
          checkUrl: `https://www.google.com/search?q=site:${encodeURIComponent(domain)}`,
          topResults: domainList.slice(0, 3).map((r: any) => ({
            title: r.title,
            url: r.url,
          })),
        },
        naver: naverResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("check-indexing error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
