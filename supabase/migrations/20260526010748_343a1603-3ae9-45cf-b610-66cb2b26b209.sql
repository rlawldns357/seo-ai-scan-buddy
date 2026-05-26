-- Auto-backfill blog gaps daily at 09:00 KST (= 00:00 UTC)
-- Drop existing job if re-running this migration
DO $$
BEGIN
  PERFORM cron.unschedule('auto-backfill-blog-gaps-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'auto-backfill-blog-gaps-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dmnrbmarbvirtymhszww.supabase.co/functions/v1/auto-backfill-blog-gaps',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbnJibWFyYnZpcnR5bWhzend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjM5MzMsImV4cCI6MjA4OTg5OTkzM30.oqj7ntlscycsC1aJ1XrHPyeT7804QctgSaCpczfokNY"}'::jsonb,
    body := '{"trigger":"daily-cron"}'::jsonb
  ) AS request_id;
  $$
);
