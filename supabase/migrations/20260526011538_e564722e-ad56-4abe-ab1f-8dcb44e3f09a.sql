
-- 1. Expose only the version of engine_config via a function
CREATE OR REPLACE FUNCTION public.get_engine_version(_config_key text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT version FROM public.engine_config
  WHERE config_key = _config_key
  ORDER BY version DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_engine_version(text) TO anon, authenticated;

-- 2. Lock down sensitive config tables
DROP POLICY IF EXISTS "Anyone can read engine config version" ON public.engine_config;
DROP POLICY IF EXISTS "Anyone can read autoblog engine config" ON public.autoblog_engine_config;
DROP POLICY IF EXISTS "Anyone can read rate_limit_config" ON public.rate_limit_config;

-- 3. user_sites: remove owner_email exposure to anon/authenticated (RLS keeps public read for safe columns)
REVOKE SELECT (owner_email) ON public.user_sites FROM anon, authenticated;

-- 4. Remove sensitive tables from realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.engine_config;

-- 5. storage.objects: drop broad SELECT policies for public buckets (public URLs still serve files)
DROP POLICY IF EXISTS "OG images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Report PDFs are publicly accessible" ON storage.objects;

-- 6. Restrict SECURITY DEFINER helper functions from being called by anon/authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_tier(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.grant_beta_by_email(text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.count_site_products(uuid) FROM anon, authenticated, public;
