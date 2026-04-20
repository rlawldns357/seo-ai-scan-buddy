
-- Add user_id to user_sites
ALTER TABLE public.user_sites
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_user_sites_user_id ON public.user_sites(user_id);

-- Reset RLS policies on user_sites
DROP POLICY IF EXISTS "Anyone can create user sites" ON public.user_sites;
DROP POLICY IF EXISTS "Anyone can read user sites" ON public.user_sites;
DROP POLICY IF EXISTS "Service role manages user_sites" ON public.user_sites;

-- Public read (needed for /sites/:slug public hub)
CREATE POLICY "Public can read user sites"
  ON public.user_sites FOR SELECT
  USING (true);

-- Authenticated users can create their own site
CREATE POLICY "Users can insert own site"
  ON public.user_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND owner_email IS NOT NULL
    AND char_length(site_slug) BETWEEN 3 AND 50
    AND site_slug ~ '^[a-z0-9-]+$'
    AND char_length(site_url) BETWEEN 5 AND 2000
    AND char_length(title) BETWEEN 1 AND 200
  );

CREATE POLICY "Users can update own site"
  ON public.user_sites FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own site"
  ON public.user_sites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages user_sites"
  ON public.user_sites FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Reset RLS policies on site_posts
DROP POLICY IF EXISTS "Anyone can create draft site posts" ON public.site_posts;
DROP POLICY IF EXISTS "Anyone can read own site posts by site_id" ON public.site_posts;
DROP POLICY IF EXISTS "Anyone can read published site posts" ON public.site_posts;
DROP POLICY IF EXISTS "Service role manages site_posts" ON public.site_posts;

-- Public can read published posts
CREATE POLICY "Public can read published site posts"
  ON public.site_posts FOR SELECT
  USING (status = 'published');

-- Owners can read all their own posts (any status)
CREATE POLICY "Owners can read own site posts"
  ON public.site_posts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_sites s
      WHERE s.id = site_posts.site_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can insert site posts"
  ON public.site_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_sites s
      WHERE s.id = site_posts.site_id AND s.user_id = auth.uid()
    )
    AND char_length(title) BETWEEN 1 AND 300
    AND char_length(content) BETWEEN 1 AND 100000
  );

CREATE POLICY "Owners can update site posts"
  ON public.site_posts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_sites s
      WHERE s.id = site_posts.site_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_sites s
      WHERE s.id = site_posts.site_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete site posts"
  ON public.site_posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_sites s
      WHERE s.id = site_posts.site_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages site_posts"
  ON public.site_posts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
