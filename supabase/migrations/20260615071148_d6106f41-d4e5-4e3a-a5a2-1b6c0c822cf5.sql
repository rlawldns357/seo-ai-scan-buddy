CREATE OR REPLACE FUNCTION public.sync_blog_serp_keywords()
RETURNS TABLE(inserted int, deactivated int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int := 80;
  v_inserted int := 0;
  v_deactivated int := 0;
  r RECORD;
  v_kw text;
BEGIN
  FOR r IN
    SELECT slug, title FROM public.blog_posts
    WHERE published = true ORDER BY date DESC LIMIT v_max
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

  RETURN QUERY SELECT v_inserted, v_deactivated;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_blog_serp_keywords() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_blog_serp_keywords() TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.trg_sync_blog_serp_keywords()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.published = true)
     OR (TG_OP = 'UPDATE' AND (
            COALESCE(NEW.published, false) IS DISTINCT FROM COALESCE(OLD.published, false)
         OR (NEW.published = true AND NEW.slug IS DISTINCT FROM OLD.slug)
         OR (NEW.published = true AND NEW.title IS DISTINCT FROM OLD.title)
     ))
     OR (TG_OP = 'DELETE' AND OLD.published = true)
  THEN
    BEGIN
      PERFORM public.sync_blog_serp_keywords();
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'sync_blog_serp_keywords failed: %', SQLERRM;
    END;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS blog_posts_serp_autosync ON public.blog_posts;
CREATE TRIGGER blog_posts_serp_autosync
AFTER INSERT OR UPDATE OR DELETE ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_blog_serp_keywords();

SELECT public.sync_blog_serp_keywords();