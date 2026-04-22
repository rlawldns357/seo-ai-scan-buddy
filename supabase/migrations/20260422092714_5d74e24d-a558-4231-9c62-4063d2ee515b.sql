-- AutoBlog 콘텐츠 품질 강화: FAQ JSON-LD + 자동 백링크 + 3축 점수 저장 컬럼

ALTER TABLE public.site_posts
  ADD COLUMN IF NOT EXISTS faq jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS internal_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_score integer,
  ADD COLUMN IF NOT EXISTS aeo_score integer,
  ADD COLUMN IF NOT EXISTS geo_score integer,
  ADD COLUMN IF NOT EXISTS scored_at timestamp with time zone;

-- 키워드 검색 성능을 위한 GIN 인덱스
CREATE INDEX IF NOT EXISTS idx_site_posts_keywords ON public.site_posts USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_site_posts_site_status ON public.site_posts (site_id, status);
