import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { buildAiOgPrompt, buildSvgOg, resolveStyle } from "../_shared/og-design-rulebook.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Detect garbled/missing Korean in AI-generated images is impossible without OCR.
 * Defensive strategy: try AI 1 model only (fast), and if it fails OR if user
 * passed `prefer_svg=true`, render the brand-safe SVG instead.
 *
 * Both AI image and SVG image are uploaded as PNG/SVG to og-images bucket and
 * stored to BOTH `og_image` AND `thumbnail` columns so blog list cards and
 * social previews share the same brand-consistent image.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const slug = body?.slug as string | undefined;
    const title = body?.title as string | undefined;
    const category = (body?.category as string | undefined) || "가이드";
    // 룰북 SVG가 SSOT. AI 이미지는 명시적으로 prefer_ai=true 줄 때만 시도 (한글 깨짐/스타일 불일치 위험).
    const preferSvg = body?.prefer_ai !== true;

    if (!slug || !title) {
      return new Response(
        JSON.stringify({ error: "slug and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileId = crypto.randomUUID();
    let imageBytes: Uint8Array | null = null;
    let contentType = "image/png";
    let ext = "png";
    let source: "ai" | "svg" = "svg";
    let lastError = "";

    // === 1) Try AI image (skip if preferSvg) ===
    if (!preferSvg && LOVABLE_API_KEY) {
      const prompt = buildAiOgPrompt({ title, category });
      const models = [
        "google/gemini-3.1-flash-image-preview",
        "google/gemini-3-pro-image-preview",
        "google/gemini-2.5-flash-image",
      ];

      for (const model of models) {
        try {
          console.log(`[OG] Trying AI model: ${model}`);
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
          });

          if (!response.ok) {
            lastError = `${model}: HTTP ${response.status}`;
            continue;
          }
          const data = await response.json();
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (!imageUrl) {
            lastError = `${model}: no image in response`;
            continue;
          }
          const m = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (!m) {
            lastError = `${model}: malformed data URL`;
            continue;
          }
          const fmt = m[1];
          imageBytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
          ext = fmt === "jpeg" ? "jpg" : fmt;
          contentType = `image/${fmt}`;
          source = "ai";
          console.log(`[OG] AI model ${model} succeeded`);
          break;
        } catch (e) {
          lastError = `${model}: ${e instanceof Error ? e.message : String(e)}`;
          console.warn(`[OG] AI model ${model} threw:`, e);
        }
      }
    }

    // === 2) Fallback: brand-safe SVG ===
    if (!imageBytes) {
      console.log(`[OG] Using SVG fallback (lastError=${lastError})`);
      const svg = buildSvgOg({ title, category, slug });
      imageBytes = new TextEncoder().encode(svg);
      contentType = "image/svg+xml";
      ext = "svg";
      source = "svg";
    }

    const fileName = `${fileId}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("og-images")
      .upload(fileName, imageBytes, { contentType, upsert: true });
    if (uploadError) {
      console.error("[OG] Storage upload error:", uploadError);
      throw new Error(`Failed to upload OG image: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from("og-images")
      .getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    // Update BOTH og_image and thumbnail (unified per design rulebook).
    // thumbnail was previously the placeholder; now it shares the same brand image.
    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ og_image: publicUrl, thumbnail: publicUrl })
      .eq("slug", slug);

    if (updateError) {
      console.error("[OG] DB update error:", updateError);
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    console.log(`[OG] ${source.toUpperCase()} image saved for ${slug}: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        og_image: publicUrl,
        thumbnail: publicUrl,
        source,
        category,
        style: resolveStyle(category).label,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[OG] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
