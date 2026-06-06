
CREATE TABLE IF NOT EXISTS public.threads_engine_config (
  config_key TEXT PRIMARY KEY DEFAULT 'threads_engine',
  version_major INT NOT NULL DEFAULT 1,
  version_minor INT NOT NULL DEFAULT 0,
  rules TEXT NOT NULL DEFAULT '',
  pending_rules TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.threads_engine_config TO service_role;
ALTER TABLE public.threads_engine_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.threads_engine_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  version_at TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_threads_engine_chat_created ON public.threads_engine_chat(created_at);

GRANT ALL ON public.threads_engine_chat TO service_role;
ALTER TABLE public.threads_engine_chat ENABLE ROW LEVEL SECURITY;

INSERT INTO public.threads_engine_config (config_key, rules, version_major, version_minor)
VALUES ('threads_engine',
'기본 룰 (v1.0)
- 한국어, 120자 이내
- 이모지 1~2개 허용
- 후크 유형: 통계/반전/질문/손실회피 중 하나
- 해시태그 금지, 링크 금지 (링크는 시스템이 따로 부착)
- 글 제목 그대로 복사 금지 (재가공)
- 끝에 줄바꿈 + 👉 한 줄 추가',
1, 0)
ON CONFLICT (config_key) DO NOTHING;
