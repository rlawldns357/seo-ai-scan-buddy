import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

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

    // Run Google search for site:domain and site:exact-url in parallel
    const [domainRes, exactRes] = await Promise.all([
      fetch(`${FIRECRAWL_V2}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `site:${domain}`,
          limit: 5,
          lang: "ko",
          country: "KR",
        }),
      }),
      fetch(`${FIRECRAWL_V2}/search`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `site:${url}`,
          limit: 3,
          lang: "ko",
          country: "KR",
        }),
      }),
    ]);

    const domainData = await domainRes.json();
    const exactData = await exactRes.json();

    // Count results
    const domainResults = domainData?.data?.length || 0;
    const exactResults = exactData?.data?.length || 0;

    // Check if exact URL appears in domain results
    const normalizedUrl = url.replace(/\/$/, "").toLowerCase();
    const exactMatch = (domainData?.data || []).some(
      (r: any) => r.url?.replace(/\/$/, "").toLowerCase() === normalizedUrl,
    ) || exactResults > 0;

    return new Response(
      JSON.stringify({
        success: true,
        google: {
          domainIndexed: domainResults > 0,
          domainPages: domainResults,
          urlIndexed: exactMatch,
          topResults: (domainData?.data || []).slice(0, 3).map((r: any) => ({
            title: r.title,
            url: r.url,
          })),
        },
        naver: {
          checkUrl: `https://search.naver.com/search.naver?query=site%3A${encodeURIComponent(domain)}`,
        },
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
