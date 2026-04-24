// Paddle webhook handler — receives subscription/transaction events and
// upserts the subscriptions table. Uses ?env=sandbox | ?env=live to
// distinguish source (registered automatically when payments were enabled).
//
// verify_jwt is NOT required here — Paddle calls this directly. Auth is
// done via signature verification of the raw body.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyWebhook, type PaddleEnv } from "../_shared/paddle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paddle-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface PaddleEventBase {
  event_type: string;
  data: any;
}

function envFromUrl(req: Request): PaddleEnv {
  const url = new URL(req.url);
  const envParam = url.searchParams.get("env");
  return envParam === "live" ? "live" : "sandbox";
}

function externalIdFor(items: any[] | undefined, kind: "product" | "price"): string | undefined {
  if (!Array.isArray(items)) return undefined;
  for (const item of items) {
    const node = kind === "product" ? item?.product : item?.price;
    const ext = node?.import_meta?.external_id ?? node?.importMeta?.externalId;
    if (ext) return ext as string;
  }
  return undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const env = envFromUrl(req);
  const rawBody = await req.text();
  const sig = req.headers.get("paddle-signature");

  const valid = await verifyWebhook(rawBody, sig, env);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event = JSON.parse(rawBody) as PaddleEventBase;
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const t = event.event_type;
    if (t.startsWith("subscription.")) {
      const sub = event.data;
      const productExt = externalIdFor(sub.items, "product");
      const priceExt = externalIdFor(sub.items, "price");
      if (!productExt || !priceExt) {
        console.warn(`[payments-webhook] missing importMeta.externalId on ${t}`, sub.id);
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = sub.custom_data?.userId ?? sub.customData?.userId ?? null;
      const status: string = sub.status ?? "active";

      const row = {
        user_id: userId,
        environment: env,
        product_id: productExt,
        price_id: priceExt,
        status,
        paddle_subscription_id: sub.id,
        paddle_customer_id: sub.customer_id ?? sub.customerId ?? null,
        current_period_start: sub.current_billing_period?.starts_at ?? null,
        current_period_end: sub.current_billing_period?.ends_at ?? null,
        canceled_at: sub.canceled_at ?? null,
        raw: sub,
      };

      if (!userId) {
        console.warn(`[payments-webhook] no userId in custom_data — skipping ${sub.id}`);
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase
        .from("subscriptions")
        .upsert(row, { onConflict: "paddle_subscription_id,environment" });
      if (error) throw error;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[payments-webhook] handler error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
