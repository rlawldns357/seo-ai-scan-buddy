
-- Soap Opera funnel: track 5-day email sequence per lead
ALTER TABLE public.email_leads
  ADD COLUMN IF NOT EXISTS analyzed_url text,
  ADD COLUMN IF NOT EXISTS seo_score smallint,
  ADD COLUMN IF NOT EXISTS aeo_score smallint,
  ADD COLUMN IF NOT EXISTS geo_score smallint,
  ADD COLUMN IF NOT EXISTS funnel_started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS funnel_day_sent smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funnel_paused_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_email_leads_funnel
  ON public.email_leads (funnel_day_sent, funnel_started_at)
  WHERE funnel_paused_at IS NULL AND funnel_day_sent < 5;

-- Allow anon to insert with the new optional columns (RLS already permits insert by email check; new cols are nullable)
-- No policy change needed.

-- Update existing INSERT policy to allow the new optional fields (existing policy uses only email check, so fine)
