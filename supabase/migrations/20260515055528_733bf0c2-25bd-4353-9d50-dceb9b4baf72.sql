
-- 1) API 비용 로그 테이블
CREATE TABLE public.api_cost_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  provider text NOT NULL,
  model text,
  tokens_in integer NOT NULL DEFAULT 0,
  tokens_out integer NOT NULL DEFAULT 0,
  requests integer NOT NULL DEFAULT 1,
  cost_krw numeric(12,4) NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_cost_log_created ON public.api_cost_log(created_at DESC);
CREATE INDEX idx_api_cost_log_provider ON public.api_cost_log(provider, created_at DESC);
CREATE INDEX idx_api_cost_log_function ON public.api_cost_log(function_name, created_at DESC);

ALTER TABLE public.api_cost_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api cost log"
ON public.api_cost_log FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages api_cost_log"
ON public.api_cost_log FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- 2) 공급자별 월 예산 테이블
CREATE TABLE public.api_cost_budget (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  monthly_budget_krw numeric(12,2) NOT NULL DEFAULT 0,
  alert_threshold_pct smallint NOT NULL DEFAULT 80,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_cost_budget ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api cost budget"
ON public.api_cost_budget FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role manages api_cost_budget"
ON public.api_cost_budget FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER trg_api_cost_budget_updated
BEFORE UPDATE ON public.api_cost_budget
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) 기본 예산 시드 (Lovable Cloud의 월 무료 잔고 기준 + 외부 결제 추정)
INSERT INTO public.api_cost_budget (provider, monthly_budget_krw, notes) VALUES
  ('lovable_ai', 1400, 'Lovable AI Gateway: 월 $1 무료 (≈ ₩1,400). Gemini/GPT/Claude 통합'),
  ('perplexity', 28000, 'Perplexity API: 월 약 $20 추정'),
  ('firecrawl', 28000, 'Firecrawl: 월 약 $20 추정'),
  ('psi', 0, 'Google PageSpeed Insights: 무료')
ON CONFLICT (provider) DO NOTHING;
