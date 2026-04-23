-- Drop the old constraint FIRST so migration can change values
ALTER TABLE public.site_posts DROP CONSTRAINT IF EXISTS site_posts_status_check;

-- Migrate legacy 'queued' to new 'scheduled'
UPDATE public.site_posts SET status = 'scheduled' WHERE status = 'queued';

-- Re-add constraint with new allowed values
ALTER TABLE public.site_posts
  ADD CONSTRAINT site_posts_status_check
  CHECK (status IN ('idea', 'draft', 'scheduled', 'published'));

-- Index for kanban grouping
CREATE INDEX IF NOT EXISTS idx_site_posts_site_status
  ON public.site_posts (site_id, status, updated_at DESC);