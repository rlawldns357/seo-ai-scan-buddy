-- 분석 엔진 설정 테이블
CREATE TABLE public.engine_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL UNIQUE,
  config_value text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.engine_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage engine_config"
  ON public.engine_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 엔진 업데이트 이력 테이블
CREATE TABLE public.engine_update_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  changes_summary text NOT NULL,
  trends_found jsonb DEFAULT '[]'::jsonb,
  previous_prompt text,
  new_prompt text,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.engine_update_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage engine_update_log"
  ON public.engine_update_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);