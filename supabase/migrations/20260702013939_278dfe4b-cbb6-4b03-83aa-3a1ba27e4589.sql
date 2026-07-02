
ALTER TABLE public.email_leads
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS landing_url TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS tripwire_purchased_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notify_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS email_leads_stage_idx ON public.email_leads(stage, created_at DESC);

INSERT INTO public.engine_config (config_key, config_value, version)
VALUES ('lead_notify_emails', '', 1)
ON CONFLICT DO NOTHING;
