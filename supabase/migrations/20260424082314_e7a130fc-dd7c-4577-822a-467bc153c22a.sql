ALTER TABLE public.beta_waitlist
  ADD COLUMN IF NOT EXISTS marketing_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;