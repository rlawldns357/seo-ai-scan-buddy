/**
 * Shared Paddle utility for edge functions.
 * All Paddle API calls are routed through Lovable's connector gateway
 * — never call api.paddle.com directly.
 */

export type PaddleEnv = "sandbox" | "live";

const GATEWAY_BASE = "https://connector-gateway.lovable.dev/paddle";

function envApiKey(env: PaddleEnv): string {
  const key = env === "sandbox"
    ? Deno.env.get("PADDLE_SANDBOX_API_KEY")
    : Deno.env.get("PADDLE_LIVE_API_KEY");
  if (!key) throw new Error(`PADDLE_${env.toUpperCase()}_API_KEY is not configured`);
  return key;
}

function lovableApiKey(): string {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");
  return key;
}

export async function gatewayFetch(env: PaddleEnv, path: string, init: RequestInit = {}) {
  const url = `${GATEWAY_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${lovableApiKey()}`);
  headers.set("X-Connection-Api-Key", envApiKey(env));
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Paddle gateway error [${res.status}] ${path}: ${body}`);
  }
  return res;
}

/** Verify a Paddle webhook signature (HMAC SHA-256 over `${ts}:${rawBody}`). */
export async function verifyWebhook(rawBody: string, signatureHeader: string | null, env: PaddleEnv) {
  if (!signatureHeader) return false;
  const secret = env === "sandbox"
    ? Deno.env.get("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : Deno.env.get("PAYMENTS_LIVE_WEBHOOK_SECRET");
  if (!secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("=") as [string, string]),
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}:${rawBody}`));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === h1;
}
