CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  seo_score INTEGER NOT NULL,
  aeo_score INTEGER NOT NULL,
  geo_score INTEGER NOT NULL,
  result_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analysis results
CREATE POLICY "Anyone can insert analysis history"
ON public.analysis_history
FOR INSERT
WITH CHECK (
  url IS NOT NULL
  AND char_length(url) >= 5
  AND char_length(url) <= 2000
);

-- Anyone can read analysis history (needed to show comparisons)
CREATE POLICY "Anyone can read analysis history"
ON public.analysis_history
FOR SELECT
USING (true);

-- Index for fast URL-based lookups
CREATE INDEX idx_analysis_history_url_date ON public.analysis_history (url, created_at DESC);