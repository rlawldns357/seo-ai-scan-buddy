
-- 1) serp_keywords status fields
ALTER TABLE public.serp_keywords
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'monitoring',
  ADD COLUMN IF NOT EXISTS last_action_at timestamptz;

-- 2) indexing_queue
CREATE TABLE IF NOT EXISTS public.indexing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  target_keyword text,
  engine text NOT NULL DEFAULT 'both',
  reason text,
  priority smallint NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz,
  verified_at timestamptz,
  result text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.indexing_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages indexing_queue" ON public.indexing_queue;
CREATE POLICY "Service role manages indexing_queue" ON public.indexing_queue
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read indexing_queue" ON public.indexing_queue;
CREATE POLICY "Admins can read indexing_queue" ON public.indexing_queue
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_indexing_queue_status ON public.indexing_queue(status, priority DESC);

-- 3) seo_actions
CREATE TABLE IF NOT EXISTS public.seo_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_url text NOT NULL,
  target_keyword text,
  action_type text NOT NULL,
  before_state jsonb DEFAULT '{}'::jsonb,
  after_state jsonb DEFAULT '{}'::jsonb,
  result text NOT NULL DEFAULT 'waiting',
  ai_judgement text,
  next_action text,
  remeasure_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages seo_actions" ON public.seo_actions;
CREATE POLICY "Service role manages seo_actions" ON public.seo_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read seo_actions" ON public.seo_actions;
CREATE POLICY "Admins can read seo_actions" ON public.seo_actions
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_seo_actions_created ON public.seo_actions(created_at DESC);

-- 4) seo_action_metrics
CREATE TABLE IF NOT EXISTS public.seo_action_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid REFERENCES public.seo_actions(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  engine text NOT NULL,
  rank_before integer,
  rank_after integer,
  measured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_action_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages seo_action_metrics" ON public.seo_action_metrics;
CREATE POLICY "Service role manages seo_action_metrics" ON public.seo_action_metrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read seo_action_metrics" ON public.seo_action_metrics;
CREATE POLICY "Admins can read seo_action_metrics" ON public.seo_action_metrics
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
