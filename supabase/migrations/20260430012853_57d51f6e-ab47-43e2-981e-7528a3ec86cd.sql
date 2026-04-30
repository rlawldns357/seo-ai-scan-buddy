CREATE TABLE public.naver_store_analysis_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  result_data JSONB NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_naver_store_cache_url ON public.naver_store_analysis_cache(url);
CREATE INDEX idx_naver_store_cache_analyzed_at ON public.naver_store_analysis_cache(analyzed_at DESC);

ALTER TABLE public.naver_store_analysis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read naver store cache"
ON public.naver_store_analysis_cache
FOR SELECT
USING (true);

CREATE POLICY "Service role manages naver store cache"
ON public.naver_store_analysis_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);