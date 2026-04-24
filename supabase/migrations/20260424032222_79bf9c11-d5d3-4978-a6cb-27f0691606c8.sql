
ALTER TABLE public.site_products
  ADD COLUMN IF NOT EXISTS compare_at_price text,
  ADD COLUMN IF NOT EXISTS sale_label text,
  ADD COLUMN IF NOT EXISTS sale_ends_at timestamptz;
