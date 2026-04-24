import { corsHeaders } from "@supabase/supabase-js/cors";
import { gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

interface ReqBody {
  priceId?: string;
  environment?: PaddleEnv;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const priceId = body.priceId?.trim();
    const environment: PaddleEnv = body.environment === "live" ? "live" : "sandbox";
    if (!priceId || priceId.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid priceId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await gatewayFetch(
      environment,
      `/prices?external_id=${encodeURIComponent(priceId)}`,
    );
    const data = await res.json();
    const paddleId: string | undefined = data?.data?.[0]?.id;
    if (!paddleId) {
      return new Response(JSON.stringify({ error: "Price not found", priceId }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ paddleId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-paddle-price error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
