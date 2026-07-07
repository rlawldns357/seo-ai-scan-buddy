-- =========================================================
-- AEO Daily Tracker: 3 tables
-- =========================================================

-- 1) Target prompts
CREATE TABLE public.aeo_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  intent text,
  expected_url text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  priority smallint NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.aeo_prompts TO service_role;
ALTER TABLE public.aeo_prompts ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated -> zero read/write via PostgREST.
-- service_role bypasses RLS; edge functions use it.

CREATE TRIGGER trg_aeo_prompts_updated_at
  BEFORE UPDATE ON public.aeo_prompts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_aeo_prompts_active ON public.aeo_prompts(active, priority DESC);

-- 2) Per-engine raw check log
CREATE TABLE public.aeo_check_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_date date NOT NULL,
  prompt_id uuid NOT NULL REFERENCES public.aeo_prompts(id) ON DELETE CASCADE,
  engine text NOT NULL,
  mode text NOT NULL DEFAULT 'cron',
  mentioned boolean NOT NULL DEFAULT false,
  mention_rank smallint,
  sentiment smallint NOT NULL DEFAULT 0,
  accuracy smallint NOT NULL DEFAULT 0,
  excerpt text,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  citation_hit boolean NOT NULL DEFAULT false,
  response_text text,
  cost_usd numeric NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.aeo_check_results TO service_role;
ALTER TABLE public.aeo_check_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_aeo_results_date_prompt
  ON public.aeo_check_results(check_date DESC, prompt_id);
CREATE INDEX idx_aeo_results_engine_date
  ON public.aeo_check_results(engine, check_date DESC);

-- 3) Daily aggregate score cache
CREATE TABLE public.aeo_daily_scores (
  check_date date PRIMARY KEY,
  visibility_score smallint NOT NULL DEFAULT 0,
  presence_score smallint NOT NULL DEFAULT 0,
  position_score smallint NOT NULL DEFAULT 0,
  sentiment_score smallint NOT NULL DEFAULT 0,
  accuracy_score smallint NOT NULL DEFAULT 0,
  citation_share numeric NOT NULL DEFAULT 0,
  total_checks int NOT NULL DEFAULT 0,
  mentioned_checks int NOT NULL DEFAULT 0,
  by_engine jsonb NOT NULL DEFAULT '{}'::jsonb,
  by_prompt jsonb NOT NULL DEFAULT '{}'::jsonb,
  delta_vs_yesterday smallint NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'cron',
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.aeo_daily_scores TO service_role;
ALTER TABLE public.aeo_daily_scores ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Seed: 20 initial prompts
-- =========================================================
INSERT INTO public.aeo_prompts (prompt, category, intent, priority) VALUES
  ('AI 검색 최적화 도구 추천',                 'AEO',    'recommendation', 9),
  ('GEO 진단 툴 뭐가 좋아?',                    'GEO',    'recommendation', 9),
  ('ChatGPT 검색 노출 최적화 방법',            'AEO',    'howto',          8),
  ('Perplexity에 내 사이트 노출시키는 법',      'AEO',    'howto',          8),
  ('생성형 AI 검색 SEO 툴',                     'AEO',    'recommendation', 8),
  ('한국 SEO 진단 도구 추천',                   'SEO',    'recommendation', 7),
  ('네이버 스마트스토어 SEO 진단 툴',           '네이버', 'recommendation', 7),
  ('무료 웹사이트 SEO 분석 서비스',             'SEO',    'recommendation', 7),
  ('AEO(Answer Engine Optimization)란 무엇인가','AEO',    'definition',     6),
  ('GEO(Generative Engine Optimization)란',      'GEO',    'definition',     6),
  ('내 사이트가 ChatGPT에 인용되는지 확인 방법','AEO',    'howto',          7),
  ('Google Lighthouse 외에 쓸만한 SEO 툴',      'SEO',    'recommendation', 6),
  ('AI 검색 시대 콘텐츠 최적화 전략',           'AEO',    'howto',          6),
  ('E-E-A-T 자동 진단 도구',                    'SEO',    'recommendation', 5),
  ('Core Web Vitals 자동 분석 서비스',          'SEO',    'recommendation', 5),
  ('블로그 AI 검색 최적화 방법',                'AEO',    'howto',          6),
  ('한국어 AEO 최적화 서비스',                  'AEO',    'recommendation', 8),
  ('SearchTune OS 후기',                        '브랜드', 'brand',          4),
  ('서치튠OS vs 다른 SEO 진단 도구 비교',       '브랜드', 'compare',        4),
  ('AI 검색에서 내 브랜드 노출 트래킹 방법',    'GEO',    'howto',          7);