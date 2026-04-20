ALTER TABLE public.site_posts
ADD COLUMN IF NOT EXISTS queue_position integer,
ADD COLUMN IF NOT EXISTS is_auto_generated boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_viewed_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS public.site_post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.site_posts(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  referrer text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_posts_queue_position ON public.site_posts(queue_position) WHERE status = 'queued';
CREATE INDEX IF NOT EXISTS idx_site_post_views_post_id_created_at ON public.site_post_views(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_post_views_post_id_session_id ON public.site_post_views(post_id, session_id);

ALTER TABLE public.site_post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert site post views" ON public.site_post_views;
CREATE POLICY "Public can insert site post views"
ON public.site_post_views
FOR INSERT
TO public
WITH CHECK (
  char_length(session_id) >= 1
  AND char_length(session_id) <= 255
  AND EXISTS (
    SELECT 1
    FROM public.site_posts p
    WHERE p.id = site_post_views.post_id
      AND p.status = 'published'
  )
);

DROP POLICY IF EXISTS "Owners can read own site post views" ON public.site_post_views;
CREATE POLICY "Owners can read own site post views"
ON public.site_post_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.site_posts p
    JOIN public.user_sites s ON s.id = p.site_id
    WHERE p.id = site_post_views.post_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Service role manages site_post_views" ON public.site_post_views;
CREATE POLICY "Service role manages site_post_views"
ON public.site_post_views
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_site_post_view(_post_id uuid, _session_id text, _referrer text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _post_id IS NULL OR _session_id IS NULL OR char_length(_session_id) = 0 THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.site_posts
    WHERE id = _post_id AND status = 'published'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.site_post_views (post_id, session_id, referrer)
  VALUES (_post_id, left(_session_id, 255), left(_referrer, 2000));

  UPDATE public.site_posts
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE id = _post_id
    AND status = 'published';
END;
$$;