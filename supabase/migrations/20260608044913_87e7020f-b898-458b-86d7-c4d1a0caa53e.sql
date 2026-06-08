CREATE TABLE IF NOT EXISTS public.threads_engine_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'learn',
  prev_version text,
  new_version text,
  summary text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'success',
  error text
);
GRANT SELECT ON public.threads_engine_log TO authenticated;
GRANT ALL ON public.threads_engine_log TO service_role;
ALTER TABLE public.threads_engine_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read threads_engine_log" ON public.threads_engine_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role manages threads_engine_log" ON public.threads_engine_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS threads_engine_log_created_at_idx ON public.threads_engine_log (created_at DESC);