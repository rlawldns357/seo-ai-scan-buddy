
CREATE OR REPLACE FUNCTION public.sync_blog_serp_keywords()
RETURNS TABLE(inserted int, deactivated int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int := 40;
  v_inserted int := 0;
  v_deactivated int := 0;
  r RECORD;
  v_kw text;
BEGIN
  -- 1) Register/refresh keywords for the most recent published posts
  FOR r IN
    SELECT slug, title
    FROM public.blog_posts
    WHERE published = true
    ORDER BY date DESC
    LIMIT v_max
  LOOP
    v_kw := regexp_replace(r.title, '^([^:,!?—–\-]+).*', '\1');
    v_kw := btrim(v_kw);
    v_kw := left(v_kw, 60);
    IF length(v_kw) < 3 THEN CONTINUE; END IF;

    INSERT INTO public.serp_keywords (keyword, category, target_url, priority, active)
    VALUES (v_kw, 'blog', '/blog/' || r.slug || '.html', 4, true)
    ON CONFLICT (keyword) DO UPDATE
      SET target_url = EXCLUDED.target_url,
          active = true,
          category = CASE WHEN public.serp_keywords.category IN ('blog','core') THEN 'blog' ELSE public.serp_keywords.category END;

    v_inserted := v_inserted + 1;
  END LOOP;

  -- 2) Deactivate stale blog-target keywords (slug no longer published)
  WITH stale AS (
    UPDATE public.serp_keywords sk
    SET active = false
    WHERE sk.target_url LIKE '/blog/%'
      AND sk.active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.published = true
          AND ('/blog/' || bp.slug || '.html' = sk.target_url
               OR '/blog/' || bp.slug = sk.target_url)
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deactivated FROM stale;

  RETURN QUERY SELECT v_inserted, v_deactivated;
END;
$$;

-- Schedule daily sync 5 minutes before SERP tracking (20:55 UTC = 05:55 KST)
DO $$
BEGIN
  PERFORM cron.unschedule('sync-blog-serp-keywords-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sync-blog-serp-keywords-daily',
  '55 20 * * *',
  $$ SELECT public.sync_blog_serp_keywords(); $$
);
