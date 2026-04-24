
-- Helper to count products without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.count_site_products(_site_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.site_products WHERE site_id = _site_id
$$;

-- Replace recursive INSERT policy
DROP POLICY IF EXISTS "Owners can insert own site products" ON public.site_products;

CREATE POLICY "Owners can insert own site products"
ON public.site_products
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_sites s
    WHERE s.id = site_products.site_id AND s.user_id = auth.uid()
  )
  AND public.count_site_products(site_products.site_id) < 50
);
