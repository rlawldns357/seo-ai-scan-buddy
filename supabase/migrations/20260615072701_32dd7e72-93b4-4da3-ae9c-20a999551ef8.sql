DROP FUNCTION IF EXISTS public.sync_blog_serp_keywords();

CREATE OR REPLACE FUNCTION public.sync_blog_serp_keywords()
 RETURNS TABLE(inserted integer, deactivated integer, total_active integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_inserted int := 0;
  v_deactivated int := 0;
  v_total_active int := 0;
  r RECORD;
  v_kw text;
BEGIN
  FOR r IN
    SELECT slug, title FROM public.blog_posts
    WHERE published = true ORDER BY date DESC
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

  WITH stale AS (
    UPDATE public.serp_keywords sk SET active = false
    WHERE sk.target_url LIKE '/blog/%' AND sk.active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.blog_posts bp
        WHERE bp.published = true
          AND ('/blog/' || bp.slug || '.html' = sk.target_url
               OR '/blog/' || bp.slug = sk.target_url)
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_deactivated FROM stale;

  SELECT COUNT(*) INTO v_total_active FROM public.serp_keywords WHERE active = true;

  RETURN QUERY SELECT v_inserted, v_deactivated, v_total_active;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_blog_serp_keywords() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_blog_serp_keywords() TO service_role, postgres;