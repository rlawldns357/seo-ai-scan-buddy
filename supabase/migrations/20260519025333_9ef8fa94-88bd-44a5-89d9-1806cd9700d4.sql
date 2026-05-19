UPDATE public.autoblog_engine_config
SET config_value = config_value || E'\n\n[제목 다양성 룰 — 강제]\n- 제목 첫머리에 "2026년"으로 시작 금지. 연도가 꼭 필요하면 부제·괄호로 빼거나 생략.\n- "N단계 가이드 / N가지 전략 / 완벽 가이드 / 백서 / 실전 가이드" 같은 클리셰 표현은 최근 5개 제목 중 1회 이하.\n- 매번 다른 형태로 회전: 질문형, 단언형, 비교형(A vs B), 사례형, How-to, 체크리스트형, 미신 깨기형.\n- 최근 발행 제목과 구조·패턴이 30% 이상 유사하면 재작성.\n- 본문/도입부에서도 "2026년"을 반복 노출하지 말 것 (필요 시 1회).',
    version = version + 1,
    updated_at = now()
WHERE config_key = 'content_system_prompt'
  AND config_value NOT LIKE '%제목 다양성 룰%';