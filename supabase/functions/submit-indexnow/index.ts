import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// IndexNow key — also served as a static file at /indexnow-key.txt
const INDEXNOW_KEY = "e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5";
const SITE_URL = "https://searchtuneos.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Accept explicit URLs or fetch recent blog posts
    let urls: string[] = [];

    const body = await req.json().catch(() => ({}));

    if (body.urls && Array.isArray(body.urls)) {
      urls = body.urls;
    } else if (body.slug) {
      urls = [`${SITE_URL}/blog/${body.slug}`];
    } else {
      // Submit all blog posts published today
      const today = new Date().toISOString().slice(0, 10);
      const { data: posts } = await supabase
        .from("blog_posts")
        .select("slug")
        .eq("published", true)
        .eq("date", today);

      if (posts && posts.length > 0) {
        urls = posts.map((p: { slug: string }) => `${SITE_URL}/blog/${p.slug}`);
      }
    }

    if (urls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No URLs to submit" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`IndexNow: submitting ${urls.length} URL(s)`, urls);

    // Submit to IndexNow (Bing/Naver/Yandex all support this endpoint)
    const indexNowResponse = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: "searchtuneos.com",
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });

    const status = indexNowResponse.status;
    const responseText = await indexNowResponse.text();

    console.log(`IndexNow response: ${status}`, responseText);

    // 200 or 202 = success
    const success = status === 200 || status === 202;

    return new Response(
      JSON.stringify({
        success,
        indexnow_status: status,
        submitted_urls: urls,
        response: responseText || null,
      }),
      {
        status: success ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("IndexNow error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
