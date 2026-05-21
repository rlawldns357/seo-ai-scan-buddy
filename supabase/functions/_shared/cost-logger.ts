// Centralized API cost logger for SearchTune OS
// Records each AI/external API call into public.api_cost_log with KRW conversion.
//
// Pricing (USD per 1M tokens unless noted) — last updated 2026-05.
// Adjust here when provider pricing changes.

const USD_TO_KRW = 1400;

type ModelPricing = {
  inputPerM: number;   // USD per 1M input tokens
  outputPerM: number;  // USD per 1M output tokens
  perRequest?: number; // USD flat per request (e.g. Firecrawl)
};

const PRICING: Record<string, ModelPricing> = {
  // Lovable AI Gateway -> Google Gemini
  "google/gemini-2.5-pro":              { inputPerM: 1.25, outputPerM: 10.00 },
  "google/gemini-2.5-flash":            { inputPerM: 0.30, outputPerM: 2.50 },
  "google/gemini-2.5-flash-lite":       { inputPerM: 0.10, outputPerM: 0.40 },
  "google/gemini-3-flash-preview":      { inputPerM: 0.30, outputPerM: 2.50 },
  "google/gemini-3.1-flash-image-preview": { inputPerM: 0.30, outputPerM: 2.50, perRequest: 0.039 },
  "google/gemini-2.5-flash-image":      { inputPerM: 0.30, outputPerM: 2.50, perRequest: 0.039 },
  "google/gemini-3-pro-image-preview":  { inputPerM: 1.25, outputPerM: 10.00 },
  "google/gemini-3.1-pro-preview":      { inputPerM: 1.25, outputPerM: 10.00 },
  // Lovable AI Gateway -> OpenAI
  "openai/gpt-5":       { inputPerM: 2.50, outputPerM: 10.00 },
  "openai/gpt-5-mini":  { inputPerM: 0.25, outputPerM: 2.00 },
  "openai/gpt-5-nano":  { inputPerM: 0.05, outputPerM: 0.40 },
  "openai/gpt-5.2":     { inputPerM: 3.00, outputPerM: 12.00 },
  // Perplexity
  "sonar":      { inputPerM: 1.00, outputPerM: 1.00, perRequest: 0.005 },
  "sonar-pro":  { inputPerM: 3.00, outputPerM: 15.00, perRequest: 0.015 },
  // Firecrawl (per request, ~1 credit ≈ $0.0009)
  "firecrawl/scrape": { inputPerM: 0, outputPerM: 0, perRequest: 0.001 },
  "firecrawl/search": { inputPerM: 0, outputPerM: 0, perRequest: 0.005 },
  // Anthropic (Claude) — direct API
  "claude-haiku-4-5":  { inputPerM: 1.00, outputPerM: 5.00 },
  "claude-sonnet-4-5": { inputPerM: 3.00, outputPerM: 15.00 },
  // Naver CLOVA Studio HCX (KRW per 1k chars; converted assuming ~1.5 chars/token)
  "HCX-005": { inputPerM: 4.00, outputPerM: 8.00 },
  // Naver Search Open API — free up to 25k req/day per app, then ₩… per call
  // (within free tier we record 0; admin can mark estimated overage in budget notes)
  "naver/search": { inputPerM: 0, outputPerM: 0, perRequest: 0 },
  // Google PageSpeed Insights — free quota 25k/day, no charge under quota
  "google/psi": { inputPerM: 0, outputPerM: 0, perRequest: 0 },
};

function providerOfModel(model: string): string {
  if (model === "google/psi") return "psi";
  if (model.startsWith("google/")) return "lovable_ai";
  if (model.startsWith("openai/")) return "lovable_ai";
  if (model.startsWith("anthropic/")) return "lovable_ai";
  if (model === "sonar" || model === "sonar-pro") return "perplexity";
  if (model.startsWith("firecrawl/")) return "firecrawl";
  if (model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("HCX-")) return "clova";
  if (model.startsWith("naver/")) return "naver";
  return "other";
}

export interface LogCostInput {
  function_name: string;
  model: string;          // e.g. "google/gemini-3-flash-preview", "sonar", "firecrawl/scrape"
  tokens_in?: number;
  tokens_out?: number;
  requests?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget cost logging. Never throws — failures only log to console.
 * Uses service role via SUPABASE_SERVICE_ROLE_KEY env directly to avoid client overhead.
 */
export async function logApiCost(input: LogCostInput): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;

    const pricing = PRICING[input.model];
    const tokens_in = input.tokens_in ?? 0;
    const tokens_out = input.tokens_out ?? 0;
    const requests = input.requests ?? 1;

    let cost_usd = 0;
    if (pricing) {
      cost_usd =
        (tokens_in / 1_000_000) * pricing.inputPerM +
        (tokens_out / 1_000_000) * pricing.outputPerM +
        (pricing.perRequest ?? 0) * requests;
    }
    const cost_krw = Math.round(cost_usd * USD_TO_KRW * 10000) / 10000;

    const provider = providerOfModel(input.model);

    await fetch(`${url}/rest/v1/api_cost_log`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        function_name: input.function_name,
        provider,
        model: input.model,
        tokens_in,
        tokens_out,
        requests,
        cost_usd,
        cost_krw,
        metadata: input.metadata ?? {},
      }),
    });
  } catch (e) {
    console.warn("[cost-logger] failed:", e);
  }
}

/** Convenience: parse usage from Lovable AI Gateway / OpenAI-compatible response. */
export function extractUsage(json: any): { tokens_in: number; tokens_out: number } {
  const u = json?.usage ?? {};
  return {
    tokens_in: Number(u.prompt_tokens ?? u.input_tokens ?? 0) || 0,
    tokens_out: Number(u.completion_tokens ?? u.output_tokens ?? 0) || 0,
  };
}
