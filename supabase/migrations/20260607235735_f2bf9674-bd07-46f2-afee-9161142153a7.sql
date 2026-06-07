DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobname FROM cron.job
           WHERE jobname IN ('threads-generate-daily-kst-09', 'threads-publish-worker-5min')
  LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;

SELECT cron.schedule(
  'threads-generate-daily-kst-09',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dmnrbmarbvirtymhszww.supabase.co/functions/v1/generate-threads-from-blog',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object('trigger', 'daily-cron')
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'threads-publish-worker-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dmnrbmarbvirtymhszww.supabase.co/functions/v1/publish-threads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object('trigger', '5min-cron')
  ) AS request_id;
  $$
);