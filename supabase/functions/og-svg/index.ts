import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { buildSvgOg } from "../_shared/og-design-rulebook.ts";
import { svgToPng } from "../_shared/og-png-renderer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * On-demand OG 이미지 폴백 endpoint.
 *
 * **항상 PNG 응답** (카카오톡 호환). 함수 이름은 호환성 유지.
 * - 룰북 SVG 빌드 → resvg-wasm + Pretendard ttf로 PNG 래스터라이즈
 * - 24h Cloudflare 캐시
 *
 * Usage:
 *   GET /functions/v1/og-svg?slug=...
 *   GET /functions/v1/og-svg?title=...&category=...
 *   GET /functions/v1/og-svg?slug=...&format=svg  ← 디버그용 SVG raw 출력
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
    const format = url.searchParams.get("format") || "png";

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

    const svg = buildSvgOg({ title, category, slug: slug || undefined });

    // 디버그용 — SVG raw 응답
    if (format === "svg") {
      return new Response(svg, {
        headers: {
          ...corsHeaders,
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // 기본 — PNG (카카오톡 호환)
    const png = await svgToPng(svg);
    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("[og-svg] Error:", error);
    // 에러여도 SVG 반환 (최후 폴백)
    const fallback = buildSvgOg({ title: "SearchTune OS", category: "가이드" });
    try {
      const png = await svgToPng(fallback);
      return new Response(png, {
        headers: { ...corsHeaders, "Content-Type": "image/png" },
      });
    } catch {
      return new Response(fallback, {
        headers: { ...corsHeaders, "Content-Type": "image/svg+xml; charset=utf-8" },
      });
    }
  }
});
