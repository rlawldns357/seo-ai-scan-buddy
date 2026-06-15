REVOKE EXECUTE ON FUNCTION public.trg_sync_blog_serp_keywords() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_sync_blog_serp_keywords() TO service_role, postgres;