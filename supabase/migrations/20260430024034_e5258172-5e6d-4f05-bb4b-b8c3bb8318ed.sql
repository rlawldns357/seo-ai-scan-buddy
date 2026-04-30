-- 한글 slug → 영문 slug 매핑 테이블 (301 리다이렉트용)
CREATE TABLE public.slug_redirects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  old_slug TEXT NOT NULL UNIQUE,
  new_slug TEXT NOT NULL,
  post_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_slug_redirects_old_slug ON public.slug_redirects(old_slug);

ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read slug redirects"
  ON public.slug_redirects
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role manages slug_redirects"
  ON public.slug_redirects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);