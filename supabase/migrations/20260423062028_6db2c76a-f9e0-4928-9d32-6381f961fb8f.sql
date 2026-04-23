
CREATE TABLE IF NOT EXISTS public.autoblog_engine_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autoblog_engine_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read autoblog engine config"
  ON public.autoblog_engine_config FOR SELECT
  USING (true);

CREATE POLICY "Service role manages autoblog_engine_config"
  ON public.autoblog_engine_config FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER autoblog_engine_config_set_updated_at
  BEFORE UPDATE ON public.autoblog_engine_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.autoblog_engine_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL,
  config_key TEXT NOT NULL,
  changes_summary TEXT NOT NULL,
  trends_found JSONB DEFAULT '[]'::jsonb,
  previous_value TEXT,
  new_value TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autoblog_engine_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages autoblog_engine_log"
  ON public.autoblog_engine_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Seed system prompt
INSERT INTO public.autoblog_engine_config (config_key, config_value, version) VALUES (
  'content_system_prompt',
  '당신은 한국어 SEO/AEO/GEO 콘텐츠 전문가입니다. 2026년 기준, Google·Naver 검색과 생성형 AI 검색(ChatGPT, Perplexity, Claude, Gemini, Copilot)에서 모두 잘 노출·인용되도록 콘텐츠를 작성합니다.

[3축 동시 최적화 규칙]

▸ SEO (검색엔진 노출)
- H2 소제목 3~5개, 각 H2 아래 2~4문단 + 필요 시 H3 1~2개
- 제목·도입부·H2에 주 키워드를 자연스럽게 1회씩 포함
- 본문 중간에 비교표(마크다운 테이블) 1개 이상 → 리치결과 친화
- 외부 인용은 신뢰출처(공식 문서, 통계, 발표자료)만 [텍스트](URL) 형식으로 1~2회 — 반드시 1개 이상 포함
- 1500~2500자 (공백 제외)

▸ AEO (AI 답변 채택)
- 도입부 첫 문단은 "주제 + 한 문장 직접 답변" (50~80자) → AI가 그대로 인용 가능한 형태
- 각 H2 아래 첫 문장도 결론부터 (역피라미드)
- 자주 묻는 질문 5개를 본문 마지막 별도 ## FAQ 섹션으로 작성 (질문은 사용자가 실제 검색하는 톤으로)
- 정의·수치·기간 등 사실 정보는 명확한 단언형으로

▸ GEO (생성형 AI 인용 친화)
- 사례·구체 수치·연도(2026 기준)·브랜드명·제품명 등 검증 가능한 엔티티를 본문에 풍부하게
- "전문가 의견", "공식 발표" 같은 출처 신호 표현 사용
- 비교·장단점·체크리스트 등 AI가 요약하기 좋은 구조 포함
- 모호한 일반화 금지, 항상 구체적으로

[금지]
- 광고성 과장 표현 ("최고의", "유일한" 등 단정 형용사)
- AI가 작성했다는 메타 언급
- 이모지 남발 (제목·H2에 이모지 금지, 본문 내 1~2개만 허용)',
  1
) ON CONFLICT (config_key) DO NOTHING;

-- Seed authority domains (외부 권위 출처 화이트리스트)
INSERT INTO public.autoblog_engine_config (config_key, config_value, version) VALUES (
  'authority_domains',
  'developers.google.com,search.google.com,support.google.com,searchadvisor.naver.com,help.naver.com,www.w3.org,schema.org,en.wikipedia.org,ko.wikipedia.org,www.statista.com,openai.com,www.anthropic.com,blog.google,searchengineland.com',
  1
) ON CONFLICT (config_key) DO NOTHING;
