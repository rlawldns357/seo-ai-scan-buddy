CREATE OR REPLACE FUNCTION public.increment_site_product_click(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _product_id IS NULL THEN RETURN; END IF;
  UPDATE public.site_products
  SET click_count = click_count + 1
  WHERE id = _product_id AND is_active = true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_site_product_click(uuid) TO anon, authenticated;