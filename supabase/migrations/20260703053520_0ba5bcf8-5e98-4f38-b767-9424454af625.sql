ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS inblog_post_id text,
  ADD COLUMN IF NOT EXISTS inblog_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS inblog_sync_error text;

CREATE INDEX IF NOT EXISTS blog_posts_inblog_pending_idx
  ON public.blog_posts (date DESC)
  WHERE published = true AND inblog_post_id IS NULL;