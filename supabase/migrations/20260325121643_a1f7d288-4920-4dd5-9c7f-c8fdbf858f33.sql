
CREATE TABLE public.analysis_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  used_date date NOT NULL DEFAULT CURRENT_DATE,
  usage_count integer NOT NULL DEFAULT 1,
  email_unlocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ip_address, used_date)
);

ALTER TABLE public.analysis_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage analysis_usage"
  ON public.analysis_usage
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);
