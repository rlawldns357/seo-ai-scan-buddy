import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { buildSvgOg } from "../_shared/og-design-rulebook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * On-demand brand-safe SVG OG image.
 *
 * Used as a permanent fallback in BlogPost.tsx when og_image / thumbnail are
 * missing or broken. Always returns a valid 1200x630 SVG matching the brand
 * design rulebook — Korean text renders perfectly.
 *
 * Usage:
 *   GET /functions/v1/og-svg?slug=...
 *   GET /functions/v1/og-svg?title=...&category=...
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let title = url.searchParams.get("title") || "";
    let category = url.searchParams.get("category") || "가이드";
    const slug = url.searchParams.get("slug");

    // Look up post by slug if title not provided
    if (!title && slug) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data } = await supabase
        .from("blog_posts")
        .select("title, category")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        title = data.title;
        category = data.category || category;
      }
    }

    if (!title) title = "SearchTune OS";

    const svg = buildSvgOg({ title, category });

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("[og-svg] Error:", error);
    // Even on error, return a valid SVG so previews never break
    const svg = buildSvgOg({ title: "SearchTune OS", category: "가이드" });
    return new Response(svg, {
      headers: { ...corsHeaders, "Content-Type": "image/svg+xml; charset=utf-8" },
    });
  }
});
