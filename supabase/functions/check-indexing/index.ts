const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PERPLEXITY_API = "https://api.perplexity.ai/chat/completions";
const NAVER_SEARCH_API = "https://openapi.naver.com/v1/search/webkr.json";

interface GoogleResult {
  status: "confirmed" | "unknown";
  domainIndexed: boolean;
  domainPages: number;
  urlIndexed: boolean;
  checkUrl: string;
  topResults: { title: string; url: string }[];
}

async function checkGoogleViaPerplexity(
  domain: string,
  url: string,
  apiKey: string,
): Promise<GoogleResult> {
  const checkUrl = `https://www.google.com/search?q=site:${encodeURIComponent(domain)}`;

  const prompt = `Search Google for "site:${domain}" and tell me which pages from ${domain} are currently indexed by Google. Return up to 5 indexed page URLs and their titles. If no pages are indexed, say so explicitly.`;

  try {
    const res = await fetch(PERPLEXITY_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content:
              "You are a search index checker. Use only real Google search results. Be concise and factual.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0,
        max_tokens: 600,
        search_domain_filter: [domain],
        return_citations: true,
      }),
    });

    if (!res.ok) {
      console.error("Perplexity API error:", res.status, await res.text());
      return {
        status: "unknown",
        domainIndexed: false,
        domainPages: 0,
        urlIndexed: false,
        checkUrl,
        topResults: [],
      };
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const citations: string[] = Array.isArray(data?.citations)
      ? data.citations
      : Array.isArray(data?.search_results)
      ? data.search_results.map((r: any) => r?.url).filter(Boolean)
      : [];

    // Filter citations that belong to the target domain
    const domainCitations = citations.filter((c) => {
      try {
        const host = new URL(c).hostname;
        return host === domain || host.endsWith(`.${domain}`);
      } catch {
        return false;
      }
    });

    // Try to extract titles from search_results if present
    const searchResults: any[] = Array.isArray(data?.search_results)
      ? data.search_results
      : [];
    const topResults = domainCitations.slice(0, 3).map((u) => {
      const match = searchResults.find((r: any) => r?.url === u);
      return {
        title: match?.title || u.replace(/^https?:\/\//, ""),
        url: u,
      };
    });

    const normalizedTarget = url.replace(/\/$/, "").toLowerCase();
    const exactMatch = domainCitations.some(
      (c) => c.replace(/\/$/, "").toLowerCase() === normalizedTarget,
    );

    // Detect "not indexed" phrasing in the answer as a negative signal
    const negativeSignal = /not\s+indexed|no\s+pages|not\s+found|appears\s+not/i.test(
      content,
    );

    const indexed = domainCitations.length > 0 && !negativeSignal;

    return {
      status: indexed || domainCitations.length > 0 ? "confirmed" : "unknown",
      domainIndexed: indexed,
      domainPages: domainCitations.length,
      urlIndexed: exactMatch,
      checkUrl,
      topResults,
    };
  } catch (e) {
    console.error("Perplexity check failed:", e);
    return {
      status: "unknown",
      domainIndexed: false,
      domainPages: 0,
      urlIndexed: false,
      checkUrl,
      topResults: [],
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let domain: string;
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return new Response(JSON.stringify({ error: "Invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const perplexityKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!perplexityKey) {
      return new Response(
        JSON.stringify({ error: "PERPLEXITY_API_KEY not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const naverClientId = Deno.env.get("NAVER_CLIENT_ID");
    const naverClientSecret = Deno.env.get("NAVER_CLIENT_SECRET");
    const hasNaverApi = !!(naverClientId && naverClientSecret);

    const naverCheckUrl = `https://search.naver.com/search.naver?query=site%3A${encodeURIComponent(domain)}`;

    // Run Google (Perplexity) and Naver in parallel
    const [googleResult, naverResponse] = await Promise.all([
      checkGoogleViaPerplexity(domain, url, perplexityKey),
      hasNaverApi
        ? fetch(
            `${NAVER_SEARCH_API}?query=${encodeURIComponent(domain)}&display=10&start=1`,
            {
              method: "GET",
              headers: {
                "X-Naver-Client-Id": naverClientId!,
                "X-Naver-Client-Secret": naverClientSecret!,
              },
            },
          )
        : Promise.resolve(null),
    ]);

    let naverResult: {
      checkUrl: string;
      domainFound: boolean;
      resultCount: number;
      topResults: { title: string; url: string }[];
    } = {
      checkUrl: naverCheckUrl,
      domainFound: false,
      resultCount: 0,
      topResults: [],
    };

    if (naverResponse) {
      try {
        const naverData = await naverResponse.json();
        const items: any[] = Array.isArray(naverData?.items) ? naverData.items : [];
        const domainMatches = items.filter((item: any) => {
          try {
            const itemHost = new URL(item.link).hostname;
            return itemHost === domain || itemHost.endsWith(`.${domain}`);
          } catch {
            return false;
          }
        });
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
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        google: googleResult,
        naver: naverResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("check-indexing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
