
CREATE OR REPLACE FUNCTION public.admin_list_cron_jobs()
RETURNS TABLE(jobid bigint, jobname text, schedule text, active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT jobid, jobname, schedule, active FROM cron.job;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_cron_runs(_since timestamptz)
RETURNS TABLE(jobid bigint, status text, start_time timestamptz, end_time timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT jobid, status, start_time, end_time
  FROM cron.job_run_details
  WHERE start_time >= _since
  ORDER BY start_time DESC
  LIMIT 5000;
$$;

REVOKE ALL ON FUNCTION public.admin_list_cron_jobs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_list_cron_runs(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_cron_jobs() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_cron_runs(timestamptz) TO service_role;
