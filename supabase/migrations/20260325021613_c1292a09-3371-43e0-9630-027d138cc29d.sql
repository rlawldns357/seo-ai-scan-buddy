CREATE TABLE public.email_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_leads_email_unique UNIQUE (email)
);

ALTER TABLE public.email_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert email leads"
  ON public.email_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read email leads"
  ON public.email_leads
  FOR SELECT
  TO authenticated
  USING (true);