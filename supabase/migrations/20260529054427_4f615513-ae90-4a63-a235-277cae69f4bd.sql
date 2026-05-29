
CREATE TABLE public.answer_share_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  brand text NOT NULL,
  domain text,
  ip_address text,
  email text,
  response_share numeric NOT NULL DEFAULT 0,
  citation_share numeric NOT NULL DEFAULT 0,
  first_mention_share numeric NOT NULL DEFAULT 0,
  avg_brand_position numeric,
  competitor_share jsonb NOT NULL DEFAULT '{}'::jsonb,
  missed_queries jsonb NOT NULL DEFAULT '[]'::jsonb,
  queries_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  by_engine jsonb NOT NULL DEFAULT '{}'::jsonb,
  by_query jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_responses integer NOT NULL DEFAULT 0,
  cost_usd numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_answer_share_results_url ON public.answer_share_results(url);
CREATE INDEX idx_answer_share_results_created_at ON public.answer_share_results(created_at DESC);
CREATE INDEX idx_answer_share_results_ip ON public.answer_share_results(ip_address, created_at DESC);

GRANT SELECT, INSERT ON public.answer_share_results TO anon;
GRANT SELECT, INSERT ON public.answer_share_results TO authenticated;
GRANT ALL ON public.answer_share_results TO service_role;

ALTER TABLE public.answer_share_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert answer share results"
ON public.answer_share_results
FOR INSERT
TO anon, authenticated
WITH CHECK (
  url IS NOT NULL AND char_length(url) BETWEEN 5 AND 2000
  AND brand IS NOT NULL AND char_length(brand) BETWEEN 1 AND 200
);

CREATE POLICY "Service role can read all answer share results"
ON public.answer_share_results
FOR SELECT
TO service_role
USING (true);

CREATE POLICY "Public can read recent results by url"
ON public.answer_share_results
FOR SELECT
TO anon, authenticated
USING (true);
