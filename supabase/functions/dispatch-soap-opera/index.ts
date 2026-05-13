// Soap Opera dispatcher: sends Day 2~5 emails based on funnel_started_at age.
// Day 1 is sent immediately on lead capture from FunnelCTAs.
// Schedule: pg_cron daily 09:00 KST.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // Find leads needing next email (Day N where N = days since funnel_started_at, capped 1..5)
  const { data: leads, error } = await supabase
    .from('email_leads')
    .select('id, email, analyzed_url, seo_score, aeo_score, geo_score, funnel_started_at, funnel_day_sent')
    .is('funnel_paused_at', null)
    .lt('funnel_day_sent', 5)
    .limit(500)

  if (error) {
    console.error('[soap] query error', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const lead of leads ?? []) {
    const startedMs = new Date(lead.funnel_started_at).getTime()
    const ageDays = Math.floor((Date.now() - startedMs) / (1000 * 60 * 60 * 24))
    // dueDay = ageDays + 1 capped at 5; only send if dueDay > funnel_day_sent
    const dueDay = Math.min(5, ageDays + 1)
    if (dueDay <= lead.funnel_day_sent) {
      skipped++
      continue
    }
    // Send the next single day (not catch-up burst)
    const nextDay = lead.funnel_day_sent + 1
    if (nextDay < 2 || nextDay > 5) {
      skipped++
      continue
    }
    try {
      const { error: invokeErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: `soap-day-${nextDay}`,
          recipientEmail: lead.email,
          idempotencyKey: `soap-${lead.id}-day-${nextDay}`,
          templateData: {
            url: lead.analyzed_url ?? undefined,
            seo: lead.seo_score ?? undefined,
            aeo: lead.aeo_score ?? undefined,
            geo: lead.geo_score ?? undefined,
          },
        },
      })
      if (invokeErr) throw invokeErr
      await supabase
        .from('email_leads')
        .update({ funnel_day_sent: nextDay })
        .eq('id', lead.id)
      sent++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[soap] send failed', lead.id, msg)
      errors.push(`${lead.id}: ${msg}`)
    }
  }

  return new Response(
    JSON.stringify({ ok: true, sent, skipped, errors, total: leads?.length ?? 0 }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
