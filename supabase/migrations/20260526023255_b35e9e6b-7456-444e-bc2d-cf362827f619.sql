REVOKE ALL ON FUNCTION public.log_site_post_view(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_site_product_click(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.count_site_products(uuid) FROM PUBLIC, anon, authenticated;
