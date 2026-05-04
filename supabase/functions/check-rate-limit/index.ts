import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// NOTE: 세션용 임시 상향 (평소 3). 세션 종료 후 3으로 원복 권장.
const FREE_LIMIT = 50;
const EMAIL_BONUS = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, email } = await req.json();
    // action: "check" | "increment" | "unlock"

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // Get or create today's usage record
    const { data: existing } = await supabase
      .from("analysis_usage")
      .select("*")
      .eq("ip_address", ip)
      .eq("used_date", today)
      .maybeSingle();

    const usageCount = existing?.usage_count || 0;
    const emailUnlocked = existing?.email_unlocked || false;
    const limit = emailUnlocked ? FREE_LIMIT + EMAIL_BONUS : FREE_LIMIT;
    const remaining = Math.max(0, limit - usageCount);

    if (action === "check") {
      return new Response(
        JSON.stringify({
          allowed: remaining > 0,
          remaining,
          limit,
          usageCount,
          emailUnlocked,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unlock" && email) {
      // Unlock bonus via email
      if (existing) {
        await supabase
          .from("analysis_usage")
          .update({ email_unlocked: true, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("analysis_usage").insert({
          ip_address: ip,
          used_date: today,
          usage_count: 0,
          email_unlocked: true,
        });
      }

      const newLimit = FREE_LIMIT + EMAIL_BONUS;
      const newRemaining = Math.max(0, newLimit - usageCount);

      return new Response(
        JSON.stringify({
          allowed: newRemaining > 0,
          remaining: newRemaining,
          limit: newLimit,
          usageCount,
          emailUnlocked: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "increment") {
      if (remaining <= 0) {
        return new Response(
          JSON.stringify({
            allowed: false,
            remaining: 0,
            limit,
            usageCount,
            emailUnlocked,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (existing) {
        await supabase
          .from("analysis_usage")
          .update({
            usage_count: usageCount + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("analysis_usage").insert({
          ip_address: ip,
          used_date: today,
          usage_count: 1,
          email_unlocked: false,
        });
      }

      return new Response(
        JSON.stringify({
          allowed: true,
          remaining: remaining - 1,
          limit,
          usageCount: usageCount + 1,
          emailUnlocked,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("check-rate-limit error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
