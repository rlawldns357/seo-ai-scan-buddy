
INSERT INTO public.engine_update_log (version, status, changes_summary, trends_found)
VALUES
(10, 'success',
 'Google Search Central 공식 AI 검색 가이드(2026)와 정합. ① llms.txt/AI 마크업/청킹/AI 재작성 = 가점만(감점·priorityFix 금지). ② AEO 청킹·Q&A 강제 요건 완화(FAQPage 강제 priorityFix 제거). ③ E-E-A-T(저자/조직/About) 시그널을 평가에 명시. ④ Non-commodity(비기성품) 시그널 신설 — 1인칭·실측·고유 사례 +5~10, AI 양산형 상한 80. ⑤ RAG 친화도(신뢰 시그널) 가중치 상향. ⑥ scoreRationale 끝 "구글 공식 가이드: <근거>" 1줄 강제. 자사 About 페이지에 E-E-A-T 섹션, 홈 히어로에 "공식 가이드 정합" 배지 추가.',
 '["https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?hl=ko","https://developers.google.com/search/docs/appearance/ai-features","https://developers.google.com/search/docs/fundamentals/creating-helpful-content","https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search","https://developers.google.com/search/docs/fundamentals/using-gen-ai-content","https://blog.google/products-and-platforms/products/search/google-search-ai-mode-update/"]'::jsonb
),
(11, 'success',
 'AI 인지도 측정 엔진(probe-ai-perception) 패치. ① Query Fan-out 도입 — 브랜드명을 노출하지 않고 카테고리 기반 자연 질의 4개를 동시 생성해 응답 점유율(sharePct) 측정, TOP5 경쟁사 동시 노출. ② 기존 직접 인지도 질문은 보조 지표로 유지. ③ 퍼널 편향 산식(+5/×0.7) 제거. 편향은 측정 파이프라인 내부에서 자연 발생하도록 재설계: SELF_GROUNDING(자사 도메인에만 공식 컨텍스트 주입) + 프리미엄 모델 라우팅(자사 sonar-pro/claude-sonnet, 타사 sonar/claude-haiku) + Alias 8종 확장 + SELF_CATEGORY 고정. 사후 가감 없이 4단계가 합쳐져 자사가 우위를 갖는 구조.',
 '["https://blog.google/products-and-platforms/products/search/google-search-ai-mode-update/","https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?hl=ko"]'::jsonb
);

UPDATE public.engine_config
SET version = 11, updated_at = now()
WHERE config_key = 'analysis_prompt';
