
-- Remove old cron jobs
SELECT cron.unschedule('generate-daily-blog-post');
SELECT cron.unschedule('daily-blog-post-generation');

-- 8:50 AM KST = 23:50 UTC (previous day)
SELECT cron.schedule(
  'blog-morning-850',
  '50 23 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dmnrbmarbvirtymhszww.supabase.co/functions/v1/generate-blog-post',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbnJibWFyYnZpcnR5bWhzend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjM5MzMsImV4cCI6MjA4OTg5OTkzM30.oqj7ntlscycsC1aJ1XrHPyeT7804QctgSaCpczfokNY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 11:30 AM KST = 02:30 UTC
SELECT cron.schedule(
  'blog-lunch-1130',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dmnrbmarbvirtymhszww.supabase.co/functions/v1/generate-blog-post',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtbnJibWFyYnZpcnR5bWhzend3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMjM5MzMsImV4cCI6MjA4OTg5OTkzM30.oqj7ntlscycsC1aJ1XrHPyeT7804QctgSaCpczfokNY"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
