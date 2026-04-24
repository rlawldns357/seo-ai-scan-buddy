
-- Index for fast idea queue lookup
CREATE INDEX IF NOT EXISTS idx_site_posts_site_status_created
  ON public.site_posts (site_id, status, created_at DESC);

-- Allow short placeholder content for 'idea' status while keeping strict limits for other statuses
DROP POLICY IF EXISTS "Owners can insert site posts" ON public.site_posts;

CREATE POLICY "Owners can insert site posts"
ON public.site_posts
FOR INSERT
TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.user_sites s
    WHERE s.id = site_posts.site_id AND s.user_id = auth.uid()
  ))
  AND char_length(title) BETWEEN 1 AND 300
  AND char_length(content) BETWEEN 1 AND 100000
);
