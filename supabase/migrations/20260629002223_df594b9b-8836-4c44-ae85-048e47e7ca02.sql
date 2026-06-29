
CREATE TABLE IF NOT EXISTS public.engine_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'geo',
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  fetch_count INTEGER NOT NULL DEFAULT 0,
  last_fetched_at TIMESTAMPTZ,
  last_content TEXT,
  last_summary TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.engine_knowledge_sources TO service_role;

ALTER TABLE public.engine_knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages knowledge sources"
  ON public.engine_knowledge_sources
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER trg_engine_knowledge_sources_updated_at
  BEFORE UPDATE ON public.engine_knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.engine_knowledge_sources (label, url, category, notes)
VALUES (
  'WePick — GEO AI 검색 최적화 완전가이드',
  'https://letter.wepick.kr/wiki/geo-ai-search-optimization',
  'geo',
  '한국어 GEO 전체 개요 — 엔진 트렌드 보강용 베이스 레퍼런스'
)
ON CONFLICT (url) DO NOTHING;
