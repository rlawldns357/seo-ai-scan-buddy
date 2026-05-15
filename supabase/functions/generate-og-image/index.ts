import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { buildAiOgPrompt, buildSvgOg, resolveStyle } from "../_shared/og-design-rulebook.ts";
import { svgToPng } from "../_shared/og-png-renderer.ts";
import { logApiCost, extractUsage } from "../_shared/cost-logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * OG 이미지 생성 — **항상 PNG 출력** (카카오톡/페북/트위터/슬랙 호환).
 *
 * 전략:
 *  1. 룰북 SVG 빌드 (단일 진실 소스, 한글 안전)
 *  2. resvg-wasm + Pretendard ttf로 PNG 래스터라이즈
 *  3. og-images 버킷에 .png 업로드 → og_image, thumbnail 양쪽에 저장
 *
 * AI 이미지 모드는 `prefer_ai=true` 명시 시에만 시도 (한글 깨짐 위험).
 * AI도 PNG로 떨어지므로 동일 경로 사용.
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
    const contentType = "image/png";
    const ext = "png";
    let source: "ai" | "svg" = "svg";
    let lastError = "";

    // === 1) AI 이미지 모드 (옵트인) ===
    if (!preferSvg && LOVABLE_API_KEY) {
      const prompt = buildAiOgPrompt({ title, category });
      const models = [
        "google/gemini-3.1-flash-image-preview",
        "google/gemini-3-pro-image-preview",
        "google/gemini-2.5-flash-image",
      ];

      for (const model of models) {
        try {
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
          imageBytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
          source = "ai";
          // AI는 png/jpeg로 떨어짐 — 그대로 png로 저장 (jpeg면 .png 확장자로 강제 저장,
          // og-image MIME은 컨텐트로 결정됨. 안전을 위해 그냥 svg-first로 가는 걸 권장)
          console.log(`[OG] AI model ${model} succeeded`);
          break;
        } catch (e) {
          lastError = `${model}: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
    }

    // === 2) SVG → PNG 래스터라이즈 (기본 경로) ===
    if (!imageBytes) {
      console.log(`[OG] SVG→PNG 래스터라이즈 (lastError=${lastError})`);
      const svg = buildSvgOg({ title, category, slug });
      imageBytes = await svgToPng(svg);
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

    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ og_image: publicUrl, thumbnail: publicUrl })
      .eq("slug", slug);
    if (updateError) {
      console.error("[OG] DB update error:", updateError);
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    console.log(`[OG] ${source.toUpperCase()} PNG saved for ${slug}: ${publicUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        og_image: publicUrl,
        thumbnail: publicUrl,
        source,
        format: "png",
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
