CREATE TABLE public.rate_limit_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  free_limit INTEGER NOT NULL DEFAULT 3,
  email_bonus INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

ALTER TABLE public.rate_limit_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages rate_limit_config"
ON public.rate_limit_config FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can read rate_limit_config"
ON public.rate_limit_config FOR SELECT
TO public
USING (true);

INSERT INTO public.rate_limit_config (id, free_limit, email_bonus)
VALUES (1, 50, 5)
ON CONFLICT (id) DO UPDATE SET free_limit = 50, email_bonus = 5, updated_at = now();