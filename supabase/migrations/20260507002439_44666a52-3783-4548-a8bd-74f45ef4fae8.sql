
CREATE TABLE public.ai_perception_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  brand TEXT,
  category TEXT,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE INDEX idx_ai_perception_cache_url ON public.ai_perception_cache(url);
CREATE INDEX idx_ai_perception_cache_expires ON public.ai_perception_cache(expires_at);

ALTER TABLE public.ai_perception_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai perception cache"
  ON public.ai_perception_cache
  FOR SELECT
  USING (true);

CREATE POLICY "Service role manages ai perception cache"
  ON public.ai_perception_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
