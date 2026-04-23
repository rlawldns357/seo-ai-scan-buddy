
-- Extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Settings table: one row per site
CREATE TABLE IF NOT EXISTS public.autopublish_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL UNIQUE REFERENCES public.user_sites(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  weekdays smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[], -- Mon-Fri
  hours_kst smallint[] NOT NULL DEFAULT ARRAY[9]::smallint[],         -- 09:00 KST
  daily_limit smallint NOT NULL DEFAULT 1 CHECK (daily_limit BETWEEN 1 AND 10),
  auto_topup boolean NOT NULL DEFAULT true,
  min_queue smallint NOT NULL DEFAULT 5 CHECK (min_queue BETWEEN 0 AND 50),
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation triggers (avoid CHECK constraints with subqueries)
CREATE OR REPLACE FUNCTION public.validate_autopublish_settings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  d smallint;
  h smallint;
BEGIN
  IF NEW.weekdays IS NULL OR array_length(NEW.weekdays, 1) IS NULL THEN
    RAISE EXCEPTION 'weekdays must contain at least one day';
  END IF;
  FOREACH d IN ARRAY NEW.weekdays LOOP
    IF d < 0 OR d > 6 THEN
      RAISE EXCEPTION 'weekday out of range: %', d;
    END IF;
  END LOOP;
  IF NEW.hours_kst IS NULL OR array_length(NEW.hours_kst, 1) IS NULL THEN
    RAISE EXCEPTION 'hours_kst must contain at least one hour';
  END IF;
  FOREACH h IN ARRAY NEW.hours_kst LOOP
    IF h < 0 OR h > 23 THEN
      RAISE EXCEPTION 'hour out of range: %', h;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_autopublish_settings_trg ON public.autopublish_settings;
CREATE TRIGGER validate_autopublish_settings_trg
  BEFORE INSERT OR UPDATE ON public.autopublish_settings
  FOR EACH ROW EXECUTE FUNCTION public.validate_autopublish_settings();

-- updated_at trigger
DROP TRIGGER IF EXISTS set_updated_at_autopublish_settings ON public.autopublish_settings;
CREATE TRIGGER set_updated_at_autopublish_settings
  BEFORE UPDATE ON public.autopublish_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.autopublish_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read own autopublish settings" ON public.autopublish_settings;
CREATE POLICY "Owners can read own autopublish settings"
  ON public.autopublish_settings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_sites s
    WHERE s.id = autopublish_settings.site_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Owners can insert own autopublish settings" ON public.autopublish_settings;
CREATE POLICY "Owners can insert own autopublish settings"
  ON public.autopublish_settings FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_sites s
    WHERE s.id = autopublish_settings.site_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Owners can update own autopublish settings" ON public.autopublish_settings;
CREATE POLICY "Owners can update own autopublish settings"
  ON public.autopublish_settings FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_sites s
    WHERE s.id = autopublish_settings.site_id AND s.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_sites s
    WHERE s.id = autopublish_settings.site_id AND s.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Service role manages autopublish_settings" ON public.autopublish_settings;
CREATE POLICY "Service role manages autopublish_settings"
  ON public.autopublish_settings FOR ALL
  TO service_role USING (true) WITH CHECK (true);
