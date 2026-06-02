
-- ① 편향 관련 v11 로그 제거
DELETE FROM public.engine_update_log WHERE version = 11;

-- ② v10 → v10.5 통합본으로 갱신 (Google 공식 문서 근거만)
UPDATE public.engine_update_log
SET
  changes_summary = 'v10.5 통합본 — Google Search Central 공식 AI 검색 가이드(2025–2026) 시리즈와 정합. ① llms.txt / AI 마크업 / 청킹 / AI 재작성 = 가점만(감점·priorityFix 금지). 출처: ai-optimization-guide. ② AEO 청킹·Q&A 강제 요건 완화(FAQPage 강제 priorityFix 제거). 출처: ai-features. ③ E-E-A-T(저자·조직·About) 시그널을 평가에 명시. 출처: creating-helpful-content. ④ Non-commodity(비기성품) 시그널 신설 — 1인칭·실측·고유 사례 +5~10, AI 양산형 상한 80. 출처: using-gen-ai-content + succeeding-in-ai-search. ⑤ RAG 친화도(신뢰 시그널) 가중치 상향. 출처: succeeding-in-ai-search. ⑥ Query Fan-out 측정 엔진(probe-ai-perception) 도입 — 브랜드명 노출 없이 카테고리 기반 자연 질의 4개 동시 생성으로 응답 점유율과 TOP5 경쟁사 동시 측정. 출처: google-search-ai-mode-update. ⑦ scoreRationale 끝 "구글 공식 가이드: <근거>" 1줄 강제. 자사 About에 E-E-A-T 섹션, 홈 히어로에 "공식 가이드 정합" 배지 반영.',
  trends_found = '[
    "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?hl=ko",
    "https://developers.google.com/search/docs/appearance/ai-features?hl=ko",
    "https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=ko",
    "https://developers.google.com/search/blog/2025/05/succeeding-in-ai-search",
    "https://developers.google.com/search/docs/fundamentals/using-gen-ai-content?hl=ko",
    "https://blog.google/products-and-platforms/products/search/google-search-ai-mode-update/",
    "https://developers.google.com/search/docs/essentials?hl=ko"
  ]'::jsonb
WHERE version = 10;

-- ③ 엔진 설정 버전 정렬 — 통합본은 단일 마일스톤(v11 = v10.5 통합)으로 라이브 유지
UPDATE public.engine_config
SET version = 11, updated_at = now()
WHERE config_key = 'analysis_prompt';
