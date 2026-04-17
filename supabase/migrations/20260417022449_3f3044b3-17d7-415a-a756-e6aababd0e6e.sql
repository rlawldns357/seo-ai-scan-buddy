ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS failure_attempts integer;

CREATE INDEX IF NOT EXISTS idx_blog_posts_failed
  ON public.blog_posts (created_at DESC)
  WHERE published = false AND failure_reason IS NOT NULL;