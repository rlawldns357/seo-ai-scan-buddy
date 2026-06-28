
CREATE TABLE IF NOT EXISTS public.gsc_index_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  slug text,
  coverage_state text,
  indexing_state text,
  page_fetch_state text,
  robots_txt_state text,
  verdict text,
  google_canonical text,
  user_canonical text,
  last_crawl_time timestamptz,
  raw jsonb,
  inspected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gsc_index_coverage TO authenticated;
GRANT ALL ON public.gsc_index_coverage TO service_role;
ALTER TABLE public.gsc_index_coverage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read gsc_index_coverage" ON public.gsc_index_coverage;
CREATE POLICY "Admins read gsc_index_coverage" ON public.gsc_index_coverage
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Service role manages gsc_index_coverage" ON public.gsc_index_coverage;
CREATE POLICY "Service role manages gsc_index_coverage" ON public.gsc_index_coverage
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_gsc_coverage_verdict ON public.gsc_index_coverage(verdict);
CREATE INDEX IF NOT EXISTS idx_gsc_coverage_inspected_at ON public.gsc_index_coverage(inspected_at DESC);

DROP TRIGGER IF EXISTS trg_gsc_coverage_updated ON public.gsc_index_coverage;
CREATE TRIGGER trg_gsc_coverage_updated BEFORE UPDATE ON public.gsc_index_coverage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily cron: 21:30 UTC = 06:30 KST
DO $$
DECLARE jid bigint;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'gsc-index-audit-daily';
  IF jid IS NOT NULL THEN PERFORM cron.unschedule(jid); END IF;
  PERFORM cron.schedule(
    'gsc-index-audit-daily',
    '30 21 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://dmnrbmarbvirtymhszww.supabase.co/functions/v1/gsc-index-audit',
      headers := jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('mode','auto','autoFix',true)
    );
    $cron$
  );
END $$;
