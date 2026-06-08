-- Threads 자동 생성 룰 설정 (단일 행)
CREATE TABLE IF NOT EXISTS public.threads_autogen_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  daily_count smallint NOT NULL DEFAULT 10 CHECK (daily_count BETWEEN 1 AND 30),
  hour_kst smallint NOT NULL DEFAULT 9 CHECK (hour_kst BETWEEN 0 AND 23),
  minute_kst smallint NOT NULL DEFAULT 30 CHECK (minute_kst BETWEEN 0 AND 59),
  slot_start_hour_kst smallint NOT NULL DEFAULT 10 CHECK (slot_start_hour_kst BETWEEN 0 AND 23),
  slot_end_hour_kst smallint NOT NULL DEFAULT 19 CHECK (slot_end_hour_kst BETWEEN 0 AND 23),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton_row CHECK (id = 1)
);

GRANT SELECT ON public.threads_autogen_settings TO authenticated;
GRANT ALL ON public.threads_autogen_settings TO service_role;

ALTER TABLE public.threads_autogen_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read autogen settings"
ON public.threads_autogen_settings FOR SELECT
TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages autogen settings"
ON public.threads_autogen_settings FOR ALL
TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.threads_autogen_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- cron 스케줄을 KST 시/분에 맞춰 변경하는 헬퍼 (service_role 전용)
CREATE OR REPLACE FUNCTION public.set_threads_autogen_cron(p_hour int, p_minute int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  job_id bigint;
  utc_hour int;
  expr text;
BEGIN
  utc_hour := (p_hour - 9 + 24) % 24;
  expr := format('%s %s * * *', p_minute, utc_hour);
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'threads-daily-generate-10';
  IF job_id IS NOT NULL THEN
    PERFORM cron.alter_job(job_id, schedule := expr);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_threads_autogen_cron(int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_threads_autogen_cron(int,int) TO service_role;