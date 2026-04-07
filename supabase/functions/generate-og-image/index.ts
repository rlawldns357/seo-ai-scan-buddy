import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CATEGORY_STYLES: Record<string, { emoji: string; color: string }> = {
  SEO: { emoji: "🔍", color: "#6366f1" },
  AEO: { emoji: "🤖", color: "#f59e0b" },
  GEO: { emoji: "🌐", color: "#10b981" },
  가이드: { emoji: "📘", color: "#3b82f6" },
  뉴스: { emoji: "📰", color: "#8b5cf6" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { slug, title, category } = await req.json();

    if (!slug || !title || !category) {
      return new Response(
        JSON.stringify({ error: "slug, title, category are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const style = CATEGORY_STYLES[category] || CATEGORY_STYLES["가이드"];

    // Truncate title for prompt if too long
    const shortTitle = title.length > 40 ? title.slice(0, 40) + "..." : title;

    const prompt = `Create a professional blog OG image (1200x630px landscape) with these specifications:
- Dark navy/slate background (#0f172a to #1e293b gradient)
- Large bold white Korean text in center: "${shortTitle}"
- Small category badge at top-left with text "${category}" and emoji "${style.emoji}" in color ${style.color}
- "SearchTune OS" brand text at bottom-right in subtle white
- Subtle geometric grid pattern in background
- Clean, modern, professional tech blog style
- No photos, no illustrations, just typography and geometric shapes
- Ensure all text is clearly readable and well-spaced
- The overall style should look like a premium tech company's blog card`;

    console.log(`Generating OG image for: ${slug}`);

    // Try multiple models in order of preference
    const models = [
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3-pro-image-preview",
      "google/gemini-2.5-flash-image",
    ];

    let aiData: any = null;
    let lastError = "";

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
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

        if (response.ok) {
          aiData = await response.json();
          break;
        }
        lastError = `${model}: ${response.status}`;
        console.warn(`Model ${model} failed: ${response.status}`);
      } catch (e) {
        lastError = `${model}: ${e}`;
        console.warn(`Model ${model} error:`, e);
      }
    }

    if (!aiData) {
      throw new Error(`All image models failed. Last error: ${lastError}`);
    }
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated from AI");
    }

    // Extract base64 data and upload to storage
    const base64Match = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      throw new Error("Unexpected image format from AI");
    }

    const imageFormat = base64Match[1]; // png, jpg, etc.
    const base64Data = base64Match[2];
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Use crypto UUID for safe storage key (avoids non-ASCII issues)
    const fileId = crypto.randomUUID();
    const ext = imageFormat === "jpeg" ? "jpg" : imageFormat;
    const fileName = `${fileId}.${ext}`;
    const contentType = `image/${imageFormat}`;

    const { error: uploadError } = await supabase.storage
      .from("og-images")
      .upload(fileName, imageBytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Failed to upload OG image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("og-images")
      .getPublicUrl(fileName);

    const ogImageUrl = publicUrlData.publicUrl;

    // Update blog post with OG image URL
    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ og_image: ogImageUrl })
      .eq("slug", slug);

    if (updateError) {
      console.error("DB update error:", updateError);
      throw new Error(`Failed to update post: ${updateError.message}`);
    }

    console.log(`OG image created for ${slug}: ${ogImageUrl}`);

    return new Response(
      JSON.stringify({ success: true, og_image: ogImageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
