// notify-admin-lead
// Sends admin email(s) whenever a new inbound lead is captured.
// Recipient list is configured in engine_config.config_key='lead_notify_emails'
// as a comma-separated list. If empty, this function no-ops silently.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({} as any))
    const {
      email, source, duplicate,
      analyzed_url, seo, aeo, geo,
      landing_url, utm_source, utm_medium, utm_campaign,
    } = body

    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'email required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Internal company domain — do not send admin lead notifications for our own team's signups.
    if (String(email).trim().toLowerCase().endsWith('@my-progress.co.kr')) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'internal_domain' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Load recipient list from engine_config
    const { data: cfg } = await supabase
      .from('engine_config')
      .select('config_value')
      .eq('config_key', 'lead_notify_emails')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle()

    const raw = (cfg?.config_value ?? '').trim()
    const recipients = raw
      .split(/[,;\s]+/g)
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, skipped: 'no_recipients_configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const idBase = `admin-lead-${email}-${new Date().toISOString().slice(0, 10)}`
    let sent = 0
    for (const to of recipients) {
      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'admin-new-lead',
            recipientEmail: to,
            idempotencyKey: `${idBase}-${to}`,
            templateData: {
              email, source, duplicate: !!duplicate,
              analyzed_url, seo, aeo, geo,
              landing_url, utm_source, utm_medium, utm_campaign,
              admin_url: 'https://www.searchtuneos.com/admin/insights',
            },
          },
        })
        sent++
      } catch (e) {
        console.error('[notify-admin-lead] send failed', to, e)
      }
    }

    // Mark on the lead record (best-effort)
    try {
      await supabase
        .from('email_leads')
        .update({ admin_notify_sent_at: new Date().toISOString() })
        .eq('email', email)
    } catch { /* ignore */ }

    return new Response(
      JSON.stringify({ ok: true, sent, recipients: recipients.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[notify-admin-lead] error', msg)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
