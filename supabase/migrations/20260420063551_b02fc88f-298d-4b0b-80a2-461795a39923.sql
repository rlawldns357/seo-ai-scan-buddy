
-- user_sites: 사용자별 콘텐츠 허브
CREATE TABLE public.user_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_email TEXT NOT NULL,
  site_url TEXT NOT NULL,
  site_slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_sites_owner_email ON public.user_sites(owner_email);
CREATE INDEX idx_user_sites_site_slug ON public.user_sites(site_slug);

ALTER TABLE public.user_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read user sites"
  ON public.user_sites FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create user sites"
  ON public.user_sites FOR INSERT
  WITH CHECK (
    owner_email IS NOT NULL
    AND char_length(owner_email) BETWEEN 5 AND 255
    AND owner_email ~ '^[^@]+@[^@]+\.[^@]+$'
    AND site_slug IS NOT NULL
    AND char_length(site_slug) BETWEEN 3 AND 50
    AND site_slug ~ '^[a-z0-9-]+$'
    AND site_url IS NOT NULL
    AND char_length(site_url) BETWEEN 5 AND 2000
    AND title IS NOT NULL
    AND char_length(title) BETWEEN 1 AND 200
  );

CREATE POLICY "Service role manages user_sites"
  ON public.user_sites FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- site_posts: 사이트별 콘텐츠
CREATE TABLE public.site_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.user_sites(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  source_axis TEXT,
  og_image TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(site_id, slug),
  CHECK (status IN ('draft','queued','published'))
);

CREATE INDEX idx_site_posts_site_id ON public.site_posts(site_id);
CREATE INDEX idx_site_posts_status ON public.site_posts(status);

ALTER TABLE public.site_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published site posts"
  ON public.site_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "Anyone can read own site posts by site_id"
  ON public.site_posts FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create draft site posts"
  ON public.site_posts FOR INSERT
  WITH CHECK (
    site_id IS NOT NULL
    AND title IS NOT NULL AND char_length(title) BETWEEN 1 AND 300
    AND content IS NOT NULL AND char_length(content) BETWEEN 1 AND 100000
    AND status IN ('draft','queued')
    AND EXISTS (SELECT 1 FROM public.user_sites s WHERE s.id = site_posts.site_id)
  );

CREATE POLICY "Service role manages site_posts"
  ON public.site_posts FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 공통 updated_at 트리거 (이미 존재할 수 있음 - 안전하게 재정의)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_user_sites_updated_at
  BEFORE UPDATE ON public.user_sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_site_posts_updated_at
  BEFORE UPDATE ON public.site_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
