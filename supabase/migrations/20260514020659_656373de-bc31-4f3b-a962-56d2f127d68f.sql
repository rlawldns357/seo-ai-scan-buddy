-- SERP tracking keywords (Top 20 + reverse keywords)
CREATE TABLE public.serp_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'core',
  target_url text,
  priority smallint NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.serp_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read serp_keywords"
ON public.serp_keywords FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages serp_keywords"
ON public.serp_keywords FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Daily SERP snapshots
CREATE TABLE public.serp_tracking_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id uuid REFERENCES public.serp_keywords(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  engine text NOT NULL CHECK (engine IN ('google', 'naver')),
  our_exposed boolean NOT NULL DEFAULT false,
  our_rank smallint,
  our_url text,
  our_title text,
  our_snippet text,
  top10 jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_domains text[] NOT NULL DEFAULT '{}'::text[],
  total_results integer,
  error text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_serp_results_keyword_engine_date
  ON public.serp_tracking_results (keyword, engine, checked_at DESC);
CREATE INDEX idx_serp_results_checked_at
  ON public.serp_tracking_results (checked_at DESC);

ALTER TABLE public.serp_tracking_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read serp_tracking_results"
ON public.serp_tracking_results FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages serp_tracking_results"
ON public.serp_tracking_results FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Seed Top 20 + reverse keywords
INSERT INTO public.serp_keywords (keyword, category, target_url, priority) VALUES
  -- Brand defense
  ('서치튠OS', 'brand', '/', 10),
  ('SearchTune OS', 'brand', '/', 10),
  ('서치튠', 'brand', '/', 9),
  -- Core service
  ('SEO AEO GEO 진단', 'core', '/', 9),
  ('AI 검색 진단 도구', 'core', '/', 8),
  ('AI 검색 최적화', 'core', '/', 8),
  ('AEO 최적화', 'core', '/', 8),
  ('GEO 최적화', 'core', '/blog/generative-engine-optimization', 8),
  ('생성형 검색 최적화', 'core', '/blog/generative-engine-optimization', 7),
  -- Problem / need
  ('네이버 SEO 진단', 'problem', '/', 9),
  ('무료 SEO 진단', 'problem', '/', 8),
  ('ChatGPT 검색 노출', 'problem', '/blog/what-is-aeo', 7),
  -- Platform long-tail
  ('카페24 상품 페이지 SEO', 'platform', '/blog/cafe24-seo-guide', 7),
  ('아임웹 SEO 한계', 'platform', '/blog/imweb-seo-guide', 7),
  ('워드프레스 SEO 점검', 'platform', '/blog/lighthouse-score-improve', 6),
  ('쇼핑몰 SEO 진단', 'platform', '/blog/cafe24-seo-guide', 7),
  -- Competitor / alternative
  ('SEO 분석 도구', 'competitor', '/', 7),
  ('AI SEO 도구', 'competitor', '/', 7),
  -- Reverse / answer-style
  ('SEO AEO GEO 차이', 'reverse', '/blog/seo-vs-aeo-vs-geo', 9),
  ('AEO와 SEO의 차이점', 'reverse', '/blog/seo-vs-aeo-vs-geo', 8),
  ('AEO란', 'reverse', '/blog/what-is-aeo', 9),
  ('FAQ 스키마 작성 방법', 'reverse', '/blog/faq-schema-aeo-boost', 8),
  ('robots.txt AI 크롤러 허용', 'reverse', '/blog/ai-crawler-access', 8),
  ('네이버 사이트맵 제출 방법', 'reverse', '/blog/naver-search-advisor-guide', 8),
  ('네이버 서치어드바이저', 'reverse', '/blog/naver-search-advisor-guide', 8),
  ('구조화 데이터 JSON-LD', 'reverse', '/blog/structured-data-guide', 7),
  ('메타 태그 최적화', 'reverse', '/blog/meta-tags-best-practices', 7),
  ('Naver Cue', 'reverse', '/blog/naver-cue-geo-strategy', 7),
  ('네이버 AI 브리핑 노출', 'reverse', '/blog/naver-cue-geo-strategy', 6),
  ('Perplexity 인용', 'reverse', '/blog/what-is-aeo', 6)
ON CONFLICT (keyword) DO NOTHING;