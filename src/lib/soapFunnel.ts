// Soap Opera funnel helper.
// - Inserts/updates a lead in email_leads with optional analyzed URL & scores.
// - Captures landing URL + UTM params for attribution.
// - Triggers Day 1 email immediately (customer) + admin notification.
// - Days 2~5 are sent by `dispatch-soap-opera` (pg_cron daily).

import { supabase } from "@/integrations/supabase/client";

export interface SoapContext {
  url?: string | null;
  seo?: number | null;
  aeo?: number | null;
  geo?: number | null;
}

function captureAttribution() {
  if (typeof window === "undefined") return {};
  try {
    const usp = new URLSearchParams(window.location.search);
    return {
      landing_url: window.location.href.slice(0, 500),
      utm_source: usp.get("utm_source")?.slice(0, 60) || null,
      utm_medium: usp.get("utm_medium")?.slice(0, 60) || null,
      utm_campaign: usp.get("utm_campaign")?.slice(0, 120) || null,
    };
  } catch {
    return {};
  }
}

/**
 * Insert lead (idempotent on email unique constraint) and fire Day 1 + admin notify.
 */
export async function enrollSoapFunnel(
  email: string,
  source: string,
  ctx: SoapContext = {},
): Promise<{ inserted: boolean; duplicate: boolean; error?: string }> {
  const trimmed = email.trim().toLowerCase();
  // Internal company domain — record the lead but do not send any funnel/admin emails.
  const isInternal = trimmed.endsWith("@my-progress.co.kr");
  const attribution = captureAttribution();
  const payload: Record<string, unknown> = { email: trimmed, source, ...attribution };
  if (ctx.url) payload.analyzed_url = ctx.url;
  if (typeof ctx.seo === "number") payload.seo_score = Math.round(ctx.seo);
  if (typeof ctx.aeo === "number") payload.aeo_score = Math.round(ctx.aeo);
  if (typeof ctx.geo === "number") payload.geo_score = Math.round(ctx.geo);
  payload.funnel_started_at = new Date().toISOString();
  payload.funnel_day_sent = isInternal ? 5 : 1; // skip all subsequent days for internal
  payload.stage = isInternal ? "internal" : "new";
  if (isInternal) payload.funnel_paused_at = new Date().toISOString();

  const { error } = await supabase.from("email_leads").insert(payload as never);

  let duplicate = false;
  if (error) {
    if (error.code === "23505") {
      duplicate = true;
    } else {
      return { inserted: false, duplicate: false, error: error.message };
    }
  }

  if (isInternal) {
    return { inserted: !duplicate, duplicate };
  }

  // Fire Day 1 (customer). Idempotency keyed per email per day.
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

  // Notify admins (best-effort, fire-and-forget)
  void supabase.functions.invoke("notify-admin-lead", {
    body: {
      email: trimmed,
      source,
      duplicate,
      analyzed_url: ctx.url ?? undefined,
      seo: ctx.seo ?? undefined,
      aeo: ctx.aeo ?? undefined,
      geo: ctx.geo ?? undefined,
      ...attribution,
    },
  });

  return { inserted: !duplicate, duplicate };
}
