-- 제품 카탈로그 테이블
CREATE TABLE public.site_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.user_sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  price TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_products_title_len CHECK (char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT site_products_url_len CHECK (char_length(url) BETWEEN 5 AND 2000),
  CONSTRAINT site_products_desc_len CHECK (description IS NULL OR char_length(description) <= 500)
);

CREATE INDEX idx_site_products_site_active ON public.site_products(site_id, is_active, sort_order);

ALTER TABLE public.site_products ENABLE ROW LEVEL SECURITY;

-- 누구나 활성 제품 조회 (블로그 글 CTA 렌더링)
CREATE POLICY "Public can read active site products"
ON public.site_products FOR SELECT
USING (is_active = true);

-- 사이트 소유자: CRUD
CREATE POLICY "Owners can read own site products"
ON public.site_products FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = auth.uid()));

CREATE POLICY "Owners can insert own site products"
ON public.site_products FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = auth.uid())
  AND (SELECT count(*) FROM public.site_products p WHERE p.site_id = site_products.site_id) < 50
);

CREATE POLICY "Owners can update own site products"
ON public.site_products FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = auth.uid()));

CREATE POLICY "Owners can delete own site products"
ON public.site_products FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_products.site_id AND s.user_id = auth.uid()));

CREATE POLICY "Service role manages site_products"
ON public.site_products FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- updated_at 트리거
CREATE TRIGGER set_site_products_updated_at
BEFORE UPDATE ON public.site_products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- site_posts에 매칭된 제품 ID 목록 저장
ALTER TABLE public.site_posts
ADD COLUMN IF NOT EXISTS product_links JSONB NOT NULL DEFAULT '[]'::jsonb;