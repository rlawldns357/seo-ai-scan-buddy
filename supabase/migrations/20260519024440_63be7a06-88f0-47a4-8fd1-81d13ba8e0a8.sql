UPDATE public.autoblog_engine_config
SET
  config_value = regexp_replace(
    config_value,
    E'\\[시기성 \\(Recency / Freshness\\)\\][\\s\\S]*?(?=\\n\\[)',
    E'[시기성 (Recency / Freshness)]\n'
    || E'- 내부 기준 연도는 2026년. 인용하는 통계·정책·모델명은 2024~2026년 자료만 사용.\n'
    || E'- 단, "2026년"이라는 표현을 본문/제목/도입부에 반복적으로 박아 넣지 말 것. 한 글 안에서 연도 표기는 꼭 필요할 때 1~2회까지만 자연스럽게.\n'
    || E'- 시즌·트렌드는 "올해 봄", "이번 시즌", "요즘"처럼 자연스러운 시점 표현 우선. 연도가 정말 의미 있을 때(트렌드 변화·통계 비교 등)에만 "2026년"을 사용.\n'
    || E'- 단종/철 지난 정보 단정 금지. 변동 가능한 정보는 "현재 기준" 정도로 완곡하게.\n\n',
    'g'
  ),
  version = version + 1,
  updated_at = now()
WHERE config_key = 'content_system_prompt';

UPDATE public.autoblog_engine_config
SET config_value = replace(config_value, '2026년 기준, ', '')
WHERE config_key = 'content_system_prompt';