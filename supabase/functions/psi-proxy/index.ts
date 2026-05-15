import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logApiCost } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, strategy = "mobile" } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("PSI_API_KEY");
    if (!apiKey) {
      console.error("PSI_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
    const validStrategy = strategy === "desktop" ? "desktop" : "mobile";
    const params = new URLSearchParams({
      url,
      key: apiKey,
      category: "performance",
      strategy: validStrategy,
    });
    ["accessibility", "best-practices", "seo"].forEach((c) =>
      params.append("category", c)
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);

    let res: Response;
    try {
      res = await fetch(`${endpoint}?${params.toString()}`, {
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeout);
      const msg = fetchErr instanceof Error ? fetchErr.message : "Fetch failed";
      if (msg.includes("aborted")) {
        return new Response(
          JSON.stringify({ status: 408, body: { error: { message: "TIMEOUT" } } }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      throw fetchErr;
    }
    clearTimeout(timeout);

    const body = await res.json();

    // Cost log: PSI is free up to 25k/day quota
    logApiCost({
      function_name: "psi-proxy",
      model: "google/psi",
      requests: 1,
      metadata: { strategy: validStrategy, status: res.status, free_quota: true },
    });

    return new Response(JSON.stringify({ status: res.status, body }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("psi-proxy error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
