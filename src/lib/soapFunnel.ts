// Soap Opera funnel helper.
// - Inserts/updates a lead in email_leads with optional analyzed URL & scores.
// - Triggers Day 1 email immediately.
// - Days 2~5 are sent by `dispatch-soap-opera` (pg_cron daily).

import { supabase } from "@/integrations/supabase/client";

export interface SoapContext {
  url?: string | null;
  seo?: number | null;
  aeo?: number | null;
  geo?: number | null;
}

/**
 * Insert lead (idempotent on email unique constraint) and fire Day 1 email.
 * If insert fails because email is duplicate, we still update the latest scores/url
 * and re-fire Day 1 (idempotency key dedupes at the email side).
 */
export async function enrollSoapFunnel(
  email: string,
  source: string,
  ctx: SoapContext = {},
): Promise<{ inserted: boolean; duplicate: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  const payload: Record<string, unknown> = { email: trimmed, source };
  if (ctx.url) payload.analyzed_url = ctx.url;
  if (typeof ctx.seo === "number") payload.seo_score = Math.round(ctx.seo);
  if (typeof ctx.aeo === "number") payload.aeo_score = Math.round(ctx.aeo);
  if (typeof ctx.geo === "number") payload.geo_score = Math.round(ctx.geo);
  // Reset funnel start when (re)enrolling so the 5-day clock restarts.
  payload.funnel_started_at = new Date().toISOString();
  payload.funnel_day_sent = 1;

  const { error } = await supabase.from("email_leads").insert(payload as never);

  let duplicate = false;
  if (error) {
    if (error.code === "23505") {
      duplicate = true;
    } else {
      return { inserted: false, duplicate: false, error: error.message };
    }
  }

  // Fire Day 1 (fire-and-forget). Idempotency keyed per email per day.
  void supabase.functions.invoke("send-transactional-email", {
    body: {
      templateName: "soap-day-1",
      recipientEmail: trimmed,
      idempotencyKey: `soap-${trimmed}-day-1`,
      templateData: {
        url: ctx.url ?? undefined,
        seo: ctx.seo ?? undefined,
        aeo: ctx.aeo ?? undefined,
        geo: ctx.geo ?? undefined,
      },
    },
  });

  return { inserted: !duplicate, duplicate };
}
